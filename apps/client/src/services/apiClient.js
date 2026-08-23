import axios from 'axios';
import { useAuthStore } from '../store/authStore.js';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  timeout: 20_000,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Session died (e.g. dev server reseeded) — send the user back to login
      // instead of leaving dead buttons everywhere
      useAuthStore.getState().logout();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

/** Unwraps the { success, data, error } envelope; throws error.message on failure. */
export async function apiRequest(promise) {
  try {
    const { data: body } = await promise;
    if (!body.success) throw new Error(body.error?.message || 'Request failed');
    return body.data;
  } catch (err) {
    const message = err.response?.data?.error?.message || err.message || 'Something went wrong';
    const details = err.response?.data?.error?.details;
    const wrapped = new Error(message);
    wrapped.details = details;
    throw wrapped;
  }
}
