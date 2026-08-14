export const queryKeys = {
  clients: {
    all: ['clients'],
    list: (filters = {}) => [...queryKeys.clients.all, 'list', filters],
    options: () => [...queryKeys.clients.all, 'options'],
    lookup: (phone) => [...queryKeys.clients.all, 'lookup', phone],
  },
  dashboard: {
    all: ['dashboard'],
    stats: () => [...queryKeys.dashboard.all, 'stats'],
  },
  services: {
    all: ['services'],
    list: () => [...queryKeys.services.all, 'list'],
  },
  vehicleTypes: {
    all: ['vehicleTypes'],
    list: () => [...queryKeys.vehicleTypes.all, 'list'],
  },
  invoices: {
    all: ['invoices'],
    list: (filters = {}) => [...queryKeys.invoices.all, 'list', filters],
    openByClient: (clientId) => [...queryKeys.invoices.all, 'open', clientId],
  },
  organizations: {
    all: ['organizations'],
    list: () => [...queryKeys.organizations.all, 'list'],
    billing: (id, range) => [...queryKeys.organizations.all, 'billing', id, range],
  },
  thirdPartyServices: {
    all: ['thirdPartyServices'],
    list: () => [...queryKeys.thirdPartyServices.all, 'list'],
  },
  assignedOffers: {
    all: ['assignedOffers'],
    byClient: (clientId) => [...queryKeys.assignedOffers.all, 'client', clientId],
  },
};

export function mapClient(c) {
  return {
    ...c,
    id: c.id,
    name: c.full_name ?? c.name ?? '',
    createdAt: c.created_at ?? c.createdAt,
  };
}

export function mapOrganization(o) {
  return {
    ...o,
    id: o.id,
    name: o.org_name ?? o.name ?? '',
  };
}

export function mapService(s) {
  const vpArray = Array.isArray(s.vehicle_prices) ? s.vehicle_prices : [];
  const vpMap = {};
  vpArray.forEach(item => {
    if (item.vehicle_type_id) {
      vpMap[item.vehicle_type_id] = Number(item.price);
    }
  });

  return {
    ...s,
    id: s.id,
    name: s.service_name ?? s.name ?? '',
    price: Number(s.base_price ?? s.price ?? 0),
    description: s.category ?? s.description ?? '',
    isActive: s.is_active !== undefined ? !!s.is_active : s.isActive !== false,
    estimateTime: s.estimate_time ?? s.estimateTime ?? '',
    vehiclePrices: vpArray,
    vehiclePricesMap: vpMap,
  };
}

export function mapVehicleType(vt) {
  return {
    ...vt,
    id: vt.id,
    name: vt.name ?? '',
    isActive: vt.is_active !== false,
  };
}

export function mapThirdPartyService(t) {
  const vpArray = Array.isArray(t.vehicle_prices) ? t.vehicle_prices : [];
  const vpMap = {};
  vpArray.forEach(item => {
    if (item.vehicle_type_id) {
      vpMap[item.vehicle_type_id] = Number(item.selling_price);
    }
  });

  return {
    ...t,
    id: t.id,
    name: t.service_name ?? '',
    vendorName: t.vendor_name ?? '',
    labourCount: Number(t.labour_count ?? 1),
    labourCharge: Number(t.labour_charge ?? 0),
    serviceCost: Number(t.service_cost ?? 0),
    sellingPrice: Number(t.selling_price ?? 0),
    isActive: t.is_active !== undefined ? !!t.is_active : true,
    vehiclePrices: vpArray,
    vehiclePricesMap: vpMap,
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
