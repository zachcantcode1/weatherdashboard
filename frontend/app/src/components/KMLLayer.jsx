import React, { useEffect, useState } from 'react';
import { GeoJSON } from 'react-leaflet';
import * as toGeoJSON from '@tmcw/togeojson';

/**
 * KMLLayer component
 * Downloads and displays KML files as GeoJSON on the map
 */
const KMLLayer = ({ 
  url, 
  style = {}, 
  onEachFeature = null,
  attribution = null 
}) => {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) {
      setGeoJsonData(null);
      return;
    }

    const fetchKML = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching KML from:', url);
        
        // Fetch the KML file
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch KML: ${response.status} ${response.statusText}`);
        }
        
        const kmlText = await response.text();
        console.log('KML fetched, length:', kmlText.length);
        
        // Parse the KML string into a DOM document
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(kmlText, 'application/xml');
        
        // Check for parsing errors
        const parserError = kmlDoc.getElementsByTagName('parsererror')[0];
        if (parserError) {
          throw new Error('Failed to parse KML: Invalid XML format');
        }
        
        // Convert KML to GeoJSON
        const geoJson = toGeoJSON.kml(kmlDoc);
        console.log('Converted to GeoJSON:', geoJson);
        
        setGeoJsonData(geoJson);
      } catch (err) {
        console.error('Error loading KML:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchKML();
  }, [url]);

  // Default style function
  const defaultStyle = (feature) => {
    const baseStyle = {
      color: '#3388ff',
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.3,
      fillColor: '#3388ff',
      ...style
    };

    // If style is a function, call it with the feature
    if (typeof style === 'function') {
      return style(feature);
    }

    return baseStyle;
  };

  // Default onEachFeature function
  const defaultOnEachFeature = (feature, layer) => {
    if (feature.properties) {
      // Create popup content from properties
      const popupContent = Object.entries(feature.properties)
        .filter(([key, value]) => value != null && value !== '')
        .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
        .join('<br/>');
      
      if (popupContent) {
        layer.bindPopup(popupContent);
      }
    }

    // Call custom onEachFeature if provided
    if (onEachFeature) {
      onEachFeature(feature, layer);
    }
  };

  if (loading) {
    console.log('KMLLayer: Loading...');
    return null;
  }

  if (error) {
    console.error('KMLLayer error:', error);
    return null;
  }

  if (!geoJsonData || !geoJsonData.features || geoJsonData.features.length === 0) {
    console.log('KMLLayer: No data to display');
    return null;
  }

  console.log('KMLLayer: Rendering', geoJsonData.features.length, 'features');

  return (
    <GeoJSON
      data={geoJsonData}
      style={defaultStyle}
      onEachFeature={defaultOnEachFeature}
      attribution={attribution}
    />
  );
};

export default KMLLayer;
