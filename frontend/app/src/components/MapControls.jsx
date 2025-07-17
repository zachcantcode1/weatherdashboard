import React, { useState, useEffect, useRef } from 'react';

/**
 * MapControls component
 * Centralized panel for map layer selection and radar opacity slider.
 * TailwindCSS / shadcn inspired dark style.
 */
const MapControls = ({
  mapSelection,
  setMapSelection,
  spcOutlookLayer,
  setSpcOutlookLayer,
  positionClass = 'absolute top-4 left-1/2 transform -translate-x-1/2',
}) => {
  const [showSpcSubmenu, setShowSpcSubmenu] = useState(false);
  const submenuRef = useRef(null);

  // Close submenu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (submenuRef.current && !submenuRef.current.contains(event.target)) {
        setShowSpcSubmenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Available SPC Outlook layers (KML-based)
  const spcLayers = [
    // Day 1 Outlooks
    { id: 'day1-categorical', name: 'Day 1 Categorical', description: 'Day 1 Categorical Outlook', type: 'categorical', day: 1 },
    { id: 'day1-tornado', name: 'Day 1 Tornado Prob', description: 'Day 1 Probabilistic Tornado Outlook', type: 'tornado', day: 1 },
    { id: 'day1-hail', name: 'Day 1 Hail Prob', description: 'Day 1 Probabilistic Hail Outlook', type: 'hail', day: 1 },
    { id: 'day1-wind', name: 'Day 1 Wind Prob', description: 'Day 1 Probabilistic Wind Outlook', type: 'wind', day: 1 },
    
    // Day 2 Outlooks
    { id: 'day2-categorical', name: 'Day 2 Categorical', description: 'Day 2 Categorical Outlook', type: 'categorical', day: 2 },
    { id: 'day2-tornado', name: 'Day 2 Tornado Prob', description: 'Day 2 Probabilistic Tornado Outlook', type: 'tornado', day: 2 },
    { id: 'day2-hail', name: 'Day 2 Hail Prob', description: 'Day 2 Probabilistic Hail Outlook', type: 'hail', day: 2 },
    { id: 'day2-wind', name: 'Day 2 Wind Prob', description: 'Day 2 Probabilistic Wind Outlook', type: 'wind', day: 2 },
    
    // Day 3 Outlook
    { id: 'day3-categorical', name: 'Day 3 Categorical', description: 'Day 3 Categorical Outlook', type: 'categorical', day: 3 },
    { id: 'day3-probabilistic', name: 'Day 3 Probabilistic', description: 'Day 3 Probabilistic Outlook', type: 'probabilistic', day: 3 },
    
    // Day 4-8 Extended Outlooks
    { id: 'day4-probabilistic', name: 'Day 4 Probabilistic', description: 'Day 4 Probabilistic Outlook', type: 'probabilistic', day: 4 },
    { id: 'day5-probabilistic', name: 'Day 5 Probabilistic', description: 'Day 5 Probabilistic Outlook', type: 'probabilistic', day: 5 },
    { id: 'day6-probabilistic', name: 'Day 6 Probabilistic', description: 'Day 6 Probabilistic Outlook', type: 'probabilistic', day: 6 },
    { id: 'day7-probabilistic', name: 'Day 7 Probabilistic', description: 'Day 7 Probabilistic Outlook', type: 'probabilistic', day: 7 },
    { id: 'day8-probabilistic', name: 'Day 8 Probabilistic', description: 'Day 8 Probabilistic Outlook', type: 'probabilistic', day: 8 },
  ];

  const handleSpcOutlookClick = () => {
    setMapSelection('spc-outlooks');
    setShowSpcSubmenu(!showSpcSubmenu);
  };

  const handleSpcLayerSelect = (layerId) => {
    console.log('SPC Layer selected:', layerId); // Debug log
    setSpcOutlookLayer(layerId);
    setShowSpcSubmenu(false);
  };
  return (
    <div className={`${positionClass} z-[1000] rounded-lg bg-gray-800/90 backdrop-blur-md shadow-lg p-3`}>
      {/* Map Layer Selection */}
      <div>
        <div className="flex gap-2">
          <button
            onClick={() => setMapSelection('radar-warnings')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              mapSelection === 'radar-warnings'
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20 border border-teal-400'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600'
            }`}
          >
            Radar with Warnings
          </button>
          <button
            onClick={() => setMapSelection('storm-reports')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              mapSelection === 'storm-reports'
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20 border border-teal-400'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600'
            }`}
          >
            Storm Reports
          </button>
          <div className="relative" ref={submenuRef}>
            <button
              onClick={handleSpcOutlookClick}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                mapSelection === 'spc-outlooks'
                  ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20 border border-teal-400'
                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600'
              }`}
            >
              SPC Outlooks ▼
            </button>
            
            {/* SPC Submenu */}
            {showSpcSubmenu && (
              <div className="absolute top-full left-0 mt-1 bg-gray-800/95 backdrop-blur-md rounded-md shadow-lg border border-gray-600 min-w-48 z-[1001]">
                <div className="p-2 space-y-1">
                  {spcLayers.map((layer) => (
                    <button
                      key={layer.id}
                      onClick={() => handleSpcLayerSelect(layer.id)}
                      className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                        spcOutlookLayer === layer.id
                          ? 'bg-teal-500 text-white'
                          : 'text-gray-200 hover:bg-gray-700'
                      }`}
                      title={layer.description}
                    >
                      {layer.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setMapSelection('future-radar')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              mapSelection === 'future-radar'
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20 border border-teal-400'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600'
            }`}
          >
            Future Radar
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapControls;
