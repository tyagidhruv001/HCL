import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthAPI } from '../services/auth.api.js';
import { Storage } from '../utils/storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => Storage.getToken());
  const [user, setUser] = useState(() => Storage.getUser());
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const response = await AuthAPI.login({ email, password });
      if (response && response.status === 'success' && response.data) {
        const { token, user: userSummary } = response.data;
        Storage.saveToken(token);
        Storage.saveUser(userSummary);
        setToken(token);
        setUser(userSummary);
        return response.data;
      } else {
        throw new Error(response?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    setLoading(true);
    try {
      const response = await AuthAPI.register({ name, email, password });
      if (response && response.status === 'success') {
        return response.data;
      } else {
        throw new Error(response?.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    Storage.clearToken();
    Storage.clearUser();
    Storage.clearPath();
    Storage.clearChat();
    // We can also clear the profile
    localStorage.removeItem('alpr_profile_v2');
    setToken('');
    setUser(null);
  }, []);

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
