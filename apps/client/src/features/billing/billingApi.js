import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, apiRequest } from '../../services/apiClient.js';

// Reads via react-query (queries are reliable); writes via awaited requests
// so component state machines stay in control (see ImportModal precedent).

export function useSkuCatalog() {
  return useQuery({
    queryKey: ['inventory', 'skus'],
    queryFn: () => apiRequest(apiClient.get('/inventory/skus')),
  });
}

export function useBills(date) {
  return useQuery({
    queryKey: ['billing', 'bills', date],
    queryFn: () => apiRequest(apiClient.get('/billing/bills', { params: { date } })),
  });
}

export function useDaySummary(date) {
  return useQuery({
    queryKey: ['billing', 'summary', date],
    queryFn: () => apiRequest(apiClient.get('/billing/summary', { params: { date } })),
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: ['billing', 'customers'],
    queryFn: () => apiRequest(apiClient.get('/billing/customers')),
  });
}

export const createBill = (payload) => apiRequest(apiClient.post('/billing/bills', payload));
export const returnBill = (id, payload) => apiRequest(apiClient.post(`/billing/bills/${id}/return`, payload));
export const addCustomer = (payload) => apiRequest(apiClient.post('/billing/customers', payload));
export const recordPayment = (id, payload) => apiRequest(apiClient.post(`/billing/customers/${id}/payment`, payload));
export const getCustomerKhata = (id) => apiRequest(apiClient.get(`/billing/customers/${id}`));

/** Billing writes touch stock, cash flow and dashboards — refresh them all. */
export function useRefreshAfterBilling() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['billing'] });
    qc.invalidateQueries({ queryKey: ['inventory'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['cashflow'] });
  };
}
