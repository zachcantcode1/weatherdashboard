import React, { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * HRRRLayer - Displays HRRR REFC data from NOMADS GRIB2 files
 * Downloads GRIB2 files and processes them through a backend service
 * Supports multiple forecast hours (f00-f48) with time scrubbing
 */
const HRRRLayer = ({ 
  isVisible = true, 
  opacity = 0.7, 
  forecastHour = 0,
  onModelRunChange = null 
}) => {
  const map = useMap();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modelRun, setModelRun] = useState(null);
  const layerCacheRef = useRef(new Map()); // Cache for forecast layers
  const activeLayerRef = useRef(null); // Currently visible layer

  // Generate HRRR GRIB2 URL for specific forecast hour
  const generateHRRRUrl = (forecastHour = 0) => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    
    // HRRR runs every hour, get the most recent run (subtract 2 hours to ensure data is available)
    const currentHour = now.getUTCHours();
    const modelHour = Math.max(0, currentHour - 2);
    const hourStr = String(modelHour).padStart(2, '0');
    
    const dateStr = `${year}${month}${day}`;
    const forecastStr = String(forecastHour).padStart(2, '0');
    
    // Set model run time for reporting
    const modelRunTime = new Date(year, now.getUTCMonth(), day, modelHour);
    if (!modelRun) {
      setModelRun(modelRunTime.toISOString());
      if (onModelRunChange) {
        onModelRunChange(modelRunTime.toISOString());
      }
    }
    
    // Direct NOMADS HRRR URL for specific forecast hour
    return `https://nomads.ncep.noaa.gov/pub/data/nccf/com/hrrr/prod/hrrr.${dateStr}/conus/hrrr.t${hourStr}z.wrfsubhf${forecastStr}.grib2`;
  };

  // Process GRIB2 file through backend service
  const processGRIB2 = async (gribUrl, forecastHour) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[HRRRLayer] Processing GRIB2 file for f${String(forecastHour).padStart(2, '0')}:`, gribUrl);
      
      // Send request to backend to process GRIB2 file
      const response = await fetch('/api/process-grib2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gribUrl: gribUrl,
          variable: 'REFC',
          colorRamp: 'reflectivity', // Use predefined reflectivity color ramp
          forecastHour: forecastHour // Add forecast hour for caching/identification
        })
      });

      if (!response.ok) {
        throw new Error(`Backend processing failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('[HRRRLayer] GRIB2 processing complete:', result);
      
      return result;
      
    } catch (err) {
      console.error('[HRRRLayer] Error processing GRIB2:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Create image overlay from processed GeoTIFF
  const createImageOverlay = (processedData) => {
    if (!processedData || !processedData.imageUrl || !processedData.bounds) {
      console.error('[HRRRLayer] Invalid processed data:', processedData);
      return null;
    }

    const { imageUrl, bounds } = processedData;
    
    // Create Leaflet image overlay
    const imageOverlay = L.imageOverlay(imageUrl, bounds, {
      opacity: opacity,
      zIndex: 200,
      attribution: '© NOAA HRRR Model'
    });

    return imageOverlay;
  };

  // Load HRRR data for specific forecast hour
  const loadHRRRData = async (targetForecastHour) => {
    try {
      // Check if already cached or being processed
      if (layerCacheRef.current.has(targetForecastHour)) {
        console.log(`[HRRRLayer] Layer f${String(targetForecastHour).padStart(2, '0')} already cached`);
        const cachedLayer = layerCacheRef.current.get(targetForecastHour);
        return;
      }

      // Check if already being processed (prevent duplicate requests)
      const processingKey = `processing_${targetForecastHour}`;
      if (layerCacheRef.current.has(processingKey)) {
        console.log(`[HRRRLayer] Layer f${String(targetForecastHour).padStart(2, '0')} already being processed`);
        return;
      }

      // Mark as being processed
      layerCacheRef.current.set(processingKey, true);

      const gribUrl = generateHRRRUrl(targetForecastHour);
      const processedData = await processGRIB2(gribUrl, targetForecastHour);
      
      if (processedData) {
        // Create new layer
        const newLayer = createImageOverlay(processedData);
        if (newLayer) {
          // Cache the layer
          layerCacheRef.current.set(targetForecastHour, newLayer);
          
          console.log(`[HRRRLayer] Cached layer for forecast hour f${String(targetForecastHour).padStart(2, '0')}`);
        }
      }
      
    } catch (err) {
      console.error('[HRRRLayer] Error loading HRRR data:', err);
      setError(err.message);
    } finally {
      // Remove processing flag
      const processingKey = `processing_${targetForecastHour}`;
      layerCacheRef.current.delete(processingKey);
    }
  };

  // Show specific layer and hide others
  const showLayer = (layer, hour) => {
    if (!map || !layer) return;

    console.log(`[HRRRLayer] Switching to forecast hour f${String(hour).padStart(2, '0')}`);

    // Hide currently active layer
    if (activeLayerRef.current && map.hasLayer(activeLayerRef.current)) {
      map.removeLayer(activeLayerRef.current);
      console.log(`[HRRRLayer] Removed previous layer`);
    }

    // Show new layer
    layer.setOpacity(opacity);
    layer.addTo(map);
    activeLayerRef.current = layer;
    
    console.log(`[HRRRLayer] Added layer for forecast hour f${String(hour).padStart(2, '0')}`);
  };

  // Load initial forecast hour and start preloading
  useEffect(() => {
    if (isVisible) {
      loadHRRRData(forecastHour);
      
      // Preload surrounding forecast hours for smooth scrubbing
      const preloadHours = [
        Math.max(0, forecastHour - 2),
        Math.max(0, forecastHour - 1),
        Math.min(48, forecastHour + 1),
        Math.min(48, forecastHour + 2)
      ].filter(h => h !== forecastHour);
      
      preloadHours.forEach((hour, index) => {
        setTimeout(() => {
          loadHRRRData(hour);
        }, (index + 1) * 1000); // Stagger preloading
      });
    }
    
    // Refresh every 30 minutes (HRRR runs hourly)
    const interval = setInterval(() => {
      if (isVisible) {
        // Clear cache and reload current hour to get latest data
        layerCacheRef.current.clear();
        loadHRRRData(forecastHour);
      }
    }, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isVisible, forecastHour]);

  // Handle visibility and forecast hour changes
  useEffect(() => {
    if (!map) return;

    if (isVisible) {
      // Check if we have the layer for current forecast hour
      if (layerCacheRef.current.has(forecastHour)) {
        // Show cached layer for current forecast hour
        const layer = layerCacheRef.current.get(forecastHour);
        showLayer(layer, forecastHour);
        console.log(`[HRRRLayer] Switched to cached layer f${String(forecastHour).padStart(2, '0')}`);
      } else {
        // Load the layer for current forecast hour if not cached
        console.log(`[HRRRLayer] Loading layer f${String(forecastHour).padStart(2, '0')}`);
        loadHRRRData(forecastHour);
      }
    } else if (!isVisible && activeLayerRef.current) {
      // Hide layer
      if (map.hasLayer(activeLayerRef.current)) {
        map.removeLayer(activeLayerRef.current);
      }
      activeLayerRef.current = null;
    }
  }, [isVisible, forecastHour, map]);

  // Handle opacity changes
  useEffect(() => {
    if (activeLayerRef.current) {
      activeLayerRef.current.setOpacity(opacity);
    }
  }, [opacity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up all cached layers
      layerCacheRef.current.forEach((layer) => {
        if (map && map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
      layerCacheRef.current.clear();
    };
  }, [map]);

  // Display loading/error states (optional - could be handled by parent)
  if (loading) {
    console.log('[HRRRLayer] Loading HRRR data...');
  }
  
  if (error) {
    console.error('[HRRRLayer] Error:', error);
  }

  return null; // This component doesn't render anything directly
};

export default HRRRLayer;
