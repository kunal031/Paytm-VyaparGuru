import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient, apiRequest } from '../../services/apiClient.js';

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: () => apiRequest(apiClient.get('/integrations')),
  });
}

/** Await mutateAsync and apply the returned list yourself (see IntegrationsPage). */
export function useConnectIntegration() {
  return useMutation({
    mutationFn: ({ provider, action }) =>
      apiRequest(apiClient.post(`/integrations/${provider}/${action}`)),
  });
}

export function useImportedData(provider, enabled) {
  return useQuery({
    queryKey: ['integrations', provider, 'data'],
    queryFn: () => apiRequest(apiClient.get(`/integrations/${provider}/data`)),
    enabled: Boolean(provider) && enabled,
  });
}
