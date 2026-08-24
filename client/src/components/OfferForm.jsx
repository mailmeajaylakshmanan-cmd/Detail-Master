import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios.js';
import {
  User, Phone, Home, Sparkles, Car, CheckCircle2, Package, Search
} from 'lucide-react';
import Select from 'react-select';
import toast from 'react-hot-toast';
import { useClients, useServices, useThirdPartyServices } from '../hooks/useQueries.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';

const EMPTY_ARRAY = [];

/* ─── shared select styles ────────────────────────────────────── */
const selectStyles = () => ({
  control: (b, s) => ({
    ...b,
    borderColor: s.isFocused ? '#F6CB59' : 'rgba(255,255,255,0.4)',
    borderRadius: '0.75rem',
    boxShadow: s.isFocused ? '0 0 0 3px rgba(251,217,4,.15)' : 'inset 0 2px 4px rgba(0,0,0,0.02)',
    minHeight: '42px',
    fontSize: '13px',
    backgroundColor: 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(12px)',
    color: '#111827',
    transition: 'all .2s',
    '&:hover': { borderColor: '#F6CB59', backgroundColor: 'rgba(255,255,255,0.8)' },
  }),
  menuPortal: b => ({ ...b, zIndex: 9999 }),
  menu: b => ({
    ...b,
    borderRadius: '0.75rem',
    boxShadow: '0 10px 40px rgba(0,0,0,.1)',
    border: '1px solid rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(16px)',
    overflow: 'hidden',
  }),
  menuList: b => ({ ...b, maxHeight: '220px', padding: '4px' }),
  option: (b, s) => ({
    ...b,
    fontSize: '13px',
    borderRadius: '0.5rem',
    padding: '8px 12px',
    backgroundColor: s.isSelected ? '#F6CB59' : s.isFocused ? 'rgba(0,0,0,0.03)' : 'transparent',
    color: '#111827',
    cursor: 'pointer',
    fontWeight: s.isSelected ? '600' : '500',
  }),
  placeholder: b => ({ ...b, color: '#6b7280', fontSize: '13px' }),
  input: b => ({ ...b, fontSize: '13px', color: '#111827' }),
  singleValue: b => ({ ...b, color: '#111827', fontWeight: '500' }),
});

const customInputCls = 'input focus:ring-[#F6CB59]/40 focus:border-[#F6CB59] font-medium';

