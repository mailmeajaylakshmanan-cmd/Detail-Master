export const queryKeys = {
  clients: {
    all: ['clients'],
    list: () => [...queryKeys.clients.all, 'list'],
  },
  services: {
    all: ['services'],
    list: () => [...queryKeys.services.all, 'list'],
  },
  invoices: {
    all: ['invoices'],
    list: (filters = {}) => [...queryKeys.invoices.all, 'list', filters],
    openByClient: (clientId) => [...queryKeys.invoices.all, 'open', clientId],
  },
};

export function mapClient(c) {
  return {
    ...c,
    id: c.id,
    name: c.full_name ?? c.name ?? '',
  };
}

export function mapService(s) {
  return {
    ...s,
    id: s.id,
    name: s.service_name ?? s.name ?? '',
    price: Number(s.base_price ?? s.price ?? 0),
    description: s.category ?? s.description ?? '',
    isActive: s.is_active !== undefined ? !!s.is_active : s.isActive !== false,
  };
}

export function mapInvoice(inv) {
  const status = inv.status || 'draft';
  const balance = Number(inv.balance_due ?? inv.balance ?? 0);
  const total = Number(inv.grand_total ?? inv.total ?? 0);
  const amountPaid = Number(inv.amount_paid ?? 0);

  // UI-friendly status for list badges
  let displayStatus = status;
  if (status === 'completed' || (total > 0 && balance <= 0)) displayStatus = 'paid';
  else if (amountPaid > 0 && balance > 0) displayStatus = 'partial';
  else if (status === 'open' || status === 'draft' || status === 'pending') displayStatus = status;

  return {
    ...inv,
    id: inv.id,
    invoiceNo: inv.invoice_number ?? inv.invoiceNo,
    customer: {
      name: inv.client_name || inv.customer?.name || '—',
      phone: inv.client_phone || inv.customer?.phone || '',
    },
    vehicleName: inv.vehicle_name || '',
    licenseVin: inv.license_vin || '',
    total,
    balance,
    amountPaid,
    status,
    displayStatus,
    staffingStatus: inv.staffingStatus ?? null,
    date: inv.created_at || inv.date,
    jobNumber: inv.invoice_number,
    clientId: inv.client_id,
    vehicleId: inv.vehicle_id,
  };
}
