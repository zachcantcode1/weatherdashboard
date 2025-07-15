import React from 'react';

/**
 * RadarTimeSlider component
 * Standalone time slider for radar imagery, styled to match MapControls
 * Positioned independently to avoid map interaction conflicts
 */
const RadarTimeSlider = ({
  radarTimes = [],
  selectedTime = null,
  onTimeChange,
  isLoading = false,
  isLooping = false,
  onLoopToggle,
  positionClass = 'fixed bottom-4 left-4',
}) => {
  if (!radarTimes || radarTimes.length === 0) {
    return null;
  }

  // Find current index based on selected time
  const currentIndex = radarTimes.findIndex(time => time.timestamp === selectedTime);
  const validIndex = currentIndex >= 0 ? currentIndex : radarTimes.length - 1;

  const handleSliderChange = (e) => {
    const newIndex = parseInt(e.target.value, 10);
    const selectedTime = radarTimes[newIndex];
    onTimeChange(newIndex, selectedTime.timestamp);
  };

  const formattedTime = selectedTime && radarTimes.length > 0
    ? radarTimes.find(time => time.timestamp === selectedTime)?.display || 'Loading...'
    : radarTimes[validIndex]?.display || 'Loading...';

  // Get oldest and newest times for display  
  const oldestTime = radarTimes[0]?.display || '';
  const newestTime = radarTimes[radarTimes.length - 1]?.display || '';

  // Format times to show only time part (remove date if present)
  const formatDisplayTime = (timeStr) => {
    if (timeStr.includes(' CT')) {
      return timeStr.split(' ')[0]; // Just the time part
    }
    return timeStr;
  };

  return (
    <div className={`${positionClass} z-[1000] w-72 rounded-lg bg-gray-800/90 backdrop-blur-md shadow-lg p-4`}>
      <h3 className="text-sm font-semibold text-gray-200 mb-2">Radar Time</h3>
      
      {/* Current time display with loading indicator */}
      <div className="text-center mb-3">
        <div className="text-lg font-mono text-teal-400 bg-gray-700/50 rounded px-2 py-1 relative">
          {formattedTime}
          {isLoading && (
            <div className="absolute -right-1 -top-1">
              <div className="w-3 h-3 bg-teal-500 rounded-full animate-pulse"></div>
            </div>
          )}
        </div>
        {isLoading && (
          <div className="text-xs text-gray-400 mt-1">
            Loading radar layers...
          </div>
        )}
      </div>

      {/* Time slider */}
      <div className="space-y-2">
        <input
          type="range"
          min="0"
          max={radarTimes.length - 1}
          value={validIndex}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
          style={{
            background: `linear-gradient(to right, #374151 0%, #374151 ${(validIndex / (radarTimes.length - 1)) * 100}%, #6B7280 ${(validIndex / (radarTimes.length - 1)) * 100}%, #6B7280 100%)`
          }}
        />
        
        {/* Time range labels */}
        <div className="flex justify-between text-xs text-gray-400">
          <span>{formatDisplayTime(oldestTime)}</span>
          <span className="text-gray-300">
            {validIndex + 1} / {radarTimes.length}
          </span>
          <span>{formatDisplayTime(newestTime)}</span>
        </div>
      </div>

      {/* Loop control */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <label className="flex items-center justify-center text-gray-200 text-sm gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="form-checkbox text-teal-500 rounded bg-gray-700 border-gray-600 focus:ring-teal-500"
            checked={isLooping}
            onChange={(e) => onLoopToggle && onLoopToggle(e.target.checked)}
          />
          <span className="flex items-center gap-1">
            🔄 Loop Animation
          </span>
        </label>
        {isLooping && (
          <div className="text-xs text-center text-gray-400 mt-1">
            Auto-advancing through radar frames
          </div>
        )}
      </div>
    </div>
  );
};

export default RadarTimeSlider;
