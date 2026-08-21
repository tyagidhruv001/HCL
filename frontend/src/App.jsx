import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import { ProfileProvider } from './context/ProfileContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';

import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import ApiKeyModal from './components/ApiKeyModal.jsx';

import Dashboard from './pages/Dashboard/Dashboard.jsx';
import Chat from './pages/Home/Chat.jsx';
import Path from './pages/Path/Path.jsx';
import Explore from './pages/Explore/Explore.jsx';
import Onboarding from './pages/Onboarding/Onboarding.jsx';

import { Storage } from './utils/storage.js';

export default function App() {
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);

  // Expose for legacy event-based trigger from any module
  useEffect(() => {
    const handler = () => setApiKeyModalOpen(true);
    window.addEventListener('app:show-apikey', handler);
    return () => window.removeEventListener('app:show-apikey', handler);
  }, []);

  // Show API key prompt for onboarded users without a key
  useEffect(() => {
    const profile = Storage.getProfile();
    if (profile.onboarded && !Storage.hasApiKey()) {
      const timer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('app:show-apikey-hint'));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <ProfileProvider>
      <ToastProvider>
        <HashRouter>
          <div id="app-shell">
            <Sidebar onOpenApiKey={() => setApiKeyModalOpen(true)} />
            <div id="main-content">
              <Topbar onOpenApiKey={() => setApiKeyModalOpen(true)} />
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/chat"      element={<Chat />} />
                <Route path="/path"      element={<Path />} />
                <Route path="/explore"   element={<Explore />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="*" element={<DefaultRedirect />} />
              </Routes>
            </div>
          </div>
          {apiKeyModalOpen && (
            <ApiKeyModal onClose={() => setApiKeyModalOpen(false)} />
          )}
        </HashRouter>
      </ToastProvider>
    </ProfileProvider>
  );
}

function DefaultRedirect() {
  const profile = Storage.getProfile();
  return <Navigate to={profile.onboarded ? '/dashboard' : '/onboarding'} replace />;
}
