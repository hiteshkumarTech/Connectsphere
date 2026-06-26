import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Access token lives in memory only (never localStorage) — the refresh token is
// an httpOnly cookie the browser sends automatically to /auth/refresh.
let accessToken = null;
export const setAuthToken = (t) => {
  accessToken = t || null;
};
export const getAuthToken = () => accessToken;

export const api = axios.create({ baseURL: API_URL, withCredentials: true });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Single in-flight refresh so a burst of 401s triggers exactly one refresh call.
let refreshing = null;
async function refreshAccessToken() {
  const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
  const token = res.data?.data?.accessToken;
  setAuthToken(token);
  return token;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const skip =
      !original ||
      original._retry ||
      /\/auth\/(refresh|login|register)/.test(original.url || '');

    if (status === 401 && !skip) {
      original._retry = true;
      try {
        refreshing = refreshing || refreshAccessToken();
        const token = await refreshing;
        refreshing = null;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        setAuthToken(null);
        window.dispatchEvent(new Event('auth:expired')); // AuthContext clears state
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export { refreshAccessToken, API_URL };

export const apiError = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.message || err?.message || fallback;

export const apiFieldErrors = (err) => {
  const list = err?.response?.data?.errors || [];
  return list.reduce((acc, e) => {
    if (e.field && !acc[e.field]) acc[e.field] = e.message;
    return acc;
  }, {});
};