function Field({ label, required, children, invisibleLabel }) {
  return (
    <div>
      <label
        className={[
          'block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1',
          invisibleLabel ? 'invisible select-none' : '',
        ].join(' ')}
      >
        {label || '\u00A0'}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function OfferForm({ initial, onSubmit, loading, onCustomerSelect }) {
  const { data: clientData } = useClients();
  const { data: serviceOptions = [] } = useServices();
  const { data: thirdPartyOptions = [] } = useThirdPartyServices();
  const customers = clientData?.clients || EMPTY_ARRAY;
  const [form, setForm] = useState(() => {
    const base = {
      customer: { name: '', phone: '', address: '' },
      vehicleId: '', carMake: '', carModel: '', licensePlate: '',
      masterOfferId: '', packageName: '', description: '',
      price: '', validityDate: '', totalWashes: '', freeWashes: '', terms: '', status: 'active',
      services: [], thirdPartyItems: []
    };
    if (!initial) return base;
    return { ...base, ...initial, customer: initial.customer || base.customer };
  });

  const [offerTemplates, setOfferTemplates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 250);

  useEffect(() => {
    // offerMaster not connected to Postgres yet
    api.get('/offerMaster').then(r => setOfferTemplates(Array.isArray(r.data) ? r.data : [])).catch(() => setOfferTemplates([]));
  }, []);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const calculateExpiry = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + Number(days));
    return d.toISOString().split('T')[0];
  };

  const filteredTemplates = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return offerTemplates.filter(t => (t.name || '').toLowerCase().includes(q));
  }, [offerTemplates, debouncedSearch]);

  const handlePackageSelect = (masterOfferId) => {
    if (form.masterOfferId === masterOfferId) {
      setForm(f => ({ ...f, masterOfferId: '', packageName: '', description: '', price: '', validityDate: '', totalWashes: '', freeWashes: '', terms: '', services: [], thirdPartyItems: [] }));
      return;
    }
    const selectedPackage = offerTemplates.find(o => o.id === masterOfferId);
    if (selectedPackage) {
      // Map standard services
      const selectedServices = (selectedPackage.serviceIds || []).map(id => {
        const s = serviceOptions.find(opt => opt.id === id);
        return s ? { service_id: s.id, service: s.name } : null;
      }).filter(Boolean);

      // Map third-party services
      const selectedThirdParty = (selectedPackage.thirdPartyServiceIds || []).map(id => {
        const t = thirdPartyOptions.find(opt => opt.id === id);
        return t ? { third_party_service_id: t.id, service_name: t.name } : null;
      }).filter(Boolean);

      setForm(f => ({
        ...f,
        masterOfferId: selectedPackage.id,
        packageName: selectedPackage.name,
        price: selectedPackage.defaultPrice,
        description: selectedPackage.description,
        totalWashes: selectedPackage.totalWashes || 0,
        freeWashes: selectedPackage.freeWashes || 0,
        terms: selectedPackage.terms,
        validityDate: calculateExpiry(selectedPackage.defaultValidityDays),
        services: selectedServices,
        thirdPartyItems: selectedThirdParty
      }));
    }
  };

  const toggleService = (opt, checked) => {
    if (checked) {
      setForm(f => ({
        ...f,
        services: [...f.services, {
          service_id: opt.id,
          service: opt.name,
          description: opt.description || '',
          price: opt.price || 0,
          total: opt.price || 0,
        }]
      }));
    } else {
      setForm(f => ({
        ...f,
        services: f.services.filter(s => s.service_id !== opt.id)
      }));
    }
  };

  const addThirdPartyItem = (catalogId) => {
    const opt = thirdPartyOptions.find(t => t.id === Number(catalogId));
    setForm(f => ({
      ...f,
      thirdPartyItems: [...f.thirdPartyItems, {
        third_party_service_id: opt?.id || null,
        service_name: opt?.name || 'Custom Third-Party Service',
        vendor_name: opt?.vendorName || '',
        labour_count: opt?.labourCount ?? 1,
        labour_charge: opt?.labourCharge ?? 0,
        selling_price: opt?.sellingPrice ?? 0,
      }],
    }));
  };

  const removeThirdPartyItem = (idx) => {
    setForm(f => ({ ...f, thirdPartyItems: f.thirdPartyItems.filter((_, i) => i !== idx) }));
  };

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.customer.name) return toast.error('Please select a customer.');
    if (!form.packageName) return toast.error('Please provide a package name.');
    
    onSubmit(form);
  }

  const fullCustomerObj = useMemo(() => customers.find(c => c.id === form.customer?.id), [customers, form.customer?.id]);

  const selectedCustomer = form.customer?.id
    ? { value: form.customer.id, label: `${form.customer.name} — ${form.customer.phone}`, customer: fullCustomerObj }
    : null;

  const isStep1Complete = !!form.customer?.name;
  const isStep2Complete = !!form.carMake || !!form.licensePlate;

  return (
    <form onSubmit={handleSubmit} className="w-full font-sans pb-8">
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* ── LEFT COLUMN: Steps 1 & 2 ── */}
        <div className="w-full lg:w-[420px] flex flex-col gap-5 relative shrink-0">
          {/* Connecting Line */}
          <div className="hidden lg:block absolute left-[15px] top-[40px] bottom-[60px] w-0.5 bg-white/40 -z-10"></div>

          {/* STEP 1: Customer Details */}
          <div className="relative z-10 flex gap-4 items-start">
            <div className="mt-[22px] bg-transparent shrink-0">
              <CheckCircle2 size={22} strokeWidth={2.5} className={isStep1Complete ? "text-emerald-500 bg-white/90 rounded-full shadow-sm" : "text-gray-400 bg-white/50 backdrop-blur-sm rounded-full"} />
            </div>
            <div className="card flex-1 p-6 md:p-7">
              <h3 className="text-[16px] font-bold text-gray-900 mb-5 flex items-center gap-2">
                <span className="text-gray-400 font-medium text-[14px]">1 |</span> Customer Details
              </h3>
              <div className="space-y-4">
                <Select
                  isClearable
                  isSearchable
                  placeholder="Search customer…"
                  styles={selectStyles()}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  options={customers
                    .filter(c => c.isActive !== false || c.id === form.customer?.id)
                    .map(c => ({ value: c.id, label: `${c.name} — ${c.phone}`, customer: c }))}
                  value={selectedCustomer}
                  onChange={sel => {
                    if (!sel) { setForm(f => ({ ...f, customer: { name: '', phone: '', address: '' }, vehicleId: '', carMake: '', licensePlate: '' })); return; }
                    const m = sel.customer;
                    setForm(f => ({ 
                      ...f, 
                      customer: { id: m.id, name: m.name, phone: m.phone, address: m.address || '' },
                      vehicleId: '', carMake: '', licensePlate: ''
                    }));
                    onCustomerSelect?.(m);
                  }}
                  isDisabled={!!initial}
                />
                
                {form.customer.name && (
                  <div className="bg-white/50 border border-white/60 rounded-xl p-4 text-[13px] text-gray-700 space-y-2 shadow-inner">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      <span className="font-bold text-gray-900 uppercase tracking-wide text-[10px]">Customer:</span> {form.customer.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-gray-400" />
                      <span className="font-bold text-gray-900 uppercase tracking-wide text-[10px]">Phone:</span> {form.customer.phone}
                    </div>
                    <div className="flex items-start gap-2">
                      <Home size={14} className="text-gray-400 mt-0.5" />
                      <span className="font-bold text-gray-900 uppercase tracking-wide text-[10px]">Address:</span> 
                      <span className="flex-1 leading-tight">{form.customer.address || 'N/A'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* STEP 2: Vehicle Details */}
          <div className="relative z-10 flex gap-4 items-start">
            <div className="mt-[22px] bg-transparent shrink-0">
              <CheckCircle2 size={22} strokeWidth={2.5} className={isStep2Complete ? "text-emerald-500 bg-white/90 rounded-full shadow-sm" : "text-gray-400 bg-white/50 backdrop-blur-sm rounded-full"} />
            </div>
            <div className="card flex-1 p-6 md:p-7">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[16px] font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-gray-400 font-medium text-[14px]">2 |</span> Vehicle Details
                </h3>
                <Car className="text-gray-400/50" size={24} strokeWidth={1.5} />
              </div>
              <div className="space-y-4">
                <Field label="SELECT VEHICLE">
                  <Select
                    isClearable
                    placeholder={!selectedCustomer ? "Select a customer first..." : "Select a vehicle..."}
                    styles={selectStyles()}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                    isDisabled={!selectedCustomer || !selectedCustomer.customer?.vehicles || selectedCustomer.customer.vehicles.length === 0}
                    options={selectedCustomer?.customer?.vehicles?.map(v => ({
                      value: v.id,
                      label: `${v.make} ${v.model} - ${v.plate}`,
                      vehicle: v
                    })) || []}
                    value={
                      form.vehicleId 
                        ? { 
                            value: form.vehicleId, 
                            label: `${form.carMake} - ${form.licensePlate}` 
                          } 
                        : null
                    }
                    onChange={sel => {
                      if (!sel) {
                        setForm(f => ({ ...f, vehicleId: '', carMake: '', licensePlate: '' }));
                        return;
                      }
                      const v = sel.vehicle;
                      setForm(f => ({
                        ...f,
                        vehicleId: v.id,
                        carMake: `${v.make} ${v.model}`,
                        licensePlate: v.plate
                      }));
                    }}
                  />
                </Field>
                <Field label="MAKE & MODEL (AUTO-FILLED)">
                  <input className={customInputCls} value={form.carMake} readOnly placeholder="e.g. Ford Mustang Shelby" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="YEAR (OPTIONAL)">
                    <input className={customInputCls} placeholder="e.g. 2023" />
                  </Field>
                  <Field label="LICENSE / VIN (AUTO-FILLED)">
                    <input className={`${customInputCls} font-mono uppercase`} value={form.licensePlate} readOnly placeholder="1FA-XXX" />
                  </Field>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Step 3 (Upgrade Selection) ── */}
        <div className="w-full lg:flex-1">
          <div className="card p-6 md:p-8 h-full flex flex-col">
            <h3 className="text-[18px] font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-gray-400 font-medium text-[16px]">3 |</span> Upgrade Selection
            </h3>
            
            {/* Search Bar */}
            <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} strokeWidth={2.5} />
              <input 
                type="text" 
                placeholder="FIND A PRESET PACKAGE"
                className={`${customInputCls} pl-12 py-3.5 text-[12px] font-bold uppercase tracking-widest bg-white/70`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
              
              {/* Left Side: Package List */}
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[440px] pr-2 custom-scrollbar">
                {filteredTemplates.map(opt => {
                  const isSelected = form.masterOfferId === opt.id;
                  return (
                    <div 
                      key={opt.id}
                      onClick={() => handlePackageSelect(opt.id)}
                      className={`relative cursor-pointer rounded-2xl p-4 transition-all duration-200 flex items-center justify-between overflow-hidden group border ${isSelected ? 'bg-amber-50/70 border-[#F6CB59] shadow-md' : 'bg-white/60 border-white/60 hover:bg-white/90 hover:shadow-sm'}`}
                    >
                      {isSelected && (
                        <div className="absolute top-0 right-0 bg-[#F6CB59] text-[#886D52] text-[9px] font-black px-2.5 py-1 rounded-bl-lg uppercase tracking-widest shadow-sm">
                          Suggested
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors shadow-sm ${isSelected ? 'bg-white border border-amber-100' : 'bg-white/80 border border-white group-hover:bg-white'}`}>
                          <Package size={22} strokeWidth={1.5} className={isSelected ? 'text-amber-600' : 'text-gray-500'} />
                        </div>
                        <div className={`font-bold text-[13px] leading-tight ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                          {opt.name}
                        </div>
                      </div>
                      <div className="text-right pr-2">
                        <div className="text-[11px] text-gray-500 font-bold tracking-wide">₹{opt.defaultPrice}</div>
                      </div>
                    </div>
                  );
                })}
                {filteredTemplates.length === 0 && (
                  <div className="text-center p-8 text-gray-400 text-sm font-medium border border-dashed border-white/60 rounded-2xl bg-white/30">
                    No packages found.
                  </div>
                )}
              </div>

              {/* Right Side: Form Fields */}
              <div className="space-y-5">
                <Field label="CUSTOMIZING">
                  <input className={customInputCls} value={form.packageName} onChange={e => setF('packageName', e.target.value)} placeholder="Enter Package Name" />
                </Field>
                <Field label="PRICE">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                    <input type="number" min="0" className={`${customInputCls} pl-8`} value={form.price} onChange={e => setF('price', e.target.value)} placeholder="PRICE" />
                  </div>
                </Field>
                <Field label="VALIDITY">
                  <input type="date" className={customInputCls} value={form.validityDate} onChange={e => setF('validityDate', e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="TOTAL WASHES">
                    <input type="number" min="0" className={customInputCls} value={form.totalWashes} onChange={e => setF('totalWashes', e.target.value)} placeholder="0" />
                  </Field>
                  <Field label="FREE WASHES">
                    <input type="number" min="0" className={customInputCls} value={form.freeWashes} onChange={e => setF('freeWashes', e.target.value)} placeholder="0" />
                  </Field>
                </div>
                <Field label="TERMS & CONDITIONS">
                  <textarea 
                    className={`${customInputCls} resize-none min-h-[110px] leading-relaxed`} 
                    value={form.terms} 
                    onChange={e => setF('terms', e.target.value)} 
                    placeholder="Terms & conditions. Service details and exclusions apply..." 
                  />
                </Field>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM ROW: Step 4 (Services Included) ── */}
      <div className="w-full mt-6">
        <div className="card p-6 md:p-8 flex flex-col gap-6 relative">
          <div className="hidden lg:block absolute left-[30px] -top-6 h-6 w-0.5 bg-white/40 -z-10"></div>
          
          <h3 className="text-[18px] font-bold text-gray-900 flex items-center gap-2">
            <span className="text-gray-400 font-medium text-[16px]">4 |</span> Services Included in Package
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Field label="STANDARD SERVICES">
                <Select
                  isClearable
                  isSearchable
                  placeholder="Select standard service..."
                  styles={selectStyles()}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  options={serviceOptions.map(s => ({ value: s.id, label: s.name, opt: s }))}
                  value={null}
                  onChange={sel => sel && toggleService(sel.opt, true)}
                />
              </Field>
              <div className="flex flex-wrap gap-2 mt-3">
                {form.services.map(s => (
                  <div key={s.service_id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-[13px] font-bold shadow-sm">
                    {s.service}
                    <button type="button" onClick={() => toggleService({ id: s.service_id }, false)} className="hover:text-rose-400">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Field label="THIRD-PARTY / CUSTOM SERVICES">
                <Select
                  isClearable
                  isSearchable
                  placeholder="Select third-party service..."
                  styles={selectStyles()}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  options={[
                    { label: '-- Add Custom Service --', value: 'custom' },
                    ...thirdPartyOptions.map(t => ({ value: t.id, label: t.name }))
                  ]}
                  value={null}
                  onChange={sel => sel && addThirdPartyItem(sel.value)}
                />
              </Field>
              <div className="flex flex-wrap gap-2 mt-3">
                {form.thirdPartyItems.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[13px] font-bold shadow-sm">
                    {t.service_name}
                    <button type="button" onClick={() => removeThirdPartyItem(idx)} className="hover:text-rose-200">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className={`px-8 py-3.5 rounded-xl text-[13px] font-bold tracking-widest text-[#886D52] bg-[#F6CB59] hover:bg-[#e6c700] shadow-lg shadow-amber-200/40 flex items-center justify-center gap-2 transition-all uppercase ${loading ? 'opacity-70 pointer-events-none' : 'hover:-translate-y-0.5'}`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-[#886D52]/30 border-t-[#886D52] rounded-full animate-spin" />
              ) : null}
              Save and Continue
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
