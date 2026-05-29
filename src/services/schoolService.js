import { apiRequest } from './api';

export function getSchoolSettings() {
  return apiRequest('/api/settings');
}

export function updateSchoolSettings(payload) {
  return apiRequest('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
