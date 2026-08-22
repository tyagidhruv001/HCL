import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ProfileProvider, useProfile } from './context/ProfileContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';

import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import ApiKeyModal from './components/ApiKeyModal.jsx';

import Landing from './pages/Landing/Landing.jsx';
import Login from './pages/Auth/Login.jsx';
import Register from './pages/Auth/Register.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import Chat from './pages/Home/Chat.jsx';
import Path from './pages/Path/Path.jsx';
import Explore from './pages/Explore/Explore.jsx';
import Onboarding from './pages/Onboarding/Onboarding.jsx';

import { Storage } from './utils/storage.js';

export default function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <ToastProvider>
          <HashRouter>
            <AppContent />
          </HashRouter>
        </ToastProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { refreshProfile } = useProfile();

  // Expose for legacy event-based trigger from any module
  useEffect(() => {
    const handler = () => setApiKeyModalOpen(true);
    window.addEventListener('app:show-apikey', handler);
    return () => window.removeEventListener('app:show-apikey', handler);
  }, []);

  // Fetch latest profile state from database if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshProfile();
    }
  }, [isAuthenticated, refreshProfile]);

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

  // Public routing layout
  const isPublicRoute = ['/', '/login', '/register'].includes(location.pathname);

  if (!isAuthenticated && !isPublicRoute) {
    return <Navigate to="/" replace />;
  }

  if (isPublicRoute) {
    if (isAuthenticated) {
      return <Navigate to="/dashboard" replace />;
    }
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Authenticated layout with Sidebar & Topbar
  return (
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
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
      {apiKeyModalOpen && (
        <ApiKeyModal onClose={() => setApiKeyModalOpen(false)} />
      )}
    </div>
  );
}
