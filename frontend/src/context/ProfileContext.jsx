import React, { createContext, useContext, useState, useCallback } from 'react';
import { Storage } from '../utils/storage.js';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(() => Storage.getProfile());

  const refreshProfile = useCallback(() => {
    setProfile(Storage.getProfile());
  }, []);

  const updateProfile = useCallback((data) => {
    Storage.saveProfile(data);
    setProfile(Storage.getProfile());
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
