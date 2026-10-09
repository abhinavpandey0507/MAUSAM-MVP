import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Gate } from './App';
import { Home } from './pages/Home';
import { Forecast } from './pages/Forecast';
import { Nowcast } from './pages/Nowcast';
import { Alerts } from './pages/Alerts';
import { RadarPage } from './pages/Radar';
import { SatellitePage } from './pages/Satellite';
import { Demo } from './pages/Demo';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { Auth } from './pages/Auth';
import { History } from './pages/History';
import { AirQuality } from './pages/AirQuality';
import { Dataset } from './pages/Dataset';
import { About } from './pages/About';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppProvider>
        <AuthProvider>
          <Routes>
            <Route element={<Gate />}>
              <Route path="/" element={<Home />} />
              <Route path="/forecast" element={<Forecast />} />
              <Route path="/nowcast" element={<Nowcast />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/radar" element={<RadarPage />} />
              <Route path="/satellite" element={<SatellitePage />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/history" element={<History />} />
              <Route path="/air-quality" element={<AirQuality />} />
              <Route path="/dataset" element={<Dataset />} />
              <Route path="/about" element={<About />} />
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Home />} />
            </Route>
          </Routes>
        </AuthProvider>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
