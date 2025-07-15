import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MapContainer from '../components/MapContainer';

function MapPage() {
  const [alertGeometry, setAlertGeometry] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Handle URL query parameters for centering map on specific alerts
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const alertData = params.get('alert');
    
    if (alertData) {
      try {
        const parsedAlert = JSON.parse(decodeURIComponent(alertData));
        setAlertGeometry(parsedAlert.geometry);
      } catch (e) {
        console.error('Error parsing alert data from URL:', e);
      }
    }
  }, [location.search]);

  // Handle alert geometry changes from the MapContainer
  const handleAlertGeometry = (geometry) => {
    setAlertGeometry(geometry);
  };

  return (
    <div className="w-full h-full">
      <MapContainer 
        onAlertGeometry={handleAlertGeometry} 
        initialAlertGeometry={alertGeometry}
      />
    </div>
  );
}

export default MapPage;
