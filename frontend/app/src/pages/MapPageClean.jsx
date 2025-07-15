import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, useMap, GeoJSON } from 'react-leaflet';

import * as LEsri from 'esri-leaflet';
import { createLayerComponent } from '@react-leaflet/core';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import LsrLegend from '../components/LsrLegend';
import TimeSliderControl from '../components/TimeSliderControl';
import MapControls from '../components/MapControls';
import AtmosXAlertsLayer from '../components/AtmosXAlertsLayer';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiemFjaG1pbGxlOTYiLCJhIjoiY200cmR2bXJ5MDNvbzJqb3F6dHQ0NDF6ZSJ9.ZbynfFycdWjRz1Bf-2iluQ';

// Custom Radar Layer Component that keeps all frames loaded and switches visibility
function RadarLayer({ radarOpacity, availableTimes, currentTimeIndex, onLayerReady }) {
  const map = useMap();
  const layersRef = useRef({});
  const layersCreatedRef = useRef(false);

  useEffect(() => {
    if (!map || !availableTimes.length || layersCreatedRef.current) return;

    console.log('[RadarLayer] Creating', availableTimes.length, 'persistent radar layers...');
    
    availableTimes.forEach((timeString, index) => {
      const wmsLayer = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r-t.cgi', {
        layers: 'nexrad-n0r-wmst',
        format: 'image/png',
        transparent: true,
        opacity: index === currentTimeIndex ? radarOpacity : 0,
        time: timeString,
        attribution: 'Iowa State Mesonet',
        updateWhenIdle: false,
        updateWhenZooming: false,
        zIndex: 200 + index
      });

      wmsLayer.addTo(map);
      layersRef.current[index] = wmsLayer;
    });

    layersCreatedRef.current = true;

    if (onLayerReady) {
      onLayerReady(layersRef.current);
    }

    return () => {
      Object.values(layersRef.current).forEach(layer => {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
      layersRef.current = {};
      layersCreatedRef.current = false;
    };
  }, [map, availableTimes, onLayerReady]);

  useEffect(() => {
    if (!layersCreatedRef.current || currentTimeIndex < 0) return;

    Object.entries(layersRef.current).forEach(([index, layer]) => {
      const targetOpacity = parseInt(index) === currentTimeIndex ? radarOpacity : 0;
      layer.setOpacity(targetOpacity);
    });
  }, [currentTimeIndex, radarOpacity]);

  return null;
}

// Helper component to adjust map view based on alert geometry
function MapController({ alertGeometry }) {
  const map = useMap();

  useEffect(() => {
    if (map) {
      const popupPane = map.getPane('popupPane');
      if (popupPane) {
        popupPane.style.zIndex = 1000;
      }
    }
  }, [map]);

  useEffect(() => {
    const currentGeometry = alertGeometry;
    if (currentGeometry && map) {
      if (currentGeometry.type === 'Polygon' && currentGeometry.coordinates && currentGeometry.coordinates[0]) {
        const polygonRing = currentGeometry.coordinates[0];
        if (Array.isArray(polygonRing) && polygonRing.length > 0 &&
            polygonRing.every(coord => Array.isArray(coord) && coord.length === 2 &&
                                     typeof coord[0] === 'number' && typeof coord[1] === 'number')) {
          try {
            map.fitBounds(polygonRing);
          } catch (e) {
            console.error('MapController: Error calling fitBounds for Polygon:', e);
          }
        }
      } else if (currentGeometry.type === 'Point' && currentGeometry.coordinates && currentGeometry.coordinates.length === 2) {
        const circleCenter = [currentGeometry.coordinates[1], currentGeometry.coordinates[0]];
        const radius = currentGeometry.radius || 10000;
        if (typeof circleCenter[0] === 'number' && typeof circleCenter[1] === 'number') {
          try {
            map.setView(circleCenter, map.getBoundsZoom(L.circle(circleCenter, radius).getBounds()));
          } catch (e) {
            console.error('MapController: Error calling setView for Circle:', e);
          }
        }
      }
    }
  }, [map, alertGeometry]);

  return null;
}

