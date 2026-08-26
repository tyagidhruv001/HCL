import { Storage } from '../utils/storage.js';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

export async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };

  const token = Storage.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers }
  });
  if (response.status === 401) {
    Storage.clearToken();
    Storage.clearUser();
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new Error('Session expired or unauthorized');
  }
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
};

