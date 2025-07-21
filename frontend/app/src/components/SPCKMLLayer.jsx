import React from 'react';
import KMLLayer from './KMLLayer';

/**
 * SPCKMLLayer component
 * Displays SPC Outlook KML files with proper styling and legends
 */
const SPCKMLLayer = ({ outlookType, day }) => {
  // SPC KML file URLs (these are the actual NOAA SPC KML URLs)
  const getKMLUrl = (type, dayNum) => {
    const baseUrl = 'https://www.spc.noaa.gov/products/outlook/';
    
    switch (type) {
      case 'categorical':
        if (dayNum === 1) return `${baseUrl}day1otlk_cat.kml`;
        if (dayNum === 2) return `${baseUrl}day2otlk_cat.kml`;
        if (dayNum === 3) return `${baseUrl}day3otlk_cat.kml`;
        break;
      case 'tornado':
        if (dayNum === 1) return `${baseUrl}day1otlk_torn.kml`;
        if (dayNum === 2) return `${baseUrl}day2otlk_torn.kml`;
        break;
      case 'hail':
        if (dayNum === 1) return `${baseUrl}day1otlk_hail.kml`;
        if (dayNum === 2) return `${baseUrl}day2otlk_hail.kml`;
        break;
      case 'wind':
        if (dayNum === 1) return `${baseUrl}day1otlk_wind.kml`;
        if (dayNum === 2) return `${baseUrl}day2otlk_wind.kml`;
        break;
      case 'probabilistic':
        if (dayNum === 3) return `${baseUrl}day3otlk_prob.kml`;
        if (dayNum >= 4 && dayNum <= 8) return `${baseUrl}day${dayNum}otlk_prob.kml`;
        break;
    }
    return null;
  };

  // Style function for different outlook types
  const getStyleFunction = (type) => {
    return (feature) => {
      const props = feature.properties || {};
      
      switch (type) {
        case 'categorical':
          return getCategoricalStyle(props);
        case 'tornado':
        case 'hail':
        case 'wind':
          return getProbabilisticStyle(props, type);
        case 'probabilistic':
          return getProbabilisticStyle(props, 'general');
        default:
          return getDefaultStyle();
      }
    };
  };

  // Categorical outlook styling (TSTM, MRGL, SLGT, ENH, MDT, HIGH)
  const getCategoricalStyle = (props) => {
    console.log('Categorical feature props:', props); // Debug log
    
    // Use the actual colors from the KML file if available
    const strokeColor = props.stroke || props.STROKE || '#3388ff';
    const fillColor = props.fill || props.FILL || '#87CEEB';
    
    return {
      color: strokeColor,
      weight: 2,
      opacity: 0.9,
      fillColor: fillColor,
      fillOpacity: 0.3 // Lowered for more translucency
    };
  };

  // Probabilistic outlook styling
  const getProbabilisticStyle = (props, hazardType) => {
    console.log('Probabilistic feature props:', props); // Debug log
    
    // Use the actual colors from the KML file if available
    const strokeColor = props.stroke || props.STROKE || '#3388ff';
    const fillColor = props.fill || props.FILL || '#87CEEB';
    
    return {
      color: strokeColor,
      weight: 2,
      opacity: 0.9,
      fillColor: fillColor,
      fillOpacity: 0.3 // Lowered for more translucency
    };
  };

  // Default style
  const getDefaultStyle = () => ({
    color: '#3388ff',
    weight: 2,
    opacity: 0.8,
    fillColor: '#3388ff',
    fillOpacity: 0.4
  });

  // Custom onEachFeature to add popups with outlook information
  const onEachFeature = (feature, layer) => {
    const props = feature.properties || {};
    
    let popupContent = `<div style="font-family: Arial, sans-serif;">`;
    popupContent += `<h4 style="margin: 0 0 8px 0; color: #333;">SPC ${outlookType.charAt(0).toUpperCase() + outlookType.slice(1)} Outlook - Day ${day}</h4>`;
    
    // Add specific information based on outlook type
    if (outlookType === 'categorical') {
      const risk = props.LABEL || props.DN || 'Unknown';
      const description = props.LABEL2 || risk;
      popupContent += `<p><strong>Risk Level:</strong> ${description}</p>`;
      popupContent += `<p><strong>Code:</strong> ${risk}</p>`;
    } else {
      const prob = props.LABEL || props.DN || 0;
      popupContent += `<p><strong>Probability:</strong> ${prob}</p>`;
    }
    
    // Add timing information
    if (props.VALID) {
      popupContent += `<p><strong>Valid:</strong> ${props.VALID}</p>`;
    }
    if (props.EXPIRE) {
      popupContent += `<p><strong>Expires:</strong> ${props.EXPIRE}</p>`;
    }
    if (props.ISSUE) {
      popupContent += `<p><strong>Issued:</strong> ${props.ISSUE}</p>`;
    }
    
    popupContent += `</div>`;
    
    layer.bindPopup(popupContent);
  };

  const kmlUrl = getKMLUrl(outlookType, day);
  
  if (!kmlUrl) {
    console.log(`No KML URL available for ${outlookType} day ${day}`);
    return null;
  }

  return (
    <KMLLayer
      url={kmlUrl}
      style={getStyleFunction(outlookType)}
      onEachFeature={onEachFeature}
      attribution="SPC/NOAA"
    />
  );
};

export default SPCKMLLayer;
