import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, WMSTileLayer, GeoJSON } from 'react-leaflet';

import * as LEsri from 'esri-leaflet';
import { createLayerComponent } from '@react-leaflet/core';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import LsrLegend from '../components/LsrLegend'; // Adjust path if LsrLegend is elsewhere
import SpcLegend from '../components/SpcLegend';
import MapControls from '../components/MapControls';
import AtmosXAlertsLayer from '../components/AtmosXAlertsLayer';
import IEMRadarLayer from '../components/IEMRadarLayer';
import RadarTimeSlider from '../components/RadarTimeSlider';
import FutureRadarLayer from '../components/FutureRadarLayer';
import FutureRadarTimeSlider from '../components/FutureRadarTimeSlider';
import SPCKMLLayer from '../components/SPCKMLLayer';
import PNGRadarLayer from '../components/PNGRadarLayer';

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
    html: `<i class="${iconClass}" style="color: ${color}; font-size: 20px; text-shadow: 0 0 3px #000;"></i>`,
    className: 'lsr-custom-icon', // For any additional CSS if needed
    iconSize: [20, 20],
    iconAnchor: [10, 20], // Point of the icon which will correspond to marker's location
    popupAnchor: [0, -20] // Point from which the popup should open relative to the iconAnchor
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

export function MapPage() {
  console.log('[MapPage] Component rendering/re-rendering');
  const [radarOpacity, setRadarOpacity] = useState(0.75);
  // Map layer selection state - single selection for all layers
  const [selectedLayer, setSelectedLayer] = useState('radar-warnings'); // 'radar-warnings', 'storm-reports', 'spc-outlooks'
  const [spcOutlookLayer, setSpcOutlookLayer] = useState('day1-categorical'); // Default to Day 1 Categorical

  // Helper function to get layer details from layer ID
  const getSpcLayerDetails = (layerId) => {
    const layerMap = {
      'day1-categorical': { type: 'categorical', day: 1, name: 'Day 1 Categorical' },
      'day1-tornado': { type: 'tornado', day: 1, name: 'Day 1 Tornado Prob' },
      'day1-hail': { type: 'hail', day: 1, name: 'Day 1 Hail Prob' },
      'day1-wind': { type: 'wind', day: 1, name: 'Day 1 Wind Prob' },
      'day2-categorical': { type: 'categorical', day: 2, name: 'Day 2 Categorical' },
      'day2-tornado': { type: 'tornado', day: 2, name: 'Day 2 Tornado Prob' },
      'day2-hail': { type: 'hail', day: 2, name: 'Day 2 Hail Prob' },
      'day2-wind': { type: 'wind', day: 2, name: 'Day 2 Wind Prob' },
      'day3-categorical': { type: 'categorical', day: 3, name: 'Day 3 Categorical' },
      'day3-probabilistic': { type: 'probabilistic', day: 3, name: 'Day 3 Probabilistic' },
      'day4-probabilistic': { type: 'probabilistic', day: 4, name: 'Day 4 Probabilistic' },
      'day5-probabilistic': { type: 'probabilistic', day: 5, name: 'Day 5 Probabilistic' },
      'day6-probabilistic': { type: 'probabilistic', day: 6, name: 'Day 6 Probabilistic' },
      'day7-probabilistic': { type: 'probabilistic', day: 7, name: 'Day 7 Probabilistic' },
      'day8-probabilistic': { type: 'probabilistic', day: 8, name: 'Day 8 Probabilistic' }
    };
    return layerMap[layerId] || { type: 'categorical', day: 1, name: 'Unknown' };
  };

  // Debug log for SPC layer changes
  useEffect(() => {
    console.log('SPC Outlook Layer changed to:', spcOutlookLayer);
  }, [spcOutlookLayer]);
  
  // Radar-specific state
  const [radarSelectedTime, setRadarSelectedTime] = useState(null);
  const [radarAvailableTimes, setRadarAvailableTimes] = useState([]);
  const [radarLoading, setRadarLoading] = useState(false);
  const [radarLooping, setRadarLooping] = useState(false);
  const loopIntervalRef = useRef(null);

  // PNG Radar-specific state
  const [pngRadarSelectedTime, setPngRadarSelectedTime] = useState(null);
  const [pngRadarAvailableTimes, setPngRadarAvailableTimes] = useState([]);
  const [pngRadarLoading, setPngRadarLoading] = useState(false);
  const [pngRadarLooping, setPngRadarLooping] = useState(false);
  const pngLoopIntervalRef = useRef(null);

  // Future radar state
  const [futureRadarForecastMinute, setFutureRadarForecastMinute] = useState(0);
  const [futureRadarModelRun, setFutureRadarModelRun] = useState(null);
  const [futureRadarLoading, setFutureRadarLoading] = useState(false);
  const [futureRadarError, setFutureRadarError] = useState(null);

  const [lsrData, setLsrData] = useState(null);

  // Derived states based on selection
  const showRadar = selectedLayer === 'radar-warnings';
  const showWwa = selectedLayer === 'radar-warnings';
  const showLsrLayer = selectedLayer === 'storm-reports';
  const showFutureRadar = selectedLayer === 'future-radar';
  const showSpcOutlooks = selectedLayer === 'spc-outlooks';
  const showSingleRadar = selectedLayer === 'single-radar';
  
  // Expose functions for IEM radar layer to communicate with parent
  useEffect(() => {
    window.setRadarTimes = (times) => {
      setRadarAvailableTimes(times);
      // Set initial time to the latest available
      if (times.length > 0 && !radarSelectedTime) {
        setRadarSelectedTime(times[times.length - 1].timestamp);
      }
    };
    
    window.setRadarLoading = (loading) => {
      setRadarLoading(loading);
    };
    
    return () => {
      delete window.setRadarTimes;
      delete window.setRadarLoading;
    };
  }, [radarSelectedTime]);

  // Expose functions for PNG radar layer to communicate with parent
  useEffect(() => {
    window.setPngRadarTimes = (times) => {
      console.log('[MapPage] setPngRadarTimes called with', times.length, 'times');
      console.log('[MapPage] PNG radar times:', times.map(t => t.timestamp));
      setPngRadarAvailableTimes(times);
      // Set initial time to the latest available
      if (times.length > 0 && !pngRadarSelectedTime) {
        console.log('[MapPage] Setting initial PNG radar time to:', times[times.length - 1].timestamp);
        setPngRadarSelectedTime(times[times.length - 1].timestamp);
      }
    };
    
    window.setPngRadarLoading = (loading) => {
      setPngRadarLoading(loading);
    };
    
    return () => {
      delete window.setPngRadarTimes;
      delete window.setPngRadarLoading;
    };
  }, [pngRadarSelectedTime]);

  const debounceTimerRef = useRef(null);
  const location = useLocation();
  console.log('MapPage: selectedLayer state:', selectedLayer); // Log map selection state
  const alertGeometry = location.state?.alertGeometry;

  // Clear alertGeometry from history state after first render to avoid persistence on refresh
  const navigate = useNavigate();
  useEffect(() => {
    if (location.state?.alertGeometry) {
      navigate('.', { replace: true, state: null });
    }
  }, []);

  // Approximate geographic center of contiguous USA
  const defaultUsaCenter = [39.8283, -98.5795];
  const initialZoom = 4; // Default zoom level

  // Default center
  const initialCenter = defaultUsaCenter;

  useEffect(() => {
    console.log('MapPage: LSR useEffect triggered. selectedLayer:', selectedLayer, 'lsrData exists:', !!lsrData); // Log effect trigger
    if (showLsrLayer && !lsrData) {
      console.log('MapPage: Fetching LSR GeoJSON data...'); // Log fetch initiation
      fetch('https://mapservices.weather.noaa.gov/vector/rest/services/obs/nws_local_storm_reports/MapServer/0/query?where=1%3D1&outFields=*&f=geojson')
        .then(response => response.json())
        .then(data => {
          console.log('MapPage: Received LSR GeoJSON data:', data); // Log received data
          
          // Filter data for current day only and exclude rain reports
          if (data && data.features) {
            const today = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000); // Next day start
            
            const filteredFeatures = data.features.filter(feature => {
              const props = feature.properties;
              
              // Filter for current day only
              if (props.lsr_validtime) {
                const reportTime = new Date(props.lsr_validtime);
                if (reportTime < todayStart || reportTime >= todayEnd) {
                  return false; // Not from today
                }
              }
              
              // Filter out rain reports
              const description = (props.descript || '').toLowerCase();
              if (description.includes('rain') || 
                  description.includes('heavy rain') || 
                  description.includes('excessive rainfall') ||
                  description.includes('rainfall') ||
                  description.includes('precipitation') ||
                  description.includes('flooding rain') ||
                  description.includes('flood')) {
                return false; // Skip rain/flood reports
              }
              
              return true;
            });
            
            // Update data with filtered features
            const filteredData = {
              ...data,
              features: filteredFeatures
            };
            
            console.log(`MapPage: Filtered LSR data - ${filteredFeatures.length} reports from today (excluding rain)`);
            setLsrData(filteredData);
          } else {
            setLsrData(data);
          }
        })
        .catch(error => {
          console.error('MapPage: Error fetching LSR GeoJSON data:', error); // Log fetch error
        });
    } else if (selectedLayer !== 'storm-reports' && lsrData) {
      // Optional: Consider clearing data if layer is turned off and you want to re-fetch next time
      // Or to free up memory if features are very numerous.
      // console.log('MapPage: LSR layer turned off, optionally clear lsrData here.');
      // setLsrData(null); // Uncomment if you want to clear data on toggle off
    }
  }, [selectedLayer]);

  const handleTimeChange = (newIndex, newTime) => {
    // Stop looping when user manually changes time
    if (radarLooping) {
      setRadarLooping(false);
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
        loopIntervalRef.current = null;
      }
    }
    
    // Update selected radar time
    setRadarSelectedTime(newTime);
  };

  const handleLoopToggle = (isLooping) => {
    setRadarLooping(isLooping);
    
    if (isLooping) {
      // Start looping animation
      loopIntervalRef.current = setInterval(() => {
        setRadarSelectedTime(currentTime => {
          if (!radarAvailableTimes.length) return currentTime;
          
          const currentIndex = radarAvailableTimes.findIndex(time => time.timestamp === currentTime);
          const nextIndex = currentIndex >= radarAvailableTimes.length - 1 ? 0 : currentIndex + 1;
          return radarAvailableTimes[nextIndex]?.timestamp || currentTime;
        });
      }, 800); // Change frame every 800ms
    } else {
      // Stop looping
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
        loopIntervalRef.current = null;
      }
    }
  };

  // PNG Radar time handling functions
  const handlePngTimeChange = (newIndex, newTime) => {
    console.log('[MapPage] PNG radar time changed to index:', newIndex, 'time:', newTime);
    // Stop looping when user manually changes time
    if (pngRadarLooping) {
      setPngRadarLooping(false);
      if (pngLoopIntervalRef.current) {
        clearInterval(pngLoopIntervalRef.current);
        pngLoopIntervalRef.current = null;
      }
    }
    
    // Update selected PNG radar time
    setPngRadarSelectedTime(newTime);
  };

  const handlePngLoopToggle = (isLooping) => {
    setPngRadarLooping(isLooping);
    
    if (isLooping) {
      // Start looping animation
      pngLoopIntervalRef.current = setInterval(() => {
        setPngRadarSelectedTime(currentTime => {
          if (!pngRadarAvailableTimes.length) return currentTime;
          
          const currentIndex = pngRadarAvailableTimes.findIndex(time => time.timestamp === currentTime);
          const nextIndex = currentIndex >= pngRadarAvailableTimes.length - 1 ? 0 : currentIndex + 1;
          return pngRadarAvailableTimes[nextIndex]?.timestamp || currentTime;
        });
      }, 800); // Change frame every 800ms
    } else {
      // Stop looping
      if (pngLoopIntervalRef.current) {
        clearInterval(pngLoopIntervalRef.current);
        pngLoopIntervalRef.current = null;
      }
    }
  };

  // Future radar callback functions
  const handleFutureRadarTimeChange = (minutes) => {
    setFutureRadarForecastMinute(minutes);
  };

  const handleFutureRadarModelRunChange = (modelRun, loading, error) => {
    setFutureRadarModelRun(modelRun);
    setFutureRadarLoading(loading);
    setFutureRadarError(error);
  };

  // Cleanup loop interval on unmount
  useEffect(() => {
    return () => {
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
      }
    };
  }, []);

  console.log("MapPage: Rendering with radarAvailableTimes:", radarAvailableTimes.length, "times");

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
          {/* Basemap - ArcGIS Dark Gray Canvas */}
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


          {/* IEM NEXRAD Radar */}
          <IEMRadarLayer 
            isVisible={showRadar}
            opacity={radarOpacity}
            selectedTime={radarSelectedTime}
            overlayType="radar"
          />


          {/* Future Radar Forecast */}
          {showFutureRadar && (
            <FutureRadarLayer
              isVisible={showFutureRadar}
              opacity={radarOpacity}
              forecastMinute={futureRadarForecastMinute}
              onModelRunChange={handleFutureRadarModelRunChange}
            />
          )}

          {/* Single PNG Radar */}
          {showSingleRadar && (
            <PNGRadarLayer
              isVisible={showSingleRadar}
              opacity={radarOpacity}
              selectedTime={pngRadarSelectedTime}
            />
          )}

          {/* AtmosphericX Weather Alerts */}
          {showWwa && (
            <AtmosXAlertsLayer isVisible={true} />
          )}

          {/* Local Storm Reports */}
          {showLsrLayer && (
            <MarkerClusterGroup
              iconCreateFunction={(cluster) => {
                const count = cluster.getChildCount();
                let size = 'small';
                if (count > 10) size = 'medium';
                if (count > 25) size = 'large';
                
                return L.divIcon({
                  html: `<div style="
                    background: rgba(0, 123, 255, 0.8);
                    border: 2px solid #ffffff;
                    border-radius: 50%;
                    color: white;
                    font-size: 11px;
                    font-weight: bold;
                    text-align: center;
                    line-height: ${size === 'small' ? '20px' : size === 'medium' ? '24px' : '28px'};
                    width: ${size === 'small' ? '20px' : size === 'medium' ? '24px' : '28px'};
                    height: ${size === 'small' ? '20px' : size === 'medium' ? '24px' : '28px'};
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                  ">${count}</div>`,
                  className: 'custom-cluster-icon',
                  iconSize: L.point(
                    size === 'small' ? 20 : size === 'medium' ? 24 : 28,
                    size === 'small' ? 20 : size === 'medium' ? 24 : 28
                  )
                });
              }}
              maxClusterRadius={40}
              spiderfyOnMaxZoom={true}
              showCoverageOnHover={false}
              zoomToBoundsOnClick={true}
            >
              <GeoJSON
                key={lsrData ? lsrData.features.length : 0}
                data={lsrData || { type: 'FeatureCollection', features: [] }}
                pointToLayer={pointToLayerLsr}
                onEachFeature={onEachFeatureLsr}
              />
            </MarkerClusterGroup>
          )}

          {/* SPC Weather Outlooks */}
          {showSpcOutlooks && (
            <SPCKMLLayer
              key={`spc-outlook-${spcOutlookLayer}`}
              outlookType={getSpcLayerDetails(spcOutlookLayer).type}
              day={getSpcLayerDetails(spcOutlookLayer).day}
            />
          )}

          {/* Controller for zoom-to-alert functionality */}
          <MapController alertGeometry={alertGeometry} />
        </MapContainer>

        {/* Legend */}
        {showLsrLayer && <LsrLegend items={legendItems} />}
        
        {/* SPC Legend */}
        {showSpcOutlooks && (
          <SpcLegend 
            layerId={spcOutlookLayer}
            layerName={getSpcLayerDetails(spcOutlookLayer).name}
          />
        )}

        {/* Controls overlay */}
        <MapControls
          selectedLayer={selectedLayer}
          setSelectedLayer={setSelectedLayer}
          spcOutlookLayer={spcOutlookLayer}
          setSpcOutlookLayer={setSpcOutlookLayer}
        />

        {/* Radar Time Slider - positioned outside map to avoid interaction conflicts */}
        {showRadar && (
          <RadarTimeSlider
            radarTimes={radarAvailableTimes}
            selectedTime={radarSelectedTime}
            onTimeChange={handleTimeChange}
            isLoading={radarLoading}
            isLooping={radarLooping}
            onLoopToggle={handleLoopToggle}
            positionClass="absolute bottom-4 left-4"
          />
        )}

        {/* Future Radar Time Slider - positioned outside map to avoid interaction conflicts */}
        {showFutureRadar && (
          <FutureRadarTimeSlider
            forecastMinute={futureRadarForecastMinute}
            onTimeChange={handleFutureRadarTimeChange}
            modelRun={futureRadarModelRun}
            isLoading={futureRadarLoading}
            error={futureRadarError}
            positionClass="absolute bottom-4 left-4"
          />
        )}

        {/* PNG Radar Time Slider - positioned outside map to avoid interaction conflicts */}
        {showSingleRadar && (
          <RadarTimeSlider
            radarTimes={pngRadarAvailableTimes}
            selectedTime={pngRadarSelectedTime}
            onTimeChange={handlePngTimeChange}
            isLoading={pngRadarLoading}
            isLooping={pngRadarLooping}
            onLoopToggle={handlePngLoopToggle}
            positionClass="absolute bottom-4 left-4"
          />
        )}
      </div>
    </div>
  );
}
