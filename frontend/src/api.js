import axios from 'axios';

// Google Apps Script Web App URL — set via environment variable at build time
const GAS_URL = import.meta.env.VITE_API_URL || '';

function getToken() { return localStorage.getItem('token') || ''; }

// Translate REST calls → GAS Web App calls
// GAS only supports GET and POST, so we simulate PUT/DELETE via POST with _method field
const api = {
  async get(path, config = {}) {
    const params = { path: stripApiPrefix(path), token: getToken(), ...(config.params || {}) };
    const r = await axios.get(GAS_URL, { params });
    return r;
  },
  async post(path, data = {}) {
    const params = { path: stripApiPrefix(path) };
    const body = { ...data, _token: getToken() };
    const r = await axios.post(GAS_URL, body, { params });
    return r;
  },
  async put(path, data = {}) {
    const params = { path: stripApiPrefix(path) };
    const body = { ...data, _method: 'PUT', _token: getToken() };
    const r = await axios.post(GAS_URL, body, { params });
    return r;
  },
  async delete(path) {
    const params = { path: stripApiPrefix(path) };
    const body = { _method: 'DELETE', _token: getToken() };
    const r = await axios.post(GAS_URL, body, { params });
    return r;
  }
};

function stripApiPrefix(path) {
  return path.replace(/^\/api\//, '');
}

export default api;
