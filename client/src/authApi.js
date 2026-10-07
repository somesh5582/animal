async function authRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'The request could not be completed.');
  return payload;
}

export const authApi = {
  status: () => authRequest('/api/auth/status'),
  me: () => authRequest('/api/auth/me'),
  setup: (input) => authRequest('/api/auth/setup', {
    method: 'POST', body: JSON.stringify(input),
  }),
  login: (input) => authRequest('/api/auth/login', {
    method: 'POST', body: JSON.stringify(input),
  }),
  logout: () => authRequest('/api/auth/logout', { method: 'POST' }),
  listUsers: () => authRequest('/api/users'),
  createUser: (input) => authRequest('/api/users', {
    method: 'POST', body: JSON.stringify(input),
  }),
  setUserActive: (id, isActive) => authRequest(`/api/users/${id}/active`, {
    method: 'PATCH', body: JSON.stringify({ isActive }),
  }),
  resetPassword: (id, password) => authRequest(`/api/users/${id}/password`, {
    method: 'PATCH', body: JSON.stringify({ password }),
  }),
};
