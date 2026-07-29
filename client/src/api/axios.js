import axios from 'axios';

// Local: Vite proxies /api → localhost:4000
// Production: set VITE_API_URL to your Railway URL, e.g. https://xxx.up.railway.app/api
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  err => Promise.reject(err)
);

export default api;
