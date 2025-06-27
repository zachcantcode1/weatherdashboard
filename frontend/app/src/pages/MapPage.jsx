import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, useMap, WMSTileLayer, GeoJSON } from 'react-leaflet';

import * as LEsri from 'esri-leaflet';
import { createLayerComponent } from '@react-leaflet/core';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import LsrLegend from '../components/LsrLegend'; // Adjust path if LsrLegend is elsewhere
import TimeSliderControl from '../components/TimeSliderControl';
import MapControls from '../components/MapControls';

// Helper component to adjust map view based on alert geometry
function MapController({ alertGeometry }) {
  const map = useMap();

  useEffect(() => {
    if (map) {
      const popupPane = map.getPane('popupPane');
      if (popupPane) {
        popupPane.style.zIndex = 1000; // Ensure popups are above other layers
        console.log('[MapPage] MapController: Set popupPane z-index to 1000');
      }
    }
  }, [map]);

  // Existing useEffect for alertGeometry follows
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
        } else {
          console.error('MapController: Invalid polygonRing for fitBounds:', polygonRing);
        }
      } else if (currentGeometry.type === 'Point' && currentGeometry.coordinates && currentGeometry.coordinates.length === 2) {
        const circleCenter = [currentGeometry.coordinates[1], currentGeometry.coordinates[0]]; // Leaflet expects [lat, lng]
        const radius = currentGeometry.radius || 10000; // Default radius if not provided
        if (typeof circleCenter[0] === 'number' && typeof circleCenter[1] === 'number') {
          try {
            map.setView(circleCenter, map.getBoundsZoom(L.circle(circleCenter, radius).getBounds()));
          } catch (e) {
            console.error('MapController: Error calling setView for Circle:', e);
          }
        } else {
          console.error('MapController: Invalid circleCenter for setView:', circleCenter);
        }
      }
    }
  }, [map, alertGeometry]);

  return null; // This component does not render anything itself
}

const getLsrIcon = (descript) => {
  let iconClass = 'fas fa-circle-info'; // Default icon
  let color = '#007bff'; // Default color (blue)

  const lowerDescript = descript.toLowerCase();

  if (lowerDescript.includes('rain')) { iconClass = 'fas fa-cloud-showers-heavy'; color = '#4682B4'; } 
  else if (lowerDescript.includes('hail')) { iconClass = 'fas fa-cloud-meatball'; color = '#ADD8E6'; } 
  else if (lowerDescript.includes('tstm wnd gst') || lowerDescript.includes('tstm wnd dmg') || lowerDescript.includes('non-tstm wnd gst')) { iconClass = 'fas fa-wind'; color = '#87CEEB'; } 
  else if (lowerDescript.includes('tornado')) { iconClass = 'fas fa-tornado'; color = '#FF0000'; } 
  else if (lowerDescript.includes('funnel cloud')) { iconClass = 'fas fa-tornado'; color = '#FFA500'; } // Orange for funnel cloud 
  else if (lowerDescript.includes('flash flood') || lowerDescript.includes('flood')) { iconClass = 'fas fa-water'; color = '#0000FF'; } 
  else if (lowerDescript.includes('debris flow') || lowerDescript.includes('mudslide')) { iconClass = 'fas fa-house-flood-water'; color = '#A0522D'; } 
  else if (lowerDescript.includes('snow')) { iconClass = 'fas fa-snowflake'; color = '#FFFFFF'; } 
  else if (lowerDescript.includes('sleet') || lowerDescript.includes('freezing rain')) { iconClass = 'fas fa-icicles'; color = '#AFEEEE'; } 
  else if (lowerDescript.includes('lightning')) { iconClass = 'fas fa-bolt'; color = '#FFFF00'; }
  // Add more specific cases as needed
  // e.g., 'Funnel Cloud', 'Waterspout', 'Dust Devil', 'Wildfire', 'Volcanic Ash'

  return L.divIcon({
    html: `<i class="${iconClass}" style="color: ${color}; font-size: 24px; text-shadow: 0 0 3px #000;"></i>`,
    className: 'lsr-custom-icon', // For any additional CSS if needed
    iconSize: [24, 24],
    iconAnchor: [12, 24], // Point of the icon which will correspond to marker's location
    popupAnchor: [0, -24] // Point from which the popup should open relative to the iconAnchor
  });
};

