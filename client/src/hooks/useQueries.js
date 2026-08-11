import { useQuery } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import api from '../api/axios.js';
import { queryKeys, mapClient, mapService, mapInvoice, mapOrganization, mapThirdPartyService } from '../api/queryKeys.js';

// Master data (services, organizations, third-party) changes rarely — cache long
// enough that navigating between pages never re-downloads them.
const MASTER_STALE = 5 * 60 * 1000;

export function useClients(filters = {}) {
  const { page, limit, search } = filters;
  const hasPagination = page !== undefined && limit !== undefined;

  return useQuery({
    queryKey: queryKeys.clients.list({ page, limit, search }),
    queryFn: async () => {
      const res = await api.get('/clients', {
        params: hasPagination
          ? { page, limit, search: search || undefined }
          : { search: search || undefined },
      });

      if (hasPagination && Array.isArray(res.data?.clients)) {
        return {
          clients: res.data.clients.map(mapClient),
          pagination: res.data.pagination,
        };
      }

      const rows = Array.isArray(res.data) ? res.data : [];
      return { clients: rows.map(mapClient), pagination: null };
    },
    placeholderData: hasPagination ? keepPreviousData : undefined,
  });
}

// Lightweight dropdown list — id/name/phone only (no vehicles).
export function useClientOptions() {
  return useQuery({
    queryKey: queryKeys.clients.options(),
    staleTime: MASTER_STALE,
    queryFn: async () => {
      const res = await api.get('/clients/options');
      const rows = Array.isArray(res.data) ? res.data : [];
      return rows.map(c => ({ id: c.id, name: c.full_name, phone: c.phone }));
    },
  });
}

// Single client by phone (customer profile page).
export function useClientByPhone(phone) {
  return useQuery({
    queryKey: queryKeys.clients.lookup(phone),
    enabled: !!phone,
    queryFn: async () => {
      const res = await api.get('/clients/lookup', { params: { phone } });
      return mapClient(res.data);
    },
  });
}

export function useOrganizations() {
  return useQuery({
    queryKey: queryKeys.organizations.list(),
    staleTime: MASTER_STALE,
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
    staleTime: MASTER_STALE,
    queryFn: async () => {
      const res = await api.get('/services');
      const rows = Array.isArray(res.data) ? res.data : [];
      return rows.map(mapService);
    },
  });
}

export function useThirdPartyServices() {
  return useQuery({
    queryKey: queryKeys.thirdPartyServices.list(),
    staleTime: MASTER_STALE,
    queryFn: async () => {
      const res = await api.get('/third_party_services');
      const rows = Array.isArray(res.data) ? res.data : [];
      return rows.map(mapThirdPartyService);
    },
  });
}

export function useInvoices(filters = {}) {
  const { page = 1, limit = 20, search = '', status = '', clientId = '' } = filters;

  return useQuery({
    queryKey: queryKeys.invoices.list({ page, limit, search, status, clientId }),
    placeholderData: keepPreviousData,
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
