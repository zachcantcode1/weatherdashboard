import React from 'react';

/**
 * MapControls component
 * Centralized panel for map layer selection and radar opacity slider.
 * TailwindCSS / shadcn inspired dark style.
 */
const MapControls = ({
  mapSelection,
  setMapSelection,
  radarOpacity,
  setRadarOpacity,
  positionClass = 'fixed top-4 right-4',
}) => {
  return (
    <div className={`${positionClass} z-[1000] w-56 rounded-lg bg-gray-800/90 backdrop-blur-md shadow-lg p-4`}>
      <h3 className="text-sm font-semibold text-gray-200 mb-3">Map Controls</h3>

      {/* Map Layer Selection */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-gray-300 mb-2">Display</h4>
        <div className="space-y-2">
          <label className="flex items-center text-gray-200 text-sm gap-2 cursor-pointer select-none">
            <input
              type="radio"
              name="mapLayer"
              value="radar-warnings"
              className="form-radio text-teal-500 bg-gray-700 border-gray-600 focus:ring-teal-500"
              checked={mapSelection === 'radar-warnings'}
              onChange={(e) => setMapSelection(e.target.value)}
            />
            Radar with Warnings
          </label>
          <label className="flex items-center text-gray-200 text-sm gap-2 cursor-pointer select-none">
            <input
              type="radio"
              name="mapLayer"
              value="storm-reports"
              className="form-radio text-teal-500 bg-gray-700 border-gray-600 focus:ring-teal-500"
              checked={mapSelection === 'storm-reports'}
              onChange={(e) => setMapSelection(e.target.value)}
            />
            Storm Reports
          </label>
          <label className="flex items-center text-gray-200 text-sm gap-2 cursor-pointer select-none">
            <input
              type="radio"
              name="mapLayer"
              value="warnings-only"
              className="form-radio text-teal-500 bg-gray-700 border-gray-600 focus:ring-teal-500"
              checked={mapSelection === 'warnings-only'}
              onChange={(e) => setMapSelection(e.target.value)}
            />
            Warnings Only
          </label>
          <label className="flex items-center text-gray-200 text-sm gap-2 cursor-pointer select-none">
            <input
              type="radio"
              name="mapLayer"
              value="future-radar"
              className="form-radio text-teal-500 bg-gray-700 border-gray-600 focus:ring-teal-500"
              checked={mapSelection === 'future-radar'}
              onChange={(e) => setMapSelection(e.target.value)}
            />
            Future Radar
          </label>
        </div>
      </div>
      {/* Radar opacity slider - only show when radar is enabled */}
      {(mapSelection === 'radar-warnings' || mapSelection === 'future-radar') && (
        <div className="mt-4">
          <label htmlFor="opacity" className="block text-xs text-gray-400 mb-1">
            Radar Opacity
          </label>
          <input
            id="opacity"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={radarOpacity}
            onChange={(e) => setRadarOpacity(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
        </div>
      )}
    </div>
  );
};

export default MapControls;
