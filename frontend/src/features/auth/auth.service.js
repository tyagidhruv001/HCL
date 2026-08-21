export const AuthService = {
  async login(credentials) {
    console.log('Auth service: login request', credentials);
    return { token: 'mock-jwt-token' };
  },
  async logout() {
    console.log('Auth service: logout request');
  }
};
