import {
  getPortalStudent,
  getPortalToken,
  portalApiRequest,
  setPortalStudent,
  setPortalToken,
} from './api';

export async function portalLogin(admissionNo, pin) {
  const data = await portalApiRequest('/api/portal/login', {
    method: 'POST',
    body: JSON.stringify({ admission_no: admissionNo, pin }),
  });
  setPortalToken(data.access_token);
  setPortalStudent(data.student);
  return data;
}

export function portalLogout() {
  setPortalToken(null);
  setPortalStudent(null);
}

export function getStoredPortalStudent() {
  return getPortalStudent();
}

export function hasPortalSession() {
  return Boolean(getPortalToken());
}

export function getPortalProfile() {
  return portalApiRequest('/api/portal/profile');
}

export function getPortalPayments() {
  return portalApiRequest('/api/portal/payments');
}

export function portalPayFees(payload) {
  return portalApiRequest('/api/portal/payments/stkpush', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
