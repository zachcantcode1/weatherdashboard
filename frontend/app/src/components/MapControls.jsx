import React from 'react';

/**
 * MapControls component
 * Centralized panel for map layer toggles and radar opacity slider.
 * TailwindCSS / shadcn inspired dark style.
 */
const MapControls = ({
  showRadar,
  setShowRadar,
  showWwa,
  setShowWwa,
  showLsr,
  setShowLsr,

  radarOpacity,
  setRadarOpacity,
  positionClass = 'fixed top-4 right-4',
}) => {
  return (
    <div className={`${positionClass} z-[1000] w-56 rounded-lg bg-gray-800/90 backdrop-blur-md shadow-lg p-4`}>
      <h3 className="text-sm font-semibold text-gray-200 mb-2">Map Controls</h3>

      {/* Layer toggles */}
      <div className="space-y-2 mb-4">
        <label className="flex items-center text-gray-200 text-sm gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="form-checkbox text-teal-500 rounded-md bg-gray-700 border-gray-600 focus:ring-teal-500"
            checked={showRadar}
            onChange={(e) => setShowRadar(e.target.checked)}
          />
          Radar
        </label>
        <label className="flex items-center text-gray-200 text-sm gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="form-checkbox text-teal-500 rounded-md bg-gray-700 border-gray-600 focus:ring-teal-500"
            checked={showWwa}
            onChange={(e) => setShowWwa(e.target.checked)}
          />
          Watches / Warnings
        </label>
        <div>
          <label className="inline-flex items-center space-x-2 text-gray-200 text-sm">
            <input type="checkbox" checked={showLsr} onChange={(e) => setShowLsr(e.target.checked)} className="form-checkbox h-4 w-4" />
            <span>Storm Reports</span>
          </label>
        </div>

      </div>
      {/* Radar opacity slider */}
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
    </div>
  );
};

export default MapControls;
