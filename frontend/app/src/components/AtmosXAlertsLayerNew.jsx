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
    let coordinateMode = false;
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
        coordinateMode = false;
      } else if (line.startsWith('Line:')) {
        // Parse line style
        const lineData = line.substring(5).trim();
        if (currentAlert) {
          currentAlert.lineStyle = lineData;
        }
      } else if (line.startsWith('Text:')) {
        // Parse alert text/description
        const text = line.substring(5).trim();
        if (currentAlert) {
          currentAlert.description = text;
          // Extract alert type from description
          if (text.includes('TORNADO')) {
            currentAlert.alertType = 'Tornado Warning';
            currentAlert.severity = 'Extreme';
          } else if (text.includes('SEVERE THUNDERSTORM')) {
            currentAlert.alertType = 'Severe Thunderstorm Warning';
            currentAlert.severity = 'Severe';
          } else if (text.includes('FLASH FLOOD')) {
            currentAlert.alertType = 'Flash Flood Warning';
            currentAlert.severity = 'Severe';
          } else if (text.includes('WATCH')) {
            currentAlert.alertType = 'Watch';
            currentAlert.severity = 'Moderate';
          } else {
            currentAlert.alertType = 'Weather Alert';
            currentAlert.severity = 'Moderate';
          }
        }
      } else if (line.match(/^-?\d+\.\d+,\s*-?\d+\.\d+$/)) {
        // Parse coordinate pairs (lat, lon)
        const [lat, lon] = line.split(',').map(coord => parseFloat(coord.trim()));
        if (!isNaN(lat) && !isNaN(lon)) {
          coordinates.push([lat, lon]);
        }
      }
    }

    // Add the last alert if it exists
    if (currentAlert && coordinates.length > 0) {
      currentAlert.coordinates = [...coordinates];
      alerts.push(currentAlert);
    }

    return alerts.filter(alert => alert.coordinates && alert.coordinates.length >= 3);
  };

  // Fetch alerts from AtmosphericX API
  const fetchAlerts = async () => {
    if (!map) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('https://api.atmosphericx.com/data/placefile/alerts.php');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      const parsedAlerts = parseAtmosXData(text);
      
      console.log('[AtmosXAlertsLayer] Fetched alerts:', parsedAlerts.length);
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
        const popupContent = `
          <div class="font-sans">
            <h4 class="font-bold text-lg mb-2">${alert.alertType || 'Weather Alert'}</h4>
            <p class="mb-1"><strong>Severity:</strong> ${alert.severity || 'Unknown'}</p>
            ${alert.description ? `<p class="mb-1"><strong>Description:</strong> ${alert.description}</p>` : ''}
            <p class="text-sm text-gray-600 mt-2">Source: AtmosphericX</p>
          </div>
        `;
        
        polygon.bindPopup(popupContent);
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
