import { apiRequest } from './api';

export function fetchPayments(studentId) {
  const suffix = studentId ? `?student_id=${studentId}` : '';
  return apiRequest(`/api/payments${suffix}`);
}

export function createManualPayment(payload) {
  return apiRequest('/api/payments/manual', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function initiateSTKPush(payload) {
  return apiRequest('/api/payments/stkpush', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