const pointToLayerLsr = (feature, latlng) => {
  return L.marker(latlng, { icon: getLsrIcon(feature.properties.descript) });
};

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

// Custom component to add Esri DynamicMapLayer with React Leaflet hooks
// React-Leaflet compatible Esri FeatureLayer
// Esri FeatureLayer helper for generic url segment
const EsriFeatureLayer = (url, style) => createLayerComponent((props, ctx) => {
  const layer = LEsri.featureLayer({ url });
  return { instance: layer, context: ctx };
});

const WWAFeatureLayer = createLayerComponent((props, ctx) => {
  const styleFn = props.styleFn || null;
  const layer = LEsri.featureLayer({
    url: props.url,
    where: props.where,
    style: styleFn || props.style || { color: '#FF00FF', weight: 1, fillOpacity: 0.4 },
    onEachFeature: (feature, leafletLayer) => {
      // Bind popup content with basic details
      const {
        event, prod_type, phenom, sig,
        headline,
        wfo,
        begints,
        expirets,
        etn,
        officeid,
      } = feature.properties;

      // Build title and details list
      const title = `${prod_type || event || phenom || 'Warning'}`.trim();
      const fieldLabels = {
        issuance: 'Issued',
        expiration: 'Expires',
      };
      const detailLines = Object.entries(fieldLabels)
        .map(([key, label]) => {
          const val = feature.properties[key];
          if (val && String(val).trim() !== '') {
            return `${label}: ${val}`;
          }
          return null;
        })
        .filter(Boolean);
      // If no details matched, fall back to showing all properties for now
      const fallbackLines = Object.entries(feature.properties)
        .slice(0, 15) // limit length
        .map(([k, v]) => `${k}: ${v}`);
      const popupHtml = `<strong>${title}</strong><br/>${(detailLines.length ? detailLines : fallbackLines).join('<br/>')}`;
      leafletLayer.bindPopup(popupHtml);
      leafletLayer.on('click', () => {
        if (ctx && ctx.map) {
          ctx.map.fitBounds(leafletLayer.getBounds());
          leafletLayer.openPopup();
        }
      });
    }
  });
  return { instance: layer, context: ctx };
});

