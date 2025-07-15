import React, { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * AtmosXAlertsLayer - Displays severe weather alerts using AtmosphericX API
 * Provides real-time alerts with structured meteorological data
 */
const AtmosXAlertsLayer = ({ isVisible = true }) => {
  const map = useMap();
  const [alertsData, setAlertsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const layersRef = useRef([]);

  // Parse AtmosphericX placefile format
  const parseAtmosXData = (text) => {
    const alerts = [];
    const lines = text.split('\n');
    let currentAlert = null;
    let coordinates = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('Color:')) {
        // Start of new alert
        if (currentAlert && coordinates.length > 0) {
          currentAlert.coordinates = [...coordinates];
          alerts.push(currentAlert);
        }
        
        // Parse color (format: "Color: R G B A")
        const colorParts = line.split(' ').slice(1).map(Number);
        currentAlert = {
          color: {
            r: colorParts[0] || 255,
            g: colorParts[1] || 255, 
            b: colorParts[2] || 255,
            a: colorParts[3] || 255
          },
          coordinates: [],
          properties: {}
        };
        coordinates = [];
        
      } else if (line.startsWith('Line:')) {
        // Parse line style and embedded alert info
        const lineData = line.substring(5).trim();
        if (currentAlert) {
          currentAlert.lineStyle = lineData;
          
          // Extract event type and details from the line data
          if (lineData.includes('Event:')) {
            const eventMatch = lineData.match(/Event:\s*([^\\]+)/);
            if (eventMatch) {
              const eventType = eventMatch[1].trim();
              currentAlert.alertType = eventType;
              currentAlert.description = lineData; // Store full line for details
              
              // Determine severity based on event type
              if (eventType.toLowerCase().includes('tornado')) {
                currentAlert.severity = 'Extreme';
              } else if (eventType.toLowerCase().includes('severe thunderstorm')) {
                currentAlert.severity = 'Severe';
              } else if (eventType.toLowerCase().includes('flash flood')) {
                currentAlert.severity = 'Severe';
              } else if (eventType.toLowerCase().includes('watch')) {
                currentAlert.severity = 'Moderate';
              } else {
                currentAlert.severity = 'Moderate';
              }
            }
          }
        }
      } else if (line.startsWith('Text:')) {
        // Parse alert text/description (alternative format)
        const text = line.substring(5).trim();
        if (currentAlert) {
          currentAlert.description = text;
        }
      } else if (line.match(/^-?\d+\.\d+\s*,\s*-?\d+\.\d+\s*$/)) {
        // Parse coordinate pairs (lat, lon) - allow for optional spaces
        const [lat, lon] = line.split(',').map(coord => parseFloat(coord.trim()));
        if (!isNaN(lat) && !isNaN(lon)) {
          coordinates.push([lat, lon]);
        }
      } else if (line === 'End:') {
        // End of current alert
        if (currentAlert && coordinates.length > 0) {
          currentAlert.coordinates = [...coordinates];
          alerts.push(currentAlert);
        }
        currentAlert = null;
        coordinates = [];
      }
    }

    // Add the last alert if it exists and no End: was found
    if (currentAlert && coordinates.length > 0) {
      currentAlert.coordinates = [...coordinates];
      alerts.push(currentAlert);
    }

    const filteredAlerts = alerts.filter(alert => alert.coordinates && alert.coordinates.length >= 3);
    console.log('[AtmosXAlertsLayer] Successfully parsed', filteredAlerts.length, 'alerts');
    
    return filteredAlerts;
  };

  // Fetch alerts from AtmosphericX API
  const fetchAlerts = async () => {
    if (!map) {
      console.log('[AtmosXAlertsLayer] No map available, skipping fetch');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('[AtmosXAlertsLayer] Fetching alerts from AtmosphericX...');
      const response = await fetch('https://atmosx.calrp.com/placefiles/alerts');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      const parsedAlerts = parseAtmosXData(text);
      
      console.log('[AtmosXAlertsLayer] Fetched', parsedAlerts.length, 'alerts');
      setAlertsData(parsedAlerts);
      
    } catch (error) {
      console.error('[AtmosXAlertsLayer] Error fetching alerts:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch alerts on mount and set up refresh interval
  useEffect(() => {
    fetchAlerts();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [map]);

  // Update layer visibility when isVisible changes
  useEffect(() => {
    layersRef.current.forEach(layer => {
      if (map.hasLayer(layer)) {
        if (isVisible) {
          layer.setStyle({ opacity: 0.8, fillOpacity: 0.3 });
        } else {
          layer.setStyle({ opacity: 0, fillOpacity: 0 });
        }
      }
    });
  }, [isVisible, map]);

  // Create clean popup content with only essential information
  const createCleanPopupContent = (alert) => {
    const description = alert.description || '';
    
    // Split on literal \n characters and create a key-value map
    const lines = description.split('\\n');
    const fieldMap = {};
    
    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        if (key && value) {
          fieldMap[key.trim()] = value;
        }
      }
    });

    // Extract the fields we want
    const locations = fieldMap['Locations'];
    const issued = fieldMap['Issued'];
    const expires = fieldMap['Expires'];
    const windGusts = fieldMap['Wind Gusts'];
    const hailSize = fieldMap['Hail Size'];
    const damageThreat = fieldMap['Damage Threat'];
    const tornado = fieldMap['Tornado'];

    let content = `
      <div class="font-sans">
        <h4 class="font-bold text-lg mb-3">${alert.alertType || 'Weather Alert'}</h4>
    `;

    if (locations) {
      content += `<p class="mb-2"><strong>Locations:</strong> ${locations}</p>`;
    }
    
    if (issued) {
      content += `<p class="mb-2"><strong>Issued:</strong> ${issued}</p>`;
    }
    
    if (expires) {
      content += `<p class="mb-2"><strong>Expires:</strong> ${expires}</p>`;
    }
    
    if (windGusts && windGusts !== 'N/A') {
      content += `<p class="mb-2"><strong>Wind Gusts:</strong> ${windGusts}</p>`;
    }
    
    if (hailSize && hailSize !== 'N/A') {
      content += `<p class="mb-2"><strong>Hail Size:</strong> ${hailSize}</p>`;
    }
    
    if (damageThreat && damageThreat !== 'N/A') {
      content += `<p class="mb-2"><strong>Damage Threat:</strong> ${damageThreat}</p>`;
    }
    
    if (tornado && tornado !== 'N/A') {
      content += `<p class="mb-2"><strong>Tornado:</strong> ${tornado}</p>`;
    }

    content += `
        <p class="text-sm text-gray-600 mt-3">Source: AtmosphericX</p>
      </div>
    `;

    return content;
  };

  // Render alert polygons on the map
  useEffect(() => {
    if (!map || !alertsData.length) return;

    // Clear existing layers
    layersRef.current.forEach(layer => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });
    layersRef.current = [];

    // Add new alert polygons
    alertsData.forEach((alert, index) => {
      if (alert.coordinates && alert.coordinates.length >= 3) {
        // Convert color values to hex
        const color = `rgb(${alert.color.r}, ${alert.color.g}, ${alert.color.b})`;
        
        // Determine color based on alert type if color is not distinctive
        let alertColor = color;
        if (alert.alertType === 'Tornado Warning') {
          alertColor = '#FF0000'; // Red
        } else if (alert.alertType === 'Severe Thunderstorm Warning') {
          alertColor = '#FFA500'; // Orange
        } else if (alert.alertType === 'Flash Flood Warning') {
          alertColor = '#00FF00'; // Green
        }

        const polygon = L.polygon(alert.coordinates, {
          color: alertColor,
          weight: 2,
          opacity: isVisible ? 0.8 : 0,
          fillColor: alertColor,
          fillOpacity: isVisible ? 0.3 : 0,
          zIndex: 300
        });

        // Add popup with alert information
        const popupContent = createCleanPopupContent(alert);
        
        polygon.bindPopup(popupContent);
        
        // Add click handler to zoom to alert bounds
        polygon.on('click', () => {
          try {
            const bounds = polygon.getBounds();
            if (bounds && bounds.isValid()) {
              // Zoom to the alert polygon with some padding
              map.fitBounds(bounds, {
                padding: [20, 20], // Add 20px padding around the bounds
                maxZoom: 10 // Don't zoom in too close for large polygons
              });
            }
          } catch (error) {
            console.warn('[AtmosXAlertsLayer] Error zooming to alert bounds:', error);
          }
        });
        
        polygon.addTo(map);
        layersRef.current.push(polygon);
      }
    });

    console.log('[AtmosXAlertsLayer] Added', layersRef.current.length, 'alert polygons to map');

    // Cleanup function
    return () => {
      layersRef.current.forEach(layer => {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
      layersRef.current = [];
    };
  }, [map, alertsData, isVisible]);

  return null;
};

export default AtmosXAlertsLayer;
