import { useQuery } from '@tanstack/react-query';
import { apiClient, apiRequest } from '../../services/apiClient.js';

export function useDailyCashflow(days = 90) {
  return useQuery({
    queryKey: ['cashflow', 'daily', days],
    queryFn: () => apiRequest(apiClient.get('/cashflow/daily', { params: { days } })),
  });
}

export function useExpenseBreakdown(days = 90) {
  return useQuery({
    queryKey: ['cashflow', 'expenses', days],
    queryFn: () => apiRequest(apiClient.get('/cashflow/expenses', { params: { days } })),
  });
}

export function useHiddenExpenses() {
  return useQuery({
    queryKey: ['cashflow', 'hidden-expenses'],
    queryFn: () => apiRequest(apiClient.get('/cashflow/hidden-expenses')),
  });
}

export function useForecast(days = 30) {
  return useQuery({
    queryKey: ['cashflow', 'forecast', days],
    queryFn: () => apiRequest(apiClient.get('/cashflow/forecast', { params: { days } })),
    staleTime: 5 * 60_000, // forecasts are expensive; cache harder
  });
}
