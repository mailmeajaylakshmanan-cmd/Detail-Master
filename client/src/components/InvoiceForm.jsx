import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import {
  User, Phone, MapPin, Plus, Trash2, Sparkles,
  CheckCircle2, AlertCircle, Calendar, IndianRupee, Hash, Receipt, Settings, Truck, X, Car,
  Search, UserPlus, ChevronDown, Check, ArrowRight, RefreshCw, UserCheck
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
    <div className="relative w-full min-w-0">
      <IndianRupee size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="number" min="0"
        disabled={disabled}
        autoFocus={autoFocus}
        value={value}
        onChange={onChange}
        className={`${inputCls} pl-7 pr-2.5 py-2 text-right font-mono min-w-0 w-full disabled:opacity-50`}
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
    <div className="flex flex-col gap-1.5 bg-white/95 p-2.5 rounded-xl border border-gray-200 shadow-2xs relative group transition-all hover:border-gray-300">
      {!locked && (
        <button
          type="button"
          onClick={removePayment}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:border-rose-300 transition-all opacity-100 sm:opacity-0 group-hover:opacity-100 z-10"
          title="Remove payment"
        >
          <Trash2 size={11} />
        </button>
      )}
      <div className="grid grid-cols-12 gap-1.5 items-center">
        <div className="col-span-4 min-w-0">
          <MoneyInput value={amount} onChange={onAmount} disabled={locked} />
        </div>
        <div className="col-span-4 min-w-0">
          <DatePicker
            selected={date ? parseISO(date) : null}
            onChange={d => onDate(d ? format(d, 'yyyy-MM-dd') : '')}
            dateFormat="dd/MM/yyyy"
            placeholderText="dd/mm/yyyy"
            wrapperClassName="w-full"
            portalId="root"
            className="input block w-full px-2 py-2 text-xs font-medium text-gray-900 bg-white border border-gray-200/80 rounded-[14px] focus:outline-none focus:ring-2 focus:ring-[#F6CB59]/40 text-center"
            disabled={locked}
          />
        </div>
        <div className="col-span-4 min-w-0">
          <select
            className="input block w-full px-2 py-2 text-xs font-bold text-gray-800 bg-white border border-gray-200/80 rounded-[14px] focus:outline-none focus:ring-2 focus:ring-[#F6CB59]/40 truncate"
            value={method}
            onChange={onMethod}
            disabled={locked}
          >
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank</option>
            <option value="Card">Card</option>
          </select>
        </div>
      </div>
      {needsRef && (
        <input
          className="input block w-full px-3 py-1.5 text-xs font-medium text-gray-900 bg-gray-50/80 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F6CB59]/40"
          placeholder="Transaction / ref no (optional)"
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
    <label className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all border ${checked
        ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
      }`}>
      <input type="checkbox" checked={checked} onChange={e => onToggle(opt, e.target.checked)} className="sr-only" />
      <span>{opt.name}</span>
      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${checked ? 'bg-gray-800 text-[#FFD700]' : 'bg-slate-100 text-slate-700'}`}>
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
    <label className={`flex items-center justify-between gap-2.5 cursor-pointer px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all border ${checked
        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
        : 'bg-white text-gray-800 border-gray-200 hover:bg-amber-50 hover:border-amber-200'
      }`}>
      <input type="checkbox" checked={checked} onChange={e => onToggle(opt, e.target.checked)} className="sr-only" />
      <span className="flex items-center gap-1.5">
        <Truck size={13} className={checked ? 'text-white' : 'text-amber-500'} />
        {opt.name}
      </span>
      <span className={`text-[11px] font-mono font-bold ${checked ? 'text-white' : 'text-gray-900'}`}>
        ₹{fullPrice.toLocaleString('en-IN')}{labelSuffix}
      </span>
    </label>
  );
});

