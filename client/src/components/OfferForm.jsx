import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios.js';
import {
  User, Phone, Home, Sparkles, Car, CheckCircle2, Package, Search
} from 'lucide-react';
import Select from 'react-select';
import toast from 'react-hot-toast';

/* ─── shared select styles ────────────────────────────────────── */
const selectStyles = () => ({
  control: (b, s) => ({
    ...b,
    borderColor: s.isFocused ? '#FBD904' : 'rgba(255,255,255,0.4)',
    borderRadius: '0.75rem',
    boxShadow: s.isFocused ? '0 0 0 3px rgba(251,217,4,.15)' : 'inset 0 2px 4px rgba(0,0,0,0.02)',
    minHeight: '42px',
    fontSize: '13px',
    backgroundColor: 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(12px)',
    color: '#111827',
    transition: 'all .2s',
    '&:hover': { borderColor: '#FBD904', backgroundColor: 'rgba(255,255,255,0.8)' },
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
    backgroundColor: s.isSelected ? '#FBD904' : s.isFocused ? 'rgba(0,0,0,0.03)' : 'transparent',
    color: '#111827',
    cursor: 'pointer',
    fontWeight: s.isSelected ? '600' : '500',
  }),
  placeholder: b => ({ ...b, color: '#6b7280', fontSize: '13px' }),
  input: b => ({ ...b, fontSize: '13px', color: '#111827' }),
  singleValue: b => ({ ...b, color: '#111827', fontWeight: '500' }),
});

const customInputCls = 'input focus:ring-[#FBD904]/40 focus:border-[#FBD904] font-medium';

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
  const [form, setForm] = useState(() => {
    const base = {
      customer: { name: '', phone: '', address: '' },
      carMake: '', carModel: '', licensePlate: '',
      masterOfferId: '', packageName: '', description: '',
      price: '', validityDate: '', terms: '', status: 'active'
    };
    if (!initial) return base;
    return { ...base, ...initial, customer: initial.customer || base.customer };
  });

  const [customers, setCustomers] = useState([]);
  const [offerTemplates, setOfferTemplates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.get('/customers').then(r => setCustomers(r.data));
    api.get('/offerMaster').then(r => setOfferTemplates(r.data));
  }, []);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const calculateExpiry = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + Number(days));
    return d.toISOString().split('T')[0];
  };

  const filteredTemplates = useMemo(() => {
    return offerTemplates.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [offerTemplates, searchQuery]);

  const handlePackageSelect = (masterOfferId) => {
    if (form.masterOfferId === masterOfferId) {
      setForm(f => ({ ...f, masterOfferId: '', packageName: '', description: '', price: '', validityDate: '', terms: '' }));
      return;
    }
    const selectedPackage = offerTemplates.find(o => o._id === masterOfferId);
    if (selectedPackage) {
      setForm(f => ({
        ...f,
        masterOfferId: selectedPackage._id,
        packageName: selectedPackage.name,
        price: selectedPackage.defaultPrice,
        description: selectedPackage.description,
        terms: selectedPackage.terms,
        validityDate: calculateExpiry(selectedPackage.defaultValidityDays)
      }));
    }
  };

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.customer.name) return toast.error('Please select a customer.');
    if (!form.packageName) return toast.error('Please provide a package name.');
    
    onSubmit(form);
  }

  const selectedCustomer = form.customer?._id
    ? { value: form.customer._id, label: `${form.customer.name} — ${form.customer.phone}` }
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
                    .filter(c => c.isActive !== false || c._id === form.customer?._id)
                    .map(c => ({ value: c._id, label: `${c.name} — ${c.phone}`, customer: c }))}
                  value={selectedCustomer}
                  onChange={sel => {
                    if (!sel) { setForm(f => ({ ...f, customer: { name: '', phone: '', address: '' } })); return; }
                    const m = sel.customer;
                    setForm(f => ({ ...f, customer: { _id: m._id, name: m.name, phone: m.phone, address: m.address || '' } }));
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
                <Field label="MAKE & MODEL">
                  <input className={customInputCls} value={form.carMake} onChange={e => setF('carMake', e.target.value)} placeholder="e.g. Ford Mustang Shelby" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="YEAR">
                    <input className={customInputCls} placeholder="e.g. 2023" />
                  </Field>
                  <Field label="LICENSE / VIN">
                    <input className={`${customInputCls} font-mono uppercase`} value={form.licensePlate} onChange={e => setF('licensePlate', e.target.value)} placeholder="1FA-XXX" />
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
                  const isSelected = form.masterOfferId === opt._id;
                  return (
                    <div 
                      key={opt._id}
                      onClick={() => handlePackageSelect(opt._id)}
                      className={`relative cursor-pointer rounded-2xl p-4 transition-all duration-200 flex items-center justify-between overflow-hidden group border ${isSelected ? 'bg-amber-50/70 border-[#FBD904] shadow-md' : 'bg-white/60 border-white/60 hover:bg-white/90 hover:shadow-sm'}`}
                    >
                      {isSelected && (
                        <div className="absolute top-0 right-0 bg-[#FBD904] text-[#020029] text-[9px] font-black px-2.5 py-1 rounded-bl-lg uppercase tracking-widest shadow-sm">
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

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className={`px-8 py-3.5 rounded-xl text-[13px] font-bold tracking-widest text-[#020029] bg-[#FBD904] hover:bg-[#e6c700] shadow-lg shadow-amber-200/40 flex items-center justify-center gap-2 transition-all uppercase ${loading ? 'opacity-70 pointer-events-none' : 'hover:-translate-y-0.5'}`}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-[#020029]/30 border-t-[#020029] rounded-full animate-spin" />
                ) : null}
                Save and Continue
              </button>
            </div>
          </div>
        </div>

      </div>
    </form>
  );
}