export function MapPage() {
  console.log('[MapPage] Component rendering/re-rendering');
  const [radarOpacity, setRadarOpacity] = useState(0.7);
  const [showRadar, setShowRadar] = useState(true);
  const [showWwa, setShowWwa] = useState(true);
  const [showLsrLayer, setShowLsrLayer] = useState(true);

  const [lsrData, setLsrData] = useState(null);
  const [radarTimeInfo, _setRadarTimeInfo] = useState(() => {
    console.log('[MapPage] Initializing radarTimeInfo state');
    return {
      availableTimes: [], // Array of available time strings
      effectiveTime: '', // The currently selected time string for the radar layer
      isLoading: true,
      error: null,
    }
  }); // Renamed original setter

  const setRadarTimeInfo = (newStateOrCallback) => {
    console.log('MapPage: Calling setRadarTimeInfo. Argument type:', typeof newStateOrCallback);
    if (typeof newStateOrCallback === 'function') {
      console.log('MapPage: setRadarTimeInfo called with an updater function.');
      _setRadarTimeInfo(prevState => {
        const nextStateToSet = newStateOrCallback(prevState);
        console.log('MapPage: setRadarTimeInfo (updater) - Prev state (inside _setRadarTimeInfo):', JSON.parse(JSON.stringify(prevState)));
        console.log('MapPage: setRadarTimeInfo (updater) - Next state (inside _setRadarTimeInfo):', JSON.parse(JSON.stringify(nextStateToSet)));
        return nextStateToSet;
      });
    } else {
      console.log('MapPage: setRadarTimeInfo called with new state object:', JSON.parse(JSON.stringify(newStateOrCallback)));
      _setRadarTimeInfo(newStateOrCallback);
    }
  };

  const [radarTimeInfo_useState_direct_access_for_debug, setRadarTimeInfo_original] = useState({ 
    availableTimes: [],       // Array of ISO strings
    currentTime: null,        // This will now be the *visual* current time for display/slider, updates immediately
    currentIndex: 0,          // Index for the slider, updates immediately
    effectiveTime: null,      // ISO string for the WMS layer, updates debounced
  });
  const debounceTimerRef = useRef(null);
  const location = useLocation();
  console.log('MapPage: showLsrLayer state:', showLsrLayer); // Log showLsrLayer state
  const alertGeometry = location.state?.alertGeometry;

  // Clear alertGeometry from history state after first render to avoid persistence on refresh
  const navigate = useNavigate();
  useEffect(() => {
    if (location.state?.alertGeometry) {
      navigate('.', { replace: true, state: null });
    }
  }, []);

  let circleCenter = null;
  let circleRadius = null;
  if (alertGeometry && alertGeometry.type === 'Point' && alertGeometry.coordinates) {
    circleCenter = [alertGeometry.coordinates[1], alertGeometry.coordinates[0]]; // GeoJSON is [lng, lat], Leaflet is [lat, lng]
    circleRadius = alertGeometry.radius || 10000; // Default radius in meters
  }

  let polygonPositions = null;
  if (alertGeometry && alertGeometry.type === 'Polygon' && alertGeometry.coordinates && alertGeometry.coordinates[0]) {
    polygonPositions = alertGeometry.coordinates[0];
  }

  // Approximate geographic center of contiguous USA
  const defaultUsaCenter = [39.8283, -98.5795];
  const initialZoom = alertGeometry ? 7 : 4; // Wider view when no specific geometry

  // Determine initial center: use geometry if available, otherwise USA center
  const initialCenter = alertGeometry ? (circleCenter || defaultUsaCenter) : defaultUsaCenter;

  useEffect(() => {
    console.log('MapPage: LSR useEffect triggered. showLsrLayer:', showLsrLayer, 'lsrData exists:', !!lsrData); // Log effect trigger
    if (showLsrLayer && !lsrData) {
      console.log('MapPage: Fetching LSR GeoJSON data...'); // Log fetch initiation
      fetch('https://mapservices.weather.noaa.gov/vector/rest/services/obs/nws_local_storm_reports/MapServer/0/query?where=1%3D1&outFields=*&f=geojson')
        .then(response => response.json())
        .then(data => {
          console.log('MapPage: Received LSR GeoJSON data:', data); // Log received data
          setLsrData(data);
        })
        .catch(error => {
          console.error('MapPage: Error fetching LSR GeoJSON data:', error); // Log fetch error
        });
    } else if (!showLsrLayer && lsrData) {
      // Optional: Consider clearing data if layer is turned off and you want to re-fetch next time
      // Or to free up memory if features are very numerous.
      // console.log('MapPage: LSR layer turned off, optionally clear lsrData here.');
      // setLsrData(null); // Uncomment if you want to clear data on toggle off
    }
  }, [showLsrLayer]);

  // Effect to fetch WMS capabilities and parse time dimension
  useEffect(() => {
    const fetchRadarCapabilities = async () => {
      console.log('[MapPage] fetchRadarCapabilities called');
      setRadarTimeInfo(prev => ({ ...prev, isLoading: true, error: null, availableTimes: [], effectiveTime: '' }));
      try {
        console.log('[MapPage] fetchRadarCapabilities: fetching capabilities from', 'https://nowcoast.ncep.noaa.gov/arcgis/services/nowcoast/radar_meteo_imagery_nexrad_time/MapServer/WMSServer?service=WMS&version=1.3.0&request=GetCapabilities');
        const response = await fetch('https://nowcoast.ncep.noaa.gov/arcgis/services/nowcoast/radar_meteo_imagery_nexrad_time/MapServer/WMSServer?service=WMS&version=1.3.0&request=GetCapabilities');
        console.log('[MapPage] fetchRadarCapabilities: response status', response.status);
        if (!response.ok) {
          const errorMsg = `HTTP error! status: ${response.status}`;
          console.error('[MapPage] fetchRadarCapabilities: fetch error', errorMsg);
          throw new Error(errorMsg);
        }
        const xmlText = await response.text();
        console.log('[MapPage] fetchRadarCapabilities: successfully fetched XML text (first 500 chars):', xmlText.substring(0, 500));
        const parser = new DOMParser();
        console.log('[MapPage] fetchRadarCapabilities: attempting to parse XML');
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const timeDimension = xmlDoc.querySelector('Dimension[name="time"]');
        console.log('MapPage: Raw timeDimension content:', timeDimension ? timeDimension.textContent : 'Not found');
        
        if (timeDimension) {
          const timeExtent = timeDimension.textContent.split('/');
          if (timeExtent.length >= 2) {
            const startTimeStr = timeExtent[0];
            const startTime = new Date(startTimeStr);
            const endTime = new Date(startTime);
            endTime.setHours(startTime.getHours() + 4); // 4-hour window

            const availableTimes = [];
            let currentTimeIter = new Date(startTime);
            while (currentTimeIter <= endTime) {
              availableTimes.push(currentTimeIter.toISOString());
              currentTimeIter.setMinutes(currentTimeIter.getMinutes() + 10);
            }
            console.log('MapPage: Generated availableTimes:', availableTimes);
            
            if (availableTimes.length > 0) {
              const latestTimeIndex = availableTimes.length - 1;
              const initialTime = availableTimes[latestTimeIndex];
              console.log('[MapPage] fetchRadarCapabilities: successfully parsed times, updating state.');
              setRadarTimeInfo({ // This will now use the wrapper function
                availableTimes: availableTimes,
                currentTime: initialTime,      // Initial visual time
                currentIndex: latestTimeIndex, // Initial slider index
                effectiveTime: initialTime,    // Initial time for WMS layer
              });
              console.log('MapPage: Set radarTimeInfo with times:', { availableTimes, initialTime, latestTimeIndex });
            } else {
              console.warn('No available radar times were generated.');
              setRadarTimeInfo(prev => {
                console.log('MapPage: setRadarTimeInfo (updater in catch/warn) - Clearing times. Prev state:', JSON.parse(JSON.stringify(prev)));
                return { ...prev, availableTimes: [], currentTime: null, currentIndex: 0, effectiveTime: null };
              });
            }
          } else {
            console.error('Could not parse time extent from WMS capabilities.');
          }
        } else {
          console.error('Time dimension not found in WMS capabilities.');
        }
      } catch (error) {
        console.error('[MapPage] fetchRadarCapabilities: CATCH block - Error fetching or parsing radar capabilities:', error);
        setRadarTimeInfo(prevState => ({ ...prevState, isLoading: false, error: error.message }));
      }
    };

    console.log('[MapPage] Calling fetchRadarCapabilities in useEffect');
    fetchRadarCapabilities();
  }, []);

  useEffect(() => {
    console.log('[MapPage] radarTimeInfo changed:', radarTimeInfo);
  }, [radarTimeInfo]);

  const handleTimeChange = (newIndex, newTime) => {
    // Update visual state immediately
    setRadarTimeInfo(prev => ({
      ...prev,
      currentIndex: newIndex,
      currentTime: newTime, // This updates the time display in TimeSliderControl immediately
    }));

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer to update the WMS layer's time
    debounceTimerRef.current = setTimeout(() => {
      setRadarTimeInfo(prev => ({
        ...prev,
        effectiveTime: newTime, // Update the time that the WMS layer uses
      }));
    }, 300); // 300ms debounce delay
  };

  console.log("MapPage: Rendering with radarTimeInfo state:", radarTimeInfo);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const legendItems = [
    { text: 'Rain', iconClass: 'fas fa-cloud-showers-heavy', color: '#4682B4' },
    { text: 'Hail', iconClass: 'fas fa-cloud-meatball', color: '#ADD8E6' },
    { text: 'Wind Event', iconClass: 'fas fa-wind', color: '#87CEEB' },
    { text: 'Funnel Cloud', iconClass: 'fas fa-tornado', color: '#FFA500' },
    { text: 'Tornado', iconClass: 'fas fa-tornado', color: '#FF0000' },
    { text: 'Flood/Flash Flood', iconClass: 'fas fa-water', color: '#0000FF' },
    { text: 'Debris Flow/Mudslide', iconClass: 'fas fa-house-flood-water', color: '#A0522D' },
    { text: 'Snow', iconClass: 'fas fa-snowflake', color: '#FFFFFF', textShadow: true },
    { text: 'Sleet/Freezing Rain', iconClass: 'fas fa-icicles', color: '#AFEEEE' },
    { text: 'Lightning', iconClass: 'fas fa-bolt', color: '#FFFF00', textShadow: true },
    { text: 'Other Report', iconClass: 'fas fa-circle-info', color: '#007bff' }
  ];

  return (
    <div className="container mx-auto p-4 flex flex-col h-full">
      <h1 className="text-2xl font-bold mb-4 shrink-0">Interactive Map</h1>

      <div className="relative flex-grow w-full h-[calc(100vh-200px)] rounded-lg shadow overflow-hidden">
        {/* Main Leaflet Map */}
        <MapContainer
          center={initialCenter}
          zoom={initialZoom}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          {/* Basemap */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Radar */}
          {showRadar && (
            <WMSTileLayer
              url="https://mapservices.weather.noaa.gov/eventdriven/services/radar/radar_base_reflectivity_time/ImageServer/WMSServer"
              layers="0"
              params={{ TIME: radarTimeInfo.effectiveTime }}
              format="image/png"
              transparent
              opacity={radarOpacity}
              key={`radar-${radarTimeInfo.effectiveTime}`}
            />
          )}

          {/* Watches / Warnings */}
          {showWwa && (
            <WWAFeatureLayer
              url="https://mapservices.weather.noaa.gov/eventdriven/rest/services/WWA/watch_warn_adv/MapServer/0"
              where="((phenom IN ('SV','TO') AND sig = 'W') OR prod_type = 'Special Weather Statement')"
              styleFn={(feature) => {
                const { phenom, sig, prod_type } = feature.properties;
                if (phenom === 'SV' && sig === 'W') return { color: '#FFFF00', weight: 2, fillOpacity: 0.3 };
                if (phenom === 'TO' && sig === 'W') return { color: '#FF0000', weight: 2, fillOpacity: 0.3 };
                if (prod_type === 'Special Weather Statement') return { color: '#00FFFF', weight: 2, fillOpacity: 0.3 };
                return { color: '#FFFFFF', weight: 1, fillOpacity: 0.2 };
              }}
            />
          )}

          {/* Local Storm Reports */}
          {showLsrLayer && (
            <MarkerClusterGroup>
              <GeoJSON
                key={lsrData ? lsrData.features.length : 0}
                data={lsrData || { type: 'FeatureCollection', features: [] }}
                pointToLayer={pointToLayerLsr}
                onEachFeature={onEachFeatureLsr}
              />
            </MarkerClusterGroup>
          )}

          {/* Controller and geometry highlights */}
          <MapController alertGeometry={alertGeometry} />
          {alertGeometry && alertGeometry.type === 'Polygon' && polygonPositions && (
            <Polygon positions={polygonPositions} pathOptions={{ color: 'red' }} />
          )}
          {alertGeometry && alertGeometry.type === 'Point' && circleCenter && circleRadius && (
            <Circle center={circleCenter} radius={circleRadius} pathOptions={{ color: 'blue' }} />
          )}

          {/* Time slider inside map for React-Leaflet context */}
          <TimeSliderControl radarTimeInfo={radarTimeInfo} onTimeChange={handleTimeChange} />
        </MapContainer>

        {/* Legend */}
        {showLsrLayer && <LsrLegend items={legendItems} />}

        {/* Controls overlay */}
        <MapControls
          showRadar={showRadar}
          setShowRadar={setShowRadar}
          showWwa={showWwa}
          setShowWwa={setShowWwa}
          showLsr={showLsrLayer}
          setShowLsr={setShowLsrLayer}
          radarOpacity={radarOpacity}
          setRadarOpacity={setRadarOpacity}
          positionClass="absolute top-4 right-4"
        />
      </div>
    </div>
  );
}
