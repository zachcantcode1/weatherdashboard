const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const router = express.Router();

// Path to local GDAL tools and Python environment
const GDAL_BIN_PATH = path.join(__dirname, 'gdal_tools', 'bin', 'gdal', 'apps');
const PYTHON_PATH = 'C:/Users/zachm/codee/weatherdashboard/.venv/Scripts/python.exe';

// Temporary directory for processing GRIB files
const TEMP_DIR = path.join(__dirname, '..', 'temp');
const STATIC_DIR = path.join(__dirname, '..', 'public', 'processed');

// Ensure directories exist
async function ensureDirectories() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await fs.mkdir(STATIC_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating directories:', err);
  }
}

// Initialize directories
ensureDirectories();

// Color ramp for reflectivity (REFC) - dBZ values to RGB
const REFLECTIVITY_COLOR_RAMP = `
-10.0 0 0 0 0
0.0 64 64 64
10.0 0 236 236
20.0 1 160 246
30.0 0 0 246
35.0 0 255 0
40.0 0 200 0
45.0 0 144 0
50.0 255 255 0
55.0 231 192 0
60.0 255 144 0
65.0 255 0 0
70.0 214 0 0
75.0 192 0 0
80.0 255 0 255
85.0 153 85 201
`;

// Download file using curl or wget
async function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`[GRIB2 Processor] Downloading: ${url}`);
    
    const wget = spawn('curl', ['-o', outputPath, url], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';
    
    wget.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    wget.on('close', (code) => {
      if (code === 0) {
        console.log(`[GRIB2 Processor] Download complete: ${outputPath}`);
        resolve(outputPath);
      } else {
        console.error(`[GRIB2 Processor] Download failed with code ${code}: ${stderr}`);
        reject(new Error(`Download failed: ${stderr}`));
      }
    });

    wget.on('error', (err) => {
      console.error(`[GRIB2 Processor] Download error:`, err);
      reject(err);
    });
  });
}

// Run shell command with local GDAL tools
async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    let commandPath = command;
    let processOptions = { ...options };
    
    // Use local GDAL tools if it's a GDAL command
    const gdalCommands = ['gdalwarp', 'gdaldem', 'gdal_translate', 'gdalinfo'];
    if (gdalCommands.includes(command)) {
      commandPath = path.join(GDAL_BIN_PATH, `${command}.exe`);
      
      // Add GDAL bin directory to PATH for DLL resolution
      const gdalBinDir = path.join(__dirname, 'gdal_tools', 'bin');
      const currentPath = process.env.PATH || '';
      processOptions.env = {
        ...process.env,
        PATH: `${gdalBinDir};${currentPath}`,
        GDAL_DATA: path.join(gdalBinDir, 'gdal-data'),
        PROJ_LIB: path.join(gdalBinDir, 'proj9', 'share')
      };
    }
    
    console.log(`[GRIB2 Processor] Running: ${commandPath} ${args.join(' ')}`);
    
    const childProcess = spawn(commandPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      ...processOptions
    });

    let stdout = '';
    let stderr = '';

    childProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    childProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    childProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`[GRIB2 Processor] Command completed: ${command}`);
        resolve({ stdout, stderr });
      } else {
        console.error(`[GRIB2 Processor] Command failed with code ${code}: ${stderr}`);
        reject(new Error(`Command failed: ${stderr}`));
      }
    });

    childProcess.on('error', (err) => {
      console.error(`[GRIB2 Processor] Command error:`, err);
      reject(err);
    });
  });
}

// Process GRIB2 file using the tutorial workflow
async function processGRIB2File(gribPath, outputDir, baseFilename) {
  const colorRampPath = path.join(outputDir, `${baseFilename}_colormap.txt`);
  const unwrapPath = path.join(outputDir, `${baseFilename}_unwrap.tif`);
  const mercatorPath = path.join(outputDir, `${baseFilename}_mercator.tif`);
  const colorPath = path.join(outputDir, `${baseFilename}_color.tif`);
  
  try {
    // Step 1: Create color ramp file
    await fs.writeFile(colorRampPath, REFLECTIVITY_COLOR_RAMP.trim());
    console.log(`[GRIB2 Processor] Created color ramp: ${colorRampPath}`);

    // Step 2: Extract reflectivity band (Band 1 = REFC) from GRIB2
    const refcPath = path.join(outputDir, `${baseFilename}_refc.tif`);
    await runCommand('gdal_translate', [
      '-b', '1',  // Extract band 1 (REFC - Maximum/Composite radar reflectivity)
      '-of', 'GTiff',
      gribPath, refcPath
    ]);

    // Step 3: Reproject to WGS84 first for compatibility
    await runCommand('gdalwarp', [
      '-t_srs', 'EPSG:4326',
      '-r', 'bilinear',
      refcPath, unwrapPath
    ]);

    // Step 3: Apply color ramp directly to WGS84 data (skip Web Mercator step)
    await runCommand('gdaldem', [
      'color-relief',
      unwrapPath,
      colorRampPath,
      colorPath
    ]);

    // Step 4: Convert to PNG with transparency for overlay  
    const finalPath = path.join(outputDir, `${baseFilename}.png`);
    await runCommand('gdal_translate', [
      '-of', 'PNG',
      '-a_nodata', '0 0 0',  // Set black pixels as transparent
      colorPath, finalPath
    ]);

    // Get bounds from the WGS84 version for Leaflet compatibility
    console.log(`[GRIB2 Processor] Getting bounds from: ${unwrapPath}`);
    const gdalInfoResult = await runCommand('gdalinfo', ['-json', unwrapPath]);
    const gdalInfo = JSON.parse(gdalInfoResult.stdout);
    
    console.log(`[GRIB2 Processor] Corner coordinates:`, gdalInfo.cornerCoordinates);
    
    // Leaflet expects [[south, west], [north, east]] format in WGS84
    const bounds = [
      [gdalInfo.cornerCoordinates.lowerLeft[1], gdalInfo.cornerCoordinates.lowerLeft[0]], // [lat, lng] for southwest
      [gdalInfo.cornerCoordinates.upperRight[1], gdalInfo.cornerCoordinates.upperRight[0]] // [lat, lng] for northeast
    ];

    console.log(`[GRIB2 Processor] Processing complete: ${finalPath}`);
    
    return {
      imagePath: finalPath,
      bounds: bounds,
      metadata: gdalInfo
    };

  } catch (err) {
    console.error('[GRIB2 Processor] Processing error:', err);
    throw err;
  } finally {
    // Cleanup intermediate files
    try {
      await Promise.all([
        fs.unlink(colorRampPath).catch(() => {}),
        fs.unlink(unwrapPath).catch(() => {}),
        fs.unlink(mercatorPath).catch(() => {}),
        fs.unlink(colorPath).catch(() => {})
      ]);
    } catch (err) {
      console.warn('[GRIB2 Processor] Cleanup warning:', err);
    }
  }
}

