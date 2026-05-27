const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';

async function parseJsonResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 160);

  if (snippet.startsWith('<!DOCTYPE') || snippet.startsWith('<html')) {
    throw new Error(
      `El backend respondió HTML en lugar de JSON. Verifica que esté corriendo en ${API_BASE_URL} y reinícialo con "npm run dev" en la carpeta backend.`,
    );
  }

  throw new Error(snippet || `Error del servidor (${response.status})`);
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

export function getUsers() {
  return request('/api/users');
}

export function login(username, password) {
  return request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function getNotificationPreferences(userId) {
  return request(`/api/users/${userId}/notification-preferences`);
}

export function updateNotificationPreferences(userId, preferences) {
  return request(`/api/users/${userId}/notification-preferences`, {
    method: 'PATCH',
    body: JSON.stringify(preferences),
  });
}

export function getGoogleNotificationCalendarStartUrl(userId) {
  return `${API_BASE_URL}/api/users/${userId}/notifications/google/start`;
}

export function sendPriceAlert(userId, payload) {
  return request(`/api/users/${userId}/price-alerts`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function sendTestPriceAlertEmail(userId) {
  return request(`/api/users/${userId}/price-alerts/test`, {
    method: 'POST',
  });
}

export function getDashboard(userId) {
  return request(`/api/users/${userId}/dashboard`);
}

export function verifyUserIdentity(userId) {
  return request(`/api/users/${userId}/identity-verification`, {
    method: 'PATCH',
  });
}

export function getCreditOptions(userId) {
  return request(`/api/users/${userId}/credit-options`);
}

export function requestCredit(userId, payload) {
  return request(`/api/users/${userId}/credit-requests`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getPurchase(purchaseId) {
  return request(`/api/purchases/${purchaseId}`);
}

export function getPriceTracking(trackingId) {
  return request(`/api/price-trackings/${trackingId}`);
}

export function getGoogleCalendarStartUrl(purchaseId) {
  return `${API_BASE_URL}/api/purchases/${purchaseId}/calendar/google/start`;
}

export function getAppleCalendarUrl(purchaseId) {
  return `${API_BASE_URL}/api/purchases/${purchaseId}/calendar/ics`;
}

export function openAppleCalendar(purchaseId) {
  return request(`/api/purchases/${purchaseId}/calendar/apple/open`, {
    method: 'POST',
  });
}

function checkoutCalendarQuery(payload) {
  const params = new URLSearchParams({
    productName: payload.productName,
    installmentAmount: String(payload.installmentAmount),
    totalInstallments: String(payload.totalInstallments),
    firstPaymentDate: payload.firstPaymentDate,
  });

  return params.toString();
}

export function getCheckoutGoogleCalendarStartUrl(payload) {
  return `${API_BASE_URL}/api/calendar/checkout/google/start?${checkoutCalendarQuery(payload)}`;
}

export function getCheckoutAppleCalendarUrl(payload) {
  return `${API_BASE_URL}/api/calendar/checkout/ics?${checkoutCalendarQuery(payload)}`;
}

export function openCheckoutAppleCalendar(payload) {
  return request('/api/calendar/checkout/apple/open', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
