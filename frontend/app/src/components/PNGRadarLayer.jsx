import React, { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * PNGRadarLayer component for displaying PNG radar overlays with world files
 * Fetches PNG files and .wld world files from Iowa State University's radar archive
 */
const PNGRadarLayer = ({ isVisible, opacity = 0.75, selectedTime }) => {
  const map = useMap();
  const layerCacheRef = useRef(new Map()); // Cache for radar layers
  const activeLayerRef = useRef(null); // Track currently visible layer

  // Fetch available radar scan files from the archive directory
  useEffect(() => {
    if (!isVisible) return;

    const fetchAvailableScans = async () => {
      try {
        // Fetch the directory listing to get available PNG files
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        
        const archiveUrl = `https://mesonet.agron.iastate.edu/archive/data/${year}/${month}/${day}/GIS/ridge/PAH/N0B/`;
        
        console.log('[PNGRadarLayer] Fetching available scans from:', archiveUrl);
        
        // Fetch the actual directory listing
        const response = await fetch(archiveUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch directory listing: ${response.status}`);
        }
        
        const htmlContent = await response.text();
        
        // Parse the HTML to extract PNG file names
        const pngFiles = [];
        const pngRegex = /PAH_N0B_(\d{12})\.png/g;
        let match;
        
        while ((match = pngRegex.exec(htmlContent)) !== null) {
          const timeCode = match[1];
          pngFiles.push(timeCode);
        }
        
        // Remove duplicates from pngFiles
        const uniquePngFiles = [...new Set(pngFiles)];
        console.log('[PNGRadarLayer] Found', pngFiles.length, 'PNG files,', uniquePngFiles.length, 'unique files');
        
        console.log('[PNGRadarLayer] Found', pngFiles.length, 'PNG files in directory');
        
        // Convert time codes to time objects
        const times = uniquePngFiles.map(timeCode => {
          // Parse YYYYMMDDHHMI format - these are UTC timestamps
          const year = parseInt(timeCode.substring(0, 4));
          const month = parseInt(timeCode.substring(4, 6)) - 1; // Month is 0-indexed
          const day = parseInt(timeCode.substring(6, 8));
          const hour = parseInt(timeCode.substring(8, 10));
          const minute = parseInt(timeCode.substring(10, 12));
          
          // Create UTC time since the timestamps are in UTC
          const scanTime = new Date(Date.UTC(year, month, day, hour, minute));
          const fileName = `PAH_N0B_${timeCode}.png`;
          
          return {
            timestamp: scanTime.toISOString(),
            display: scanTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/Chicago'
            }) + ' CT',
            time: scanTime,
            timeCode,
            fileName,
            pngUrl: `${archiveUrl}${fileName}`,
            wldUrl: `${archiveUrl}PAH_N0B_${timeCode}.wld`
          };
        });
        
        // Debug: log the latest few scans
        console.log('[PNGRadarLayer] Latest 5 scans found:', times.slice(0, 5).map(t => ({
          timeCode: t.timeCode,
          time: t.time.toISOString(),
          display: t.display
        })));
        
        // Sort by time (newest first for filtering)
        times.sort((a, b) => b.time - a.time);
        
        // Filter to only scans before current time and limit to last 10
        const currentTime = new Date(); // Use actual current time
        const validTimes = times.filter(t => t.time <= currentTime);
        const recentTimes = validTimes.slice(0, 10);
        
        // Sort the final times oldest to newest for intuitive slider behavior
        recentTimes.sort((a, b) => a.time - b.time);
        
        console.log('[PNGRadarLayer] Current time:', currentTime.toISOString());
        console.log('[PNGRadarLayer] Found', validTimes.length, 'valid scans, showing last', recentTimes.length);
        console.log('[PNGRadarLayer] Final radar times:', recentTimes.map(t => t.timestamp));
        
        // Set available times via window function
        console.log('[PNGRadarLayer] Calling window.setPngRadarTimes with', recentTimes.length, 'times');
        if (window.setPngRadarTimes) {
          console.log('[PNGRadarLayer] window.setPngRadarTimes function exists, calling it');
          window.setPngRadarTimes(recentTimes);
        } else {
          console.error('[PNGRadarLayer] window.setPngRadarTimes function NOT found!');
        }
        
        // Also store globally for access
        window.pngRadarAvailableTimes = recentTimes;
        console.log('[PNGRadarLayer] Set window.pngRadarAvailableTimes to', recentTimes.length, 'items');
        
        console.log('[PNGRadarLayer] Loaded', recentTimes.length, 'recent radar scans (last 3 hours)');
        
        // Preload all radar layers into cache
        console.log('[PNGRadarLayer] Starting to preload', recentTimes.length, 'radar layers...');
        for (const timeObj of recentTimes) {
          try {
            console.log('[PNGRadarLayer] Preloading layer for time:', timeObj.timestamp);
            
            // Parse world file to get bounds
            const worldFileData = await parseWorldFile(timeObj.wldUrl);
            
            // Calculate bounds from world file
            const imageWidth = 1000;
            const imageHeight = 1000;
            
            const upperLeftX = worldFileData.upperLeftX;
            const upperLeftY = worldFileData.upperLeftY;
            const pixelSizeX = worldFileData.pixelSizeX;
            const pixelSizeY = worldFileData.pixelSizeY;
            
            // Calculate bounds (world file coordinates are for pixel centers)
            const minX = upperLeftX;
            const maxY = upperLeftY;
            const maxX = minX + (imageWidth * pixelSizeX);
            const minY = maxY + (imageHeight * pixelSizeY); // pixelSizeY is negative
            
            const bounds = [[minY, minX], [maxY, maxX]];
            
            console.log('[PNGRadarLayer] Calculated bounds for', timeObj.timestamp, ':', bounds);
            
            // Create image overlay
            const layer = L.imageOverlay(timeObj.pngUrl, bounds, {
              opacity: 0, // Start with 0 opacity
              interactive: false,
              crossOrigin: 'anonymous'
            });
            
            // Add to map and cache
            layer.addTo(map);
            layerCacheRef.current.set(timeObj.timestamp, layer);
            
            console.log('[PNGRadarLayer] Cached layer for time:', timeObj.timestamp);
          } catch (error) {
            console.error('[PNGRadarLayer] Error preloading layer for time', timeObj.timestamp, ':', error);
          }
        }
        
        console.log('[PNGRadarLayer] Finished preloading. Cache now has', layerCacheRef.current.size, 'layers');
      } catch (error) {
        console.error('[PNGRadarLayer] Error fetching available scans:', error);
      }
    };

    fetchAvailableScans();
  }, [isVisible]);

  // Helper function to format time as YYYYMMDDHHMI
  const formatTimeCode = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}`;
  };

  // Parse world file (.wld) to get georeferencing information
  const parseWorldFile = async (wldUrl) => {
    try {
      const response = await fetch(wldUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch world file: ${response.status}`);
      }
      
      const wldContent = await response.text();
      const lines = wldContent.trim().split('\n').map(line => line.trim());
      
      if (lines.length < 6) {
        throw new Error('Invalid world file format');
      }
      
      // World file format:
      // Line 1: pixel size in x-direction (A)
      // Line 2: rotation about y-axis (D) (usually 0)
      // Line 3: rotation about x-axis (B) (usually 0) 
      // Line 4: pixel size in y-direction (E) (negative value)
      // Line 5: x-coordinate of center of upper left pixel (C)
      // Line 6: y-coordinate of center of upper left pixel (F)
      const pixelSizeX = parseFloat(lines[0]);
      const rotationY = parseFloat(lines[1]);
      const rotationX = parseFloat(lines[2]);
      const pixelSizeY = parseFloat(lines[3]);
      const upperLeftX = parseFloat(lines[4]);
      const upperLeftY = parseFloat(lines[5]);
      
      console.log('[PNGRadarLayer] Parsed world file:', {
        pixelSizeX,
        rotationY,
        rotationX,
        pixelSizeY,
        upperLeftX,
        upperLeftY
      });
      
      console.log('[PNGRadarLayer] World file coordinates (upper-left pixel center):', upperLeftY, upperLeftX);
      
      return {
        pixelSizeX,
        rotationY,
        rotationX,
        pixelSizeY,
        upperLeftX,
        upperLeftY
      };
    } catch (error) {
      console.error('[PNGRadarLayer] Error parsing world file:', error);
      throw error;
    }
  };

  // Calculate image bounds from world file and image dimensions
  const calculateImageBounds = (worldFileData, imageWidth = 1000, imageHeight = 1000) => {
    const { pixelSizeX, pixelSizeY, upperLeftX, upperLeftY } = worldFileData;
    
    console.log('[PNGRadarLayer] World file interpretation:');
    console.log('  - pixelSizeX (degrees/pixel):', pixelSizeX);
    console.log('  - pixelSizeY (degrees/pixel):', pixelSizeY);
    console.log('  - upperLeftX (center of upper-left pixel):', upperLeftX);
    console.log('  - upperLeftY (center of upper-left pixel):', upperLeftY);
    
    // Calculate the center of the image
    const imageCenterX = upperLeftX + ((imageWidth - 1) / 2) * pixelSizeX;
    const imageCenterY = upperLeftY + ((imageHeight - 1) / 2) * pixelSizeY;
    
    console.log('[PNGRadarLayer] Image center calculation:');
    console.log('  - Calculated image center:', imageCenterY.toFixed(6), imageCenterX.toFixed(6));
    console.log('  - Actual PAH radar location: 37.068333, -88.771944');
    console.log('  - Difference (degrees):', 
      'Lat:', (imageCenterY - 37.068333).toFixed(6), 
      'Lng:', (imageCenterX - (-88.771944)).toFixed(6));
    
    // Use world file coordinates exactly as the developer intended
    // Based on developer's code: pixel (0,0) = (x0, y0), pixel (width-1, height-1) = (x0 + (width-1)*dx, y0 + (height-1)*dy)
    
    // Upper-left corner: pixel (0, 0) coordinate
    const imageMinX = upperLeftX;  // x0
    const imageMaxY = upperLeftY;  // y0
    
    // Lower-right corner: pixel (width-1, height-1) coordinate  
    const imageMaxX = imageMinX + ((imageWidth - 1) * pixelSizeX);   // x0 + (width-1)*dx
    const imageMinY = imageMaxY + ((imageHeight - 1) * pixelSizeY);  // y0 + (height-1)*dy (pixelSizeY is negative)
    
    console.log('[PNGRadarLayer] Image corner calculation:');
    console.log('  - imageMinX (west):', imageMinX);
    console.log('  - imageMaxX (east):', imageMaxX);
    console.log('  - imageMinY (south):', imageMinY);
    console.log('  - imageMaxY (north):', imageMaxY);
    
    // Leaflet bounds format: [[south, west], [north, east]]
    const bounds = [
      [imageMinY, imageMinX], // Southwest corner
      [imageMaxY, imageMaxX]  // Northeast corner
    ];
    
    console.log('[PNGRadarLayer] Final Leaflet bounds:', bounds);
    console.log('[PNGRadarLayer] Coverage area:', 
      'Lat:', imageMinY.toFixed(3), 'to', imageMaxY.toFixed(3), 
      'Lng:', imageMinX.toFixed(3), 'to', imageMaxX.toFixed(3));
    
    return bounds;
  };

  // Preload all radar layers when component mounts or when available times change
  useEffect(() => {
    if (!map || !isVisible || !window.tmsRadarAvailableTimes) return;

    const preloadRadarLayers = async () => {
      console.log('[PNGRadarLayer] Preloading', window.tmsRadarAvailableTimes.length, 'radar layers');
      
      for (const timeData of window.tmsRadarAvailableTimes) {
        // Skip if already cached
        if (layerCacheRef.current.has(timeData.timestamp)) continue;
        
        try {
          console.log('[PNGRadarLayer] Preloading layer:', timeData.fileName);
          
          // Load world file and calculate bounds
          let bounds;
          try {
            const worldFileData = await parseWorldFile(timeData.wldUrl);
            bounds = calculateImageBounds(worldFileData);
          } catch (error) {
            console.warn('[PNGRadarLayer] Using default bounds for:', timeData.fileName);
            bounds = [[36.0, -91.0], [40.0, -86.0]]; // Default PAH radar bounds
          }
          
          // Create image overlay (invisible initially)
          const imageOverlay = L.imageOverlay(timeData.pngUrl, bounds, {
            opacity: 0, // Start invisible
            crossOrigin: true,
            zIndex: 200
          });
          
          // Add to map but keep invisible
          imageOverlay.addTo(map);
          
          // Cache the layer
          layerCacheRef.current.set(timeData.timestamp, imageOverlay);
          
          console.log('[PNGRadarLayer] Cached layer for:', timeData.fileName);
          
        } catch (error) {
          console.error('[PNGRadarLayer] Error preloading layer:', timeData.fileName, error);
        }
      }
    };

    preloadRadarLayers();
  }, [map, isVisible]);

  // Handle time changes with smooth opacity transitions
  useEffect(() => {
    if (!map || !isVisible || !selectedTime) return;

    // Hide currently active layer
    if (activeLayerRef.current) {
      activeLayerRef.current.setOpacity(0);
    }

    // Debug: log available cache keys vs requested time
    const cacheKeys = Array.from(layerCacheRef.current.keys());
    console.log('[PNGRadarLayer] Looking for time:', selectedTime);
    console.log('[PNGRadarLayer] Available cache keys:', cacheKeys);
    
    // Show selected layer
    const selectedLayer = layerCacheRef.current.get(selectedTime);
    if (selectedLayer) {
      selectedLayer.setOpacity(opacity);
      activeLayerRef.current = selectedLayer;
      console.log('[PNGRadarLayer] Switched to time:', selectedTime);
    } else {
      console.warn('[PNGRadarLayer] Layer not found for time:', selectedTime);
      console.warn('[PNGRadarLayer] Cache has', cacheKeys.length, 'layers cached');
      
      // Try to find a close match for debugging
      const closeMatch = cacheKeys.find(key => Math.abs(new Date(key) - new Date(selectedTime)) < 60000);
      if (closeMatch) {
        console.warn('[PNGRadarLayer] Close match found:', closeMatch);
      }
    }
  }, [map, isVisible, selectedTime, opacity]);

  // Handle visibility changes
  useEffect(() => {
    if (!map) return;

    if (isVisible) {
      // Show the currently selected layer if available
      if (selectedTime && layerCacheRef.current.has(selectedTime)) {
        const selectedLayer = layerCacheRef.current.get(selectedTime);
        selectedLayer.setOpacity(opacity);
        activeLayerRef.current = selectedLayer;
      }
    } else {
      // Hide all layers when not visible
      if (activeLayerRef.current) {
        activeLayerRef.current.setOpacity(0);
        activeLayerRef.current = null;
      }
    }
  }, [map, isVisible, opacity]);

  // Update opacity of active layer when opacity prop changes
  useEffect(() => {
    if (activeLayerRef.current && isVisible) {
      activeLayerRef.current.setOpacity(opacity);
    }
  }, [opacity, isVisible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (map) {
        // Remove all cached layers from map
        layerCacheRef.current.forEach((layer) => {
          map.removeLayer(layer);
        });
        layerCacheRef.current.clear();
      }
    };
  }, [map]);

  return null;
};

export default PNGRadarLayer;
