const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

export function getToken() {
  return localStorage.getItem('masomo_token');
}

export function setToken(token) {
  if (!token) {
    localStorage.removeItem('masomo_token');
    return;
  }
  localStorage.setItem('masomo_token', token);
}

export function setUser(user) {
  if (!user) {
    localStorage.removeItem('masomo_user');
    return;
  }
  localStorage.setItem('masomo_user', JSON.stringify(user));
}

export function getUser() {
  const raw = localStorage.getItem('masomo_user');
  return raw ? JSON.parse(raw) : null;
}

export function getPortalToken() {
  return localStorage.getItem('masomo_portal_token');
}

export function setPortalToken(token) {
  if (!token) {
    localStorage.removeItem('masomo_portal_token');
    return;
  }
  localStorage.setItem('masomo_portal_token', token);
}

export function setPortalStudent(student) {
  if (!student) {
    localStorage.removeItem('masomo_portal_student');
    return;
  }
  localStorage.setItem('masomo_portal_student', JSON.stringify(student));
}

export function getPortalStudent() {
  const raw = localStorage.getItem('masomo_portal_student');
  return raw ? JSON.parse(raw) : null;
}

function buildHeaders(options = {}, tokenGetter = getToken) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = tokenGetter();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function request(path, options = {}, tokenGetter = getToken) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options, tokenGetter),
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof data === 'object' ? data.message || data.error || 'Request failed' : 'Request failed';
    throw new Error(message);
  }

  return data;
}

export async function apiRequest(path, options = {}) {
  return request(path, options, getToken);
}

export async function portalApiRequest(path, options = {}) {
  return request(path, options, getPortalToken);
}
