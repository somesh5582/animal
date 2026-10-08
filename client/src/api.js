// When the client is served separately from the API (e.g. the client is on
// Cloudflare Pages and the server is hosted elsewhere), set VITE_API_BASE_URL
// to the API origin, e.g. https://api.example.com. Left empty, requests go to
// the same origin, which is how local dev (Vite proxy) and the combined
// Express production server work.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

async function request(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    // Include cookies on cross-origin requests so the session cookie is sent.
    credentials: API_BASE_URL ? 'include' : 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || 'The request could not be completed.');
  }

  return payload;
}

export const api = {
  getDashboard: () => request('/api/dashboard'),
  getPurchases: () => request('/api/purchases'),
  getInventory: () => request('/api/inventory'),
  getSales: () => request('/api/sales'),
  getWeights: () => request('/api/weights'),
  getTreatments: () => request('/api/treatments'),
  getFeeds: () => request('/api/feeds'),
  getRooms: () => request('/api/rooms'),
  getRoomAssignments: () => request('/api/room-assignments'),
  getExpenditures: () => request('/api/expenditures'),
  createPurchase: (purchase) => request('/api/purchases', {
    method: 'POST',
    body: JSON.stringify(purchase),
  }),
  updatePurchase: (id, purchase) => request(`/api/purchases/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(purchase),
  }),
  deletePurchase: (id) => request(`/api/purchases/${id}`, {
    method: 'DELETE',
  }),
  createSale: (sale) => request('/api/sales', {
    method: 'POST',
    body: JSON.stringify(sale),
  }),
  deleteSale: (id) => request(`/api/sales/${id}`, {
    method: 'DELETE',
  }),
  createWeight: (weight) => request('/api/weights', {
    method: 'POST',
    body: JSON.stringify(weight),
  }),
  updateWeight: (id, weight) => request(`/api/weights/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(weight),
  }),
  deleteWeight: (id) => request(`/api/weights/${id}`, {
    method: 'DELETE',
  }),
  createTreatment: (treatment) => request('/api/treatments', {
    method: 'POST',
    body: JSON.stringify(treatment),
  }),
  deleteTreatment: (id) => request(`/api/treatments/${id}`, {
    method: 'DELETE',
  }),
  createFeed: (feed) => request('/api/feeds', {
    method: 'POST',
    body: JSON.stringify(feed),
  }),
  deleteFeed: (id) => request(`/api/feeds/${id}`, {
    method: 'DELETE',
  }),
  createRoom: (room) => request('/api/rooms', {
    method: 'POST',
    body: JSON.stringify(room),
  }),
  updateRoom: (id, room) => request(`/api/rooms/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(room),
  }),
  deleteRoom: (id) => request(`/api/rooms/${id}`, {
    method: 'DELETE',
  }),
  createRoomAssignment: (assignment) => request('/api/room-assignments', {
    method: 'POST',
    body: JSON.stringify(assignment),
  }),
  moveRoomAssignment: (id, roomId) => request(`/api/room-assignments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ roomId }),
  }),
  deleteRoomAssignment: (id) => request(`/api/room-assignments/${id}`, {
    method: 'DELETE',
  }),
  createExpenditure: (expenditure) => request('/api/expenditures', {
    method: 'POST',
    body: JSON.stringify(expenditure),
  }),
  deleteExpenditure: (id) => request(`/api/expenditures/${id}`, {
    method: 'DELETE',
  }),
  getShedConstructions: () => request('/api/shed-constructions'),
  getShedConstructionCategories: () => request('/api/shed-constructions/categories'),
  createShedConstruction: (entry) => request('/api/shed-constructions', {
    method: 'POST',
    body: JSON.stringify(entry),
  }),
  deleteShedConstruction: (id) => request(`/api/shed-constructions/${id}`, {
    method: 'DELETE',
  }),
};
