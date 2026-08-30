import React, { useState, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import {
  User, Phone, MapPin, Plus, Trash2, Sparkles,
  CheckCircle2, AlertCircle, Calendar, IndianRupee, Hash, Receipt, Settings, Truck, X, Car
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parseISO } from 'date-fns';
import Select from 'react-select';
import { useClients, useServices, useOrganizations, useThirdPartyServices, useAssignedOffers, useVehicleTypes } from '../hooks/useQueries.js';

function fmt(n) { return Number(n || 0).toLocaleString('en-IN'); }

const EMPTY_ARRAY = [];

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
    color: '#886D52',
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
    color: '#886D52',
    cursor: 'pointer',
    marginBottom: '2px'
  }),
  placeholder: b => ({ ...b, color: '#64748b', fontSize: '13px', fontWeight: '500' }),
  input: b => ({ ...b, fontSize: '13px', color: '#886D52' }),
  singleValue: b => ({ ...b, color: '#886D52', fontWeight: '600' }),
});

const inputCls = [
  'input block w-full px-4 py-2 text-[13px] font-medium text-gray-900',
  'placeholder:text-gray-400 placeholder:font-medium',
  'bg-white focus:outline-none focus:ring-2 focus:ring-[#F6CB59]/40 focus:border-transparent',
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

const ScheduleConflictModal = memo(function ScheduleConflictModal({ isOpen, conflicts, onCancel, onProceed }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-amber-100 bg-amber-50/50">
          <AlertCircle size={20} className="text-amber-500 shrink-0" />
          <h3 className="font-bold text-gray-900 text-lg">Scheduling Conflict</h3>
        </div>
        <div className="p-4 max-h-[50vh] overflow-y-auto flex flex-col gap-2">
          {conflicts.map((c, i) => (
            <div key={i} className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-[13px]">
              <span className="font-bold text-gray-900">{c.service_name}</span> is already scheduled{' '}
              <span className="font-bold">
                {new Date(c.checkin_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}
                {' – '}
                {new Date(c.checkout_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}
              </span>{' '}
              for <span className="font-bold">{c.make_model}{c.license_vin ? ` (${c.license_vin})` : ''}</span> — {c.customer_name}.
            </div>
          ))}
          <p className="text-[12px] text-gray-500 mt-1">This is just a heads-up — you can still proceed if this is intentional (e.g. a second team is available).</p>
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 text-[13px] font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors">Go Back</button>
          <button type="button" onClick={onProceed} className="px-6 py-2.5 text-[13px] font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors shadow-sm">Proceed Anyway</button>
        </div>
      </div>
    </div>
  );
});

const ServiceVehicleModal = memo(function ServiceVehicleModal({ isOpen, onClose, onConfirm, serviceName, vehicleOptions, initialSelection, allVehicles, serviceOption }) {
  const [selected, setSelected] = useState([]);

  React.useEffect(() => {
    if (isOpen) setSelected(initialSelection || []);
  }, [isOpen, initialSelection]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-900 text-lg">Apply <span className="text-blue-600">{serviceName}</span> to...</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto flex flex-col gap-2">
          {vehicleOptions.map(v => {
            const vehObj = (allVehicles || []).find(veh => veh.id === v.value);
            const vtId = vehObj?.vehicle_type_id;
            let vPrice = Number(serviceOption?.price || serviceOption?.sellingPrice || 0);
            if (vtId && serviceOption?.vehiclePricesMap && serviceOption.vehiclePricesMap[vtId] !== undefined) {
              vPrice = Number(serviceOption.vehiclePricesMap[vtId]);
            }
            return (
              <label key={v.value} className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-colors ${selected.includes(v.value) ? 'bg-blue-50/60 border-blue-200' : 'border-gray-100 hover:bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(v.value)}
                    onChange={e => {
                      if (e.target.checked) setSelected(s => [...s, v.value]);
                      else setSelected(s => s.filter(id => id !== v.value));
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                  />
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-gray-800">{v.label}</span>
                    {vehObj?.type && <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">{vehObj.type}</span>}
                  </div>
                </div>
                {vPrice > 0 && <span className="font-mono text-xs font-bold text-gray-900 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-2xs">₹{vPrice.toLocaleString('en-IN')}</span>}
              </label>
            );
          })}
          {vehicleOptions.length === 0 && <p className="text-sm font-medium text-gray-500">No vehicles available.</p>}
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-[13px] font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
          <button type="button" onClick={() => onConfirm(selected)} className="px-6 py-2.5 text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm">Confirm ({selected.length} Vehicles)</button>
        </div>
      </div>
    </div>
  );
});

const ServiceChip = memo(function ServiceChip({ opt, checked, onToggle, resolvedPrice, vehicleTypeName }) {
  let displayPrice = resolvedPrice;
  let labelSuffix = vehicleTypeName || '';
  if (!vehicleTypeName && opt.vehiclePrices && opt.vehiclePrices.length > 0) {
    const minP = Math.min(...opt.vehiclePrices.map(vp => Number(vp.price)).filter(p => p > 0));
    if (isFinite(minP)) {
      displayPrice = minP;
      labelSuffix = ' (From)';
    }
  }
  let safePrice = 0;
  if (typeof displayPrice === 'number') {
    safePrice = isNaN(displayPrice) ? 0 : displayPrice;
  } else if (typeof displayPrice === 'string') {
    const parsed = Number(displayPrice.replace(/[^0-9.-]+/g, ''));
    safePrice = isNaN(parsed) ? 0 : parsed;
  } else {
    safePrice = Number(opt.price || 0) || 0;
  }
  return (
    <label className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all border ${checked
        ? 'bg-gray-900 text-white border-gray-900 shadow-md shadow-gray-900/20'
        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
      }`}>
      <input type="checkbox" checked={checked} onChange={e => onToggle(opt, e.target.checked)} className="sr-only" />
      <span>{opt.name}</span>
      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${checked ? 'bg-gray-800 text-[#FFD700]' : 'bg-slate-100 text-slate-700'}`}>
        ₹{safePrice.toLocaleString('en-IN')}{labelSuffix}
      </span>
    </label>
  );
});

const ThirdPartyServiceChip = memo(function ThirdPartyServiceChip({ opt, checked, onToggle, resolvedPrice, vehicleTypeName }) {
  let displayPrice = resolvedPrice;
  let labelSuffix = vehicleTypeName || '';
  const labourCount = Number(opt.labourCount) || 1;
  const labourCharge = Number(opt.labourCharge) || 0;
  const labourCostTotal = labourCount * labourCharge;

  if (!vehicleTypeName && opt.vehiclePrices && opt.vehiclePrices.length > 0) {
    const minP = Math.min(...opt.vehiclePrices.map(vp => Number(vp.selling_price)).filter(p => p > 0));
    if (isFinite(minP)) {
      displayPrice = minP + labourCostTotal;
      labelSuffix = ' (From)';
    }
  }

  let fullPrice = 0;
  if (typeof displayPrice === 'number') {
    fullPrice = isNaN(displayPrice) ? 0 : displayPrice;
  } else if (typeof displayPrice === 'string') {
    const parsed = Number(displayPrice.replace(/[^0-9.-]+/g, ''));
    fullPrice = isNaN(parsed) ? 0 : parsed;
  } else {
    fullPrice = (Number(opt.sellingPrice || 0) || 0) + labourCostTotal;
  }

  return (
    <label className={`flex flex-col gap-1 cursor-pointer px-4 py-3 rounded-xl text-[13px] font-bold transition-all border ${checked
        ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
        : 'bg-white text-gray-800 border-gray-200 hover:bg-amber-50 hover:border-amber-200 shadow-2xs'
      }`}>
      <input type="checkbox" checked={checked} onChange={e => onToggle(opt, e.target.checked)} className="sr-only" />
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 font-bold">
          <Truck size={14} className={checked ? 'text-white' : 'text-amber-500'} />
          {opt.name}
        </span>
        <span className={`text-[12px] font-black font-mono ${checked ? 'text-white' : 'text-gray-900'}`}>
          ₹{fullPrice.toLocaleString('en-IN')}{labelSuffix}
        </span>
      </div>
      <div className={`text-[11px] font-medium flex items-center justify-between gap-2 flex-wrap ${checked ? 'text-amber-100' : 'text-gray-500'}`}>
        <span>{opt.vendorName ? `Vendor: ${opt.vendorName}` : 'Third-Party'}</span>
        {labourCostTotal > 0 ? (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${checked ? 'bg-amber-600/60 text-white' : 'bg-amber-100/80 text-amber-900'}`}>
            Labour: {labourCount} × ₹{labourCharge.toLocaleString('en-IN')} (₹{labourCostTotal.toLocaleString('en-IN')})
          </span>
        ) : null}
      </div>
    </label>
  );
});

const VehicleChip = memo(function VehicleChip({ opt, checked, onToggle }) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all border ${checked
        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
        : 'bg-white text-gray-600 border-gray-200 hover:bg-blue-50 hover:border-blue-200'
      }`}>
      <input type="checkbox" checked={checked} onChange={e => onToggle(opt, e.target.checked)} className="sr-only" />
      {opt.label}
    </label>
  );
});

function parseLocalDateTime(v) {
  return v ? new Date(v) : null;
}
function formatLocalDateTime(d) {
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const VehicleVisitRow = memo(function VehicleVisitRow({ label, meta, onField, onCopyToAll, showCopyToAll }) {
  return (
    <div className="flex flex-col gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-bold text-gray-900">{label}</div>
        {showCopyToAll && (
          <button type="button" onClick={onCopyToAll} className="text-[11px] font-bold text-blue-600 hover:underline">
            Use this visitor for all vehicles
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Visitor Name">
          <input className={inputCls} placeholder="Who dropped this off" value={meta.visitorName || ''} onChange={e => onField('visitorName', e.target.value)} />
        </Field>
        <Field label="Visitor Phone">
          <input className={inputCls} placeholder="Optional" value={meta.visitorPhone || ''} onChange={e => onField('visitorPhone', e.target.value)} />
        </Field>
        <Field label="Check-in Time">
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
            <DatePicker
              selected={parseLocalDateTime(meta.checkinTime)}
              onChange={d => onField('checkinTime', formatLocalDateTime(d))}
              showTimeSelect
              dateFormat="dd/MM/yyyy h:mm aa"
              className={`${inputCls} pl-9 w-full`}
              placeholderText="Select date & time"
              wrapperClassName="w-full"
              portalId="root"
            />
          </div>
        </Field>
        <Field label="Check-out Time">
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
            <DatePicker
              selected={parseLocalDateTime(meta.checkoutTime)}
              onChange={d => onField('checkoutTime', formatLocalDateTime(d))}
              showTimeSelect
              dateFormat="dd/MM/yyyy h:mm aa"
              className={`${inputCls} pl-9 w-full`}
              placeholderText="Select date & time"
              wrapperClassName="w-full"
              portalId="root"
            />
          </div>
        </Field>
      </div>
    </div>
  );
});

const SelectedServiceRow = memo(function SelectedServiceRow({ cur, onDesc, onPrice, vehicleOptions, onVehiclesChange, assignedOffers, onRedeemPackage, readOnly, allVehicles, serviceOption }) {
  const appliedVehicles = useMemo(() => {
    if (!cur.vehicle_ids || cur.vehicle_ids.length === 0) return [];
    return (allVehicles || []).filter(v => cur.vehicle_ids.includes(v.id));
  }, [cur.vehicle_ids, allVehicles]);

  return (
    <div className="flex flex-col gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200/80 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="sm:w-2/5 font-bold text-[14px] text-gray-900 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
          <span>{cur.service}</span>
        </div>

        <div className="flex-1 flex flex-col gap-2">
          <input
            className={`${inputCls} bg-white shadow-sm border-gray-200 ${readOnly ? 'pointer-events-none opacity-80' : ''}`}
            placeholder="Detail instructions / description"
            value={cur.description || ''}
            onChange={onDesc}
            readOnly={readOnly}
          />
          {!readOnly && assignedOffers && assignedOffers.length > 0 && (
            <select
              className={`${inputCls} bg-white shadow-sm border-gray-200 text-xs py-1.5`}
              value={cur.assigned_offer_id || ''}
              onChange={e => onRedeemPackage(e.target.value)}
            >
              <option value="">-- Don't redeem from package --</option>
              {assignedOffers.map(offer => (
                <option key={offer.id} value={offer.id}>
                  Redeem from: {offer.packageName} ({offer.totalWashes - offer.completedWashes} left)
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="sm:w-36 flex flex-col gap-1 items-end">
          <MoneyInput value={cur.price || cur.total || ''} onChange={val => onPrice && onPrice(val)} disabled={readOnly} />
          {vehicleOptions && vehicleOptions.length > 1 && (
            <button type="button" onClick={onVehiclesChange} className="text-blue-600 font-bold text-[11px] hover:underline flex items-center gap-1">
              Edit Vehicles ({(cur?.vehicle_ids || []).length})
            </button>
          )}
        </div>
      </div>

      {/* Per-Vehicle Price Breakdown Pill List */}
      {appliedVehicles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-200/50">
          {appliedVehicles.map(v => {
            const vtId = v.vehicle_type_id;
            let vPrice = Number(serviceOption?.price || cur.price || 0);
            if (isNaN(vPrice)) vPrice = 0;
            if (vtId && serviceOption?.vehiclePricesMap && serviceOption.vehiclePricesMap[vtId] !== undefined) {
              const mapped = Number(serviceOption.vehiclePricesMap[vtId]);
              if (!isNaN(mapped) && mapped > 0) vPrice = mapped;
            }
            return (
              <span key={v.id} className="text-[11px] font-bold bg-white text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1 flex items-center gap-1.5 shadow-2xs">
                <Car size={11} className="text-blue-500 shrink-0" />
                <span>{[v.make, v.model].filter(Boolean).join(' ') || 'Vehicle'}{v.plate ? ` (${v.plate})` : ''}</span>
                {v.type && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-extrabold uppercase">{v.type}</span>}
                <span className="font-mono text-gray-900 font-bold">₹{vPrice.toLocaleString('en-IN')}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
});

const ThirdPartyServiceRow = memo(function ThirdPartyServiceRow({ item, onField, onRemove, vehicleOptions, onVehiclesChange, readOnly, allVehicles, thirdPartyOption }) {
  const appliedVehicles = useMemo(() => {
    if (!item.vehicle_ids || item.vehicle_ids.length === 0) return [];
    return (allVehicles || []).filter(v => item.vehicle_ids.includes(v.id));
  }, [item.vehicle_ids, allVehicles]);

  const labourCount = Number(item.labour_count || thirdPartyOption?.labourCount || 1);
  const labourCharge = Number(item.labour_charge || thirdPartyOption?.labourCharge || 0);
  const labourCostTotal = labourCount * labourCharge;

  return (
    <div className="flex flex-col gap-3.5 bg-amber-50/60 p-4 sm:p-5 rounded-2xl border border-amber-200/80 shadow-2xs">
      {/* Top Header: Service Title, Vendor Name, Labour Cost Badge, & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/60">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
            <Truck size={17} />
          </div>
          <div>
            <h4 className="text-[14px] font-bold text-gray-900 leading-tight">{item.service_name}</h4>
            {item.vendor_name && (
              <span className="text-[11px] font-medium text-amber-800">
                Vendor: <span className="font-bold">{item.vendor_name}</span>
              </span>
            )}
          </div>
        </div>

        {/* Cost & Summary Pills + Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {labourCostTotal > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-amber-200 text-amber-900 text-[11px] font-semibold shadow-2xs">
              <span className="text-amber-700 font-bold uppercase text-[10px] tracking-wider">Labour Cost:</span>
              <span className="font-mono font-bold">₹{labourCostTotal.toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-gray-500">({labourCount} × ₹{labourCharge.toLocaleString('en-IN')})</span>
            </span>
          )}

          {vehicleOptions && vehicleOptions.length > 1 && (
            <button
              type="button"
              onClick={onVehiclesChange}
              className="text-amber-800 bg-amber-100 hover:bg-amber-200 font-bold text-[11px] px-2.5 py-1 rounded-lg transition-colors"
            >
              Edit Vehicles ({(item?.vehicle_ids || []).length})
            </button>
          )}

          {!readOnly && (
            <button
              type="button"
              onClick={onRemove}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold text-[12px] px-2.5 py-1 rounded-lg transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Notes Input */}
      <div className="flex flex-col">
        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-gray-600">
          Work Instructions / Vendor Notes
        </label>
        <input
          className="input w-full bg-white shadow-2xs border border-gray-200/80 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
          placeholder="e.g. Paint color code, finish type, special instructions..."
          value={item.description || ''}
          onChange={e => onField('description', e.target.value)}
          readOnly={readOnly}
        />
      </div>

      {/* Selling Price + Labour + Total */}
      <div className="flex flex-wrap items-end gap-2.5">
        {/* Selling Price Input */}
        <div className="flex flex-col min-w-[120px]">
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-amber-900/80">
            Selling Price (₹) *
          </label>
          <MoneyInput
            value={item.selling_price || ''}
            onChange={e => onField('selling_price', e.target.value)}
            disabled={readOnly}
          />
        </div>

        {/* Plus sign */}
        <div className="flex items-center pb-2 text-amber-700 font-black text-lg select-none">+</div>

        {/* Labour Charge (read-only display) */}
        <div className="flex flex-col min-w-[120px]">
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-gray-500">
            Labour Charge (₹)
          </label>
          <div className="h-[38px] px-3 py-2 bg-white border border-amber-200 rounded-xl font-mono font-bold text-sm text-amber-900 flex items-center justify-end shadow-2xs whitespace-nowrap">
            ₹{labourCostTotal.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Equals sign */}
        <div className="flex items-center pb-2 text-amber-700 font-black text-lg select-none">=</div>

        {/* Total */}
        <div className="flex flex-col min-w-[130px]">
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-amber-950">
            Total Charge (₹)
          </label>
          <div className="h-[38px] px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-mono font-black text-sm flex items-center justify-between shadow-xs whitespace-nowrap">
            <span className="text-[9px] uppercase tracking-wider font-sans font-extrabold text-amber-100 mr-1">Total:</span>
            <span>₹{((Number(item.selling_price) || 0) + labourCostTotal).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Per-Vehicle Price Breakdown Pill List */}
      {appliedVehicles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-amber-200/50 items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mr-1">Assigned to:</span>
          {appliedVehicles.map(v => {
            const vtId = v.vehicle_type_id;
            let vPrice = Number(thirdPartyOption?.sellingPrice || item.selling_price || 0);
            if (isNaN(vPrice)) vPrice = 0;
            if (vtId && thirdPartyOption?.vehiclePricesMap && thirdPartyOption.vehiclePricesMap[vtId] !== undefined) {
              const mapped = Number(thirdPartyOption.vehiclePricesMap[vtId]);
              if (!isNaN(mapped) && mapped > 0) vPrice = mapped;
            }
            return (
              <span key={v.id} className="text-[11px] font-bold bg-white text-amber-950 border border-amber-200/80 rounded-lg px-2.5 py-1 flex items-center gap-1.5 shadow-2xs">
                <Car size={12} className="text-amber-600 shrink-0" />
                <span>{[v.make, v.model].filter(Boolean).join(' ') || 'Vehicle'}{v.plate ? ` (${v.plate})` : ''}</span>
                {v.type && <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-extrabold uppercase">{v.type}</span>}
                <span className="font-mono text-amber-900 font-bold">₹{vPrice.toLocaleString('en-IN')}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default function InvoiceForm({ initial, onSubmit, loading }) {
  const isOfferPurchase = initial?.is_offer_purchase === true;
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const { data: clientData } = useClients();
  const customers = clientData?.clients || EMPTY_ARRAY;
  const { data: organizations = [] } = useOrganizations();
  const { data: serviceOptions = [] } = useServices();
  const { data: thirdPartyOptions = [] } = useThirdPartyServices();
  const { data: vehicleTypes = [] } = useVehicleTypes();

  const [clientType, setClientType] = useState(initial?.organizationId || initial?.organization_id ? 'organization' : 'individual');
  const [serviceModal, setServiceModal] = useState({ isOpen: false, type: null, opt: null, selectedVehicleIds: [] });
  const [conflictModal, setConflictModal] = useState({ isOpen: false, conflicts: [] });
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  const [form, setForm] = useState(() => {
    const base = {
      customer: { name: '', phone: '', address: '', vehicles: [] },
      selectedVehicleIds: [],
      vehicleVisitMeta: {},
      vehicleId: null,
      carMake: '', carModel: '', licensePlate: '',
      location: '',
      services: [], thirdPartyItems: [], subTotal: 0, discount: 0,
      status: 'draft', notes: 'Thank you for choosing Detailing Masters for your car care needs!',
      payments: [{ amount: '', date: new Date().toISOString().slice(0, 10), method: 'Cash', reference_no: '' }],
      showTerms: true, termsAndConditions: ''
    };
    if (!initial) return base;
    const visits = initial?.vehicleVisits || [];
    return {
      ...base, ...initial,
      customer: initial.customer || base.customer,
      // Which of this org's registered vehicles this invoice covers, and the
      // per-visit details (visitor, check-in/check-out) for each.
      selectedVehicleIds: visits.map(v => v.vehicleId),
      vehicleVisitMeta: visits.reduce((acc, v) => {
        acc[v.vehicleId] = {
          visitorName: v.visitorName || '',
          visitorPhone: v.visitorPhone || '',
          checkinTime: v.checkinTime || '',
          checkoutTime: v.checkoutTime || '',
        };
        return acc;
      }, {}),
      vehicleId: initial?.vehicleId || null,
      services: initial.services || [],
      thirdPartyItems: (initial.thirdPartyServices || []).map(t => ({
        third_party_service_id: t.third_party_service_id || null,
        vehicle_ids: t.vehicle_ids || [],
        service_name: t.service_name,
        vendor_name: t.vendor_name || '',
        labour_count: t.labour_count ?? 1,
        labour_charge: t.labour_charge ?? 0,
        selling_price: Number(t.selling_price) || 0,
      })),
      subTotal: initial.subTotal || 0,
      payments: (() => {
        const mapped = (initial.payments || []).map(p => {
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
        });
        if (mapped.length === 0) {
          mapped.push({ amount: '', date: today, method: 'Cash', reference_no: '' });
        }
        return mapped;
      })(),
    };
  });

  const setF = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), []);

  // Only fetch assigned offers if customer is an individual client
  const { data: assignedOffers = [] } = useAssignedOffers(clientType === 'individual' ? form.customer?.id : null);

  // All vehicle ids this invoice currently covers — the org's selected
  // registered vehicles, or the single selected vehicle for individuals.
  const activeVehicleIds = useMemo(
    () => clientType === 'organization'
      ? form.selectedVehicleIds
      : (form.vehicleId ? [form.vehicleId] : []),
    [clientType, form.selectedVehicleIds, form.vehicleId]
  );

  const toggleVehicle = useCallback((opt, checked) => {
    setForm(f => {
      if (checked) {
        return {
          ...f,
          selectedVehicleIds: [...f.selectedVehicleIds, opt.value],
          vehicleVisitMeta: {
            ...f.vehicleVisitMeta,
            [opt.value]: f.vehicleVisitMeta[opt.value] || { visitorName: '', visitorPhone: '', checkinTime: '', checkoutTime: '' },
          },
        };
      }
      return { ...f, selectedVehicleIds: f.selectedVehicleIds.filter(id => id !== opt.value) };
    });
  }, []);

  const updateVehicleVisitField = useCallback((vehicleId, field, val) => {
    setForm(f => ({
      ...f,
      vehicleVisitMeta: {
        ...f.vehicleVisitMeta,
        [vehicleId]: { ...(f.vehicleVisitMeta[vehicleId] || {}), [field]: val },
      },
    }));
  }, []);

  const copyVisitorToAllVehicles = useCallback((sourceVehicleId) => {
    setForm(f => {
      const source = f.vehicleVisitMeta[sourceVehicleId] || {};
      const nextMeta = { ...f.vehicleVisitMeta };
      for (const vid of f.selectedVehicleIds) {
        nextMeta[vid] = { ...(nextMeta[vid] || {}), visitorName: source.visitorName || '', visitorPhone: source.visitorPhone || '' };
      }
      return { ...f, vehicleVisitMeta: nextMeta };
    });
  }, []);

  const servicesSubTotal = form.services.reduce((acc, s) => acc + (Number(s.total) || 0) * (s.vehicle_ids?.length || 1), 0);
  const thirdPartySubTotal = useMemo(
    () => form.thirdPartyItems.reduce((sum, t) => {
      const sellingP = Number(t.selling_price) || 0;
      const labourC = (Number(t.labour_count) || 1) * (Number(t.labour_charge) || 0);
      return sum + (sellingP + labourC) * (t.vehicle_ids?.length || 1);
    }, 0),
    [form.thirdPartyItems]
  );
  const subTotal = isOfferPurchase ? Number(form.subTotal || 0) : (servicesSubTotal + thirdPartySubTotal);
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

  const handleRedeemPackage = useCallback((offer, vid) => {
    const mappedServices = (offer.serviceIds || []).map(id => {
      const s = serviceOptions.find(opt => opt.id === id);
      if (!s) return null;
      return {
        service_id: s.id,
        service: s.name,
        description: s.description || '',
        price: 0,
        total: 0,
        vehicle_ids: [vid],
        assigned_offer_id: offer.id
      };
    }).filter(Boolean);

    const mappedThirdParty = (offer.thirdPartyServiceIds || []).map(id => {
      const t = thirdPartyOptions.find(opt => opt.id === id);
      if (!t) return null;
      return {
        third_party_service_id: t.id,
        service_name: t.name,
        vendor_name: t.vendorName || '',
        labour_count: t.labourCount ?? 1,
        labour_charge: 0,
        selling_price: 0,
        vehicle_ids: [vid],
        assigned_offer_id: offer.id
      };
    }).filter(Boolean);

    setForm(f => ({
      ...f,
      services: [...f.services, ...mappedServices],
      thirdPartyItems: [...f.thirdPartyItems, ...mappedThirdParty]
    }));
    toast.success(`Redeemed "${offer.packageName}" package for this vehicle.`);
  }, [serviceOptions, thirdPartyOptions]);
  const getVehicleTypeId = useCallback((vid) => {
    if (!vid) return null;
    const veh = (form.customer?.vehicles || []).find(v => v.id === vid);
    if (!veh) return null;
    // Use stored numeric FK first
    if (veh.vehicle_type_id) return veh.vehicle_type_id;
    // Fall back: match by text name against master vehicle types list
    if (veh.type && vehicleTypes.length > 0) {
      const match = vehicleTypes.find(vt => vt.name.toLowerCase() === String(veh.type).trim().toLowerCase());
      if (match) return match.id;
    }
    return null;
  }, [form.customer, vehicleTypes]);

  const resolveServicePrice = useCallback((opt, vid) => {
    if (!opt) return 0;
    const baseP = Number(opt.price || 0);
    const vtId = getVehicleTypeId(vid);
    if (vtId && opt.vehiclePricesMap && opt.vehiclePricesMap[vtId] !== undefined) {
      const p = Number(opt.vehiclePricesMap[vtId]);
      if (!isNaN(p) && p > 0) return p;
    }
    return !isNaN(baseP) ? baseP : 0;
  }, [getVehicleTypeId]);

  const calculateServiceTotalForVehicles = useCallback((opt, vehicleIds) => {
    if (!opt || !vehicleIds || vehicleIds.length === 0) return 0;
    return vehicleIds.reduce((sum, vid) => sum + resolveServicePrice(opt, vid), 0);
  }, [resolveServicePrice]);

  const resolveThirdPartyPrice = useCallback((opt, vid) => {
    if (!opt) return 0;
    const baseP = Number(opt.sellingPrice || 0);
    const labourTotal = (Number(opt.labourCount) || 1) * (Number(opt.labourCharge) || 0);
    const vtId = getVehicleTypeId(vid);
    if (vtId && opt.vehiclePricesMap && opt.vehiclePricesMap[vtId] !== undefined) {
      const p = Number(opt.vehiclePricesMap[vtId]);
      if (!isNaN(p) && p > 0) return p + labourTotal;
    }
    return (!isNaN(baseP) ? baseP : 0) + labourTotal;
  }, [getVehicleTypeId]);

  // Returns ONLY the base selling price (no labour) for initializing selling_price field
  const resolveThirdPartySellingPrice = useCallback((opt, vid) => {
    if (!opt) return 0;
    const baseP = Number(opt.sellingPrice || 0);
    const vtId = getVehicleTypeId(vid);
    if (vtId && opt.vehiclePricesMap && opt.vehiclePricesMap[vtId] !== undefined) {
      const p = Number(opt.vehiclePricesMap[vtId]);
      if (!isNaN(p) && p > 0) return p;
    }
    return !isNaN(baseP) ? baseP : 0;
  }, [getVehicleTypeId]);

  const calculateThirdPartySellingForVehicles = useCallback((opt, vehicleIds) => {
    if (!opt || !vehicleIds || vehicleIds.length === 0) return 0;
    return vehicleIds.reduce((sum, vid) => sum + resolveThirdPartySellingPrice(opt, vid), 0);
  }, [resolveThirdPartySellingPrice]);

  const calculateThirdPartyTotalForVehicles = useCallback((opt, vehicleIds) => {
    if (!opt || !vehicleIds || vehicleIds.length === 0) return 0;
    return vehicleIds.reduce((sum, vid) => sum + resolveThirdPartyPrice(opt, vid), 0);
  }, [resolveThirdPartyPrice]);

  const getServiceBadgeInfo = useCallback((opt, vehicleIds) => {
    if (!vehicleIds || vehicleIds.length === 0) {
      if (opt.vehiclePrices && opt.vehiclePrices.length > 0) {
        const prices = opt.vehiclePrices.map(vp => Number(vp.price)).filter(p => p > 0);
        const minP = Math.min(...prices);
        if (isFinite(minP)) {
          return { price: minP, priceStr: `₹${minP.toLocaleString('en-IN')}`, suffix: ' (From)' };
        }
      }
      const p = Number(opt.price || 0);
      return { price: p, priceStr: `₹${p.toLocaleString('en-IN')}`, suffix: '' };
    }

    const allVehicles = form.customer?.vehicles || [];
    const selectedVehs = allVehicles.filter(v => vehicleIds.includes(v.id));

    if (vehicleIds.length === 1 && selectedVehs.length === 1) {
      const v = selectedVehs[0];
      const resPrice = resolveServicePrice(opt, v.id);
      const safePrice = isNaN(resPrice) ? 0 : resPrice;
      return { price: safePrice, priceStr: `₹${safePrice.toLocaleString('en-IN')}`, suffix: v.type ? ` (${v.type})` : '' };
    }

    const totalP = calculateServiceTotalForVehicles(opt, vehicleIds);
    const safeTotalP = isNaN(totalP) ? 0 : Number(totalP);
    const types = Array.from(new Set(selectedVehs.map(v => v.type).filter(Boolean)));
    const typeLabel = types.length > 0 ? ` (${types.join(' + ')})` : ` (${vehicleIds.length} Veh)`;

    return { price: safeTotalP, priceStr: `₹${safeTotalP.toLocaleString('en-IN')}`, suffix: typeLabel };
  }, [form.customer, resolveServicePrice, calculateServiceTotalForVehicles]);

  const getThirdPartyBadgeInfo = useCallback((opt, vehicleIds) => {
    const labourTotal = (Number(opt.labourCount) || 1) * (Number(opt.labourCharge) || 0);
    if (!vehicleIds || vehicleIds.length === 0) {
      if (opt.vehiclePrices && opt.vehiclePrices.length > 0) {
        const prices = opt.vehiclePrices.map(vp => Number(vp.selling_price)).filter(p => p > 0);
        const minP = Math.min(...prices);
        if (isFinite(minP)) {
          const fullMin = minP + labourTotal;
          return { price: fullMin, priceStr: `₹${fullMin.toLocaleString('en-IN')}`, suffix: ' (From)' };
        }
      }
      const p = Number(opt.sellingPrice || 0) + labourTotal;
      return { price: p, priceStr: `₹${p.toLocaleString('en-IN')}`, suffix: '' };
    }

    const allVehicles = form.customer?.vehicles || [];
    const selectedVehs = allVehicles.filter(v => vehicleIds.includes(v.id));

    if (vehicleIds.length === 1 && selectedVehs.length === 1) {
      const v = selectedVehs[0];
      const resPrice = resolveThirdPartyPrice(opt, v.id);
      const safePrice = isNaN(resPrice) ? 0 : resPrice;
      return { price: safePrice, priceStr: `₹${safePrice.toLocaleString('en-IN')}`, suffix: v.type ? ` (${v.type})` : '' };
    }

    const totalP = calculateThirdPartyTotalForVehicles(opt, vehicleIds);
    const safeTotalP = isNaN(totalP) ? 0 : Number(totalP);
    const types = Array.from(new Set(selectedVehs.map(v => v.type).filter(Boolean)));
    const typeLabel = types.length > 0 ? ` (${types.join(' + ')})` : ` (${vehicleIds.length} Veh)`;

    return { price: safeTotalP, priceStr: `₹${safeTotalP.toLocaleString('en-IN')}`, suffix: typeLabel };
  }, [form.customer, resolveThirdPartyPrice, calculateThirdPartyTotalForVehicles]);

  const activeVehicleTypeInfo = useMemo(() => {
    if (!activeVehicleIds.length) return null;
    const vid = activeVehicleIds[0];
    const veh = (form.customer?.vehicles || []).find(v => v.id === vid);
    if (veh) return { id: veh.vehicle_type_id, name: veh.type };
    return null;
  }, [activeVehicleIds, form.customer]);

  const toggleService = useCallback((opt, checked) => {
    if (checked) {
      if (clientType === 'organization' && activeVehicleIds.length > 1) {
        setServiceModal({ isOpen: true, type: 'standard', opt, selectedVehicleIds: activeVehicleIds });
        return;
      }
      const initialTotal = calculateServiceTotalForVehicles(opt, activeVehicleIds);
      setForm(f => {
        const newServices = [...f.services, {
          service_id: opt.id,
          service: opt.name,
          description: opt.description || '',
          price: initialTotal,
          total: initialTotal,
          vehicle_ids: activeVehicleIds
        }];
        return {
          ...f,
          services: newServices,
        };
      });
    } else {
      setForm(f => {
        const newServices = f.services.filter(s => s.service_id !== opt.id && s.service !== opt.name);
        return {
          ...f,
          services: newServices,
        };
      });
    }
  }, [clientType, activeVehicleIds, calculateServiceTotalForVehicles]);

  const updateServiceField = useCallback((name, field, val) => {
    setForm(f => {
      const newServices = f.services.map(s => {
        if (s.service !== name) return s;
        if (field === 'price') {
          const numPrice = Number(val) || 0;
          return { ...s, price: numPrice, total: numPrice, isManualPrice: true };
        }
        if (field === 'assigned_offer_id') {
          const originalPrice = resolveServicePrice(
            serviceOptions.find(opt => opt.name === s.service),
            s.vehicle_ids?.[0]
          );
          const newPrice = val ? 0 : originalPrice;
          return { ...s, assigned_offer_id: val, price: newPrice, total: newPrice, isManualPrice: !val };
        }
        return { ...s, [field]: val };
      });
      return {
        ...f,
        services: newServices,
      };
    });
  }, [serviceOptions, resolveServicePrice]);

  const addThirdPartyItem = useCallback((catalogId, vehicle_ids) => {
    const opt = thirdPartyOptions.find(t => t.id === Number(catalogId));
    // Use selling-only price (no labour) — UI adds labour separately in the Total display
    const initialSelling = calculateThirdPartySellingForVehicles(opt, vehicle_ids);
    setForm(f => ({
      ...f,
      thirdPartyItems: [...f.thirdPartyItems, {
        third_party_service_id: opt?.id || null, vehicle_ids: vehicle_ids || [],
        service_name: opt?.name || 'Custom Third-Party Service',
        vendor_name: opt?.vendorName || '',
        labour_count: opt?.labourCount ?? 1,
        labour_charge: opt?.labourCharge ?? 0,
        selling_price: initialSelling,
      }],
    }));
  }, [thirdPartyOptions, calculateThirdPartySellingForVehicles]);

  const toggleThirdPartyItem = useCallback((opt, checked) => {
    if (checked) {
      if (clientType === 'organization' && activeVehicleIds.length > 1) {
        setServiceModal({ isOpen: true, type: 'third_party', opt, selectedVehicleIds: activeVehicleIds });
        return;
      }
      addThirdPartyItem(opt.id, activeVehicleIds);
    } else {
      setForm(f => ({
        ...f,
        thirdPartyItems: f.thirdPartyItems.filter(t => t.third_party_service_id !== opt.id && t.service_name !== opt.name),
      }));
    }
  }, [clientType, activeVehicleIds, addThirdPartyItem]);

  const updateThirdPartyField = useCallback((idx, field, val) => {
    setForm(f => ({
      ...f,
      thirdPartyItems: f.thirdPartyItems.map((t, i) => i === idx ? { ...t, [field]: val } : t),
    }));
  }, []);

  const removeThirdPartyItem = useCallback((idx) => {
    setForm(f => ({ ...f, thirdPartyItems: f.thirdPartyItems.filter((_, i) => i !== idx) }));
  }, []);

  const pendingPayloadRef = React.useRef(null);

  async function findScheduleConflicts(vehicleVisits, serviceItems, thirdPartyItems) {
    const allConflicts = [];
    for (const visit of vehicleVisits) {
      if (!visit.checkin_time || !visit.checkout_time) continue;
      const serviceIds = serviceItems
        .filter(s => (s.vehicle_ids || []).includes(visit.vehicle_id))
        .map(s => s.service_id);
      const thirdPartyIds = thirdPartyItems
        .filter(t => (t.vehicle_ids || []).includes(visit.vehicle_id))
        .map(t => t.third_party_service_id)
        .filter(Boolean);
      if (!serviceIds.length && !thirdPartyIds.length) continue;
      try {
        const res = await api.post('/invoices/check-conflicts', {
          vehicle_id: visit.vehicle_id,
          checkin_time: visit.checkin_time,
          checkout_time: visit.checkout_time,
          service_ids: serviceIds,
          third_party_service_ids: thirdPartyIds,
          exclude_invoice_id: initial?.id || null,
        });
        if (res.data?.conflicts?.length) allConflicts.push(...res.data.conflicts);
      } catch (err) {
        // Don't block submission if the conflict check itself fails
      }
    }
    return allConflicts;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.customer?.id) return toast.error(clientType === 'individual' ? 'Please select a client.' : 'Please select an organization.');
    if (clientType === 'individual' && !form.vehicleId) return toast.error('Please select a vehicle.');
    if (clientType === 'organization' && form.selectedVehicleIds.length === 0) return toast.error('Please select at least one vehicle.');
    if (!form.services.length && !form.thirdPartyItems.length) {
      return toast.error('Please select at least one service or third-party item.');
    }

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

    if (form.services.length && !service_ids.length) {
      return toast.error('Selected services are missing ids. Refresh and try again.');
    }

    // service_items carries per-service vehicle assignment; service_ids stays as a
    // legacy fallback for any code path that hasn't moved to service_items yet.
    const service_items = form.services.map(s => ({
      service_id: Number(s.service_id || s.serviceId),
      vehicle_ids: s.vehicle_ids || [],
      price: Number(s.price) || 0,
      assigned_offer_id: s.assigned_offer_id || null,
    }));

    const third_party_items = form.thirdPartyItems.map(t => ({
      third_party_service_id: t.third_party_service_id || null,
      service_name: t.service_name,
      vendor_name: t.vendor_name || null,
      labour_count: Number(t.labour_count) || 1,
      labour_charge: Number(t.labour_charge) || 0,
      selling_price: Number(t.selling_price) || 0,
      vendor_cost: Number(t.vendor_cost) || 0,
      vehicle_ids: t.vehicle_ids || [],
    }));

    // Per-visit details for each selected vehicle — who
    // brought it in and when it checked in/out. Vehicles themselves are
    // pre-registered under the org, not created here.
    const vehicle_visits = clientType === 'organization'
      ? form.selectedVehicleIds.map(vid => {
        const meta = form.vehicleVisitMeta[vid] || {};
        return {
          vehicle_id: vid,
          visitor_name: meta.visitorName || null,
          visitor_phone: meta.visitorPhone || null,
          checkin_time: meta.checkinTime || null,
          checkout_time: meta.checkoutTime || null,
        };
      })
      : (form.vehicleId ? [{
        vehicle_id: form.vehicleId,
        visitor_name: (form.vehicleVisitMeta[form.vehicleId] || {}).visitorName || null,
        visitor_phone: (form.vehicleVisitMeta[form.vehicleId] || {}).visitorPhone || null,
        checkin_time: (form.vehicleVisitMeta[form.vehicleId] || {}).checkinTime || null,
        checkout_time: (form.vehicleVisitMeta[form.vehicleId] || {}).checkoutTime || null,
      }] : []);

    const payload = {
      client_id: clientType === 'individual' ? form.customer.id : null,
      organization_id: clientType === 'organization' ? form.customer.id : null,
      vehicle_id: form.vehicleId || null,
      service_ids,
      service_items,
      third_party_items,
      vehicle_visits,
      discount: Number(form.discount) || 0,
      special_notes: form.notes || null,
      include_terms: !!form.showTerms,
      terms_conditions: form.termsAndConditions || null,
      status: derivedStatus === 'paid' ? 'completed' : derivedStatus === 'partial' ? 'open' : 'draft',
      payments: newPayments,
    };

    setCheckingConflicts(true);
    const conflicts = await findScheduleConflicts(vehicle_visits, service_items, third_party_items);
    setCheckingConflicts(false);

    if (conflicts.length > 0) {
      pendingPayloadRef.current = payload;
      setConflictModal({ isOpen: true, conflicts });
      return;
    }

    onSubmit(payload);
  }

  function handleProceedDespiteConflict() {
    setConflictModal({ isOpen: false, conflicts: [] });
    if (pendingPayloadRef.current) {
      onSubmit(pendingPayloadRef.current);
      pendingPayloadRef.current = null;
    }
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
  const selectedThirdPartyIds = useMemo(
    () => new Set(form.thirdPartyItems.map(t => t.third_party_service_id).filter(Boolean)),
    [form.thirdPartyItems]
  );

  const vehicleOptions = useMemo(() => {
    const vehicles = form.customer?.vehicles || [];
    const pool = clientType === 'organization' ? vehicles.filter(v => v.isActive !== false) : vehicles;
    // Defensive de-dupe by id — guards against a stale/duplicated cache ever
    // rendering the same vehicle as two separate picker entries.
    const seen = new Set();
    const deduped = pool.filter(v => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });
    return deduped.map(v => ({
      value: v.id,
      label: `${[v.make, v.model].filter(Boolean).join(' ') || 'Vehicle'}${v.plate ? ` — ${v.plate}` : ''}`,
      vehicle: v,
    }));
  }, [clientType, form.customer]);

  const selectedVehicle = vehicleOptions.find(v => v.value === form.vehicleId) || null;

  const statusConfig = {
    pending: { label: 'Pending', bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
    partial: { label: 'Partial', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    paid: { label: 'Paid', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  };
  const sc = statusConfig[derivedStatus] || statusConfig.pending;
  const isStep1Complete = !!form.customer.name;
  const isStep2Complete = clientType === 'organization' ? form.selectedVehicleIds.length > 0 : !!form.vehicleId;
  const isStep3Complete = form.services.length > 0;

  const handleModalConfirm = useCallback((selectedIds) => {
    const { type, opt } = serviceModal;
    if (type === 'standard') {
      const serviceOpt = serviceOptions.find(s => s.id === opt.id || s.name === opt.name);
      const totalForVehs = calculateServiceTotalForVehicles(serviceOpt || opt, selectedIds);
      setForm(f => ({
        ...f,
        services: [...f.services, {
          service_id: opt.id,
          service: opt.name,
          description: opt.description || '',
          price: totalForVehs,
          total: totalForVehs,
          vehicle_ids: selectedIds
        }]
      }));
    } else if (type === 'third_party') {
      addThirdPartyItem(opt.id, selectedIds);
    } else if (type === 'edit_standard') {
      const serviceOpt = serviceOptions.find(s => s.id === opt.service_id || s.name === opt.service);
      const totalForVehs = calculateServiceTotalForVehicles(serviceOpt, selectedIds);
      setForm(f => ({
        ...f,
        services: f.services.map(s => (s.service === opt.service ? { ...s, vehicle_ids: selectedIds, price: totalForVehs, total: totalForVehs } : s))
      }));
    } else if (type === 'edit_third_party') {
      const tpOpt = thirdPartyOptions.find(t => t.id === opt.third_party_service_id || t.name === opt.service_name);
      // Use selling-only price (no labour) — UI adds labour separately
      const sellingForVehs = calculateThirdPartySellingForVehicles(tpOpt, selectedIds);
      setForm(f => ({
        ...f,
        thirdPartyItems: f.thirdPartyItems.map((item, idx) => (idx === opt.idx ? { ...item, vehicle_ids: selectedIds, selling_price: sellingForVehs } : item))
      }));
    }
    setServiceModal({ isOpen: false, type: null, opt: null, selectedVehicleIds: [] });
  }, [serviceModal, serviceOptions, thirdPartyOptions, calculateServiceTotalForVehicles, calculateThirdPartyTotalForVehicles, addThirdPartyItem]);

  return (
    <div className="relative">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.8) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <ServiceVehicleModal
        isOpen={serviceModal.isOpen}
        onClose={() => setServiceModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleModalConfirm}
        serviceName={serviceModal.opt?.name || serviceModal.opt?.service || serviceModal.opt?.service_name || 'Service'}
        vehicleOptions={vehicleOptions.filter(v => activeVehicleIds.includes(v.value))}
        initialSelection={serviceModal.selectedVehicleIds}
        allVehicles={form.customer?.vehicles || []}
        serviceOption={serviceModal.opt}
      />
      <ScheduleConflictModal
        isOpen={conflictModal.isOpen}
        conflicts={conflictModal.conflicts}
        onCancel={() => { setConflictModal({ isOpen: false, conflicts: [] }); pendingPayloadRef.current = null; }}
        onProceed={handleProceedDespiteConflict}
      />
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
                  <button type="button" onClick={() => { setClientType('individual'); setForm(f => ({ ...f, customer: { name: '', phone: '', address: '', vehicles: [] }, vehicleId: null, selectedVehicleIds: [], vehicleVisitMeta: {} })); }} className={`px-3 py-1 text-[12px] font-bold rounded-md transition-colors ${clientType === 'individual' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Individual</button>
                  <button type="button" onClick={() => { setClientType('organization'); setForm(f => ({ ...f, customer: { name: '', phone: '', address: '', vehicles: [] }, vehicleId: null, selectedVehicleIds: [], vehicleVisitMeta: {} })); }} className={`px-3 py-1 text-[12px] font-bold rounded-md transition-colors ${clientType === 'organization' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Organization</button>
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
                        selectedVehicleIds: [],
                        vehicleVisitMeta: {},
                        carMake: '',
                        licensePlate: '',
                      }));
                      onCustomerSelect?.(null);
                      return;
                    }
                    const m = sel.customer;
                    const vehicles = Array.isArray(m.vehicles) ? m.vehicles : [];
                    if (clientType === 'organization') {
                      // Load the org's registered vehicle fleet for selection —
                      // nothing pre-checked, staff picks which ones apply now.
                      setForm(f => ({
                        ...f,
                        customer: { id: m.id, name: m.name, phone: m.phone, address: m.address || '', vehicles },
                        vehicleId: null,
                        selectedVehicleIds: [],
                        vehicleVisitMeta: {},
                        carMake: '',
                        licensePlate: '',
                      }));
                      onCustomerSelect?.(m);
                      return;
                    }
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

              {clientType === 'individual' ? (
                <>
                  <Field label="Vehicle" required>
                    <Select
                      isClearable
                      isSearchable
                      placeholder={form.customer?.id ? 'Select vehicle…' : 'Select first…'}
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
                  {form.customer?.id && vehicleOptions.length === 0 && (
                    <p className="text-[12px] font-medium text-rose-600">
                      This client has no vehicles. Add a vehicle in Master Customer first.
                    </p>
                  )}
                  {form.vehicleId && (
                    <div className="flex flex-col gap-3 mt-4">
                      <VehicleVisitRow
                        label={selectedVehicle?.label || 'Vehicle'}
                        meta={form.vehicleVisitMeta[form.vehicleId] || {}}
                        onField={(field, val) => updateVehicleVisitField(form.vehicleId, field, val)}
                        showCopyToAll={false}
                      />
                      {assignedOffers.filter(o => o.vehicleId === form.vehicleId).map(offer => (
                        <div key={offer.id} className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between shadow-sm">
                          <div className="flex flex-col">
                            <span className="text-[12px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5"><Sparkles size={12} /> Active Package</span>
                            <span className="text-[15px] font-bold text-gray-900 mt-0.5">{offer.packageName}</span>
                            <span className="text-[12px] font-medium text-emerald-600 mt-0.5">{offer.completedWashes} of {offer.totalWashes} washes used</span>
                          </div>
                          <button type="button" onClick={() => handleRedeemPackage(offer, form.vehicleId)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-sm">
                            Redeem Wash
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2.5">
                    {vehicleOptions.map(opt => (
                      <VehicleChip
                        key={opt.value}
                        opt={opt}
                        checked={form.selectedVehicleIds.includes(opt.value)}
                        onToggle={toggleVehicle}
                      />
                    ))}
                  </div>

                  {form.customer?.id && vehicleOptions.length === 0 && (
                    <p className="text-[12px] font-medium text-rose-600">
                      This organization has no vehicles registered. Add one via Master Organization first.
                    </p>
                  )}
                  {form.customer?.id && vehicleOptions.length > 0 && form.selectedVehicleIds.length === 0 && (
                    <p className="text-[12px] font-medium text-rose-600">
                      Select at least one vehicle for this visit.
                    </p>
                  )}

                  {form.selectedVehicleIds.length > 0 && (
                    <div className="flex flex-col gap-3">
                      {form.selectedVehicleIds.map(vid => {
                        const opt = vehicleOptions.find(v => v.value === vid);
                        return (
                          <VehicleVisitRow
                            key={vid}
                            label={opt?.label || 'Vehicle'}
                            meta={form.vehicleVisitMeta[vid] || {}}
                            onField={(field, val) => updateVehicleVisitField(vid, field, val)}
                            onCopyToAll={() => copyVisitorToAllVehicles(vid)}
                            showCopyToAll={form.selectedVehicleIds.length > 1}
                          />
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${isStep3Complete ? 'border-emerald-500 text-emerald-500 bg-emerald-50' : 'border-gray-300 text-gray-400 bg-gray-50'}`}>
                  {isStep3Complete ? <CheckCircle2 size={14} className="fill-emerald-50" /> : <span className="text-[10px] font-bold">3</span>}
                </div>
                <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">Services Grid</h2>
                {isOfferPurchase && <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">(Offer Purchase - Read Only)</span>}
              </div>
              <div>
                {!isOfferPurchase && (
                  <div className="flex flex-wrap gap-2.5">
                    {serviceOptions.filter(o => o.isActive !== false).map(opt => {
                      const badgeInfo = getServiceBadgeInfo(opt, activeVehicleIds);
                      return (
                        <ServiceChip
                          key={opt.id}
                          opt={opt}
                          checked={selectedServiceIds.has(opt.id) || selectedServiceNames.has(opt.name)}
                          onToggle={toggleService}
                          resolvedPrice={badgeInfo.price}
                          vehicleTypeName={badgeInfo.suffix}
                        />
                      );
                    })}
                    {serviceOptions.length === 0 && (
                      <div className="text-[13px] font-medium text-gray-500 p-4 border border-dashed border-gray-300 rounded-xl bg-gray-50">
                        No services available.
                      </div>
                    )}
                  </div>
                )}
                {form.services.length > 0 && (
                  <div className="mt-6 flex flex-col gap-3">
                    {form.services.map(cur => (
                      <SelectedServiceRow
                        key={cur.service_id || cur.service}
                        cur={cur}
                        onDesc={e => updateServiceField(cur.service, 'description', e.target.value)}
                        onPrice={val => updateServiceField(cur.service, 'price', val)}
                        vehicleOptions={clientType === 'organization' && activeVehicleIds.length > 1 ? vehicleOptions.filter(v => activeVehicleIds.includes(v.value)) : null}
                        onVehiclesChange={() => setServiceModal({ isOpen: true, type: 'edit_standard', opt: cur, selectedVehicleIds: cur.vehicle_ids })}
                        assignedOffers={assignedOffers}
                        onRedeemPackage={id => updateServiceField(cur.service, 'assigned_offer_id', id)}
                        readOnly={isOfferPurchase}
                        allVehicles={form.customer?.vehicles || []}
                        serviceOption={serviceOptions.find(o => o.id === cur.service_id || o.name === cur.service)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-gray-300 text-gray-400 bg-gray-50">
                  <Truck size={12} />
                </div>
                <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">Third-Party Services</h2>
                <span className="text-[11px] font-medium text-gray-400">(Optional — vendor-provided work)</span>
              </div>
              <div>
                {!isOfferPurchase && (
                  <div className="flex flex-wrap gap-2.5">
                    {thirdPartyOptions.filter(t => t.isActive !== false).map(opt => {
                      const badgeInfo = getThirdPartyBadgeInfo(opt, activeVehicleIds);
                      return (
                        <ThirdPartyServiceChip
                          key={opt.id}
                          opt={opt}
                          checked={selectedThirdPartyIds.has(opt.id)}
                          onToggle={toggleThirdPartyItem}
                          resolvedPrice={badgeInfo.price}
                          vehicleTypeName={badgeInfo.suffix}
                        />
                      );
                    })}
                    {thirdPartyOptions.length === 0 && (
                      <div className="text-[13px] font-medium text-gray-500 p-4 border border-dashed border-gray-300 rounded-xl bg-gray-50">
                        No vendor services available.
                      </div>
                    )}
                  </div>
                )}

                {form.thirdPartyItems.length > 0 && (
                  <div className="mt-6 flex flex-col gap-3">
                    {form.thirdPartyItems.map((item, idx) => (
                      <ThirdPartyServiceRow
                        key={idx}
                        item={item}
                        onField={(field, val) => updateThirdPartyField(idx, field, val)}
                        vehicleOptions={clientType === 'organization' && activeVehicleIds.length > 1 ? vehicleOptions.filter(v => activeVehicleIds.includes(v.value)) : null}
                        onVehiclesChange={() => setServiceModal({ isOpen: true, type: 'edit_third_party', opt: { ...item, idx }, selectedVehicleIds: item.vehicle_ids })}
                        onRemove={() => removeThirdPartyItem(idx)}
                        readOnly={isOfferPurchase}
                        allVehicles={form.customer?.vehicles || []}
                        thirdPartyOption={thirdPartyOptions.find(t => t.id === item.third_party_service_id || t.name === item.service_name)}
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
                disabled={loading || checkingConflicts}
                className={`w-full py-5 text-[15px] font-black tracking-widest uppercase text-slate-900 bg-[#F6CB59] hover:bg-[#e5c603] flex items-center justify-center gap-2 transition-colors ${(loading || checkingConflicts) ? 'opacity-70 pointer-events-none' : ''}`}
              >
                {(loading || checkingConflicts) ? (
                  <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                ) : (
                  <Sparkles size={18} />
                )}
                {checkingConflicts ? 'Checking Schedule…' : initial ? 'Update Invoice' : 'Create Invoice'}
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
