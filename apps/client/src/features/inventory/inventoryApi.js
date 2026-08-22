import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, apiRequest } from '../../services/apiClient.js';

export function useInventoryOverview() {
  return useQuery({
    queryKey: ['inventory', 'overview'],
    queryFn: () => apiRequest(apiClient.get('/inventory/overview')),
    staleTime: 60_000,
  });
}

export function useOnboardPhoto() {
  return useMutation({
    mutationFn: (file) => {
      const form = new FormData();
      form.append('photo', file);
      return apiRequest(
        apiClient.post('/inventory/onboard/photo', form, { timeout: 90_000 })
      );
    },
  });
}

export function useOnboardVoice() {
  return useMutation({
    mutationFn: (file) => {
      const form = new FormData();
      form.append('audio', file);
      return apiRequest(
        apiClient.post('/inventory/onboard/voice', form, { timeout: 120_000 })
      );
    },
  });
}

export function useSaveSkus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items) => apiRequest(apiClient.post('/inventory/skus/bulk', { items })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
