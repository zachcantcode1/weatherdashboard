// src/App.jsx
import 'leaflet/dist/leaflet.css'; // Required for react-leaflet
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import { MapPage } from './pages/MapPage';
import { LiveCamsPage } from './pages/LiveCamsPage'; // Added import for LiveCamsPage
import LsrListPage from './pages/LsrListPage';
import SpcOutlookPage from './pages/SpcOutlookPage'; // Import SPC Outlook Page

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          {/* Routes for Weather Services sub-pages */}

          <Route path="map" element={<MapPage />} />
          <Route path="live-cams" element={<LiveCamsPage />} /> {/* Added route for LiveCamsPage */}
          <Route path="recent-lsr" element={<LsrListPage />} />
          <Route path="spc" element={<SpcOutlookPage />} /> {/* Add SPC Outlook Page Route */}
          {/* Add other routes here later */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
