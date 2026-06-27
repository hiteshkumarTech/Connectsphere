import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const API_URL = 'https://connectsphere-z5hy.onrender.com/api';

const ACCESS_KEY = 'cs_access_token';
const REFRESH_KEY = 'cs_refresh_token';

// In-memory copy of the access token for fast request signing.
let accessToken = null;
export function setAccessToken(token) {
  accessToken = token;
}

export const tokenStore = {
  async get() {
    const [a, r] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    return { accessToken: a, refreshToken: r };
  },
  async set(a, r) {
    const tasks = [];
    if (a) tasks.push(SecureStore.setItemAsync(ACCESS_KEY, a));
    if (r) tasks.push(SecureStore.setItemAsync(REFRESH_KEY, r));
    await Promise.all(tasks);
  },
  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
  },
};

const api = axios.create({
  baseURL: API_URL,
  headers: { 'x-client-type': 'mobile' }, // tells the backend to use body-based refresh
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  if (!accessToken) {
    accessToken = await SecureStore.getItemAsync(ACCESS_KEY);
  }
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Single-flight refresh: concurrent 401s share one refresh call.
let refreshing = null;
let onAuthFailure = null;
export function setAuthFailureHandler(fn) {
  onAuthFailure = fn;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isRefreshCall = original?.url?.includes('/auth/refresh');

    if (status === 401 && original && !original._retry && !isRefreshCall) {
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = (async () => {
            const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
            if (!refreshToken) throw new Error('No refresh token');
            const { data } = await axios.post(
              `${API_URL}/auth/refresh`,
              { refreshToken },
              { headers: { 'x-client-type': 'mobile' } }
            );
            const newAccess = data.data.accessToken;
            const newRefresh = data.data.refreshToken;
            await tokenStore.set(newAccess, newRefresh);
            setAccessToken(newAccess);
            return newAccess;
          })();
        }
        const newAccess = await refreshing;
        refreshing = null;
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        await tokenStore.clear();
        setAccessToken(null);
        if (onAuthFailure) onAuthFailure();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export function apiError(err, fallback = 'Something went wrong') {
  return err?.response?.data?.message || err?.message || fallback;
}

export default api;
