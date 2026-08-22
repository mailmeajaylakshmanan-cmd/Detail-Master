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
  
  // Extract CSRF token from cookies
  const match = document.cookie.match(new RegExp('(^| )csrfToken=([^;]+)'));
  if (match) {
    config.headers['x-csrf-token'] = match[2];
  }
  
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
