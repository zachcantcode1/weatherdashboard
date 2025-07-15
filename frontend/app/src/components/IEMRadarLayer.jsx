import React, { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * IEMRadarLayer - Displays NEXRAD radar imagery from Iowa State University
 * Uses caching and opacity-based transitions for smooth time scrubbing
 */
const IEMRadarLayer = ({ isVisible = true, opacity = 0.7, selectedTime = null }) => {
  const map = useMap();
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const layerCacheRef = useRef(new Map()); // Cache for radar layers
  const activeLayersRef = useRef(new Set()); // Track active layers on map
  const preloadQueueRef = useRef(new Set()); // Track layers being preloaded

  // Generate recent radar times (every 5 minutes for the past 3 hours)
  const generateRadarTimes = () => {
    const times = [];
    const now = new Date();
    
    // Round down to the nearest 5-minute mark
    const currentMinutes = now.getUTCMinutes();
    const roundedMinutes = Math.floor(currentMinutes / 5) * 5;
    now.setUTCMinutes(roundedMinutes, 0, 0);
    
    // Generate times for the past 3 hours (36 intervals of 5 minutes)
    for (let i = 0; i < 36; i++) {
      const time = new Date(now.getTime() - (i * 5 * 60 * 1000));
      times.unshift({
        datetime: time,
        timestamp: formatTimeForIEM(time),
        display: formatTimeForDisplay(time)
      });
    }
    
    return times;
  };

  // Format time for IEM WMS-T service (ISO 8601 format)
  const formatTimeForIEM = (date) => {
    return date.toISOString();
  };

  // Format time for display in Chicago timezone
  const formatTimeForDisplay = (date) => {
    return date.toLocaleTimeString('en-US', {
      timeZone: 'America/Chicago',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }) + ' CT';
  };

  // Get the WMS URL for IEM NEXRAD
  const getRadarUrl = () => {
    return 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r-t.cgi';
  };

  // Create a radar layer for a specific time
  const createRadarLayer = (timestamp) => {
    const layer = L.tileLayer.wms(getRadarUrl(), {
      layers: 'nexrad-n0r-wmst',
      format: 'image/png',
      transparent: true,
      opacity: 0, // Start invisible
      time: timestamp,
      version: '1.1.1',
      crs: L.CRS.EPSG4326,
      attribution: '© Iowa Environmental Mesonet',
      zIndex: 200
    });

    // Add load event listener for preloading
    layer.on('load', () => {
      console.log('[IEMRadarLayer] Layer loaded for time:', timestamp);
    });

    return layer;
  };

  // Preload radar layers with smart prioritization
  const preloadRadarLayers = async () => {
    if (!map || !availableTimes.length) return;

    console.log('[IEMRadarLayer] Starting intelligent preload of', availableTimes.length, 'radar layers');
    setLoading(true);

    // Prioritize loading: current time first, then recent times, then all others
    const currentIndex = selectedTime 
      ? availableTimes.findIndex(t => t.timestamp === selectedTime)
      : availableTimes.length - 1;

    const priorityQueue = [];
    
    // Add current time first
    if (currentIndex >= 0) {
      priorityQueue.push(availableTimes[currentIndex]);
    }
    
    // Add surrounding times (±5 frames) for immediate scrubbing responsiveness
    const surroundingRange = 5;
    for (let i = 1; i <= surroundingRange; i++) {
      if (currentIndex - i >= 0) {
        priorityQueue.push(availableTimes[currentIndex - i]);
      }
      if (currentIndex + i < availableTimes.length) {
        priorityQueue.push(availableTimes[currentIndex + i]);
      }
    }
    
    // Add all remaining times
    availableTimes.forEach(timeObj => {
      if (!priorityQueue.includes(timeObj)) {
        priorityQueue.push(timeObj);
      }
    });

    // Load layers in priority order
    for (let i = 0; i < priorityQueue.length; i++) {
      const timeObj = priorityQueue[i];
      
      if (!layerCacheRef.current.has(timeObj.timestamp) && !preloadQueueRef.current.has(timeObj.timestamp)) {
        preloadQueueRef.current.add(timeObj.timestamp);
        
        const layer = createRadarLayer(timeObj.timestamp);
        layerCacheRef.current.set(timeObj.timestamp, layer);
        
        // Add to map but keep invisible
        layer.addTo(map);
        
        // Shorter delay for priority layers, longer for background loading
        const delay = i < 11 ? 50 : 200; // Fast load first 11 (current + surrounding)
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Show progress for priority layers
        if (i < 11) {
          console.log(`[IEMRadarLayer] Loaded priority layer ${i + 1}/11`);
        }
      }
    }

    setLoading(false);
    console.log('[IEMRadarLayer] Preload complete. Cached', layerCacheRef.current.size, 'layers');
  };

  // Initialize available times and start preloading
  useEffect(() => {
    console.log('[IEMRadarLayer] Generating radar times...');
    const times = generateRadarTimes();
    setAvailableTimes(times);
    console.log('[IEMRadarLayer] Generated', times.length, 'radar times');
    
    // Start preloading after a short delay
    setTimeout(() => {
      preloadRadarLayers();
    }, 1000);
  }, [map]);

  // Memory management - limit cache size and clean up old layers
  const manageCacheSize = () => {
    const maxCacheSize = 50; // Limit to prevent memory issues
    if (layerCacheRef.current.size > maxCacheSize) {
      console.log('[IEMRadarLayer] Cache size exceeded, cleaning up oldest layers');
      
      // Convert to array and sort by timestamp
      const entries = Array.from(layerCacheRef.current.entries())
        .sort((a, b) => new Date(a[0]) - new Date(b[0]));
      
      // Remove oldest layers
      const toRemove = entries.slice(0, entries.length - maxCacheSize);
      toRemove.forEach(([timestamp, layer]) => {
        if (map && map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
        layerCacheRef.current.delete(timestamp);
        activeLayersRef.current.delete(timestamp);
      });
      
      console.log('[IEMRadarLayer] Cleaned up', toRemove.length, 'old layers');
    }
  };

  // Enhanced layer transition with on-demand loading fallback
  const transitionToLayer = (targetTime) => {
    if (!map || !targetTime) return;

    let targetLayer = layerCacheRef.current.get(targetTime);
    
    // If layer not cached, create it immediately (fallback)
    if (!targetLayer) {
      console.log('[IEMRadarLayer] Creating on-demand layer for:', targetTime);
      targetLayer = createRadarLayer(targetTime);
      layerCacheRef.current.set(targetTime, targetLayer);
      targetLayer.addTo(map);
      
      // Manage cache size
      manageCacheSize();
    }

    // Hide currently visible layers instantly
    activeLayersRef.current.forEach(timestamp => {
      const layer = layerCacheRef.current.get(timestamp);
      if (layer) {
        layer.setOpacity(0);
      }
    });

    // Show target layer immediately
    targetLayer.setOpacity(opacity);
    
    // Update active layers tracking
    activeLayersRef.current.clear();
    activeLayersRef.current.add(targetTime);
  };

  // Handle layer visibility and opacity changes with smooth transitions
  useEffect(() => {
    if (!map || !availableTimes.length) return;

    if (isVisible && selectedTime) {
      // Use advanced transition for smooth scrubbing
      transitionToLayer(selectedTime);
    } else {
      // Hide all layers when radar is disabled
      layerCacheRef.current.forEach((layer) => {
        layer.setOpacity(0);
      });
      activeLayersRef.current.clear();
    }
  }, [map, isVisible, selectedTime, availableTimes]);

  // Handle global opacity changes
  useEffect(() => {
    if (!map || !isVisible) return;
    
    // Update opacity for currently active layers
    activeLayersRef.current.forEach(timestamp => {
      const layer = layerCacheRef.current.get(timestamp);
      if (layer) {
        layer.setOpacity(opacity);
      }
    });
  }, [opacity, map, isVisible]);

  // Cleanup layers when component unmounts
  useEffect(() => {
    return () => {
      console.log('[IEMRadarLayer] Cleaning up cached layers');
      layerCacheRef.current.forEach((layer) => {
        if (map && map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
      layerCacheRef.current.clear();
      activeLayersRef.current.clear();
      preloadQueueRef.current.clear();
    };
  }, [map]);

  // Expose available times and loading state for parent components
  useEffect(() => {
    if (availableTimes.length && window.setRadarTimes) {
      window.setRadarTimes(availableTimes);
    }
  }, [availableTimes]);

  useEffect(() => {
    if (window.setRadarLoading) {
      window.setRadarLoading(loading);
    }
  }, [loading]);

  return null;
};

export default IEMRadarLayer;
