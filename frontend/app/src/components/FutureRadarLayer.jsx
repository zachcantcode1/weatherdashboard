import React, { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const FutureRadarLayer = ({ opacity = 0.7, isVisible = true, forecastMinute = 0, onModelRunChange }) => {
  const [modelRun, setModelRun] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const map = useMap();
  const layerCacheRef = useRef(new Map()); // Cache for forecast layers
  const activeLayersRef = useRef(new Set()); // Track active layers on map

  // Generate forecast times (every 15 minutes for 18 hours = 72 intervals)
  const generateForecastTimes = () => {
    const times = [];
    // HRRR typically provides forecasts every 15 minutes out to 18 hours
    for (let i = 0; i <= 72; i++) {
      const minutes = i * 15;
      times.push(minutes);
    }
    return times;
  };

  const [availableForecastTimes] = useState(generateForecastTimes());

  // Format model run time for IEM URL (YYYYMMDDHHMI format)
  const formatModelRunForURL = (date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    const minute = String(date.getUTCMinutes()).padStart(2, '0');
    const formatted = `${year}${month}${day}${hour}${minute}`;
    console.log(`[FutureRadarLayer] Formatted model run: ${date.toISOString()} -> ${formatted}`);
    return formatted;
  };

  // Create a forecast layer for a specific time
  const createForecastLayer = (forecastMinutes) => {
    // Format forecast minute to 4 digits with F prefix (e.g., "F0060" for 60 minutes)
    const forecastStr = `F${String(forecastMinutes).padStart(4, '0')}`;
    
    // Create TMS URL for HRRR forecast
    let tileUrl;
    if (modelRun) {
      // Use specific model run if available (format: YYYYMMDDHHMI)
      const modelRunDate = new Date(modelRun);
      const modelRunStr = formatModelRunForURL(modelRunDate);
      tileUrl = `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/hrrr::REFD-${forecastStr}-${modelRunStr}/{z}/{x}/{y}.png`;
      console.log(`[FutureRadarLayer] Using specific model run ${modelRunStr} for ${forecastStr}`);
    } else {
      // Fallback to latest data if no specific model run available
      tileUrl = `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/hrrr::REFD-${forecastStr}-0/{z}/{x}/{y}.png`;
      console.log(`[FutureRadarLayer] Using latest data for ${forecastStr}`);
    }

    const layer = L.tileLayer(tileUrl, {
      attribution: '© Iowa Environmental Mesonet',
      opacity: 0, // Start invisible
      zIndex: 200,
      maxZoom: 18,
      transparent: true,
      format: 'image/png'
    });

    console.log(`[FutureRadarLayer] Created layer with URL template: ${tileUrl}`);

    // Add load event listener
    layer.on('load', () => {
      console.log('[FutureRadarLayer] Layer loaded for forecast minute:', forecastMinutes);
    });

    layer.on('tileerror', () => {
      console.warn('[FutureRadarLayer] Failed to load tiles for forecast minute:', forecastMinutes);
    });

    return layer;
  };

  // Preload forecast layers with smart prioritization
  const preloadForecastLayers = async () => {
    if (!map || !availableForecastTimes.length) return;

    console.log('[FutureRadarLayer] Starting preload of', availableForecastTimes.length, 'forecast layers');
    setLoading(true);

    // Prioritize loading: current forecast time first, then surrounding times
    const currentIndex = availableForecastTimes.findIndex(t => t === forecastMinute);
    const priorityQueue = [];
    
    // Add current time first
    if (currentIndex >= 0) {
      priorityQueue.push(availableForecastTimes[currentIndex]);
    }
    
    // Add surrounding times (±5 frames) for immediate scrubbing responsiveness
    const surroundingRange = 5;
    for (let i = 1; i <= surroundingRange; i++) {
      if (currentIndex - i >= 0) {
        priorityQueue.push(availableForecastTimes[currentIndex - i]);
      }
      if (currentIndex + i < availableForecastTimes.length) {
        priorityQueue.push(availableForecastTimes[currentIndex + i]);
      }
    }
    
    // Add all remaining times
    availableForecastTimes.forEach(minutes => {
      if (!priorityQueue.includes(minutes)) {
        priorityQueue.push(minutes);
      }
    });

    // Load layers in priority order
    for (let i = 0; i < priorityQueue.length; i++) {
      const minutes = priorityQueue[i];
      
      if (!layerCacheRef.current.has(minutes)) {
        const layer = createForecastLayer(minutes);
        layerCacheRef.current.set(minutes, layer);
        
        // Add to map but keep invisible
        layer.addTo(map);
        
        // Shorter delay for priority layers, longer for background loading
        const delay = i < 11 ? 50 : 200; // Fast load first 11 (current + surrounding)
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Show progress for priority layers
        if (i < 11) {
          console.log(`[FutureRadarLayer] Loaded priority layer ${i + 1}/11`);
        }
      }
    }

    setLoading(false);
    console.log('[FutureRadarLayer] Preload complete. Cached', layerCacheRef.current.size, 'layers');
  };

  // Fetch the latest model run time from IEM
  useEffect(() => {
    const fetchModelRun = async () => {
      setLoading(true);
      try {
        const response = await fetch('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_0000.json');
        const data = await response.json();
        
        // Check if this is a new model run
        const newModelRun = data.model_init_utc;
        const isNewModelRun = modelRun && modelRun !== newModelRun;
        
        console.log(`[FutureRadarLayer] Fetched model run: ${newModelRun}`);
        if (isNewModelRun) {
          console.log('[FutureRadarLayer] New model run detected, clearing cache');
          layerCacheRef.current.clear();
        }
        
        setModelRun(newModelRun);
        setError(null);
        // Notify parent component of model run change
        if (onModelRunChange) {
          onModelRunChange(newModelRun, false, null);
        }
      } catch (err) {
        console.error('Error fetching HRRR model run time:', err);
        setError('Failed to load forecast data');
        if (onModelRunChange) {
          onModelRunChange(null, false, 'Failed to load forecast data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchModelRun();
    
    // Start preloading after model run is fetched
    setTimeout(() => {
      preloadForecastLayers();
    }, 1000);
    
    // Refresh model run every 30 minutes
    const interval = setInterval(fetchModelRun, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [onModelRunChange]);

  // Memory management - limit cache size
  const manageCacheSize = () => {
    const maxCacheSize = 50; // Limit to prevent memory issues
    if (layerCacheRef.current.size > maxCacheSize) {
      console.log('[FutureRadarLayer] Cache size exceeded, cleaning up oldest layers');
      
      // Convert to array and sort by forecast minute
      const entries = Array.from(layerCacheRef.current.entries())
        .sort((a, b) => a[0] - b[0]);
      
      // Remove oldest layers
      const toRemove = entries.slice(0, entries.length - maxCacheSize);
      toRemove.forEach(([minutes, layer]) => {
        if (map && map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
        layerCacheRef.current.delete(minutes);
        activeLayersRef.current.delete(minutes);
      });
      
      console.log('[FutureRadarLayer] Cleaned up', toRemove.length, 'old layers');
    }
  };

  // Enhanced layer transition with on-demand loading fallback
  const transitionToLayer = (targetMinutes) => {
    if (!map || typeof targetMinutes !== 'number') return;

    let targetLayer = layerCacheRef.current.get(targetMinutes);
    
    // If layer not cached, create it immediately (fallback)
    if (!targetLayer) {
      console.log('[FutureRadarLayer] Creating on-demand layer for:', targetMinutes);
      targetLayer = createForecastLayer(targetMinutes);
      layerCacheRef.current.set(targetMinutes, targetLayer);
      targetLayer.addTo(map);
      
      // Manage cache size
      manageCacheSize();
    }

    // Hide currently visible layers instantly
    activeLayersRef.current.forEach(minutes => {
      const layer = layerCacheRef.current.get(minutes);
      if (layer) {
        layer.setOpacity(0);
      }
    });

    // Show target layer immediately
    targetLayer.setOpacity(opacity);
    
    // Update active layers tracking
    activeLayersRef.current.clear();
    activeLayersRef.current.add(targetMinutes);
  };

  // Handle layer visibility and opacity changes with smooth transitions
  useEffect(() => {
    if (!map) return;

    if (isVisible && typeof forecastMinute === 'number') {
      // Use transition for smooth scrubbing
      transitionToLayer(forecastMinute);
    } else {
      // Hide all layers when forecast radar is disabled
      layerCacheRef.current.forEach((layer) => {
        layer.setOpacity(0);
      });
      activeLayersRef.current.clear();
    }
  }, [map, isVisible, forecastMinute]);

  // Handle global opacity changes
  useEffect(() => {
    if (!map || !isVisible) return;
    
    // Update opacity for currently active layers
    activeLayersRef.current.forEach(minutes => {
      const layer = layerCacheRef.current.get(minutes);
      if (layer) {
        layer.setOpacity(opacity);
      }
    });
  }, [opacity, map, isVisible]);

  // Cleanup layers when component unmounts
  useEffect(() => {
    return () => {
      console.log('[FutureRadarLayer] Cleaning up cached layers');
      layerCacheRef.current.forEach((layer) => {
        if (map && map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
      layerCacheRef.current.clear();
      activeLayersRef.current.clear();
    };
  }, [map]);

  // Don't render anything - this is just a data layer
  return null;
};

export default FutureRadarLayer;
