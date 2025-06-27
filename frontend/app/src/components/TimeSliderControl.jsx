import React, { useEffect, useRef, useState } from 'react'; // Added useState for potential future use, not strictly needed for current fix
import L from 'leaflet'; // Import Leaflet for L.DomEvent
import { useMap } from 'react-leaflet'; // Import useMap

const TimeSliderControl = ({ radarTimeInfo, onTimeChange }) => {
  console.log('TimeSliderControl: Received props - radarTimeInfo:', JSON.parse(JSON.stringify(radarTimeInfo))); // Log every reception
  const controlContainerRef = useRef(null); 
  const sliderInputRef = useRef(null);    
  const map = useMap(); 

  useEffect(() => {
    const div = controlContainerRef.current;
    if (div) {
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
    }
  }, []);

  useEffect(() => {
    const sliderElement = sliderInputRef.current;
    if (!sliderElement || !map) return;

    const handlePointerDown = (e) => {
      e.stopPropagation(); 
      map.dragging.disable();
      window.addEventListener('pointerup', handlePointerUp, { once: true });
    };

    const handlePointerUp = () => {
      map.dragging.enable();
    };

    sliderElement.addEventListener('pointerdown', handlePointerDown);

    return () => {
      sliderElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      if (map && map.dragging && !map.dragging.enabled()) {
        map.dragging.enable();
      }
    };
  }, [map]); 

  if (!radarTimeInfo || !radarTimeInfo.availableTimes || radarTimeInfo.availableTimes.length === 0) {
    console.warn('TimeSliderControl: Not rendering. radarTimeInfo:', radarTimeInfo);
    return null;
  }

  const handleSliderChange = (e) => {
    const newIndex = parseInt(e.target.value, 10);
    onTimeChange(newIndex);
  };

  const formattedTime = radarTimeInfo.currentTimeISO 
    ? new Date(radarTimeInfo.currentTimeISO).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : 'Loading...';

  return (
    <div
      ref={controlContainerRef} // Use renamed ref
      className="leaflet-control leaflet-bottom leaflet-left p-2 bg-white bg-opacity-80 rounded-md shadow-lg"
      style={{ zIndex: 1000, pointerEvents: 'auto', minWidth: '200px', maxWidth: '300px' }}
    >
      <label htmlFor="map-time-slider" className="block text-xs font-medium text-gray-700 mb-1 text-center">
        {formattedTime}
      </label>
      <input
        ref={sliderInputRef} // Assign ref to the input
        id="map-time-slider"
        type="range"
        min="0"
        max={radarTimeInfo.availableTimes.length - 1}
        value={radarTimeInfo.currentIndex}
        onChange={handleSliderChange}
        // onMouseDown is now handled by the pointerdown listener in useEffect
        className="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-primary-dark"
      />
    </div>
  );
};

export default TimeSliderControl;
