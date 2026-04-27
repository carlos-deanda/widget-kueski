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

export function getPurchase(purchaseId) {
  return request(`/api/purchases/${purchaseId}`);
}

export function getPriceTracking(trackingId) {
  return request(`/api/price-trackings/${trackingId}`);
}
