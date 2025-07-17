import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { MapContainer as LeafletMapContainer, TileLayer, Marker, Popup, Polygon, Circle, useMap, GeoJSON } from 'react-leaflet';
import * as LEsri from 'esri-leaflet';
import { createLayerComponent } from '@react-leaflet/core';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import LsrLegend from './LsrLegend';
import TimeSliderControl from './TimeSliderControl';
import MapControls from './MapControls';
import AtmosXAlertsLayer from './AtmosXAlertsLayer';

// Removed MAPBOX_TOKEN as we're now using ArcGIS basemap

// Custom Radar Layer Component that keeps all frames loaded and switches visibility
function RadarLayer({ radarOpacity, availableTimes, currentTimeIndex, onLayerReady, isVisible = true }) {
  const map = useMap();
  const layersRef = useRef({});
  const layersCreatedRef = useRef(false);

  // Create layers effect - stable dependency array
  useEffect(() => {
    if (!map || !availableTimes.length || layersCreatedRef.current) return;

    console.log('[RadarLayer] Creating', availableTimes.length, 'persistent radar layers...');
    
    availableTimes.forEach((timeString, index) => {
      const wmsLayer = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r-t.cgi', {
        layers: 'nexrad-n0r-wmst',
        format: 'image/png',
        transparent: true,
        opacity: 0, // Start with 0 opacity, will be set based on visibility
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

    return () => {
      Object.values(layersRef.current).forEach(layer => {
        if (layer && map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
      layersRef.current = {};
      layersCreatedRef.current = false;
    };
  }, [map, availableTimes]);

  // Update layer visibility and opacity when currentTimeIndex or opacity changes
  useEffect(() => {
    if (layersCreatedRef.current && Object.keys(layersRef.current).length > 0) {
      Object.entries(layersRef.current).forEach(([index, layer]) => {
        const indexNum = parseInt(index);
        const shouldShow = isVisible && indexNum === currentTimeIndex;
        const newOpacity = shouldShow ? radarOpacity : 0;
        if (layer.setOpacity && layer.options.opacity !== newOpacity) {
          layer.setOpacity(newOpacity);
        }
      });
    }
  }, [currentTimeIndex, radarOpacity, isVisible]);

  // Notify parent when layers are ready
  useEffect(() => {
    if (layersCreatedRef.current && onLayerReady) {
      onLayerReady(layersRef.current);
    }
  }, [onLayerReady]);

  return null;
}

// MapController component to handle map centering and alert geometry
function MapController({ alertGeometry, map }) {
  useEffect(() => {
    if (map && !map._loaded) {
      const onLoad = () => {
        console.log('Map loaded and ready');
      };
      map.whenReady(onLoad);
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

  return { iconClass, color };
};

// Main MapContainer component
const MapContainer = ({ onAlertGeometry, initialAlertGeometry }) => {
  const [radarOpacity, setRadarOpacity] = useState(0.7);
  const [selectedLayer, setSelectedLayer] = useState('radar');
  
  const mapRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [radarLayers, setRadarLayers] = useState({});
  const [lsrData, setLsrData] = useState(null);
  const [alertGeometry, setAlertGeometry] = useState(initialAlertGeometry || null);
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

  // Handle radar layers being ready - use useCallback for stable reference
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
            
            // Generate legend items
            const uniqueTypes = [...new Set(data.features.map(f => f.properties.PHENOM))];
            const legend = uniqueTypes.map(type => {
              const { iconClass, color } = getLsrIcon(type);
              return { label: type, iconClass, color };
            });
            setLegendItems(legend);
          }
        } catch (error) {
          console.error('Error fetching LSR data:', error);
        }
      };
      
      fetchLsrData();
    }
  }, [selectedLayer, lsrData]);

  // Handle alert geometry changes
  useEffect(() => {
    if (onAlertGeometry) {
      onAlertGeometry(alertGeometry);
    }
  }, [alertGeometry, onAlertGeometry]);

  // LSR marker styling function
  const pointToLayerLsr = (feature, latlng) => {
    const { iconClass, color } = getLsrIcon(feature.properties.PHENOM);
    
    return L.marker(latlng, {
      icon: L.divIcon({
        html: `<i class="${iconClass}" style="color: ${color}; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);"></i>`,
        className: 'lsr-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    });
  };

  // LSR popup content function
  const onEachFeatureLsr = (feature, layer) => {
    if (feature.properties) {
      const props = feature.properties;
      const validTime = new Date(props.LSR_VALIDTIME);
      
      const popupContent = `
        <div class="font-sans">
          <h4 class="font-bold text-lg mb-2">${props.PHENOM}</h4>
          <p><strong>Location:</strong> ${props.CITY}, ${props.STATE}</p>
          <p><strong>Time:</strong> ${validTime.toLocaleString()}</p>
          <p><strong>Magnitude:</strong> ${props.MAG}</p>
          <p><strong>Source:</strong> ${props.SOURCE}</p>
          ${props.COMMENTS ? `<p><strong>Comments:</strong> ${props.COMMENTS}</p>` : ''}
        </div>
      `;
      
      layer.bindPopup(popupContent);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Leaflet Map Container */}
      <LeafletMapContainer
        ref={mapRef}
        center={[39.8283, -98.5795]}
        zoom={5}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        whenReady={() => setIsMapReady(true)}
        preferCanvas={true}
        className="leaflet-container"
      >
        <MapController alertGeometry={alertGeometry} map={mapRef.current} />

        {/* Base Map Tiles - ArcGIS Dark Gray Canvas */}
        <TileLayer
          key="arcgis-base"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          zIndex={1}
        />
        
        {/* Reference Layer - labels and borders on top */}
        <TileLayer
          key="arcgis-reference"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          zIndex={1000}
        />

        {/* Radar - always render but control visibility */}
        <RadarLayer
          radarOpacity={radarOpacity}
          availableTimes={radarTimeInfo.availableTimes}
          currentTimeIndex={radarTimeInfo.currentIndex}
          onLayerReady={handleRadarLayersReady}
          isVisible={selectedLayer === 'radar'}
        />

        {/* Real-time Weather Alerts from AtmosphericX - always render but control visibility */}
        <AtmosXAlertsLayer isVisible={selectedLayer === 'radar'} />

        {/* Local Storm Reports - always render but control visibility */}
        {(selectedLayer === 'reports' && lsrData) ? (
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
        ) : null}
      </LeafletMapContainer>

      {/* Time Slider - positioned absolutely within the map container */}
      <div 
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[1000]"
        style={{ 
          display: (selectedLayer === 'radar' && isMapReady) ? 'block' : 'none' 
        }}
      >
        <TimeSliderControl
          radarTimeInfo={{
            availableTimes: radarTimeInfo.availableTimes,
            currentIndex: currentRadarTime,
            previewIndex: -1
          }}
          onTimeChange={handleTimeChange}
        />
      </div>

      {/* LSR Legend - positioned absolutely within the map container */}
      <div 
        className="absolute bottom-6 left-6 z-[1000]"
        style={{ 
          display: selectedLayer === 'reports' ? 'block' : 'none'
        }}
      >
        <LsrLegend items={legendItems} />
      </div>

      {/* Map Controls - positioned to avoid sidebar overlap */}
      <div className="absolute top-4 right-[336px] z-[1001]">
        <MapControls
          selectedLayer={selectedLayer}
          setSelectedLayer={setSelectedLayer}
          radarOpacity={radarOpacity}
          setRadarOpacity={setRadarOpacity}
        />
      </div>
    </div>
  );
};

export default MapContainer;
