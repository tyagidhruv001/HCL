import React, { createContext, useContext, useState, useCallback } from 'react';
import { Storage } from '../utils/storage.js';
import { ProfileAPI } from '../services/profile.api.js';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(() => Storage.getProfile());

  const refreshProfile = useCallback(async () => {
    if (!Storage.getToken()) return;
    try {
      const response = await ProfileAPI.getProfile();
      if (response && response.status === 'success' && response.data) {
        Storage.saveProfile(response.data);
        setProfile(Storage.getProfile());
      }
    } catch (err) {
      console.warn('Could not refresh profile from server, using local fallback:', err.message);
    }
  }, []);

  const updateProfile = useCallback(async (data) => {
    // Optimistically update local storage and context state
    Storage.saveProfile(data);
    setProfile(Storage.getProfile());

    if (Storage.getToken()) {
      try {
        const body = {
          goal: data.goal,
          level: data.level,
          interests: data.interests,
          timeline: data.timeline,
          currentSkills: data.currentSkills,
          onboarded: data.onboarded
        };
        await ProfileAPI.updateProfile(body);
      } catch (err) {
        console.error('Failed to sync profile with database:', err.message);
      }
    }
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, refreshProfile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
