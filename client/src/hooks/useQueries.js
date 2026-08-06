import { useQuery } from '@tanstack/react-query';
import api from '../api/axios.js';
import { queryKeys, mapClient, mapService, mapInvoice, mapOrganization } from '../api/queryKeys.js';

export function useClients() {
  return useQuery({
    queryKey: queryKeys.clients.list(),
    queryFn: async () => {
      const res = await api.get('/clients');
      const rows = Array.isArray(res.data) ? res.data : [];
      return rows.map(mapClient);
    },
  });
}

export function useOrganizations() {
  return useQuery({
    queryKey: queryKeys.organizations.list(),
    queryFn: async () => {
      const res = await api.get('/organizations');
      const rows = Array.isArray(res.data) ? res.data : [];
      return rows.map(mapOrganization);
    },
  });
}

export function useServices() {
  return useQuery({
    queryKey: queryKeys.services.list(),
    queryFn: async () => {
      const res = await api.get('/services');
      const rows = Array.isArray(res.data) ? res.data : [];
      return rows.map(mapService);
    },
  });
}

export function useInvoices(filters = {}) {
  const { page = 1, limit = 20, search = '', status = '', clientId = '' } = filters;

  return useQuery({
    queryKey: queryKeys.invoices.list({ page, limit, search, status, clientId }),
    queryFn: async () => {
      const res = await api.get('/invoices', {
        params: {
          page,
          limit,
          search: search || undefined,
          status: status && status !== 'All' ? status : undefined,
          client_id: clientId || undefined,
        },
      });

      const payload = res.data;
      const rows = Array.isArray(payload?.invoices)
        ? payload.invoices
        : Array.isArray(payload)
          ? payload
          : [];

      const invoices = rows.map(mapInvoice);
      const pagination = payload?.pagination || {
        page: 1,
        limit: invoices.length,
        total: invoices.length,
        totalPages: 1,
      };

      return { invoices, pagination, raw: rows };
    },
  });
}

export function useOpenInvoicesForClient(clientId) {
  return useQuery({
    queryKey: queryKeys.invoices.openByClient(clientId),
    enabled: !!clientId,
    queryFn: async () => {
      const res = await api.get('/invoices', {
        params: { client_id: clientId, status: 'open', limit: 5 },
      });
      const rows = Array.isArray(res.data?.invoices)
        ? res.data.invoices
        : Array.isArray(res.data)
          ? res.data
          : [];
      return rows.map(mapInvoice);
    },
  });
}
