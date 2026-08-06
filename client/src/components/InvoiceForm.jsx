import { useState, useCallback, useMemo, memo } from 'react';
import toast from 'react-hot-toast';
import {
  User, Phone, MapPin, Plus, Trash2, Sparkles,
  CheckCircle2, AlertCircle, Calendar, IndianRupee, Hash, Receipt, Settings
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parseISO } from 'date-fns';
import Select from 'react-select';
import { useClients, useServices, useOrganizations } from '../hooks/useQueries.js';

function fmt(n) { return Number(n || 0).toLocaleString('en-IN'); }

const selectStyles = () => ({
  control: (b) => ({
    ...b,
    borderColor: 'transparent',
    borderRadius: '0.75rem',
    boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
    minHeight: '44px',
    fontSize: '13px',
    fontWeight: '500',
    backgroundColor: '#ffffff',
    color: '#020029',
    transition: 'all .15s',
    '&:hover': { borderColor: 'rgba(251, 217, 4, 0.4)' },
  }),
  menuPortal: b => ({ ...b, zIndex: 9999 }),
  menu: b => ({
    ...b,
    borderRadius: '1rem',
    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)',
    border: '1px solid rgba(0,0,0,0.1)',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  }),
  menuList: b => ({ ...b, maxHeight: '220px', padding: '6px' }),
  option: (b, s) => ({
    ...b,
    fontSize: '13px',
    fontWeight: '500',
    borderRadius: '0.5rem',
    padding: '8px 12px',
    backgroundColor: s.isSelected ? 'rgba(251, 217, 4, 0.2)' : s.isFocused ? '#f8fafc' : 'transparent',
    color: '#020029',
    cursor: 'pointer',
    marginBottom: '2px'
  }),
  placeholder: b => ({ ...b, color: '#64748b', fontSize: '13px', fontWeight: '500' }),
  input: b => ({ ...b, fontSize: '13px', color: '#020029' }),
  singleValue: b => ({ ...b, color: '#020029', fontWeight: '600' }),
});

const inputCls = [
  'input block w-full px-4 py-2 text-[13px] font-medium text-gray-900',
  'placeholder:text-gray-400 placeholder:font-medium',
  'bg-white focus:outline-none focus:ring-2 focus:ring-[#FBD904]/40 focus:border-transparent',
  'transition-all duration-200'
].join(' ');

