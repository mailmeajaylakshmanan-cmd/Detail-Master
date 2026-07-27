import axios from 'axios';

const api = axios.create({ 
  baseURL: '/api',
  withCredentials: true 
});

const mockPackages = [
  { _id: '1', name: 'Foam Wash', price: 500, description: 'Basic foam wash' },
  { _id: '2', name: 'Interior Cleaning', price: 1500, description: 'Deep interior clean' },
  { _id: '3', name: 'Ceramic Coating', price: 15000, description: 'Long lasting ceramic coat' },
  { _id: '4', name: 'Headlight Restoration', price: 800, description: 'Clear headlights' },
  { _id: '5', name: 'Interior Steaming', price: 1200, description: 'Steam clean' },
  { _id: '6', name: 'Engine Bay Detailing', price: 2000, description: 'Clean engine bay' },
  { _id: '7', name: 'Polish', price: 3000, description: 'Exterior polish' },
  { _id: '8', name: 'Paint Protection Film', price: 25000, description: 'PPF wrap' }
];

const mockServices = mockPackages.map(p => ({ _id: p._id, name: p.name }));

const mockCustomers = [
  { _id: 'c1', name: 'John Doe', phone: '9876543210', email: 'john@example.com' },
  { _id: 'c2', name: 'Jane Smith', phone: '8765432109', email: 'jane@example.com' },
  { _id: 'c3', name: 'Raj Kumar', phone: '7654321098', email: 'raj@example.com' }
];

const mockInvoices = [
  { _id: 'inv1', invoiceId: 'INV-2026-001', customer: mockCustomers[0], grandTotal: 1500, status: 'paid', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { _id: 'inv2', invoiceId: 'INV-2026-002', customer: mockCustomers[1], grandTotal: 15000, status: 'pending', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { _id: 'inv3', invoiceId: 'INV-2026-003', customer: mockCustomers[2], grandTotal: 28000, status: 'partially_paid', createdAt: new Date().toISOString() }
];

const mockEvents = [
  { _id: 'e1', title: 'Ceramic Coating - Jane', start: new Date().toISOString(), end: new Date(Date.now() + 7200000).toISOString() },
  { _id: 'e2', title: 'PPF Wrap - Raj', start: new Date(Date.now() + 86400000).toISOString(), end: new Date(Date.now() + 90000000).toISOString() }
];

const mockOfferMaster = [
  { _id: 'om1', name: 'Yearly VIP Pack', defaultPrice: 50000, defaultValidityDays: 365, description: '12 exterior washes, 2 interior details, and priority booking.', terms: 'Valid for 1 vehicle only.' },
  { _id: 'om2', name: 'Gold Shine Package', defaultPrice: 25000, defaultValidityDays: 180, description: '6 exterior washes and 1 ceramic boost.', terms: 'Non-transferable.' },
];

const mockOffers = [
  { 
    _id: 'o1', 
    offerNo: 'OFF-0001', 
    customer: mockCustomers[0], 
    carMake: 'Porsche', 
    carModel: '911 GT3', 
    licensePlate: 'DL-01-XXXX', 
    packageName: 'Yearly VIP Pack', 
    price: 50000, 
    validityDate: new Date(Date.now() + 365 * 86400000).toISOString(), 
    status: 'active',
    date: new Date().toISOString()
  },
  { 
    _id: 'o2', 
    offerNo: 'OFF-0002', 
    customer: mockCustomers[1], 
    carMake: 'BMW', 
    carModel: 'M4', 
    licensePlate: 'MH-02-YYYY', 
    packageName: 'Gold Shine Package', 
    price: 22000, // custom discounted price
    validityDate: new Date(Date.now() + 180 * 86400000).toISOString(), 
    status: 'active',
    date: new Date(Date.now() - 5 * 86400000).toISOString()
  }
];

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Bypass mock for auth, clients, website bookings, and permissions to hit real backend
  if (config.url && (
    config.url.includes('/website-bookings') || 
    config.url.includes('/auth') || 
    config.url.includes('/clients') ||
    config.url.includes('/permissions')
  )) {
    return config;
  }

  // Mock response adapter
  config.adapter = async () => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));

    const url = config.url || '';
    const method = config.method || 'get';
    
    // Default response wrapper
    const makeResponse = (data) => ({
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
      request: {}
    });

    if (url.includes('/packages')) {
      return makeResponse(mockPackages);
    }
    if (url.includes('/services')) {
      return makeResponse(mockServices);
    }
    if (url.includes('/dashboard/stats')) {
      return makeResponse({
        recentInvoices: mockInvoices,
        upcomingEvents: mockEvents,
        metrics: { totalRevenue: 245000, activeBookings: 8, pendingPayments: 12500 }
      });
    }
    if (url.includes('/invoices')) {
      return makeResponse({ invoices: mockInvoices, pagination: { totalPages: 1 } });
    }
    if (url.includes('/customers')) {
      return makeResponse(mockCustomers);
    }
    if (url.includes('/events')) {
      return makeResponse(mockEvents);
    }
    if (url.includes('/offerMaster')) {
      return makeResponse(mockOfferMaster);
    }
    if (url.includes('/offers')) {
      return makeResponse(mockOffers);
    }
    
    // Fallback for any other request
    return makeResponse({ success: true });
  };
  return config;
});

api.interceptors.response.use(
  res => res,
  err => Promise.reject(err)
);

export default api;
