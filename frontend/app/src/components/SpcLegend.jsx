import React from 'react';

/**
 * SPC Legend component
 * Displays color-coded legend for SPC Convective Outlooks
 */
const SpcLegend = ({ layerId, layerName }) => {
  // Define SPC risk categories and their colors based on actual KML data
  const categoricalRisks = [
    { level: 'TSTM', name: 'General Thunderstorms', color: '#55BB55', description: 'General Thunderstorms' },
    { level: 'MRGL', name: 'Marginal', color: '#005500', description: 'Marginal Risk' },
    { level: 'SLGT', name: 'Slight', color: '#DDAA00', description: 'Slight Risk' },
    { level: 'ENH', name: 'Enhanced', color: '#FF8800', description: 'Enhanced Risk' },
    { level: 'MDT', name: 'Moderate', color: '#FF0000', description: 'Moderate Risk' },
    { level: 'HIGH', name: 'High', color: '#FF00FF', description: 'High Risk' }
  ];

  // Note: These colors are extracted from actual NOAA SPC KML files

  // Define probability colors for tornado, hail, and wind based on official SPC standards and actual KML data
  const probabilityColors = [
    { range: '2%', color: '#66BB66', description: '2% probability' },
    { range: '5%', color: '#70380f', description: '5% probability' }, // From actual KML data
    { range: '10%', color: '#DDAA00', description: '10% probability' },
    { range: '15%', color: '#FF8800', description: '15% probability' },
    { range: '30%', color: '#FF0000', description: '30% probability' },
    { range: '45%', color: '#CC0099', description: '45% probability' },
    { range: '60%+', color: '#FF00FF', description: '60%+ probability' }
  ];

  // Note: The actual colors displayed on the map come directly from the KML files
  // This legend shows the standard SPC probability thresholds and typical colors

  // Determine if this is a categorical or probabilistic outlook
  const isCategorical = layerName && layerName.toLowerCase().includes('categorical');
  const isTornado = layerName && layerName.toLowerCase().includes('tornado');
  const isHail = layerName && layerName.toLowerCase().includes('hail');
  const isWind = layerName && layerName.toLowerCase().includes('wind');
  const isProbabilistic = isTornado || isHail || isWind || (layerName && layerName.toLowerCase().includes('probabilistic'));

  const legendItems = isCategorical ? categoricalRisks : probabilityColors;
  const title = isCategorical ? 'Risk Categories' : 
    isTornado ? 'Tornado Probabilities' :
    isHail ? 'Hail Probabilities' :
    isWind ? 'Wind Probabilities' : 
    isProbabilistic ? 'Probabilities' : 'Risk Categories';

  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-gray-800/90 backdrop-blur-md rounded-lg shadow-lg p-3 min-w-48">
      <div className="text-white text-sm font-semibold mb-2 border-b border-gray-600 pb-2">
        SPC {title}
      </div>
      
      <div className="space-y-1">
        {legendItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded border border-gray-600 flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-200 text-xs">
              {isCategorical ? item.name : item.range}
            </span>
          </div>
        ))}
      </div>
      
      {/* Data info */}
      <div className="mt-3 pt-2 border-t border-gray-600">
        <div className="text-gray-400 text-xs">
          {layerName || 'SPC Outlook'}
        </div>
        <div className="text-gray-500 text-xs">
          Source: NOAA/NWS SPC
        </div>
      </div>
    </div>
  );
};

export default SpcLegend;
