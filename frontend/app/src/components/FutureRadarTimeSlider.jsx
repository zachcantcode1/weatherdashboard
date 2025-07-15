import React from 'react';

/**
 * FutureRadarTimeSlider component
 * Standalone time slider for future radar forecast, styled to match MapControls and RadarTimeSlider
 * Positioned independently to avoid map interaction conflicts
 */
const FutureRadarTimeSlider = ({
  forecastMinute = 0,
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
    const newMinutes = parseInt(e.target.value, 10);
    onTimeChange(newMinutes);
  };

  // Format time for display
  const formatForecastTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) {
      return `+${mins}m`;
    }
    return `+${hours}h ${mins}m`;
  };

  // Get current time + forecast offset for display
  const getCurrentForecastTime = () => {
    if (!modelRun) return '';
    try {
      const modelTime = new Date(modelRun.replace(' ', 'T') + 'Z');
      const forecastTime = new Date(modelTime.getTime() + forecastMinute * 60 * 1000);
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
  const sliderPercentage = (forecastMinute / 1080) * 100;

  return (
    <div className={`${positionClass} z-[1000] w-72 rounded-lg bg-gray-800/90 backdrop-blur-md shadow-lg p-4`}>
      <h3 className="text-sm font-semibold text-gray-200 mb-2">Future Radar Forecast</h3>
      
      {/* Model run info */}
      <div className="text-xs text-gray-400 mb-3">
        {isLoading ? 'Loading...' : 
         modelRun ? `Model: ${new Date(modelRun.replace(' ', 'T') + 'Z').toLocaleString('en-US', { 
           month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' 
         })}` : 'No data'}
      </div>
      
      {/* Current forecast time display */}
      <div className="text-center mb-3">
        <div className="text-lg font-mono text-teal-400 bg-gray-700/50 rounded px-2 py-1 relative">
          {formatForecastTime(forecastMinute)}
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
          max="1080"
          step="15"
          value={forecastMinute}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
          style={{
            background: `linear-gradient(to right, #374151 0%, #374151 ${sliderPercentage}%, #6B7280 ${sliderPercentage}%, #6B7280 100%)`
          }}
        />
        
        {/* Time range labels */}
        <div className="flex justify-between text-xs text-gray-400">
          <span>Now</span>
          <span className="text-gray-300">
            {Math.floor(forecastMinute / 15) + 1} / {Math.floor(1080 / 15) + 1}
          </span>
          <span>+18h</span>
        </div>
      </div>

      {/* Additional info */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="text-xs text-center text-gray-400">
          HRRR Model Forecast • 15-minute intervals
        </div>
      </div>
    </div>
  );
};

export default FutureRadarTimeSlider;
