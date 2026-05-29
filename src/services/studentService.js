import { apiRequest } from './api';

export function getStudents(query = '') {
  const suffix = query ? `?q=${encodeURIComponent(query)}` : '';
  return apiRequest(`/api/students${suffix}`);
}

export function getStudent(studentId) {
  return apiRequest(`/api/students/${studentId}`);
}

export function createStudent(payload) {
  return apiRequest('/api/students', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateStudent(studentId, payload) {
  return apiRequest(`/api/students/${studentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteStudent(studentId) {
  return apiRequest(`/api/students/${studentId}`, {
    method: 'DELETE',
  });
}
