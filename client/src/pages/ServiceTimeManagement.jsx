import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Clock,
  CheckCircle2,
  RotateCw,
  Calendar,
  Plus,
  AlertTriangle,
  CircleDashed,
  Car,
  LayoutGrid,
  List,
  Sparkles,
  Zap,
  Timer,
  ChevronRight,
  ShieldCheck,
  User,
  Receipt,
  ArrowRight,
} from 'lucide-react';
import api from '../api/axios';

function completionCaption(item) {
  const who = item.completed_by_name || 'Technician';
  const when = item.completed_at
    ? new Date(item.completed_at).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    })
    : '';
  if (item.completion_status === 'completed') return `Completed by ${who}${when ? ` · ${when}` : ''}`;
  if (item.completion_status === 'delayed')
    return item.delay_reason ? `Delayed — ${item.delay_reason}` : `Delayed by ${who}`;
  return 'Pending Execution';
}

const STATUS_STYLE = {
  completed: {
    icon: CheckCircle2,
    iconBg: 'bg-emerald-50 text-emerald-600',
    captionColor: 'text-emerald-700',
    pill: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  delayed: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-50 text-amber-600',
    captionColor: 'text-amber-700',
    pill: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  pending: {
    icon: CircleDashed,
    iconBg: 'bg-gray-100 text-gray-400',
    captionColor: 'text-gray-400',
    pill: 'bg-gray-100 text-gray-600 border-gray-200',
  },
};

function allItemsFor(v) {
  return [
    ...(v.services || []).map((s) => ({
      ...s,
      name: `${s.service_name}${s.quantity > 1 ? ` (x${s.quantity})` : ''}`,
      isThirdParty: false,
    })),
    ...(v.third_party_services || []).map((t) => ({ ...t, name: t.service_name, isThirdParty: true })),
  ];
}

function ServiceStatusRow({ item }) {
  const status = item.completion_status || 'pending';
  const style = STATUS_STYLE[status];
  const Icon = style.icon;

  return (
    <div className="flex items-start justify-between gap-2 py-2 border-b border-gray-100/70 last:border-0">
      <div className="flex items-start gap-2 min-w-0 flex-1">
        <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${style.iconBg}`}>
          <Icon size={12} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-gray-900 leading-tight break-words">
            {item.name}
            {item.isThirdParty && (
              <span className="ml-1.5 text-[10px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                Vendor
              </span>
            )}
          </p>
          <p className={`text-[10px] font-semibold leading-snug mt-0.5 ${style.captionColor}`}>
            {completionCaption(item)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ServiceTimeManagement() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  useEffect(() => {
    fetchOrders(todayStr, todayStr, '');
  }, []);

  const fetchOrders = async (start, end, queryStr) => {
    setLoading(true);
    setError(null);
    try {
      let url = `/service-time/search?startDate=${start}&endDate=${end}`;
      if (queryStr) {
        url += `&search=${encodeURIComponent(queryStr)}`;
      }
      const res = await api.get(url);
      setVehicles(res.data);
    } catch (err) {
      setError('Failed to load orders.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    fetchOrders(startDate, endDate, search);
  };

  const resetToToday = () => {
    setStartDate(todayStr);
    setEndDate(todayStr);
    setSearch('');
    fetchOrders(todayStr, todayStr, '');
  };

  const handleAction = async (id, action) => {
    try {
      const endpoint = action === 'checkin' ? '/service-time/checkin' : '/service-time/checkout';
      const res = await api.post(endpoint, { invoice_vehicle_id: id });

      setVehicles((prev) =>
        prev.map((v) =>
          v.invoice_vehicle_id === id
            ? {
              ...v,
              checkin_time: res.data.data.checkin_time,
              checkout_time: res.data.data.checkout_time,
            }
            : v
        )
      );
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    }
  };

  const formatTimeSlot = (timeStr) => {
    if (!timeStr) return null;
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return timeStr;
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const calculateDuration = (checkin, checkout) => {
    if (!checkin || !checkout) return '--';
    const ms = new Date(checkout) - new Date(checkin);
    if (ms < 0) return '--';
    const totalMins = Math.floor(ms / 60000);
    const days = Math.floor(totalMins / 1440);
    const hrs = Math.floor((totalMins % 1440) / 60);
    const mins = totalMins % 60;

    if (days > 0) {
      return `${days}d ${hrs}h ${mins > 0 ? `${mins}m` : ''}`.trim();
    }
    return `${hrs}h ${mins}m`;
  };

  const timeMetrics = useMemo(() => {
    const inBayCount = vehicles.filter((v) => v.checkin_time && !v.checkout_time).length;
    const completedCount = vehicles.filter((v) => v.checkin_time && v.checkout_time).length;
    const pendingCheckin = vehicles.filter((v) => !v.checkin_time).length;

    return {
      totalVehicles: vehicles.length,
      inBayCount,
      completedCount,
      pendingCheckin,
    };
  }, [vehicles]);

  return (
    <div className="min-h-[calc(100vh-100px)] flex flex-col p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 font-sans pb-20">
      {/* ── Header Toolbar ── */}
      <div className="bg-white/70 backdrop-blur-2xl rounded-2xl sm:rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-white/80 p-3.5 sm:p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3.5 sm:gap-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-black flex items-center justify-center shadow-lg shrink-0">
            <Clock className="text-[#F6CB59] w-4 h-4 sm:w-6 sm:h-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base sm:text-xl md:text-[22px] font-black text-gray-900 tracking-tight">
              Service Time Management
            </h1>
            <p className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-500 uppercase tracking-wider mt-0.5">
              Live workshop bay turnaround time & service completion
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSearch}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto shrink-0"
        >
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="date"
              className="w-full sm:w-36 px-2.5 py-2 bg-white/90 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 shadow-xs"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              type="date"
              className="w-full sm:w-36 px-2.5 py-2 bg-white/90 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 shadow-xs"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="relative w-full sm:w-56 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text"
              className="w-full pl-8 pr-3 py-2 bg-white/90 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 placeholder:text-gray-400 shadow-xs"
              placeholder="Search Invoice/Plate..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-black text-[#F6CB59] shadow-xs' : 'text-gray-500'
                  }`}
                title="Cards View"
              >
                <LayoutGrid size={13} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-black text-[#F6CB59] shadow-xs' : 'text-gray-500'
                  }`}
                title="Table View"
              >
                <List size={13} />
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-black text-[#F6CB59] font-black text-xs shadow-md whitespace-nowrap"
            >
              {loading ? <RotateCw className="animate-spin" size={13} /> : 'Filter'}
            </button>
            {(startDate !== todayStr || endDate !== todayStr || search) && (
              <button
                type="button"
                onClick={resetToToday}
                className="p-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors shrink-0"
                title="Reset to today"
              >
                <RotateCw size={13} />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ── Executive Storytelling Analytics Strip ── */}
      <div className="flex lg:grid lg:grid-cols-4 gap-2.5 sm:gap-4 overflow-x-auto pb-1 hide-scrollbar">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shadow-xs shrink-0">
            <Timer size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              In Workshop
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight">
              {timeMetrics.inBayCount} <span className="text-xs font-bold text-gray-400">Active</span>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shadow-xs shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Completed
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
              {timeMetrics.completedCount} Checked Out
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center shadow-xs shrink-0">
            <Clock size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Entry
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
              {timeMetrics.pendingCheckin} Awaiting
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[165px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black/90 text-[#F6CB59] flex items-center justify-center shadow-xs shrink-0">
            <Car size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Total Roster
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
              {timeMetrics.totalVehicles} Vehicles
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>
      )}

      {/* ── View Mode: Ultra-Premium Workshop Turnaround Cards ── */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
          {vehicles.length === 0 && !loading ? (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 rounded-[24px] bg-white/60 backdrop-blur-md shadow-sm">
              <Clock size={36} className="mx-auto text-gray-400 mb-3" />
              <h3 className="text-base font-bold text-gray-800">
                {startDate === todayStr && endDate === todayStr
                  ? 'No workshop orders found for today'
                  : 'No orders found for this search period'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">Try expanding your date filter or search query.</p>
            </div>
          ) : (
            vehicles.map((v) => {
              const items = allItemsFor(v);
              const isCheckedIn = !!v.checkin_time;
              const isCheckedOut = !!v.checkout_time;
              const durationStr = calculateDuration(v.checkin_time, v.checkout_time);
              const checkinTimeFormatted = formatTimeSlot(v.checkin_time);
              const checkoutTimeFormatted = formatTimeSlot(v.checkout_time);

              return (
                <div
                  key={v.invoice_vehicle_id}
                  className="bg-white/85 backdrop-blur-2xl rounded-3xl p-4 sm:p-5 border border-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.09)] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Subtle Amber Top Accent Line */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F6CB59] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div>
                    {/* ── Header: Vehicle Crest, Name & Workshop State Badge ── */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-2xl bg-black text-[#F6CB59] flex items-center justify-center shadow-md shrink-0 border border-gray-800 group-hover:scale-105 transition-transform">
                          <Car size={18} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base sm:text-[17px] font-black text-gray-900 leading-tight break-words truncate">
                            {v.vehicle_name}
                          </h3>
                        </div>
                      </div>

                      {/* Workshop State Pill */}
                      <span
                        className={`text-[10px] font-black uppercase rounded-full px-2.5 py-0.5 shadow-xs shrink-0 ${isCheckedOut
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : isCheckedIn
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}
                      >
                        {isCheckedOut ? '🏁 Finished' : isCheckedIn ? '🟢 In Bay' : '⚪ Queued'}
                      </span>
                    </div>

                    {/* ── Storytelling Vehicle Metadata Strip ── */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-gray-600 mb-3 min-w-0">
                      {v.license_vin && (
                        <span className="bg-gray-100/90 text-gray-900 px-2 py-0.5 rounded-lg border border-gray-200/80 font-mono shadow-xs shrink-0">
                          🚗 {v.license_vin}
                        </span>
                      )}
                      <span className="bg-gray-50 text-gray-700 px-2 py-0.5 rounded-lg border border-gray-200/60 shadow-xs truncate max-w-[140px] flex items-center gap-1">
                        <User size={10} className="text-gray-400 shrink-0" />
                        <span className="truncate">{v.client_name || 'Walk-in'}</span>
                      </span>
                      <span
                        className="bg-white text-gray-500 px-2 py-0.5 rounded-lg border border-gray-200/80 shadow-xs font-mono text-[10px] ml-auto shrink-0 truncate max-w-[110px]"
                        title={v.invoice_number}
                      >
                        🧾 {v.invoice_number}
                      </span>
                    </div>

                    {/* ── Workshop Live Bay Timing Strip ── */}
                    <div className="grid grid-cols-2 gap-2 my-2.5 p-2.5 bg-gray-50/90 rounded-2xl border border-gray-200/60">
                      {/* Check-In Box */}
                      <div className="bg-white/95 p-2.5 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between min-h-[58px]">
                        <div className="flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-wider">
                          <span>Bay Check-In</span>
                          <Clock size={10} className="text-gray-400" />
                        </div>
                        {v.checkin_time ? (
                          <div className="text-[13px] font-black text-emerald-800 font-mono mt-1">
                            {checkinTimeFormatted}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAction(v.invoice_vehicle_id, 'checkin')}
                            className="mt-1 px-3 py-1 bg-black text-[#F6CB59] text-[10px] font-black uppercase rounded-lg hover:scale-102 active:scale-98 transition-all shadow-xs"
                          >
                            ⚡ Check In
                          </button>
                        )}
                      </div>

                      {/* Check-Out Box */}
                      <div className="bg-white/95 p-2.5 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between min-h-[58px]">
                        <div className="flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-wider">
                          <span>Bay Check-Out</span>
                          <CheckCircle2 size={10} className="text-gray-400" />
                        </div>
                        {v.checkout_time ? (
                          <div className="text-[13px] font-black text-rose-800 font-mono mt-1">
                            {checkoutTimeFormatted}
                          </div>
                        ) : v.checkin_time ? (
                          <button
                            onClick={() => handleAction(v.invoice_vehicle_id, 'checkout')}
                            className="mt-1 px-3 py-1 bg-white border border-gray-300 text-black hover:bg-black hover:text-[#F6CB59] text-[10px] font-black uppercase rounded-lg hover:scale-102 active:scale-98 transition-all shadow-xs"
                          >
                            🏁 Check Out
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-gray-300 mt-1">--:--</span>
                        )}
                      </div>
                    </div>

                    {/* ── Allocated Services Checklist ── */}
                    <div className="my-2.5 bg-white/70 p-3 rounded-2xl border border-gray-200/60">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>Allocated Services ({items.length})</span>
                        <span className="text-gray-500 font-bold text-[10px]">
                          {items.filter((i) => i.completion_status === 'completed').length} / {items.length} Done
                        </span>
                      </div>
                      {items.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">No services registered</span>
                      ) : (
                        <div className="space-y-0.5">
                          {items.map((item) => (
                            <ServiceStatusRow
                              key={`${item.isThirdParty ? 'tp' : 's'}-${item.id}`}
                              item={item}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Card Footer: Turnaround Duration Meter ── */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100/90 text-xs mt-1">
                    <span className="font-extrabold text-gray-500 flex items-center gap-1 text-[11px]">
                      <Timer size={13} className="text-amber-600" />
                      <span>Workshop Bay Turnaround:</span>
                    </span>
                    <span className="text-[14px] font-black font-mono text-gray-950 bg-[#F6CB59]/30 px-3 py-1 rounded-xl border border-[#F6CB59]/40 shadow-xs">
                      {durationStr}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ── Compact Table View ── */
        <div className="bg-white/80 backdrop-blur-2xl rounded-2xl sm:rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-white/80 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-gray-200/80 bg-gray-50/70 text-gray-700">
                  <th className="py-3.5 px-5 text-[11px] font-black uppercase tracking-wider">Vehicle Details</th>
                  <th className="py-3.5 px-4 text-[11px] font-black uppercase tracking-wider">Invoice</th>
                  <th className="py-3.5 px-5 text-[11px] font-black uppercase tracking-wider">Services</th>
                  <th className="py-3.5 px-4 text-[11px] font-black uppercase tracking-wider">Bay In/Out</th>
                  <th className="py-3.5 px-5 text-[11px] font-black uppercase tracking-wider text-right">Total Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/80">
                {vehicles.length === 0 && !loading ? (
                  <tr>
                    <td colSpan="5" className="py-16 text-center text-gray-400 font-bold">
                      No vehicles found.
                    </td>
                  </tr>
                ) : (
                  vehicles.map((v) => {
                    const items = allItemsFor(v);
                    const checkinTimeFormatted = formatTimeSlot(v.checkin_time);
                    const checkoutTimeFormatted = formatTimeSlot(v.checkout_time);

                    return (
                      <tr key={v.invoice_vehicle_id} className="hover:bg-amber-50/30 transition-colors align-top">
                        <td className="py-3.5 px-5">
                          <div className="font-bold text-sm text-gray-900">{v.vehicle_name}</div>
                          <div className="text-[11px] font-bold text-gray-500 mt-0.5">
                            {v.license_vin} • {v.client_name || 'Walk-in'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-xs font-mono font-bold text-black bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                            {v.invoice_number}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 min-w-[260px]">
                          {items.length === 0 ? (
                            <span className="text-[11px] text-gray-400 italic">No services</span>
                          ) : (
                            <div className="space-y-0.5">
                              {items.map((item) => (
                                <ServiceStatusRow
                                  key={`${item.isThirdParty ? 'tp' : 's'}-${item.id}`}
                                  item={item}
                                />
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1.5 min-w-[140px]">
                            <div className="flex items-center justify-between text-xs bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                              <span className="text-[10px] font-black text-gray-400">IN:</span>
                              {v.checkin_time ? (
                                <span className="font-mono font-bold text-emerald-800 text-[11px]">
                                  {checkinTimeFormatted}
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleAction(v.invoice_vehicle_id, 'checkin')}
                                  className="px-2 py-0.5 bg-black text-[#F6CB59] text-[9px] font-black uppercase rounded"
                                >
                                  In
                                </button>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-xs bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                              <span className="text-[10px] font-black text-gray-400">OUT:</span>
                              {v.checkout_time ? (
                                <span className="font-mono font-bold text-rose-800 text-[11px]">
                                  {checkoutTimeFormatted}
                                </span>
                              ) : v.checkin_time ? (
                                <button
                                  onClick={() => handleAction(v.invoice_vehicle_id, 'checkout')}
                                  className="px-2 py-0.5 bg-white border border-gray-300 text-black text-[9px] font-black uppercase rounded"
                                >
                                  Out
                                </button>
                              ) : (
                                <span className="text-gray-300 text-[10px]">--:--</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <span className="text-sm font-mono font-black text-gray-900 bg-[#F6CB59]/20 px-2.5 py-1 rounded-lg text-[#5C4A0A]">
                            {calculateDuration(v.checkin_time, v.checkout_time)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
