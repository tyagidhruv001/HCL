export const Auth = {
  getCurrentUser() {
    return { name: 'Demo User', role: 'student' };
  },
  isAuthenticated() {
    return true;
  }
};
