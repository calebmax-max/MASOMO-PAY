import { apiRequest } from './api';

export function getStudentReport(studentId) {
  return apiRequest(`/api/reports/student/${studentId}`);
}
