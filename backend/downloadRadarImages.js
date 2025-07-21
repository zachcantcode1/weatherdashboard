// Downloads radar images for a set of times and saves them to radar_cache
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const RADAR_CACHE_DIR = path.join(__dirname, 'radar_cache');
const WMS_BASE_URL = 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r-t.cgi';
const LAYER = 'nexrad-n0r-wmst';

// Example: times = ["2025-07-20T18:25:00Z", ...]
async function downloadRadarImages(times) {
  if (!fs.existsSync(RADAR_CACHE_DIR)) {
    fs.mkdirSync(RADAR_CACHE_DIR);
  }
  for (const time of times) {
    // Compose WMS request URL (example for a static bbox and zoom)
    const params = new URLSearchParams({
      service: 'WMS',
      request: 'GetMap',
      layers: LAYER,
      format: 'image/png',
      transparent: 'true',
      time,
      width: '1024',
      height: '768',
      srs: 'EPSG:4326',
      bbox: '-130,20,-60,55', // US bounding box
    });
    const url = `${WMS_BASE_URL}?${params.toString()}`;
    const outPath = path.join(RADAR_CACHE_DIR, `${time.replace(/[:]/g, '-')}.png`);
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      fs.writeFileSync(outPath, response.data);
      console.log(`[RadarCache] Downloaded ${outPath}`);
    } catch (err) {
      console.error(`[RadarCache] Failed for ${time}:`, err.message);
    }
  }
}

module.exports = { downloadRadarImages };
