import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient, apiRequest } from '../../services/apiClient.js';
import { useAuthStore } from '../../store/authStore.js';

export function useSignup() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: (payload) => apiRequest(apiClient.post('/auth/signup', payload)),
    onSuccess: (data) => setAuth(data),
  });
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: (payload) => apiRequest(apiClient.post('/auth/login', payload)),
    onSuccess: (data) => setAuth(data),
  });
}

export function useMe() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiRequest(apiClient.get('/auth/me')),
    enabled: Boolean(token),
  });
}
