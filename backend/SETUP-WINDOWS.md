# HRRR GRIB2 Processing Setup for Windows

This document explains how to set up the required tools for processing GRIB2 files on Windows.

## Required Tools

The HRRR layer requires the following command-line tools to process GRIB2 files:

1. **GDAL/OGR** - Geospatial Data Abstraction Library
2. **curl** - For downloading GRIB2 files

## Installation Options

### Option 1: OSGeo4W (Recommended)

1. Download OSGeo4W from: https://trac.osgeo.org/osgeo4w/
2. Run the installer and select "Express Desktop Install"
3. This will install GDAL, QGIS, and other geospatial tools
4. The tools will be available in the OSGeo4W Shell

### Option 2: Conda/Miniconda

```bash
# Install miniconda first: https://docs.conda.io/en/latest/miniconda.html
conda create -n grib2 python=3.9
conda activate grib2
conda install -c conda-forge gdal
```

### Option 3: Standalone GDAL

1. Download GDAL from: https://gdal.org/download.html#windows
2. Use the GISInternals builds: https://www.gisinternals.com/
3. Add the GDAL bin directory to your system PATH

## Verification

After installation, verify the tools are available by running these commands in your terminal:

```bash
gdalwarp --version
gdaldem --version
gdal_translate --version
gdalinfo --version
curl --version
```

## Optional: gribdoctor

For better GRIB2 processing, install gribdoctor:

```bash
pip install gribdoctor
```

## Backend Configuration

Once the tools are installed:

1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

2. Test the health endpoint:
   ```bash
   curl http://localhost:3001/api/health
   ```

This should return the status of all required tools.

## Troubleshooting

### PATH Issues
- Make sure GDAL tools are in your system PATH
- Restart your terminal/IDE after installation
- For OSGeo4W, use the OSGeo4W Shell or add the bin directory to PATH

### Permission Issues
- Run terminal as Administrator if needed
- Check antivirus software isn't blocking downloads

### curl Issues
- curl is included in Windows 10/11 by default
- If not available, download from: https://curl.se/windows/

## Directory Structure

The backend will create these directories:
- `backend/temp/` - Temporary processing files
- `backend/public/processed/` - Final processed images

## URL Format

HRRR GRIB2 files are downloaded from NOMADS using URLs like:
```
https://nomads.ncep.noaa.gov/cgi-bin/filter_hrrr_sub.pl?dir=%2Fhrrr.20250715%2Fconus&file=hrrr.t00z.wrfsubhf00.grib2&var_REFC=on&lev_entire_atmosphere=on
```

The backend automatically constructs these URLs based on the current date/time to get the latest model run.
