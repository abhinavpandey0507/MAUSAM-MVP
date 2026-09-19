import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
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
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<Gate />}>
            <Route path="/" element={<Home />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/nowcast" element={<Nowcast />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/radar" element={<RadarPage />} />
            <Route path="/satellite" element={<SatellitePage />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);