// Main API endpoint
router.post('/process-grib2', async (req, res) => {
  const { gribUrl, variable = 'REFC', colorRamp = 'reflectivity', forecastHour = 0 } = req.body;

  if (!gribUrl) {
    return res.status(400).json({ error: 'GRIB URL is required' });
  }

  // Generate unique filename based on URL and forecast hour (no timestamp for caching)
  const urlHash = crypto.createHash('md5').update(gribUrl).digest('hex');
  const baseFilename = `hrrr_${variable}_f${String(forecastHour).padStart(2, '0')}_${urlHash}`;
  
  // Check if already processed
  const cachedImagePath = path.join(STATIC_DIR, `${baseFilename}.png`);
  const cachedMetadataPath = path.join(STATIC_DIR, `${baseFilename}.json`);
  
  try {
    // Check if cached version exists and is recent (less than 1 hour old)
    const cachedStat = await fs.stat(cachedImagePath);
    const cachedMetadata = JSON.parse(await fs.readFile(cachedMetadataPath, 'utf8'));
    const cacheAge = Date.now() - cachedStat.mtimeMs;
    const maxCacheAge = 60 * 60 * 1000; // 1 hour
    
    if (cacheAge < maxCacheAge) {
      console.log(`[GRIB2 Processor] Using cached result for ${baseFilename}`);
      return res.json({
        success: true,
        imageUrl: `/processed/${baseFilename}.png`,
        bounds: cachedMetadata.bounds,
        metadata: {
          ...cachedMetadata.metadata,
          cached: true,
          cacheAge: Math.round(cacheAge / 1000) // age in seconds
        }
      });
    }
  } catch (err) {
    // Cache miss or error - proceed with processing
    console.log(`[GRIB2 Processor] Cache miss for ${baseFilename}, processing...`);
  }
  
  const tempDir = path.join(TEMP_DIR, baseFilename);
  const gribPath = path.join(tempDir, 'raw.grib2');

  try {
    // Create temporary directory
    await fs.mkdir(tempDir, { recursive: true });

    // Download GRIB2 file
    await downloadFile(gribUrl, gribPath);

    // Process GRIB2 file
    const result = await processGRIB2File(gribPath, tempDir, baseFilename);

    // Move final image to static directory
    const staticImagePath = path.join(STATIC_DIR, `${baseFilename}.png`);
    await fs.rename(result.imagePath, staticImagePath);

    // Save metadata for caching
    const metadataToCache = {
      bounds: result.bounds,
      metadata: {
        variable: variable,
        forecastHour: forecastHour,
        timestamp: new Date().toISOString(),
        originalUrl: gribUrl,
        cached: false
      }
    };
    
    const metadataPath = path.join(STATIC_DIR, `${baseFilename}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(metadataToCache, null, 2));

    // Return URL and bounds
    const imageUrl = `/processed/${baseFilename}.png`;
    
    res.json({
      success: true,
      imageUrl: imageUrl,
      bounds: result.bounds,
      metadata: metadataToCache.metadata
    });

  } catch (err) {
    console.error('[GRIB2 Processor] API Error:', err);
    res.status(500).json({
      error: 'Failed to process GRIB2 file',
      details: err.message
    });
  } finally {
    // Cleanup temporary directory
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch (err) {
      console.warn('[GRIB2 Processor] Temp cleanup warning:', err);
    }
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Check if required tools are available
    const tools = ['curl', 'gdalwarp', 'gdaldem', 'gdal_translate', 'gdalinfo'];
    const toolStatus = {};

    for (const tool of tools) {
      try {
        if (tool === 'curl') {
          // Check system curl
          await runCommand(tool, ['--version']);
          toolStatus[tool] = 'available';
        } else {
          // Check local GDAL tools
          const toolPath = path.join(GDAL_BIN_PATH, `${tool}.exe`);
          try {
            await fs.access(toolPath);
            toolStatus[tool] = 'available (local)';
          } catch (err) {
            toolStatus[tool] = 'missing';
          }
        }
      } catch (err) {
        toolStatus[tool] = 'missing';
      }
    }

    // Check for gribdoctor (optional)
    try {
      await runCommand(PYTHON_PATH, ['-m', 'gribdoctor', '--version']);
      toolStatus.gribdoctor = 'available';
    } catch (err) {
      toolStatus.gribdoctor = 'missing (optional)';
    }

    res.json({
      status: 'ok',
      tools: toolStatus,
      directories: {
        temp: TEMP_DIR,
        static: STATIC_DIR,
        gdalBin: GDAL_BIN_PATH
      }
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      error: err.message
    });
  }
});

module.exports = router;
