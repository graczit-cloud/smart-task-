import axios from 'axios';

// In production (Firebase Hosting), API calls go to Render.com backend
// In development, Vite proxy handles /api → localhost:5000
const baseURL = import.meta.env.VITE_API_URL || '';

const api = axios.create({ baseURL });

// Keep Authorization header in sync with localStorage
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