function Field({ label, required, children, invisibleLabel }) {
  return (
    <div>
      <label
        className={[
          'block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1',
          invisibleLabel ? 'invisible select-none' : 'text-gray-500',
        ].join(' ')}
      >
        {label || '\u00A0'}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const MoneyInput = memo(function MoneyInput({ value, onChange, autoFocus, disabled }) {
  return (
    <div className="relative">
      <IndianRupee size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="number" min="0"
        disabled={disabled}
        autoFocus={autoFocus}
        value={value}
        onChange={onChange}
        className={`${inputCls} pl-8 pr-3 text-right font-mono min-w-[7rem] w-full disabled:opacity-50`}
      />
    </div>
  );
});

const PaymentRow = memo(function PaymentRow({
  amount, onAmount, date, onDate, method, onMethod,
  referenceNo, onReferenceNo, removePayment, locked,
}) {
  const needsRef = method === 'UPI' || method === 'Bank Transfer';
  return (
    <div className="flex flex-col gap-2 bg-gray-50/80 p-2 rounded-xl border border-gray-100 relative group transition-colors hover:bg-gray-100">
      {!locked && (
        <button
          type="button"
          onClick={removePayment}
          className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-rose-500 hover:border-rose-200 transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={12} />
        </button>
      )}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="w-full sm:w-1/3 flex items-center gap-2">
          <MoneyInput value={amount} onChange={onAmount} disabled={locked} />
        </div>
        <div className="w-full sm:w-1/3">
          <DatePicker
            selected={date ? parseISO(date) : null}
            onChange={d => onDate(d ? format(d, 'yyyy-MM-dd') : '')}
            dateFormat="dd/MM/yyyy"
            placeholderText="Date"
            wrapperClassName="w-full"
            portalId="root"
            className={`${inputCls}`}
            disabled={locked}
          />
        </div>
        <div className="w-full sm:w-1/3">
          <select className={`${inputCls}`} value={method} onChange={onMethod} disabled={locked}>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Card">Card</option>
          </select>
        </div>
      </div>
      {needsRef && (
        <input
          className={`${inputCls}`}
          placeholder="Transaction / reference no (optional)"
          value={referenceNo || ''}
          onChange={onReferenceNo}
          disabled={locked}
        />
      )}
    </div>
  );
});

const ServiceChip = memo(function ServiceChip({ opt, checked, onToggle }) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all border ${
      checked
        ? 'bg-gray-900 text-white border-gray-900 shadow-md shadow-gray-900/20'
        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
    }`}>
      <input type="checkbox" checked={checked} onChange={e => onToggle(opt, e.target.checked)} className="sr-only" />
      {opt.name}
    </label>
  );
});

const SelectedServiceRow = memo(function SelectedServiceRow({ cur, onDesc }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
      <div className="sm:w-2/5 font-bold text-[14px] text-gray-900 flex items-center gap-2">
        <CheckCircle2 size={14} className="text-emerald-500" /> {cur.service}
      </div>
      <div className="flex-1">
        <input
          className={`${inputCls} bg-white shadow-sm border-gray-200`}
          placeholder="Detail instructions / description"
          value={cur.description || ''}
          onChange={onDesc}
        />
      </div>
      <div className="sm:w-36">
        {/* Price locked — snapshot comes from services.base_price on save */}
        <MoneyInput value={cur.price || ''} onChange={() => {}} disabled />
      </div>
    </div>
  );
});

export default function InvoiceForm({ initial, onSubmit, loading, onCustomerSelect }) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: customers = [] } = useClients();
  const { data: organizations = [] } = useOrganizations();
  const { data: serviceOptions = [] } = useServices();

  const [clientType, setClientType] = useState(initial?.organizationId || initial?.organization_id ? 'organization' : 'individual');

  const [form, setForm] = useState(() => {
    const base = {
      customer: { name: '', phone: '', address: '', vehicles: [] },
      vehicleId: null,
      carMake: '', carModel: '', licensePlate: '',
      serviceDate: '', location: '',
      services: [], subTotal: 0, discount: 0,
      status: 'draft', notes: 'Thank you for choosing Detailing Masters for your car care needs!',
      payments: [],
      showTerms: true, termsAndConditions: ''
    };
    if (!initial) return base;
    return {
      ...base, ...initial,
      customer: initial.customer || base.customer,
      vehicleId: initial.vehicleId || initial.vehicle_id || null,
      services: initial.services || [],
      subTotal: initial.subTotal || 0,
      payments: (initial.payments || []).map(p => {
        const methodRaw = p.payment_method || p.method || 'cash';
        const methodMap = {
          cash: 'Cash',
          upi: 'UPI',
          bank_transfer: 'Bank Transfer',
          card: 'Card',
          other: 'Cash',
        };
        const method = methodMap[String(methodRaw).toLowerCase()] || methodRaw;
        const dateSrc = p.payment_date || p.date;
        return {
          id: p.id || null,
          amount: p.amount || 0,
          date: dateSrc
            ? (typeof dateSrc === 'string' ? dateSrc.substring(0, 10) : new Date(dateSrc).toISOString().substring(0, 10))
            : today,
          method,
          reference_no: p.reference_no || '',
          locked: !!p.id,
        };
      }),
    };
  });

  const setF = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), []);

  const subTotal = Number(form.subTotal || 0);
  const discount = Number(form.discount || 0);
  const discountExceedsTotal = discount > subTotal && subTotal > 0;
  const total = Math.max(0, subTotal - discount);
  const paid = useMemo(
    () => form.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [form.payments]
  );
  const balance = total - paid;
  const derivedStatus = total <= 0
    ? form.status
    : balance <= 0
      ? 'paid'
      : balance < total
        ? 'partial'
        : 'pending';

  const toggleService = useCallback((opt, checked) => {
    setForm(f => {
      if (checked) {
        const newServices = [...f.services, {
          service_id: opt.id,
          service: opt.name,
          description: opt.description || '',
          price: opt.price || 0,
          total: opt.price || 0,
        }];
        return {
          ...f,
          services: newServices,
          subTotal: newServices.reduce((acc, s) => acc + (Number(s.total) || 0), 0)
        };
      }
      const newServices = f.services.filter(s => s.service_id !== opt.id && s.service !== opt.name);
      return {
        ...f,
        services: newServices,
        subTotal: newServices.reduce((acc, s) => acc + (Number(s.total) || 0), 0)
      };
    });
  }, []);

  const updateServiceField = useCallback((name, field, val) => {
    // Price is not editable — only description notes on the form
    if (field === 'price') return;
    setForm(f => {
      const newServices = f.services.map(s => {
        if (s.service !== name) return s;
        return { ...s, [field]: val };
      });
      return { ...f, services: newServices };
    });
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.customer?.id) return toast.error(clientType === 'individual' ? 'Please select a client.' : 'Please select an organization.');
    if (clientType === 'individual' && !form.vehicleId) return toast.error('Please select a vehicle.');
    if (!form.services.length) return toast.error('Please select at least one service.');

    // Only NEW payment rows (no id) are sent — existing ones stay in DB
    const newPayments = form.payments
      .filter(p => !p.id && Number(p.amount) > 0)
      .map(p => ({
        amount: Number(p.amount),
        date: p.date,
        method: p.method,
        reference_no: (p.method === 'UPI' || p.method === 'Bank Transfer')
          ? (p.reference_no || null)
          : null,
      }));

    const service_ids = form.services
      .map(s => Number(s.service_id || s.serviceId))
      .filter(id => Number.isFinite(id) && id > 0);

    if (!service_ids.length) return toast.error('Selected services are missing ids. Refresh and try again.');

    onSubmit({
      client_id: clientType === 'individual' ? form.customer.id : null,
      organization_id: clientType === 'organization' ? form.customer.id : null,
      vehicle_id: form.vehicleId || null,
      service_ids,
      discount: Number(form.discount) || 0,
      special_notes: form.notes || null,
      include_terms: !!form.showTerms,
      terms_conditions: form.termsAndConditions || null,
      status: derivedStatus === 'paid' ? 'completed' : derivedStatus === 'partial' ? 'open' : 'draft',
      payments: newPayments,
    });
  }

  const selectedCustomer = form.customer?.id
    ? { value: form.customer.id, label: `${form.customer.name} — ${form.customer.phone}` }
    : null;

  const customerId = form.customer?.id;
  const customerOptions = useMemo(() => {
    if (clientType === 'organization') {
      return organizations
        .filter(o => o.isActive !== false || o.id === customerId)
        .map(o => ({ value: o.id, label: `${o.name} — ${o.phone || o.contact_person || ''}`, customer: o }));
    }
    return customers
      .filter(c => c.isActive !== false || c.id === customerId)
      .map(c => ({ value: c.id, label: `${c.name} — ${c.phone}`, customer: c }));
  }, [clientType, customers, organizations, customerId]);

  const selectedServiceNames = useMemo(
    () => new Set(form.services.map(s => s.service)),
    [form.services]
  );
  const selectedServiceIds = useMemo(
    () => new Set(form.services.map(s => s.service_id).filter(Boolean)),
    [form.services]
  );

  const vehicleOptions = useMemo(() => {
    const vehicles = form.customer?.vehicles || [];
    return vehicles.map(v => ({
      value: v.id,
      label: `${[v.make, v.model].filter(Boolean).join(' ') || 'Vehicle'}${v.plate ? ` — ${v.plate}` : ''}`,
      vehicle: v,
    }));
  }, [form.customer]);

  const selectedVehicle = vehicleOptions.find(v => v.value === form.vehicleId) || null;

  const statusConfig = {
    pending: { label: 'Pending', bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
    partial: { label: 'Partial', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    paid: { label: 'Paid', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  };
  const sc = statusConfig[derivedStatus] || statusConfig.pending;
  const isStep1Complete = !!form.customer.name;
  const isStep2Complete = clientType === 'organization' ? true : !!form.vehicleId;
  const isStep3Complete = form.services.length > 0;

  return (
    <div className="relative">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.8) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <form onSubmit={handleSubmit} className="w-full font-sans pb-12 relative z-10 flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:flex-1 flex flex-col gap-8 shrink-0">
          <div className="flex items-center justify-between mb-2 border-b border-gray-200 pb-4">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <Hash size={20} className="text-gray-400" /> New Job Card
            </h1>
            <span className="font-mono text-sm text-gray-500 font-bold px-3 py-1 bg-gray-100 rounded-lg">
              {initial?.invoiceNumber || initial?.invoiceNo || 'Draft Mode'}
            </span>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${isStep1Complete ? 'border-emerald-500 text-emerald-500 bg-emerald-50' : 'border-gray-300 text-gray-400 bg-gray-50'}`}>
                  {isStep1Complete ? <CheckCircle2 size={14} className="fill-emerald-50" /> : <span className="text-[10px] font-bold">1</span>}
                </div>
                <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">{clientType === 'individual' ? 'Client Details' : 'Organization Details'}</h2>
                <div className="ml-auto flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                  <button type="button" onClick={() => { setClientType('individual'); setForm(f => ({...f, customer: { name: '', phone: '', address: '', vehicles: [] }, vehicleId: null})); }} className={`px-3 py-1 text-[12px] font-bold rounded-md transition-colors ${clientType === 'individual' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Individual</button>
                  <button type="button" onClick={() => { setClientType('organization'); setForm(f => ({...f, customer: { name: '', phone: '', address: '', vehicles: [] }, vehicleId: null})); }} className={`px-3 py-1 text-[12px] font-bold rounded-md transition-colors ${clientType === 'organization' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Organization</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <Select
                  isClearable
                  isSearchable
                  placeholder={clientType === 'individual' ? "Search existing client database…" : "Search organizations…"}
                  styles={selectStyles()}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  options={customerOptions}
                  value={selectedCustomer}
                  onChange={sel => {
                    if (!sel) {
                      setForm(f => ({
                        ...f,
                        customer: { name: '', phone: '', address: '', vehicles: [] },
                        vehicleId: null,
                        carMake: '',
                        licensePlate: '',
                      }));
                      onCustomerSelect?.(null);
                      return;
                    }
                    const m = sel.customer;
                    const vehicles = Array.isArray(m.vehicles) ? m.vehicles : [];
                    const first = vehicles[0];
                    setForm(f => ({
                      ...f,
                      customer: {
                        id: m.id,
                        name: m.name,
                        phone: m.phone,
                        address: m.address || '',
                        vehicles,
                      },
                      vehicleId: first?.id || null,
                      carMake: first ? `${first.make || ''} ${first.model || ''}`.trim() : '',
                      licensePlate: first?.plate || '',
                    }));
                    onCustomerSelect?.(m);
                  }}
                  isDisabled={!!initial}
                />

                {form.customer.name ? (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2.5 text-[13px] text-gray-700">
                      <User size={14} className="text-gray-400 shrink-0" />
                      <span className="font-bold">{form.customer.name}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-[13px] text-gray-700">
                      <Phone size={14} className="text-gray-400 shrink-0" />
                      <span className="font-medium">{form.customer.phone}</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-[13px] text-gray-700">
                      <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                      <span className="leading-tight text-gray-500">{form.customer.address || <span className="italic">No address provided</span>}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 flex items-center justify-center text-gray-400 text-sm font-medium">
                    No client selected
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${isStep2Complete ? 'border-emerald-500 text-emerald-500 bg-emerald-50' : 'border-gray-300 text-gray-400 bg-gray-50'}`}>
                  {isStep2Complete ? <CheckCircle2 size={14} className="fill-emerald-50" /> : <span className="text-[10px] font-bold">2</span>}
                </div>
                <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">Vehicle Identifiers</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Vehicle" required>
                  <Select
                    isClearable
                    isSearchable
                    placeholder={form.customer?.id ? 'Select vehicle… (Optional for orgs)' : 'Select first…'}
                    styles={selectStyles()}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                    options={vehicleOptions}
                    value={selectedVehicle}
                    isDisabled={!form.customer?.id || !!initial}
                    onChange={sel => {
                      if (!sel) {
                        setForm(f => ({ ...f, vehicleId: null, carMake: '', licensePlate: '' }));
                        return;
                      }
                      const v = sel.vehicle;
                      setForm(f => ({
                        ...f,
                        vehicleId: v.id,
                        carMake: `${v.make || ''} ${v.model || ''}`.trim(),
                        licensePlate: v.plate || '',
                      }));
                    }}
                  />
                </Field>
                <Field label="Induction Date">
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <DatePicker
                      selected={form.serviceDate ? parseISO(form.serviceDate) : null}
                      onChange={date => setF('serviceDate', date ? format(date, 'yyyy-MM-dd') : '')}
                      dateFormat="dd/MM/yyyy"
                      className={`${inputCls} pl-9 w-full`}
                      placeholderText="Select date"
                      wrapperClassName="w-full"
                      portalId="root"
                    />
                  </div>
                </Field>
              </div>
              {form.customer?.id && vehicleOptions.length === 0 && (
                <p className="text-[12px] font-medium text-rose-600">
                  This client has no vehicles. Add a vehicle in Master Customer first.
                </p>
              )}
            </div>

            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${isStep3Complete ? 'border-emerald-500 text-emerald-500 bg-emerald-50' : 'border-gray-300 text-gray-400 bg-gray-50'}`}>
                  {isStep3Complete ? <CheckCircle2 size={14} className="fill-emerald-50" /> : <span className="text-[10px] font-bold">3</span>}
                </div>
                <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">Services Grid</h2>
              </div>
              <div>
                <div className="flex flex-wrap gap-2.5">
                  {serviceOptions.filter(o => o.isActive !== false).map(opt => (
                    <ServiceChip
                      key={opt.id}
                      opt={opt}
                      checked={selectedServiceIds.has(opt.id) || selectedServiceNames.has(opt.name)}
                      onToggle={toggleService}
                    />
                  ))}
                  {serviceOptions.length === 0 && (
                    <div className="text-[13px] font-medium text-gray-500 p-4 border border-dashed border-gray-300 rounded-xl bg-gray-50">
                      No services available.
                    </div>
                  )}
                </div>
                {form.services.length > 0 && (
                  <div className="mt-6 flex flex-col gap-3">
                    {form.services.map(cur => (
                      <SelectedServiceRow
                        key={cur.service_id || cur.service}
                        cur={cur}
                        onDesc={e => updateServiceField(cur.service, 'description', e.target.value)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-gray-300 text-gray-400 bg-gray-50">
                  <Settings size={12} />
                </div>
                <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">Additional Terms & Notes</h2>
              </div>
              <div className="flex flex-col gap-4">
                <Field label="Special Notes for Client">
                  <textarea className={`${inputCls} resize-none h-16 bg-gray-50 border-gray-200`} value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="e.g. Thanks for your business!" />
                </Field>
                <label className="flex items-center gap-3 cursor-pointer group mt-2">
                  <input type="checkbox" checked={form.showTerms} onChange={e => setF('showTerms', e.target.checked)} className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900" />
                  <span className="text-[13px] font-bold text-gray-700 group-hover:text-gray-900 transition-colors">Include Terms & Conditions on Invoice</span>
                </label>
                {form.showTerms && (
                  <Field label="Terms & Conditions">
                    <textarea className={`${inputCls} resize-none h-20 bg-gray-50 border-gray-200`} value={form.termsAndConditions} onChange={e => setF('termsAndConditions', e.target.value)} placeholder="Enter custom terms or leave blank for default terms." />
                  </Field>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[420px] shrink-0">
          <div className="sticky top-6 flex flex-col gap-4">
            <div className="bg-white shadow-xl shadow-gray-200/50 rounded-3xl border border-gray-100 overflow-hidden flex flex-col">
              <div className="bg-gray-900 p-5 text-white flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[15px] tracking-wide flex items-center gap-2">
                    <Receipt size={16} className="text-gray-400" /> Payment Summary
                  </h3>
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${sc.bg} ${sc.text} shadow-sm border border-white/20`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}
                  </span>
                </div>
              </div>

              <div className="p-6 flex flex-col gap-5 bg-[#fafafa]">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="font-bold text-gray-500">Sub Total</span>
                    <span className="font-mono font-bold text-gray-900">₹{fmt(subTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between group">
                    <span className="font-bold text-gray-500 text-[14px]">Discount</span>
                    <div className="w-28">
                      <MoneyInput value={form.discount} onChange={e => setF('discount', e.target.value)} />
                    </div>
                  </div>
                  {discountExceedsTotal && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500 mt-[-4px]">
                      <AlertCircle size={10} /> Capped to Total (₹0)
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-gray-300" />

                <div className="flex items-end justify-between">
                  <span className="font-black text-gray-900 text-[15px] uppercase tracking-wider">Grand Total</span>
                  <span className="font-mono font-black text-gray-900 text-3xl tracking-tighter">₹{fmt(total)}</span>
                </div>

                <div className="mt-2 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Payments Received</span>
                    <button
                      type="button"
                      disabled={form.payments.length >= 4}
                      onClick={() => setForm(f => ({
                        ...f,
                        payments: [...f.payments, { amount: 0, date: today, method: 'Cash', reference_no: '', locked: false }],
                      }))}
                      className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 disabled:opacity-50"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {form.payments.length === 0 ? (
                      <div className="text-[12px] font-medium text-gray-400 italic text-center py-2">No payments added</div>
                    ) : (
                      form.payments.map((p, idx) => (
                        <PaymentRow
                          key={p.id || `new-${idx}`}
                          amount={p.amount}
                          date={p.date}
                          method={p.method}
                          referenceNo={p.reference_no}
                          locked={!!p.locked}
                          onAmount={e => {
                            const val = e.target.value;
                            setForm(f => ({
                              ...f,
                              payments: f.payments.map((pm, i) => i === idx ? { ...pm, amount: val } : pm)
                            }));
                          }}
                          onDate={val => {
                            setForm(f => ({
                              ...f,
                              payments: f.payments.map((pm, i) => i === idx ? { ...pm, date: val } : pm)
                            }));
                          }}
                          onMethod={e => {
                            const val = e.target.value;
                            setForm(f => ({
                              ...f,
                              payments: f.payments.map((pm, i) => i === idx
                                ? { ...pm, method: val, reference_no: (val === 'UPI' || val === 'Bank Transfer') ? pm.reference_no : '' }
                                : pm)
                            }));
                          }}
                          onReferenceNo={e => {
                            const val = e.target.value;
                            setForm(f => ({
                              ...f,
                              payments: f.payments.map((pm, i) => i === idx ? { ...pm, reference_no: val } : pm)
                            }));
                          }}
                          removePayment={() => setForm(f => ({ ...f, payments: f.payments.filter((_, i) => i !== idx) }))}
                        />
                      ))
                    )}
                  </div>
                </div>

                <div className={`flex items-center justify-between p-4 rounded-2xl border ${balance <= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  <span className="text-[12px] font-bold uppercase tracking-wider text-gray-600">Balance Due</span>
                  <span className={`font-mono font-black text-xl ${balance <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>₹{fmt(Math.max(0, balance))}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-5 text-[15px] font-black tracking-widest uppercase text-slate-900 bg-[#FBD904] hover:bg-[#e5c603] flex items-center justify-center gap-2 transition-colors ${loading ? 'opacity-70 pointer-events-none' : ''}`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                ) : (
                  <Sparkles size={18} />
                )}
                {initial ? 'Update Invoice' : 'Create Invoice'}
              </button>
            </div>
            <p className="text-center text-[11px] font-medium text-gray-400 mt-2 px-6">
              Review all services and financial details before generating the final order.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
