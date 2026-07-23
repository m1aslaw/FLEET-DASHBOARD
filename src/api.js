// In production, set VITE_API_URL in your hosting provider's environment
// variables to your deployed backend's URL (e.g. https://your-app.onrender.com/api).
// Falls back to localhost for local development.
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function getToken() {
  return localStorage.getItem("fleet_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  loginFleetOwner: (email, password) =>
    request("/auth/login/fleet-owner", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  listVehicles: () => request("/vehicles"),

  createVehicle: (payload) =>
    request("/vehicles", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getLatestPing: (vehicleId) =>
    request(`/gps/vehicles/${vehicleId}/latest`).catch((err) => {
      // No location yet is an expected state, not a hard error
      if (err.message.includes("No location")) return null;
      throw err;
    }),

  getHistory: (vehicleId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/gps/vehicles/${vehicleId}/history${qs ? `?${qs}` : ""}`);
  },

  createExpense: (payload) =>
    request("/expenses", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listExpenses: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/expenses${qs ? `?${qs}` : ""}`);
  },

  deleteExpense: (id) => request(`/expenses/${id}`, { method: "DELETE" }),

  getVehicleSummary: (vehicleId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/vehicles/${vehicleId}/summary${qs ? `?${qs}` : ""}`);
  },

  getFleetSummary: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/fleet/summary${qs ? `?${qs}` : ""}`);
  },

  // Maintenance
  listMaintenance: () => request("/maintenance"),

  createMaintenance: (payload) =>
    request("/maintenance", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateMaintenance: (id, payload) =>
    request(`/maintenance/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteMaintenance: (id) => request(`/maintenance/${id}`, { method: "DELETE" }),

  // Driver behavior
  getBehaviorSummary: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/behavior/summary${qs ? `?${qs}` : ""}`);
  },

  getBehaviorEvents: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/behavior/events${qs ? `?${qs}` : ""}`);
  },

  // Loads
  listLoads: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/loads${qs ? `?${qs}` : ""}`);
  },

  createLoad: (payload) =>
    request("/loads", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateLoad: (id, payload) =>
    request(`/loads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteLoad: (id) => request(`/loads/${id}`, { method: "DELETE" }),
};

export { getToken };
