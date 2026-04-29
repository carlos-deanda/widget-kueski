const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

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

export function getDashboard(userId) {
  return request(`/api/users/${userId}/dashboard`);
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
