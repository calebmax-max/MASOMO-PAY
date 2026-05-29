import { apiRequest, setToken, setUser, getUser } from './api';

export async function login(email, password) {
  const data = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
  setUser(data.user);
  return data;
}

export function logout() {
  setToken(null);
  setUser(null);
}

export async function getProfile() {
  return apiRequest('/api/auth/profile');
}

export function getStoredUser() {
  return getUser();
}
