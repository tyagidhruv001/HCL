import { Storage } from '../../utils/storage.js';

export const ProfileService = {
  async getProfile() {
    return Storage.getProfile();
  },
  async updateProfile(profileData) {
    return Storage.saveProfile(profileData);
  }
};
