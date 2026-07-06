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

export function createAcademicTerm(payload) {
  return apiRequest('/api/settings/academic-terms', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAcademicTerm(termId, payload) {
  return apiRequest(`/api/settings/academic-terms/${termId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteAcademicTerm(termId) {
  return apiRequest(`/api/settings/academic-terms/${termId}`, {
    method: 'DELETE',
  });
}

export function updateFeeStructure(feeStructureId, payload) {
  return apiRequest(`/api/settings/fee-structures/${feeStructureId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function createFeeStructure(payload) {
  return apiRequest('/api/settings/fee-structures', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteFeeStructure(feeStructureId) {
  return apiRequest(`/api/settings/fee-structures/${feeStructureId}`, {
    method: 'DELETE',
  });
}
