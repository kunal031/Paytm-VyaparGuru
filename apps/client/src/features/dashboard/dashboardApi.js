import { useQuery } from '@tanstack/react-query';
import { apiClient, apiRequest } from '../../services/apiClient.js';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => apiRequest(apiClient.get('/dashboard/summary', { timeout: 60_000 })),
    staleTime: 60_000,
  });
}
