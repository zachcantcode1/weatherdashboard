import React from 'react';

/**
 * HRRRTimeSlider component
 * Time slider for HRRR model forecast hours, styled to match other time sliders
 * Allows scrubbing through forecast hours f00-f48
 */
const HRRRTimeSlider = ({
  forecastHour = 0,
  onTimeChange,
  modelRun = null,
  isLoading = false,
  error = null,
  positionClass = 'fixed bottom-4 left-4',
}) => {
  if (!modelRun || error) {
    return null;
  }

  const handleSliderChange = (e) => {
    const newHour = parseInt(e.target.value, 10);
    onTimeChange(newHour);
  };

  // Format forecast hour for display
  const formatForecastHour = (hour) => {
    if (hour === 0) {
      return 'Analysis (f00)';
    }
    return `+${hour}h (f${String(hour).padStart(2, '0')})`;
  };

  // Get current time + forecast offset for display
  const getCurrentForecastTime = () => {
    if (!modelRun) return '';
    try {
      const modelTime = new Date(modelRun);
      const forecastTime = new Date(modelTime.getTime() + forecastHour * 60 * 60 * 1000);
      return forecastTime.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch (err) {
      return '';
    }
  };

  // Calculate percentage for slider background
  const sliderPercentage = (forecastHour / 48) * 100;

  return (
    <div className={`${positionClass} z-[1000] w-72 rounded-lg bg-gray-800/90 backdrop-blur-md shadow-lg p-4`}>
      <h3 className="text-sm font-semibold text-gray-200 mb-2">HRRR Model Forecast</h3>
      
      {/* Model run info */}
      <div className="text-xs text-gray-400 mb-3">
        {isLoading ? 'Loading...' : 
         modelRun ? `Model: ${new Date(modelRun).toLocaleString('en-US', { 
           month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' 
         })}` : 'No data'}
      </div>
      
      {/* Current forecast time display */}
      <div className="text-center mb-3">
        <div className="text-lg font-mono text-teal-400 bg-gray-700/50 rounded px-2 py-1 relative">
          {formatForecastHour(forecastHour)}
          {isLoading && (
            <div className="absolute -right-1 -top-1">
              <div className="w-3 h-3 bg-teal-500 rounded-full animate-pulse"></div>
            </div>
          )}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {getCurrentForecastTime()}
        </div>
      </div>

      {/* Time slider */}
      <div className="space-y-2">
        <input
          type="range"
          min="0"
          max="48"
          step="1"
          value={forecastHour}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
          style={{
            background: `linear-gradient(to right, #374151 0%, #374151 ${sliderPercentage}%, #6B7280 ${sliderPercentage}%, #6B7280 100%)`
          }}
        />
        
        {/* Time range labels */}
        <div className="flex justify-between text-xs text-gray-400">
          <span>Analysis</span>
          <span className="text-gray-300">
            Hour {forecastHour} / 48
          </span>
          <span>+48h</span>
        </div>
      </div>

      {/* Additional info */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="text-xs text-center text-gray-400">
          HRRR Model • Hourly forecasts • High-Resolution Reflectivity
        </div>
      </div>
    </div>
  );
};

export default HRRRTimeSlider;
