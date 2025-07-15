import React, { useState, useEffect, useRef } from 'react';
import { createLayerComponent } from '@react-leaflet/core';
import L from 'leaflet';

/**
 * AtmosXAlertsLayer - Displays severe weather alerts using AtmosphericX API
 * Provides rich meteorological data including wind/hail/tornado information
 */
const AtmosXAlertsLayer = createLayerComponent((props, ctx) => {
  const { map } = ctx;
  const { isVisible = true } = props;
  const [alertsData, setAlertsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const layersRef = useRef([]);

  useEffect(() => {
    if (!isVisible || !map) return;

    const fetchAtmosXAlerts = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('Fetching AtmosX alerts from: https://atmosx.calrp.com/placefiles/alerts');

        const response = await fetch('https://atmosx.calrp.com/placefiles/alerts');
        if (!response.ok) {
          throw new Error(`AtmosX API error: ${response.status} ${response.statusText}`);
        }

        const text = await response.text();
        console.log('AtmosX API Response (first 500 chars):', text.substring(0, 500));

        // Parse the placefile format
        const alerts = parseAtmosXPlacefile(text);
        setAlertsData(alerts);

      } catch (err) {
        console.error('Error fetching AtmosX alerts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAtmosXAlerts();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchAtmosXAlerts, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isVisible, map]);

  // Parse AtmosX placefile format
  const parseAtmosXPlacefile = (text) => {
    const alerts = [];
    const lines = text.split('\n');
    let currentAlert = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Parse Object lines (alert definitions)
      if (trimmed.startsWith('Object:')) {
        const parts = trimmed.split(',').map(p => p.trim());
        if (parts.length >= 3) {
          const lat = parseFloat(parts[1]);
          const lon = parseFloat(parts[2]);
          if (!isNaN(lat) && !isNaN(lon)) {
            if (currentAlert) {
              alerts.push(currentAlert);
            }
            currentAlert = {
              coordinates: [[lon, lat]], // Start new polygon
              properties: {}
            };
          }
        }
      }
      
      // Parse coordinate lines (lat,lon)
      else if (trimmed.match(/^-?\d+\.\d+,\s*-?\d+\.\d+$/)) {
        if (currentAlert) {
          const [lat, lon] = trimmed.split(',').map(p => parseFloat(p.trim()));
          if (!isNaN(lat) && !isNaN(lon)) {
            currentAlert.coordinates[0].push([lon, lat]);
          }
        }
      }
      
      // Parse metadata lines
      else if (trimmed.includes(':') && currentAlert) {
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim();
        
        if (key && value) {
          const cleanKey = key.toLowerCase().replace(/\s+/g, '_');
          currentAlert.properties[cleanKey] = value;
        }
      }
    }
    
    // Add the last alert
    if (currentAlert) {
      alerts.push(currentAlert);
    }
    
    return alerts;
  };

  const getAlertStyle = (alert) => {
    const props = alert.properties;
    
    // Use color from the placefile if available, otherwise default based on event type
    let color = props.color || '#FF6B35';
    let fillOpacity = 0.3;
    let weight = 2;
    
    // Parse event type for better styling
    const eventType = (props.event || '').toLowerCase();
    
    if (eventType.includes('tornado')) {
      color = '#DC2626'; // Red for tornado
      fillOpacity = 0.4;
      weight = 3;
    } else if (eventType.includes('severe')) {
      color = '#F59E0B'; // Orange for severe thunderstorm
    } else if (eventType.includes('flash flood')) {
      color = '#059669'; // Green for flash flood
    } else if (eventType.includes('winter') || eventType.includes('snow')) {
      color = '#3B82F6'; // Blue for winter weather
    }
    
    return {
      color: color,
      weight: weight,
      opacity: 0.8,
      fillColor: color,
      fillOpacity: fillOpacity
    };
  };

  const createPopupContent = (props) => {
    const eventType = props.event || 'Weather Alert';
    const windGusts = props.wind_gusts || props.wind || '';
    const hailSize = props.hail_size || props.hail || '';
    const damageThread = props.damage_threat || '';
    const tornado = props.tornado || '';
    const tags = props.tags || '';
    const radarIndicated = props.radar_indicated || '';
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 400px; line-height: 1.4;">
        <div style="margin-bottom: 8px;">
          <h3 style="margin: 0 0 4px 0; color: #333; font-size: 16px; font-weight: bold;">
            ${eventType}
          </h3>
          ${props.sender ? `<p style="margin: 0; font-size: 13px; color: #666;">${props.sender}</p>` : ''}
        </div>
        
        ${(windGusts || hailSize || damageThread || tornado) ? `
          <div style="margin: 8px 0; padding: 8px; border-radius: 4px; background: #e8f4fd; border: 1px solid #007acc;">
            <div style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">⚠️ Meteorological Details</div>
            ${windGusts ? `<div style="margin: 2px 0;"><strong>🌪️ Wind Gusts:</strong> ${windGusts}</div>` : ''}
            ${hailSize ? `<div style="margin: 2px 0;"><strong>🧊 Hail Size:</strong> ${hailSize}</div>` : ''}
            ${damageThread ? `<div style="margin: 2px 0;"><strong>💥 Damage Threat:</strong> ${damageThread}</div>` : ''}
            ${tornado ? `<div style="margin: 2px 0;"><strong>🌪️ Tornado:</strong> ${tornado}</div>` : ''}
          </div>
        ` : ''}

        <div style="margin: 8px 0;">
          ${props.issued ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
              <div>
                <strong>Issued:</strong><br/>
                ${new Date(props.issued).toLocaleString()}
              </div>
              ${props.expires ? `
                <div>
                  <strong>Expires:</strong><br/>
                  ${new Date(props.expires).toLocaleString()}
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          ${radarIndicated ? `
            <div style="margin: 8px 0; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <strong>Source:</strong> ${radarIndicated}
            </div>
          ` : ''}
          
          ${tags ? `
            <div style="margin: 8px 0; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <strong>Tags:</strong><br/>
              <span style="color: #1d4ed8; font-weight: 500;">${tags}</span>
            </div>
          ` : ''}
          
          ${props.urgency ? `
            <div style="margin: 8px 0; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <strong>Urgency:</strong> ${props.urgency}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  };

  // Add alert polygons to map
  useEffect(() => {
    if (!map || !alertsData || !Array.isArray(alertsData)) return;

    // Clear existing layers
    layersRef.current.forEach(layer => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });
    layersRef.current = [];

    // Add new layers
    alertsData.forEach(alert => {
      if (alert.coordinates && alert.coordinates.length > 0 && alert.coordinates[0].length >= 3) {
        try {
          // Convert coordinates to Leaflet format [lat, lng]
          const leafletCoords = alert.coordinates[0].map(coord => [coord[1], coord[0]]);
          
          const style = getAlertStyle(alert);
          
          const layer = L.polygon(leafletCoords, style);
          
          if (layer) {
            const popupContent = createPopupContent(alert.properties);
            layer.bindPopup(popupContent, {
              maxWidth: 450,
              maxHeight: 400
            });
            
            // Add hover effects
            layer.on({
              mouseover: (e) => {
                e.target.setStyle({
                  weight: style.weight + 2,
                  opacity: 1.0,
                  fillOpacity: style.fillOpacity + 0.2
                });
              },
              mouseout: (e) => {
                e.target.setStyle(style);
              }
            });
            
            layer.addTo(map);
            layersRef.current.push(layer);
          }
        } catch (error) {
          console.error('[AtmosXAlertsLayer] Error creating polygon for alert:', error);
        }
      }
    });
  }, [map, alertsData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (layersRef.current) {
        layersRef.current.forEach(layer => {
          if (map && map.hasLayer && map.hasLayer(layer)) {
            map.removeLayer(layer);
          }
        });
        layersRef.current = [];
      }
    };
  }, [map]);

  return { instance: null, context: ctx };
});

export default AtmosXAlertsLayer;
