# HRRR GRIB2 processor for radar, SIG TOR, and CAPE
# Requires: pip install metpy xarray cfgrib matplotlib numpy
import os
import requests
import xarray as xr
import numpy as np
import matplotlib.pyplot as plt
from metpy.plots import colortables
from datetime import datetime

HRRR_URL_TEMPLATE = "https://noaa-hrrr-bdp-pds.s3.amazonaws.com/hrrr.{date}/conus/hrrr.t{hour}z.wrfprsf00.grib2"
CACHE_DIR = os.path.join(os.path.dirname(__file__), 'hrrr_cache')
IMG_DIR = os.path.join(os.path.dirname(__file__), 'hrrr_images')

os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(IMG_DIR, exist_ok=True)

# Download HRRR GRIB2 file for a given date/hour
def download_hrrr_grib2(date_str, hour_str, field_name=None):
    # Use NOMADS filter for CAPE
    url = HRRR_URL_TEMPLATE.format(date=date_str, hour=hour_str)
    out_path = os.path.join(CACHE_DIR, f"hrrr_{date_str}_{hour_str}.grib2")
    if not os.path.exists(out_path):
        print(f"Downloading {url}")
        r = requests.get(url, stream=True)
        if r.status_code == 200:
            with open(out_path, 'wb') as f:
                for chunk in r.iter_content(1024 * 1024):
                    f.write(chunk)
        else:
            print(f"Failed to download: {url}")
            return None
    return out_path

# Extract and render a field as PNG
# field_name: 'Simulated radar reflectivity', 'Significant Tornado Parameter', 'Convective Available Potential Energy'
def render_field(grib_path, field_name, time_idx, out_name):
    ds = xr.open_dataset(grib_path, engine='cfgrib')
    # Find variable by name
    var = None
    for v in ds.data_vars:
        if field_name.lower() in v.lower():
            var = v
            break
    if not var:
        print(f"Field {field_name} not found in {grib_path}")
        return
    arr = ds[var].isel(time=time_idx).values
    plt.figure(figsize=(10, 6))
    cmap = colortables.get_colortable('NWSReflectivity') if 'reflectivity' in field_name.lower() else 'viridis'
    plt.imshow(arr, cmap=cmap, origin='lower')
    plt.axis('off')
    plt.savefig(os.path.join(IMG_DIR, out_name), bbox_inches='tight', pad_inches=0)
    plt.close()
    print(f"Saved {out_name}")

import sys
if __name__ == "__main__":
    # Usage: python hrrrProcessor.py <date_str> <hour_str> <field_name> <out_name>
    if len(sys.argv) == 5:
        date_str = sys.argv[1]
        hour_str = sys.argv[2]
        field_name = sys.argv[3]
        out_name = sys.argv[4]
        grib_path = download_hrrr_grib2(date_str, hour_str, field_name)
        if grib_path:
            render_field(grib_path, field_name, 0, out_name)
    else:
        # Fallback: run all overlays for latest HRRR
        now = datetime.utcnow()
        date_str = now.strftime('%Y%m%d')
        hour_str = now.strftime('%H')
        grib_path = download_hrrr_grib2(date_str, hour_str)
        if grib_path:
            render_field(grib_path, 'Simulated radar reflectivity', 0, f"radar_{date_str}_{hour_str}_f00.png")
            render_field(grib_path, 'Significant Tornado Parameter', 0, f"sigtor_{date_str}_{hour_str}_f00.png")
            render_field(grib_path, 'Convective Available Potential Energy', 0, f"cape_{date_str}_{hour_str}_f00.png")