// Helper function to get LSR icon based on description
const getLsrIcon = (descript) => {
  let iconClass = 'fas fa-circle-info';
  let color = '#007bff';

  const lowerDescript = descript.toLowerCase();

  if (lowerDescript.includes('rain')) { iconClass = 'fas fa-cloud-showers-heavy'; color = '#4682B4'; } 
  else if (lowerDescript.includes('hail')) { iconClass = 'fas fa-cloud-meatball'; color = '#ADD8E6'; } 
  else if (lowerDescript.includes('tstm wnd gst') || lowerDescript.includes('tstm wnd dmg') || lowerDescript.includes('non-tstm wnd gst')) { iconClass = 'fas fa-wind'; color = '#87CEEB'; } 
  else if (lowerDescript.includes('tornado')) { iconClass = 'fas fa-tornado'; color = '#FF0000'; } 
  else if (lowerDescript.includes('funnel cloud')) { iconClass = 'fas fa-tornado'; color = '#FFA500'; } 
  else if (lowerDescript.includes('flash flood') || lowerDescript.includes('flood')) { iconClass = 'fas fa-water'; color = '#0000FF'; } 
  else if (lowerDescript.includes('debris flow') || lowerDescript.includes('mudslide')) { iconClass = 'fas fa-house-flood-water'; color = '#A0522D'; } 
  else if (lowerDescript.includes('snow')) { iconClass = 'fas fa-snowflake'; color = '#FFFFFF'; } 
  else if (lowerDescript.includes('sleet') || lowerDescript.includes('freezing rain')) { iconClass = 'fas fa-icicles'; color = '#AFEEEE'; } 
  else if (lowerDescript.includes('lightning')) { iconClass = 'fas fa-bolt'; color = '#FFFF00'; }

  return L.divIcon({
    html: `<i class="${iconClass}" style="color: ${color}; font-size: 24px; text-shadow: 0 0 3px #000;"></i>`,
    className: 'lsr-custom-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  });
};

// Function to create LSR markers
const pointToLayerLsr = (feature, latlng) => {
  return L.marker(latlng, { icon: getLsrIcon(feature.properties.descript) });
};

// Function to handle LSR feature interactions
const onEachFeatureLsr = (feature, layer) => {
  if (feature.properties) {
    const props = feature.properties;
    let popupContent = `<div style="font-family: Arial, sans-serif; max-width: 280px;">`;
    popupContent += `<h4 style="margin-bottom: 5px; display: flex; align-items: center;"><span style="margin-right: 8px; font-size: 1.2em;">${getLsrIcon(props.descript).options.html}</span> ${props.descript || 'Local Storm Report'}</h4>`;
    
    if (props.lsr_validtime) {
      const date = new Date(props.lsr_validtime);
      const formattedTime = date.toLocaleString('en-US', {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
      });
      popupContent += `<p><strong>When:</strong> ${formattedTime}</p>`;
    }

    if (props.magnitude && String(props.magnitude).trim() !== "") {
      popupContent += `<p><strong>Magnitude:</strong> ${props.magnitude} ${props.units || ''}</p>`;
    }

    popupContent += `<p><strong>Location:</strong> ${props.loc_desc || 'N/A'}${props.state ? ', ' + props.state : ''}</p>`;
    
    if (props.remarks && String(props.remarks).trim() !== "") {
      popupContent += `<p><strong>Remarks:</strong> ${props.remarks}</p>`;
    }
    
    popupContent += `</div>`;
    layer.bindPopup(popupContent);
  }
};

export function MapPage() {
  const [radarOpacity, setRadarOpacity] = useState(0.7);
  const [selectedLayer, setSelectedLayer] = useState('radar'); // 'radar', 'reports', or 'none'
  
  const location = useLocation();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [radarLayers, setRadarLayers] = useState({});
  const [lsrData, setLsrData] = useState(null);
  const [alertGeometry, setAlertGeometry] = useState(null);
  const [legendItems, setLegendItems] = useState([]);

  // Get available radar times (last 10 frames, 5 minutes apart)
  const [radarTimeInfo, setRadarTimeInfo] = useState(() => {
    const times = [];
    const now = new Date();
    for (let i = 9; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5 * 60 * 1000);
      const isoString = time.toISOString();
      const roundedMinutes = Math.floor(time.getMinutes() / 5) * 5;
      time.setMinutes(roundedMinutes, 0, 0);
      times.push(time.toISOString());
    }
    return {
      availableTimes: times,
      currentIndex: times.length - 1
    };
  });

  const [currentRadarTime, setCurrentRadarTime] = useState(radarTimeInfo.currentIndex);

  // Handle radar layers being ready
  const handleRadarLayersReady = useCallback((layers) => {
    setRadarLayers(layers);
  }, []);

  // Handle time slider changes
  const handleTimeChange = useCallback((timeIndex) => {
    setCurrentRadarTime(timeIndex);
    setRadarTimeInfo(prev => ({ ...prev, currentIndex: timeIndex }));
  }, []);

  // Fetch LSR data when reports layer is selected
  useEffect(() => {
    if (selectedLayer === 'reports' && !lsrData) {
      const fetchLsrData = async () => {
        try {
          const response = await fetch('https://mapservices.weather.noaa.gov/eventdriven/rest/services/Storm_Reports/MapServer/0/query?f=geojson&where=1%3D1&returnGeometry=true&spatialRel=esriSpatialRelIntersects&outFields=*&orderByFields=LSR_VALIDTIME%20DESC&resultRecordCount=500');
          const data = await response.json();
          
          if (data && data.features) {
            setLsrData(data);
            
            // Create legend items
            const uniqueTypes = [...new Set(data.features.map(f => f.properties.descript))];
            const legend = uniqueTypes.map(type => ({
              type,
              count: data.features.filter(f => f.properties.descript === type).length,
              icon: getLsrIcon(type).options.html
            }));
            setLegendItems(legend);
          }
        } catch (error) {
          console.error('Error fetching LSR data:', error);
        }
      };
      
      fetchLsrData();
    }
  }, [selectedLayer]);

  // Parse URL parameters for alert geometry
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const alertParam = params.get('alert');
    
    if (alertParam) {
      try {
        const parsedAlert = JSON.parse(decodeURIComponent(alertParam));
        setAlertGeometry(parsedAlert);
      } catch (error) {
        console.error('Error parsing alert geometry:', error);
      }
    }
  }, [location.search]);

  return (
    <div className="relative h-screen w-full">
      <MapContainer
        center={[41.203221, -96.725937]}
        zoom={7}
        className="h-full w-full"
        ref={mapRef}
        whenReady={() => setIsMapReady(true)}
      >
        <MapController alertGeometry={alertGeometry} />
        
        <TileLayer
          attribution='© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`}
          tileSize={512}
          zoomOffset={-1}
        />

        {/* Radar */}
        {selectedLayer === 'radar' && (
          <RadarLayer
            radarOpacity={radarOpacity}
            availableTimes={radarTimeInfo.availableTimes}
            currentTimeIndex={radarTimeInfo.currentIndex}
            onLayerReady={handleRadarLayersReady}
          />
        )}

        {/* Real-time Weather Alerts from AtmosphericX - shown with radar */}
        {selectedLayer === 'radar' && (
          <AtmosXAlertsLayer isVisible={true} />
        )}

        {/* Local Storm Reports */}
        {selectedLayer === 'reports' && lsrData && (
          <MarkerClusterGroup
            iconCreateFunction={(cluster) => {
              const childCount = cluster.getChildCount();
              let c = ' marker-cluster-';
              if (childCount < 10) {
                c += 'small';
              } else if (childCount < 100) {
                c += 'medium';
              } else {
                c += 'large';
              }
              return new L.DivIcon({
                html: '<div><span>' + childCount + '</span></div>',
                className: 'marker-cluster' + c,
                iconSize: new L.Point(40, 40)
              });
            }}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
            zoomToBoundsOnClick={true}
            maxClusterRadius={50}
          >
            <GeoJSON
              key={`lsr-${lsrData?.features?.length || 0}`}
              data={lsrData}
              pointToLayer={pointToLayerLsr}
              onEachFeature={onEachFeatureLsr}
            />
          </MarkerClusterGroup>
        )}
      </MapContainer>

      {/* Time Slider - only show when radar is selected */}
      {selectedLayer === 'radar' && isMapReady && (
        <TimeSliderControl
          availableTimes={radarTimeInfo.availableTimes}
          currentTimeIndex={currentRadarTime}
          onTimeChange={handleTimeChange}
          positionClass="fixed bottom-4 left-1/2 transform -translate-x-1/2"
        />
      )}

      {/* Legend - only show when reports are selected */}
      {selectedLayer === 'reports' && <LsrLegend items={legendItems} />}

      {/* Map Controls */}
      <MapControls
        selectedLayer={selectedLayer}
        setSelectedLayer={setSelectedLayer}
        radarOpacity={radarOpacity}
        setRadarOpacity={setRadarOpacity}
        positionClass="fixed top-4 right-4"
      />
    </div>
  );
}
