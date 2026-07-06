import { API_BASE_URL, apiRequest, getToken } from './api';

export function getStudentReport(studentId) {
  return apiRequest(`/api/reports/student/${studentId}`);
}

export async function downloadReportBundle() {
  const response = await fetch(`${API_BASE_URL}/api/reports/download`, {
    headers: {
      Authorization: `Bearer ${getToken() || ''}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || 'Could not download report bundle');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'masomo-report-bundle.zip';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadStudentReport(studentId) {
  const response = await fetch(`${API_BASE_URL}/api/reports/student/${studentId}/download`, {
    headers: {
      Authorization: `Bearer ${getToken() || ''}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || 'Could not download student record');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `student-${studentId}-record.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
