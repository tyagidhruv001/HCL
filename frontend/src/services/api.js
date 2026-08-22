import { Storage } from '../utils/storage.js';

export const API_BASE_URL = 'http://localhost:5000/api';

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
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}