const VehicleChip = memo(function VehicleChip({ opt, checked, onToggle }) {
  return (
    <label className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all border ${checked
        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
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
    <div className="flex flex-col gap-3 bg-blue-50/50 p-3.5 sm:p-4 rounded-xl border border-blue-100">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-[13px] font-bold text-gray-900 truncate pr-2 flex items-center gap-1.5">
          <Car size={14} className="text-blue-600 shrink-0" />
          <span>{label}</span>
        </div>
        {showCopyToAll && (
          <button type="button" onClick={onCopyToAll} className="text-[11px] font-bold text-blue-600 hover:underline shrink-0">
            Use for all vehicles
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
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

  const hasOffers = !readOnly && assignedOffers && assignedOffers.length > 0;

  return (
    <div className="flex flex-col gap-2.5 bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200/90 shadow-2xs hover:border-gray-300 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Service Name */}
        <div className="md:w-1/3 font-bold text-[13px] text-gray-900 flex items-center gap-2 shrink-0">
          <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
          <span className="truncate">{cur.service}</span>
        </div>

        {/* Instructions / Notes */}
        <div className="flex-1 min-w-0">
          <input
            className={`${inputCls} bg-gray-50/70 border border-gray-200/80 rounded-lg py-1.5 px-3 text-xs`}
            placeholder="Instructions / category note (optional)"
            value={cur.description || ''}
            onChange={onDesc}
            readOnly={readOnly}
          />
        </div>

        {/* Price & Vehicle Action */}
        <div className="md:w-36 flex items-center justify-between md:justify-end gap-2 shrink-0 pt-1 md:pt-0">
          <div className="w-full md:w-28">
            <MoneyInput value={cur.price || cur.total || ''} onChange={val => onPrice && onPrice(val)} disabled={readOnly} />
          </div>
          {vehicleOptions && vehicleOptions.length > 1 && (
            <button type="button" onClick={onVehiclesChange} className="text-blue-600 font-bold text-[11px] hover:underline whitespace-nowrap">
              Edit ({(cur?.vehicle_ids || []).length})
            </button>
          )}
        </div>
      </div>

      {/* Package Redemption row (Only if assigned offer available) */}
      {hasOffers && (
        <div className="flex items-center gap-2 pt-1.5 border-t border-gray-100 text-xs flex-wrap sm:flex-nowrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1 shrink-0">
            <Sparkles size={11} /> Package:
          </span>
          <select
            className="bg-emerald-50/80 text-emerald-900 border border-emerald-200 rounded-lg text-xs py-1 px-2.5 font-medium focus:ring-1 focus:ring-emerald-500 w-full sm:max-w-sm"
            value={cur.assigned_offer_id || ''}
            onChange={e => onRedeemPackage(e.target.value)}
          >
            <option value="">-- Don't redeem from package --</option>
            {assignedOffers.map(offer => (
              <option key={offer.id} value={offer.id}>
                Redeem: {offer.packageName} ({offer.totalWashes - offer.completedWashes} left)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Per-Vehicle Price Breakdown Pill List */}
      {appliedVehicles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-gray-100 items-center">
          {appliedVehicles.map(v => {
            const vtId = v.vehicle_type_id;
            let vPrice = Number(serviceOption?.price || cur.price || 0);
            if (isNaN(vPrice)) vPrice = 0;
            if (vtId && serviceOption?.vehiclePricesMap && serviceOption.vehiclePricesMap[vtId] !== undefined) {
              const mapped = Number(serviceOption.vehiclePricesMap[vtId]);
              if (!isNaN(mapped) && mapped > 0) vPrice = mapped;
            }
            return (
              <span key={v.id} className="text-[11px] font-semibold bg-gray-50 text-gray-700 border border-gray-200 rounded-md px-2 py-0.5 flex items-center gap-1.5">
                <Car size={11} className="text-blue-500 shrink-0" />
                <span>{[v.make, v.model].filter(Boolean).join(' ') || 'Vehicle'}{v.plate ? ` (${v.plate})` : ''}</span>
                {v.type && <span className="text-[9px] bg-blue-100 text-blue-800 px-1 rounded font-bold uppercase">{v.type}</span>}
                <span className="font-mono text-gray-900 font-bold ml-1">₹{vPrice.toLocaleString('en-IN')}</span>
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
    <div className="flex flex-col gap-3.5 bg-amber-50/60 p-3.5 sm:p-5 rounded-2xl border border-amber-200/80 shadow-2xs">
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
        <div className="flex items-center gap-2.5 flex-wrap justify-between sm:justify-end">
          {labourCostTotal > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-900 text-[11px] font-semibold shadow-2xs">
              <span className="text-amber-700 font-bold uppercase text-[10px] tracking-wider">Labour:</span>
              <span className="font-mono font-bold">₹{labourCostTotal.toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-gray-500 hidden sm:inline">({labourCount} × ₹{labourCharge.toLocaleString('en-IN')})</span>
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
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold text-[12px] px-2.5 py-1 rounded-lg transition-colors ml-auto sm:ml-0"
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

      {/* Selling Price + Labour + Total (Responsive layout for all screen widths) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        {/* Selling Price Input */}
        <div className="flex flex-col min-w-0">
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-amber-900/80">
            Selling Price (₹) *
          </label>
          <MoneyInput
            value={item.selling_price || ''}
            onChange={e => onField('selling_price', e.target.value)}
            disabled={readOnly}
          />
        </div>

        {/* Labour Charge */}
        <div className="flex flex-col min-w-0">
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-gray-500">
            Labour Charge (₹)
          </label>
          <div className="h-[38px] px-3 py-2 bg-white border border-amber-200 rounded-xl font-mono font-bold text-xs sm:text-sm text-amber-900 flex items-center justify-between shadow-2xs">
            <span className="text-[10px] font-bold text-amber-600">+ Labour</span>
            <span>₹{labourCostTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Total Charge */}
        <div className="flex flex-col min-w-0">
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-amber-950">
            Total Charge (₹)
          </label>
          <div className="h-[38px] px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-mono font-black text-xs sm:text-sm flex items-center justify-between shadow-xs">
            <span className="text-[9px] uppercase tracking-wider font-sans font-extrabold text-amber-100">Total:</span>
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

export default function InvoiceForm({ initial, onSubmit, loading, onCustomerSelect }) {
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
      customer: { id: null, name: '', phone: '', address: '', vehicles: [] },
      selectedVehicleIds: [],
      vehicleVisitMeta: {},
      vehicleId: null,
      carMake: '', carModel: '', licensePlate: '',
      newVehicle: { make: '', model: '', make_model: '', plate: '', vehicle_type_id: '', vehicle_type: '' },
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

  // Unified Fast-Lane Search & New Client/Vehicle States
  const [customerSearch, setCustomerSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNewClientMode, setIsNewClientMode] = useState(!initial && !initial?.customer?.id);
  const [isAddingNewVehicle, setIsAddingNewVehicle] = useState(false);
  const [remoteClients, setRemoteClients] = useState([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);
  const searchContainerRef = React.useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Live remote search when user types phone or name
  useEffect(() => {
    if (clientType !== 'individual') return;
    const phoneQ = (form.customer?.phone || '').trim();
    const nameQ = (form.customer?.name || '').trim();
    const searchParam = phoneQ || nameQ;
    if (!searchParam || searchParam.length < 2) {
      setRemoteClients([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingRemote(true);
        const res = await api.get('/clients', { params: { search: searchParam } });
        const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.clients) ? res.data.clients : []);
        setRemoteClients(list.map(c => ({
          ...c,
          id: c.id,
          name: c.full_name || c.name || '',
          phone: c.phone || '',
          address: c.address || '',
          vehicles: Array.isArray(c.vehicles) ? c.vehicles : [],
        })));
      } catch (err) {
        console.error('Remote client search error:', err);
      } finally {
        setIsSearchingRemote(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [form.customer?.phone, form.customer?.name, clientType]);

  // Merge local cache and remote search results seamlessly
  const allKnownCustomers = useMemo(() => {
    const combined = [...customers];
    for (const rc of remoteClients) {
      if (!combined.some(c => String(c.id) === String(rc.id))) {
        combined.push(rc);
      }
    }
    return combined;
  }, [customers, remoteClients]);

  // Filter existing clients live by mobile number digits, name, or license plate
  const filteredCustomers = useMemo(() => {
    if (clientType !== 'individual') return EMPTY_ARRAY;
    const phoneRaw = (form.customer?.phone || '').trim();
    const nameRaw = (form.customer?.name || '').trim().toLowerCase();
    const phoneDigits = phoneRaw.replace(/[^0-9]/g, '');

    if (!phoneRaw && !nameRaw) return EMPTY_ARRAY;

    return allKnownCustomers.filter(c => {
      const cName = (c.name || c.full_name || '').toLowerCase();
      const cPhoneRaw = (c.phone || '').trim();
      const cPhoneDigits = cPhoneRaw.replace(/[^0-9]/g, '');

      // Check phone match
      const phoneMatches = Boolean(
        phoneRaw && (
          cPhoneRaw.toLowerCase().includes(phoneRaw.toLowerCase()) ||
          (phoneDigits.length >= 2 && cPhoneDigits.includes(phoneDigits)) ||
          (phoneDigits.length >= 10 && cPhoneDigits.slice(-10) === phoneDigits.slice(-10))
        )
      );

      // Check name match
      const nameMatches = Boolean(nameRaw && cName.includes(nameRaw));

      // Check vehicle plate match
      const hasPlate = Boolean(
        (phoneRaw || nameRaw) && (c.vehicles || []).some(v => {
          const p = (v.plate || v.license_vin || '').toLowerCase();
          const mm = [v.make, v.model].filter(Boolean).join(' ').toLowerCase();
          const q = (phoneRaw || nameRaw).toLowerCase();
          return p.includes(q) || mm.includes(q);
        })
      );

      return phoneMatches || nameMatches || hasPlate;
    }).slice(0, 8);
  }, [allKnownCustomers, form.customer?.phone, form.customer?.name, clientType]);

  // Handle selecting an existing client from dropdown
  const handleSelectExistingClient = useCallback((c) => {
    const vehicles = Array.isArray(c.vehicles) ? c.vehicles : [];
    const firstVeh = vehicles[0] || null;
    
    setForm(f => ({
      ...f,
      customer: {
        id: c.id,
        name: c.name || c.full_name || '',
        phone: c.phone || '',
        address: c.address || '',
        vehicles,
      },
      vehicleId: firstVeh?.id || null,
      carMake: firstVeh ? `${firstVeh.make || ''} ${firstVeh.model || ''}`.trim() : '',
      licensePlate: firstVeh?.plate || firstVeh?.license_vin || '',
      newVehicle: { make: '', model: '', make_model: '', plate: '', vehicle_type_id: '', vehicle_type: '' },
    }));

    setIsAddingNewVehicle(vehicles.length === 0);
    setIsSearchOpen(false);
    onCustomerSelect?.({ ...c, isOrganization: false, clientType: 'individual' });
  }, [onCustomerSelect]);

  // Handle clearing / resetting client
  const handleResetClientSearch = useCallback(() => {
    setForm(f => ({
      ...f,
      customer: { id: null, name: '', phone: '', address: '', vehicles: [] },
      vehicleId: null,
      carMake: '',
      licensePlate: '',
      selectedVehicleIds: [],
      vehicleVisitMeta: {},
      newVehicle: { make: '', model: '', make_model: '', plate: '', vehicle_type_id: '', vehicle_type: '' },
    }));
    setIsAddingNewVehicle(false);
    setIsSearchOpen(false);
    onCustomerSelect?.(null);
  }, [onCustomerSelect]);

  // Handle vehicle card click
  const handleSelectExistingVehicle = useCallback((veh) => {
    setForm(f => ({
      ...f,
      vehicleId: veh.id,
      carMake: `${veh.make || ''} ${veh.model || ''}`.trim(),
      licensePlate: veh.plate || veh.license_vin || '',
    }));
    setIsAddingNewVehicle(false);
  }, []);

  // Only fetch assigned offers if customer is an individual client
  const { data: assignedOffers = [] } = useAssignedOffers(clientType === 'individual' ? form.customer?.id : null);

  // All vehicle ids this invoice currently covers
  const activeVehicleIds = useMemo(
    () => clientType === 'organization'
      ? form.selectedVehicleIds
      : (isAddingNewVehicle || !form.vehicleId ? ['new_vehicle'] : [form.vehicleId]),
    [clientType, form.selectedVehicleIds, form.vehicleId, isAddingNewVehicle]
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

  const statusConfig = {
    paid: { label: 'Paid', bg: 'bg-emerald-500/20', text: 'text-emerald-300', dot: 'bg-emerald-400' },
    partial: { label: 'Partial', bg: 'bg-amber-500/20', text: 'text-amber-300', dot: 'bg-amber-400' },
    pending: { label: 'Pending', bg: 'bg-rose-500/20', text: 'text-rose-300', dot: 'bg-rose-400' },
    draft: { label: 'Draft', bg: 'bg-gray-500/20', text: 'text-gray-300', dot: 'bg-gray-400' },
    completed: { label: 'Completed', bg: 'bg-emerald-500/20', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  };
  const sc = statusConfig[derivedStatus] || statusConfig.draft;

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
    if (vid === 'new_vehicle' || (!vid && form.newVehicle?.vehicle_type_id)) {
      return Number(form.newVehicle?.vehicle_type_id) || null;
    }
    if (!vid) return null;
    const veh = (form.customer?.vehicles || []).find(v => v.id === vid);
    if (!veh) {
      if (form.newVehicle?.vehicle_type_id) return Number(form.newVehicle.vehicle_type_id) || null;
      return null;
    }
    // Use stored numeric FK first
    if (veh.vehicle_type_id) return veh.vehicle_type_id;
    // Fall back: match by text name against master vehicle types list
    if (veh.type && vehicleTypes.length > 0) {
      const match = vehicleTypes.find(vt => vt.name.toLowerCase() === String(veh.type).trim().toLowerCase());
      if (match) return match.id;
    }
    return null;
  }, [form.customer, form.newVehicle, vehicleTypes]);

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

  const combinedVehicles = useMemo(() => {
    const list = [...(form.customer?.vehicles || [])];
    if (isAddingNewVehicle || (!form.vehicleId && (form.newVehicle?.plate || form.newVehicle?.make || form.newVehicle?.make_model))) {
      list.push({
        id: 'new_vehicle',
        make: form.newVehicle?.make || form.newVehicle?.make_model?.split(' ')[0] || 'Vehicle',
        model: form.newVehicle?.model || form.newVehicle?.make_model?.split(' ').slice(1).join(' ') || '',
        plate: form.newVehicle?.plate || '',
        type: form.newVehicle?.vehicle_type || '',
        vehicle_type_id: form.newVehicle?.vehicle_type_id ? Number(form.newVehicle.vehicle_type_id) : null,
      });
    }
    return list;
  }, [form.customer?.vehicles, isAddingNewVehicle, form.newVehicle, form.vehicleId]);

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

    const selectedVehs = combinedVehicles.filter(v => vehicleIds.includes(v.id));

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
  }, [combinedVehicles, resolveServicePrice, calculateServiceTotalForVehicles]);

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

    const selectedVehs = combinedVehicles.filter(v => vehicleIds.includes(v.id));

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
  }, [combinedVehicles, resolveThirdPartyPrice, calculateThirdPartyTotalForVehicles]);

  const toggleService = useCallback((opt, checked) => {
    if (isOfferPurchase) return;
    setForm(f => {
      const exists = f.services.some(s => s.service_id === opt.id || s.service === opt.name);
      if (checked && !exists) {
        if (clientType === 'organization' && activeVehicleIds.length > 1) {
          setServiceModal({ isOpen: true, type: 'standard', opt, selectedVehicleIds: activeVehicleIds });
          return f;
        }
        const totalP = calculateServiceTotalForVehicles(opt, activeVehicleIds);
        return {
          ...f,
          services: [...f.services, {
            service_id: opt.id,
            service: opt.name,
            description: opt.description || '',
            price: totalP,
            total: totalP,
            vehicle_ids: activeVehicleIds
          }]
        };
      }
      if (!checked && exists) {
        return {
          ...f,
          services: f.services.filter(s => s.service_id !== opt.id && s.service !== opt.name)
        };
      }
      return f;
    });
  }, [isOfferPurchase, clientType, activeVehicleIds, calculateServiceTotalForVehicles]);

  const updateServiceField = useCallback((serviceName, field, val) => {
    setForm(f => ({
      ...f,
      services: f.services.map(s => {
        if (s.service !== serviceName) return s;
        const upd = { ...s, [field]: val };
        if (field === 'price') upd.total = val;
        return upd;
      })
    }));
  }, []);

  const addThirdPartyItem = useCallback((optId, vehicleIdsToUse) => {
    const opt = thirdPartyOptions.find(t => t.id === optId);
    if (!opt) return;
    const vIds = vehicleIdsToUse || activeVehicleIds;
    const sellingForVehs = calculateThirdPartySellingForVehicles(opt, vIds);
    setForm(f => ({
      ...f,
      thirdPartyItems: [...f.thirdPartyItems, {
        third_party_service_id: opt.id,
        service_name: opt.name,
        vendor_name: opt.vendorName || '',
        labour_count: opt.labourCount ?? 1,
        labour_charge: opt.labourCharge ?? 0,
        selling_price: sellingForVehs,
        vendor_cost: opt.vendorCost ?? 0,
        description: '',
        vehicle_ids: vIds,
      }]
    }));
  }, [thirdPartyOptions, activeVehicleIds, calculateThirdPartySellingForVehicles]);

  const removeThirdPartyItem = useCallback((idx) => {
    setForm(f => ({
      ...f,
      thirdPartyItems: f.thirdPartyItems.filter((_, i) => i !== idx)
    }));
  }, []);

  const updateThirdPartyField = useCallback((idx, field, val) => {
    setForm(f => ({
      ...f,
      thirdPartyItems: f.thirdPartyItems.map((item, i) => {
        if (i !== idx) return item;
        return { ...item, [field]: val };
      })
    }));
  }, []);

  const findScheduleConflicts = useCallback(async (vehicleVisits, serviceItems, thirdPartyItems) => {
    if (!vehicleVisits || vehicleVisits.length === 0) return [];
    const visitsWithTimes = vehicleVisits.filter(v => v.vehicle_id && v.checkin_time && v.checkout_time);
    if (visitsWithTimes.length === 0) return [];

    const svcIds = (serviceItems || []).map(s => s.service_id).filter(Boolean);
    const tpIds = (thirdPartyItems || []).map(t => t.third_party_service_id).filter(Boolean);
    if (svcIds.length === 0 && tpIds.length === 0) return [];

    const allConflicts = [];
    for (const v of visitsWithTimes) {
      try {
        const res = await api.post('/invoices/check-conflicts', {
          vehicle_id: v.vehicle_id,
          checkin_time: v.checkin_time,
          checkout_time: v.checkout_time,
          service_ids: svcIds,
          third_party_service_ids: tpIds,
          exclude_invoice_id: initial?.id || null,
        });
        if (res.data?.conflicts?.length > 0) {
          allConflicts.push(...res.data.conflicts);
        }
      } catch (err) {
        console.error('Failed to check schedule conflicts for vehicle', v.vehicle_id, err);
      }
    }
    return allConflicts;
  }, [initial?.id]);

  const pendingPayloadRef = React.useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    const isAddingNewClient = !form.customer?.id && !!form.customer?.name;
    const isAddingNewVehiclePayload = isAddingNewVehicle || !form.vehicleId || form.vehicleId === 'new_vehicle';

    if (clientType === 'individual') {
      if (!form.customer.name?.trim() || !form.customer.phone?.trim()) {
        toast.error('Customer name and phone number are required');
        return;
      }
      if (isAddingNewVehiclePayload && !form.newVehicle.make_model?.trim() && !form.newVehicle.make?.trim() && !form.newVehicle.plate?.trim()) {
        toast.error('Please enter vehicle details (Make/Model or Plate Number)');
        return;
      }
    } else {
      if (!form.customer.id) {
        toast.error('Please select an organization');
        return;
      }
      if (form.selectedVehicleIds.length === 0) {
        toast.error('Please select at least one vehicle for this organization visit');
        return;
      }
    }

    if (form.services.length === 0 && form.thirdPartyItems.length === 0) {
      toast.error('Add at least one service or third-party service');
      return;
    }

    const newPayments = (form.payments || [])
      .filter(p => Number(p.amount) > 0)
      .map(p => ({
        amount: Number(p.amount),
        method: p.method,
        date: p.date,
        reference_no: p.reference_no || null,
      }));

    const activeVid = isAddingNewVehiclePayload ? null : form.vehicleId;
    const metaKey = form.vehicleId || 'new_vehicle';

    const sanitizePayloadVid = (vid) => {
      if (!vid || vid === 'new_vehicle' || (typeof vid === 'string' && isNaN(Number(vid)))) {
        return activeVid || null;
      }
      return Number(vid);
    };

    const service_ids = form.services.map(s => s.service_id).filter(Boolean);
    const service_items = form.services.map(s => {
      const cleanVIds = (s.vehicle_ids || []).map(sanitizePayloadVid).filter(Boolean);
      return {
        service_id: s.service_id,
        price: s.price,
        vehicle_ids: cleanVIds.length > 0 ? cleanVIds : (activeVid ? [activeVid] : []),
        assigned_offer_id: s.assigned_offer_id || null,
      };
    });

    const third_party_items = form.thirdPartyItems.map(t => {
      const cleanVIds = (t.vehicle_ids || []).map(sanitizePayloadVid).filter(Boolean);
      return {
        third_party_service_id: t.third_party_service_id || null,
        service_name: t.service_name,
        vendor_name: t.vendor_name || null,
        labour_count: Number(t.labour_count) || 1,
        labour_charge: Number(t.labour_charge) || 0,
        selling_price: Number(t.selling_price) || 0,
        vendor_cost: Number(t.vendor_cost) || 0,
        vehicle_ids: cleanVIds.length > 0 ? cleanVIds : (activeVid ? [activeVid] : []),
      };
    });

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
      : [{
        vehicle_id: activeVid,
        visitor_name: (form.vehicleVisitMeta[metaKey] || {}).visitorName || null,
        visitor_phone: (form.vehicleVisitMeta[metaKey] || {}).visitorPhone || null,
        checkin_time: (form.vehicleVisitMeta[metaKey] || {}).checkinTime || null,
        checkout_time: (form.vehicleVisitMeta[metaKey] || {}).checkoutTime || null,
      }];

    const payload = {
      client_id: clientType === 'individual' && form.customer?.id ? form.customer.id : null,
      organization_id: clientType === 'organization' && form.customer?.id ? form.customer.id : null,
      vehicle_id: activeVid,
      new_client: isAddingNewClient ? {
        full_name: form.customer.name.trim(),
        phone: form.customer.phone.trim(),
        address: form.customer.address?.trim() || null,
      } : null,
      new_vehicle: (isAddingNewVehiclePayload && (form.newVehicle?.make || form.newVehicle?.model || form.newVehicle?.make_model || form.newVehicle?.plate || form.newVehicle?.vehicle_type_id)) ? {
        make_model: (form.newVehicle.make_model || `${form.newVehicle.make || ''} ${form.newVehicle.model || ''}`).trim() || 'Vehicle',
        make: form.newVehicle.make?.trim() || '',
        model: form.newVehicle.model?.trim() || '',
        license_vin: form.newVehicle.plate?.trim().toUpperCase() || '',
        plate: form.newVehicle.plate?.trim().toUpperCase() || '',
        vehicle_type_id: form.newVehicle.vehicle_type_id ? Number(form.newVehicle.vehicle_type_id) : null,
        vehicle_type: form.newVehicle.vehicle_type || null,
      } : null,
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
    ? {
        value: form.customer.id,
        label: `${form.customer.name || ''} — ${form.customer.phone || ''}`,
        customer: form.customer,
      }
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
      .map(c => {
        const vehSummary = (c.vehicles || [])
          .map(v => [v.make, v.model].filter(Boolean).join(' ') || v.plate)
          .filter(Boolean)
          .join(', ');
        return {
          value: c.id,
          label: `${c.name || c.full_name || 'Client'} — ${c.phone || ''}${vehSummary ? ` (${vehSummary})` : ''}`,
          customer: c,
        };
      });
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
    let vehicles = form.customer?.vehicles || [];

    if (clientType === 'individual' && form.customer?.id) {
      const dbCust = customers.find(c => String(c.id) === String(form.customer.id));
      if (dbCust?.vehicles && dbCust.vehicles.length > 0) {
        const existingIds = new Set(vehicles.map(v => String(v.id)));
        const additional = dbCust.vehicles.filter(v => !existingIds.has(String(v.id)));
        vehicles = [...vehicles, ...additional];
      }
    } else if (clientType === 'organization' && form.customer?.id) {
      const dbOrg = organizations.find(o => String(o.id) === String(form.customer.id));
      if (dbOrg?.vehicles && dbOrg.vehicles.length > 0) {
        const existingIds = new Set(vehicles.map(v => String(v.id)));
        const additional = dbOrg.vehicles.filter(v => !existingIds.has(String(v.id)));
        vehicles = [...vehicles, ...additional];
      }
    }

    const pool = clientType === 'organization' ? vehicles.filter(v => v.isActive !== false) : vehicles;
    const seen = new Set();
    const deduped = pool.filter(v => {
      const key = String(v.id || `${v.make}-${v.model}-${v.plate}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduped.map(v => ({
      value: v.id,
      label: `${[v.make, v.model].filter(Boolean).join(' ') || 'Vehicle'}${v.plate ? ` — ${v.plate}` : ''}`,
      vehicle: v,
    }));
  }, [clientType, form.customer, customers, organizations]);

  const selectedVehicle = vehicleOptions.find(v => String(v.value) === String(form.vehicleId)) || null;

  const isStep1Complete = !!form.customer.name && !!form.customer.phone;
  const isStep2Complete = clientType === 'organization'
    ? form.selectedVehicleIds.length > 0
    : (isAddingNewVehicle
        ? (!!form.newVehicle?.plate || !!form.newVehicle?.make || !!form.newVehicle?.make_model)
        : !!form.vehicleId);
  const isStep3Complete = form.services.length > 0 || form.thirdPartyItems.length > 0;

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
      const sellingForVehs = calculateThirdPartySellingForVehicles(tpOpt, selectedIds);
      setForm(f => ({
        ...f,
        thirdPartyItems: f.thirdPartyItems.map((item, idx) => (idx === opt.idx ? { ...item, vehicle_ids: selectedIds, selling_price: sellingForVehs } : item))
      }));
    }
    setServiceModal({ isOpen: false, type: null, opt: null, selectedVehicleIds: [] });
  }, [serviceModal, serviceOptions, thirdPartyOptions, calculateServiceTotalForVehicles, calculateThirdPartySellingForVehicles, addThirdPartyItem]);

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
        allVehicles={combinedVehicles}
        serviceOption={serviceModal.opt}
      />
      <ScheduleConflictModal
        isOpen={conflictModal.isOpen}
        conflicts={conflictModal.conflicts}
        onCancel={() => { setConflictModal({ isOpen: false, conflicts: [] }); pendingPayloadRef.current = null; }}
        onProceed={handleProceedDespiteConflict}
      />
      <form onSubmit={handleSubmit} className="w-full font-sans pb-12 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-8 flex flex-col gap-5 min-w-0">
          <div className="flex items-center justify-between mb-1 border-b border-gray-200 pb-3">
            <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight flex items-center gap-2 sm:gap-2.5">
              <Hash size={18} className="text-gray-400" /> {initial ? 'Edit Job Card' : 'New Job Card'}
            </h1>
            <span className="font-mono text-xs text-gray-600 font-bold px-2.5 py-1 bg-gray-100 rounded-lg">
              {initial?.invoiceNumber || initial?.invoiceNo || 'Draft Mode'}
            </span>
          </div>

          <div className="flex flex-col gap-5">
            {/* ── UNIFIED CUSTOMER & VEHICLE INTAKE CARD ── */}
            <div className={`bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border ${form.customer?.id ? 'border-emerald-200/90 shadow-emerald-500/5' : 'border-gray-200'} p-3.5 sm:p-5 lg:p-6 flex flex-col gap-4 sm:gap-5 transition-all`}>
              {/* Card Header with Status & Mode Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-gray-100">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border-2 shrink-0 transition-all ${isStep1Complete && isStep2Complete ? 'border-emerald-500 text-emerald-600 bg-emerald-50 shadow-xs' : 'border-gray-300 text-gray-400 bg-gray-50'}`}>
                    {isStep1Complete && isStep2Complete ? <CheckCircle2 size={16} className="fill-emerald-100 text-emerald-600" /> : <span className="text-[11px] font-black">1</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
                        {clientType === 'individual' ? 'Customer & Vehicle Intake' : 'Organization & Fleet Intake'}
                      </h2>
                      {clientType === 'individual' && (
                        form.customer?.id ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                            <UserCheck size={11} className="text-emerald-700" /> Returning Client
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-800 bg-amber-100/90 border border-amber-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                            <UserPlus size={11} className="text-amber-700" /> Walk-in Client
                          </span>
                        )
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-gray-500 mt-0.5">
                      {clientType === 'individual'
                        ? (form.customer?.id
                            ? `Client: ${form.customer.name} · Choose a vehicle below or add a new one`
                            : 'Type mobile number or name to search existing, or fill details for walk-in client')
                        : 'Select organization from master and choose vehicles from fleet'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0">
                  {clientType === 'individual' && form.customer?.id && (
                    <button
                      type="button"
                      onClick={handleResetClientSearch}
                      className="text-[11px] font-bold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200/80 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-2xs active:scale-95"
                      title="Clear and enter a different client"
                    >
                      <RefreshCw size={12} className="text-gray-500" /> Switch / New Client
                    </button>
                  )}

                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl shrink-0 border border-gray-200/60 shadow-inner">
                    <button
                      type="button"
                      onClick={() => {
                        setClientType('individual');
                        handleResetClientSearch();
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${clientType === 'individual' ? 'bg-white shadow-xs text-gray-900 ring-1 ring-gray-900/5' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      Individual
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClientType('organization');
                        handleResetClientSearch();
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${clientType === 'organization' ? 'bg-white shadow-xs text-gray-900 ring-1 ring-gray-900/5' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      Organization
                    </button>
                  </div>
                </div>
              </div>

              {clientType === 'individual' ? (
                <div className="flex flex-col gap-4">
                  {/* Top: Existing Client Master Select Dropdown */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-gray-500 flex flex-wrap items-center justify-between gap-1">
                      <span>Select Existing Client from Master (Or type below)</span>
                      <span className="text-[10px] font-semibold text-gray-400">Search by Name, Mobile, or Vehicle</span>
                    </label>
                    <Select
                      isClearable
                      options={customerOptions}
                      value={selectedCustomer ? customerOptions.find(opt => String(opt.value) === String(selectedCustomer.value)) || null : null}
                      onChange={opt => {
                        if (opt && opt.customer) {
                          handleSelectExistingClient(opt.customer);
                        } else {
                          handleResetClientSearch();
                        }
                      }}
                      styles={selectStyles()}
                      placeholder="-- Search & Select Existing Client (e.g. Rajesh Kumar, 9876543210) --"
                      menuPortalTarget={document.body}
                    />
                  </div>

                  {/* Customer Information Inputs (Responsive 1/2/3 cols) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5 relative" ref={searchContainerRef}>
                    {/* Mobile Number Field with Live Auto-Suggest Popup */}
                    <div className="relative">
                      <Field label="Mobile Number" required>
                        <div className="relative">
                          <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          <input
                            type="tel"
                            required
                            className={`${inputCls} pl-9 pr-8 rounded-xl border ${form.customer?.id ? 'border-emerald-300 bg-emerald-50/20' : 'border-gray-200'} text-xs py-2 font-mono font-bold`}
                            placeholder="Type mobile (e.g. 9894834700)"
                            value={form.customer?.phone || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setForm(f => ({
                                ...f,
                                customer: { ...f.customer, phone: val, ...(f.customer.id ? { id: null } : {}) }
                              }));
                              setIsSearchOpen(true);
                            }}
                            onFocus={() => setIsSearchOpen(true)}
                            onClick={() => setIsSearchOpen(true)}
                          />
                          {form.customer?.phone && (
                            <button
                              type="button"
                              onClick={() => {
                                handleResetClientSearch();
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                              title="Clear"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      </Field>

                      {/* Dropdown Results Under Mobile Number */}
                      {isSearchOpen && (form.customer?.phone?.trim() || form.customer?.name?.trim()) && (filteredCustomers.length > 0 || isSearchingRemote) && (
                        <div className="absolute left-0 right-0 sm:left-0 sm:w-[480px] lg:w-[520px] top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden max-h-64 sm:max-h-80 overflow-y-auto custom-scrollbar animate-scale-up">
                          <div className="p-2.5 border-b border-gray-100 bg-gray-50/90 flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            <span className="flex items-center gap-1.5">
                              {isSearchingRemote ? (
                                <>
                                  <RefreshCw size={11} className="animate-spin text-blue-500" /> Searching Master Database...
                                </>
                              ) : (
                                `Matching Master Clients (${filteredCustomers.length})`
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsSearchOpen(false)}
                              className="text-gray-400 hover:text-gray-700 text-[10px] font-bold"
                            >
                              Close
                            </button>
                          </div>
                          <div className="p-1.5 flex flex-col gap-1">
                            {filteredCustomers.map(c => {
                              const isCurrentSelected = String(form.customer?.id) === String(c.id);
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => handleSelectExistingClient(c)}
                                  className={`w-full text-left p-2.5 rounded-xl transition-colors flex items-center justify-between gap-3 group border ${
                                    isCurrentSelected
                                      ? 'bg-emerald-50/90 border-emerald-300'
                                      : 'hover:bg-blue-50/80 border-transparent hover:border-blue-200'
                                  } active:scale-[0.99]`}
                                >
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-[13px] text-gray-900 group-hover:text-blue-900">{c.name || c.full_name}</span>
                                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">{c.phone}</span>
                                    </div>
                                    {c.address && <span className="text-[11px] text-gray-400 truncate mt-0.5">{c.address}</span>}
                                    {c.vehicles && c.vehicles.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {c.vehicles.map(v => (
                                          <span key={v.id || v.plate} className="inline-flex items-center gap-1 text-[10px] font-bold bg-gray-100 group-hover:bg-blue-100 text-gray-700 group-hover:text-blue-900 px-1.5 py-0.5 rounded">
                                            <Car size={10} /> {[v.make, v.model].filter(Boolean).join(' ') || 'Car'}{v.plate ? ` (${v.plate})` : ''}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <span className={`text-xs font-bold flex items-center gap-1 shrink-0 ${isCurrentSelected ? 'text-emerald-700' : 'text-blue-600'}`}>
                                    {isCurrentSelected ? 'Selected ✓' : 'Auto-fill'} <ArrowRight size={13} />
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Customer Full Name Field */}
                    <Field label="Customer Full Name" required>
                      <div className="relative">
                        <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          required
                          className={`${inputCls} pl-9 rounded-xl border ${form.customer?.id ? 'border-emerald-300 bg-emerald-50/20' : 'border-gray-200'} text-xs py-2 font-semibold text-gray-900`}
                          placeholder="e.g. Rajesh Kumar"
                          value={form.customer?.name || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setForm(f => ({
                              ...f,
                              customer: { ...f.customer, name: val, ...(f.customer.id ? { id: null } : {}) }
                            }));
                            setIsSearchOpen(true);
                          }}
                          onFocus={() => setIsSearchOpen(true)}
                          onClick={() => setIsSearchOpen(true)}
                        />
                      </div>
                    </Field>

                    {/* Address Field */}
                    <div className="md:col-span-2 lg:col-span-1">
                      <Field label="Address / Location (Optional)">
                        <div className="relative">
                          <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          <input
                            type="text"
                            className={`${inputCls} pl-9 rounded-xl border border-gray-200 text-xs py-2`}
                            placeholder="e.g. Banjara Hills, Hyderabad"
                            value={form.customer?.address || ''}
                            onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, address: e.target.value } }))}
                          />
                        </div>
                      </Field>
                    </div>
                  </div>

                  {/* ── VEHICLE SECTION ── */}
                  <div className="pt-3 border-t border-gray-100 flex flex-col gap-3">
                    {/* Case 1: Returning Client with Registered Vehicles */}
                    {form.customer?.id && (form.customer?.vehicles || []).length > 0 ? (
                      <div className="flex flex-col gap-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                            <Car size={13} className="text-blue-600" /> Registered Vehicles for {form.customer.name}
                          </label>
                          {!isAddingNewVehicle ? (
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingNewVehicle(true);
                                setForm(f => ({ ...f, vehicleId: null }));
                              }}
                              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 transition-colors w-full sm:w-auto active:scale-95"
                            >
                              <Plus size={13} /> Add New Vehicle to Client
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingNewVehicle(false);
                                if (form.customer.vehicles?.[0]) handleSelectExistingVehicle(form.customer.vehicles[0]);
                              }}
                              className="text-[11px] font-bold text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1 bg-gray-100 px-2.5 py-1.5 rounded-lg transition-colors w-full sm:w-auto active:scale-95"
                            >
                              Select from Registered Fleet
                            </button>
                          )}
                        </div>

                        {!isAddingNewVehicle ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                            {form.customer.vehicles.map(v => {
                              const isSelected = String(form.vehicleId) === String(v.id);
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => handleSelectExistingVehicle(v)}
                                  className={`p-3 sm:p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 ${
                                    isSelected
                                      ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/25 shadow-xs'
                                      : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/80'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                      {isSelected ? <Check size={16} className="stroke-[3]" /> : <Car size={16} />}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-bold text-xs text-gray-900 truncate">
                                        {[v.make, v.model].filter(Boolean).join(' ') || 'Vehicle'}
                                      </span>
                                      <span className="font-mono text-[11px] font-bold text-gray-500 uppercase tracking-tight">
                                        {v.plate || v.license_vin || 'No Plate'}
                                      </span>
                                    </div>
                                  </div>
                                  {v.type && (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 uppercase tracking-wider shrink-0">
                                      {v.type}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingNewVehicle(true);
                                setForm(f => ({ ...f, vehicleId: null }));
                              }}
                              className="p-3 sm:p-3.5 rounded-xl border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/40 text-gray-600 hover:text-blue-700 transition-all flex items-center justify-center gap-2 text-xs font-bold active:scale-95"
                            >
                              <Plus size={15} /> Add New Vehicle
                            </button>
                          </div>
                        ) : (
                          /* Inline New Vehicle Form for Existing Client */
                          <div className="bg-blue-50/40 border border-blue-200/80 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3">
                            <div className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                              <Car size={14} className="text-blue-600" /> New Vehicle Details for {form.customer.name}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              <Field label="Make & Model" required>
                                <input
                                  type="text"
                                  required
                                  className={`${inputCls} rounded-xl border border-gray-200 text-xs py-2`}
                                  placeholder="e.g. BMW 320d / Creta"
                                  value={form.newVehicle?.make_model || ''}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setForm(f => ({
                                      ...f,
                                      carMake: val,
                                      newVehicle: { ...f.newVehicle, make_model: val, make: val.split(' ')[0] || val, model: val.split(' ').slice(1).join(' ') || '' }
                                    }));
                                  }}
                                />
                              </Field>
                              <Field label="License Plate Number" required>
                                <input
                                  type="text"
                                  required
                                  className={`${inputCls} rounded-xl border border-gray-200 text-xs py-2 font-mono uppercase font-bold`}
                                  placeholder="e.g. MH 12 AB 1234"
                                  value={form.newVehicle?.plate || ''}
                                  onChange={e => {
                                    const val = e.target.value.toUpperCase();
                                    setForm(f => ({
                                      ...f,
                                      licensePlate: val,
                                      newVehicle: { ...f.newVehicle, plate: val }
                                    }));
                                  }}
                                />
                              </Field>
                              <div className="sm:col-span-2 lg:col-span-1 flex flex-col">
                                <Field label="Vehicle Type (Dynamic Pricing)" required>
                                  <select
                                    required
                                    className={`${inputCls} rounded-xl border border-gray-200 text-xs py-2 font-bold text-gray-800`}
                                    value={form.newVehicle?.vehicle_type_id || ''}
                                    onChange={e => {
                                      const vtId = e.target.value ? Number(e.target.value) : '';
                                      const matched = vehicleTypes.find(vt => vt.id === vtId);
                                      setForm(f => ({
                                        ...f,
                                        newVehicle: {
                                          ...f.newVehicle,
                                          vehicle_type_id: vtId,
                                          vehicle_type: matched ? matched.name : '',
                                        }
                                      }));
                                    }}
                                  >
                                    <option value="">-- Select Type --</option>
                                    {vehicleTypes.filter(vt => vt.isActive !== false).map(vt => (
                                      <option key={vt.id} value={vt.id}>{vt.name}</option>
                                    ))}
                                  </select>
                                </Field>
                                {vehicleTypes.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-0.5">Quick:</span>
                                    {vehicleTypes.filter(vt => vt.isActive !== false).slice(0, 6).map(vt => {
                                      const isSel = String(form.newVehicle?.vehicle_type_id) === String(vt.id);
                                      return (
                                        <button
                                          key={vt.id}
                                          type="button"
                                          onClick={() => setForm(f => ({
                                            ...f,
                                            newVehicle: {
                                              ...f.newVehicle,
                                              vehicle_type_id: vt.id,
                                              vehicle_type: vt.name,
                                            }
                                          }))}
                                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all border ${
                                            isSel
                                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                              : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-200'
                                          }`}
                                        >
                                          {vt.name}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Case 2: New Walk-in Client Vehicle Intake */
                      <div className="flex flex-col gap-2">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                          <Car size={13} className="text-amber-600" /> Vehicle Information *
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <Field label="Make & Model" required>
                            <input
                              type="text"
                              required
                              className={`${inputCls} rounded-xl border border-gray-200 text-xs py-2`}
                              placeholder="e.g. BMW 320d / Creta"
                              value={form.newVehicle?.make_model || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setForm(f => ({
                                  ...f,
                                  carMake: val,
                                  newVehicle: { ...f.newVehicle, make_model: val, make: val.split(' ')[0] || val, model: val.split(' ').slice(1).join(' ') || '' }
                                }));
                              }}
                            />
                          </Field>
                          <Field label="License Plate Number" required>
                            <input
                              type="text"
                              required
                              className={`${inputCls} rounded-xl border border-gray-200 text-xs py-2 font-mono uppercase font-bold`}
                              placeholder="e.g. MH 12 AB 1234"
                              value={form.newVehicle?.plate || ''}
                              onChange={e => {
                                const val = e.target.value.toUpperCase();
                                setForm(f => ({
                                  ...f,
                                  licensePlate: val,
                                  newVehicle: { ...f.newVehicle, plate: val }
                                }));
                              }}
                            />
                          </Field>
                          <div className="sm:col-span-2 lg:col-span-1 flex flex-col">
                            <Field label="Vehicle Type (Dynamic Pricing)" required>
                              <select
                                required
                                className={`${inputCls} rounded-xl border border-gray-200 text-xs py-2 font-bold text-gray-800`}
                                value={form.newVehicle?.vehicle_type_id || ''}
                                onChange={e => {
                                  const vtId = e.target.value ? Number(e.target.value) : '';
                                  const matched = vehicleTypes.find(vt => vt.id === vtId);
                                  setForm(f => ({
                                    ...f,
                                    newVehicle: {
                                      ...f.newVehicle,
                                      vehicle_type_id: vtId,
                                      vehicle_type: matched ? matched.name : '',
                                    }
                                  }));
                                }}
                              >
                                <option value="">-- Select Type --</option>
                                {vehicleTypes.filter(vt => vt.isActive !== false).map(vt => (
                                  <option key={vt.id} value={vt.id}>{vt.name}</option>
                                ))}
                              </select>
                            </Field>
                            {vehicleTypes.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-0.5">Quick:</span>
                                {vehicleTypes.filter(vt => vt.isActive !== false).slice(0, 6).map(vt => {
                                  const isSel = String(form.newVehicle?.vehicle_type_id) === String(vt.id);
                                  return (
                                    <button
                                      key={vt.id}
                                      type="button"
                                      onClick={() => setForm(f => ({
                                        ...f,
                                        newVehicle: {
                                          ...f.newVehicle,
                                          vehicle_type_id: vt.id,
                                          vehicle_type: vt.name,
                                        }
                                      }))}
                                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all border ${
                                        isSel
                                          ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                                          : 'bg-white text-gray-700 border-gray-200 hover:bg-amber-50 hover:border-amber-200'
                                      }`}
                                    >
                                      {vt.name}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Visit Check-in/Check-out Metadata & Package Redemptions */}
                    <div className="flex flex-col gap-3 pt-2">
                      <VehicleVisitRow
                        label={selectedVehicle?.label || form.newVehicle?.make_model || 'Vehicle Visit'}
                        meta={form.vehicleVisitMeta[form.vehicleId || 'new_vehicle'] || {}}
                        onField={(field, val) => updateVehicleVisitField(form.vehicleId || 'new_vehicle', field, val)}
                        showCopyToAll={false}
                      />

                      {form.customer?.id && assignedOffers.filter(o => o.vehicleId === form.vehicleId).map(offer => (
                        <div key={offer.id} className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                          <div className="flex flex-col">
                            <span className="text-[12px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles size={12} /> Active Package
                            </span>
                            <span className="text-[15px] font-bold text-gray-900 mt-0.5">{offer.packageName}</span>
                            <span className="text-[12px] font-medium text-emerald-600 mt-0.5">
                              {offer.completedWashes} of {offer.totalWashes} washes used
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRedeemPackage(offer, form.vehicleId)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-sm self-start sm:self-auto active:scale-95"
                          >
                            Redeem Wash
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Organization Fleet Intake Mode */
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <Select
                      isClearable
                      isSearchable
                      placeholder="Search organizations…"
                      styles={selectStyles()}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      options={customerOptions}
                      value={selectedCustomer}
                      onChange={sel => {
                        if (!sel) {
                          setForm(f => ({
                            ...f,
                            customer: { id: null, name: '', phone: '', address: '', vehicles: [] },
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
                        setForm(f => ({
                          ...f,
                          customer: { id: m.id, name: m.name, phone: m.phone, address: m.address || '', vehicles },
                          vehicleId: null,
                          selectedVehicleIds: [],
                          vehicleVisitMeta: {},
                          carMake: '',
                          licensePlate: '',
                        }));
                        onCustomerSelect?.({ ...m, isOrganization: true, clientType: 'organization' });
                      }}
                      isDisabled={!!initial}
                    />

                    {form.customer.name ? (
                      <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-[13px] text-gray-800">
                          <User size={14} className="text-gray-400 shrink-0" />
                          <span className="font-bold">{form.customer.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[13px] text-gray-800">
                          <Phone size={14} className="text-gray-400 shrink-0" />
                          <span className="font-medium">{form.customer.phone}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-3.5 flex items-center justify-center text-gray-400 text-xs font-medium">
                        No organization selected
                      </div>
                    )}
                  </div>

                  {form.customer?.id && (
                    <div className="flex flex-col gap-3 pt-2">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500">
                        Select Vehicles from Fleet ({vehicleOptions.length} registered)
                      </label>
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

                      {vehicleOptions.length === 0 && (
                        <p className="text-[12px] font-medium text-rose-600">
                          This organization has no vehicles registered. Add one via Master Organization first.
                        </p>
                      )}

                      {form.selectedVehicleIds.length > 0 && (
                        <div className="flex flex-col gap-3 mt-2">
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
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors ${isStep3Complete ? 'border-emerald-500 text-emerald-500 bg-emerald-50' : 'border-gray-300 text-gray-400 bg-gray-50'}`}>
                  {isStep3Complete ? <CheckCircle2 size={12} className="fill-emerald-50" /> : <span className="text-[9px] font-bold">3</span>}
                </div>
                <h2 className="text-[14px] font-bold text-gray-900 tracking-tight">Services Grid</h2>
                {isOfferPurchase && <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">(Offer Purchase - Read Only)</span>}
              </div>
              <div>
                {!isOfferPurchase && (
                  <div className="flex flex-wrap gap-2">
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
                      <div className="text-[12px] font-medium text-gray-500 p-3 border border-dashed border-gray-300 rounded-xl bg-gray-50">
                        No services available.
                      </div>
                    )}
                  </div>
                )}
                {form.services.length > 0 && (
                  <div className="mt-4 flex flex-col gap-2.5">
                    {form.services.map((cur, idx) => (
                      <SelectedServiceRow
                        key={`service-${cur.service_id || cur.service}-${idx}`}
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

            <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center border-2 border-gray-300 text-gray-400 bg-gray-50">
                  <Truck size={11} />
                </div>
                <h2 className="text-[14px] font-bold text-gray-900 tracking-tight">Third-Party Services</h2>
                <span className="text-[11px] font-medium text-gray-400">(Optional — vendor work)</span>
              </div>
              <div>
                {!isOfferPurchase && (
                  <div className="flex flex-wrap gap-2">
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
                      <div className="text-[12px] font-medium text-gray-500 p-3 border border-dashed border-gray-300 rounded-xl bg-gray-50">
                        No vendor services available.
                      </div>
                    )}
                  </div>
                )}

                {form.thirdPartyItems.length > 0 && (
                  <div className="mt-4 flex flex-col gap-2.5">
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

            <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center border-2 border-gray-300 text-gray-400 bg-gray-50">
                  <Settings size={11} />
                </div>
                <h2 className="text-[14px] font-bold text-gray-900 tracking-tight">Additional Terms & Notes</h2>
              </div>
              <div className="flex flex-col gap-3">
                <Field label="Special Notes for Client">
                  <textarea className={`${inputCls} resize-none h-14 bg-gray-50 border-gray-200 rounded-xl`} value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="e.g. Thanks for your business!" />
                </Field>
                <label className="flex items-center gap-2.5 cursor-pointer group mt-1">
                  <input type="checkbox" checked={form.showTerms} onChange={e => setF('showTerms', e.target.checked)} className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900" />
                  <span className="text-[12px] font-bold text-gray-700 group-hover:text-gray-900 transition-colors">Include Terms & Conditions on Invoice</span>
                </label>
                {form.showTerms && (
                  <Field label="Terms & Conditions">
                    <textarea className={`${inputCls} resize-none h-16 bg-gray-50 border-gray-200 rounded-xl`} value={form.termsAndConditions} onChange={e => setF('termsAndConditions', e.target.value)} placeholder="Enter custom terms or leave blank for default terms." />
                  </Field>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-4 lg:sticky lg:top-20 min-w-0">
          <div className="flex flex-col gap-4">
            <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
              <div className="bg-gray-900 p-3.5 sm:p-4 text-white flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs sm:text-[14px] tracking-wide flex items-center gap-2">
                    <Receipt size={15} className="text-[#F6CB59]" /> Payment Summary
                  </h3>
                  <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${sc.bg} ${sc.text} shadow-sm border border-white/20`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}
                  </span>
                </div>
              </div>

              <div className="p-3.5 sm:p-5 flex flex-col gap-3.5 sm:gap-4 bg-[#fafafa]">
                <div className="flex flex-col gap-2.5 sm:gap-3">
                  <div className="flex items-center justify-between text-xs sm:text-[14px]">
                    <span className="font-bold text-gray-500">Sub Total</span>
                    <span className="font-mono font-bold text-gray-900">₹{fmt(subTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between group">
                    <span className="font-bold text-gray-500 text-xs sm:text-[14px]">Discount</span>
                    <div className="w-28 sm:w-36">
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
                  <span className="font-black text-gray-900 text-xs sm:text-[15px] uppercase tracking-wider">Grand Total</span>
                  <span className="font-mono font-black text-gray-900 text-2xl sm:text-3xl tracking-tighter">₹{fmt(total)}</span>
                </div>

                <div className="mt-1 bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 shadow-sm flex flex-col gap-2.5 sm:gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest">Payments Received</span>
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

                <div className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl border ${balance <= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-gray-600">Balance Due</span>
                  <span className={`font-mono font-black text-lg sm:text-xl ${balance <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>₹{fmt(Math.max(0, balance))}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || checkingConflicts}
                className={`w-full py-4 sm:py-5 text-xs sm:text-[15px] font-black tracking-widest uppercase text-slate-900 bg-[#F6CB59] hover:bg-[#e5c603] flex items-center justify-center gap-2 transition-colors ${(loading || checkingConflicts) ? 'opacity-70 pointer-events-none' : ''}`}
              >
                {(loading || checkingConflicts) ? (
                  <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                ) : (
                  <Sparkles size={18} />
                )}
                {checkingConflicts ? 'Checking Schedule…' : initial ? 'Update Invoice' : 'Create Invoice'}
              </button>
            </div>
            <p className="text-center text-[10px] sm:text-[11px] font-medium text-gray-400 mt-1 px-4">
              Review all services and financial details before generating the final order.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
