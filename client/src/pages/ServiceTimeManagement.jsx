import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Clock, CheckCircle2, RotateCw, Calendar, Plus, AlertTriangle, CircleDashed } from 'lucide-react';
import api from '../api/axios';

function completionCaption(item) {
  const who = item.completed_by_name || 'someone';
  const when = item.completed_at
    ? new Date(item.completed_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '';
  if (item.completion_status === 'completed') return `Completed by ${who}${when ? ` · ${when}` : ''}`;
  if (item.completion_status === 'delayed') return item.delay_reason ? `Delayed — ${item.delay_reason}` : `Delayed by ${who}`;
  return 'Pending';
}

const STATUS_STYLE = {
  completed: { icon: CheckCircle2, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', captionColor: 'text-emerald-700' },
  delayed: { icon: AlertTriangle, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', captionColor: 'text-amber-700' },
  pending: { icon: CircleDashed, iconBg: 'bg-gray-100', iconColor: 'text-gray-400', captionColor: 'text-gray-400' },
};

function allItemsFor(v) {
  return [
    ...(v.services || []).map(s => ({ ...s, name: `${s.service_name}${s.quantity > 1 ? ` (x${s.quantity})` : ''}`, isThirdParty: false })),
    ...(v.third_party_services || []).map(t => ({ ...t, name: t.service_name, isThirdParty: true })),
  ];
}

function ServiceStatusRow({ item }) {
  const status = item.completion_status || 'pending';
  const style = STATUS_STYLE[status];
  const Icon = style.icon;

  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${style.iconBg}`}>
        <Icon size={13} className={style.iconColor} />
      </span>
      <div className="min-w-0">
        <p className="text-[12.5px] font-bold text-gray-900 leading-snug">
          {item.name}
          {item.isThirdParty && <span className="text-gray-400 font-semibold"> · 3rd party</span>}
        </p>
        <p className={`text-[11px] font-semibold leading-snug ${style.captionColor}`}>
          {completionCaption(item)}
        </p>
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
      
      // Update local state
      setVehicles(prev => prev.map(v => 
        v.invoice_vehicle_id === id 
          ? { 
              ...v, 
              checkin_time: res.data.data.checkin_time, 
              checkout_time: res.data.data.checkout_time 
            } 
          : v
      ));
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    }
  };

  const calculateDuration = (checkin, checkout) => {
    if (!checkin || !checkout) return '--';
    const ms = new Date(checkout) - new Date(checkin);
    if (ms < 0) return '--';
    const hrs = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="min-h-[calc(100vh-100px)] flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 lg:space-y-8 font-sans">
      
      {/* ── Header Toolbar ── */}
      <div className="card p-4 sm:p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center shadow-lg shrink-0">
            <Clock className="text-[#F6CB59]" size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-[22px] font-black text-gray-900 tracking-tight uppercase">
              Service Time Management
            </h1>
            <p className="text-[12px] md:text-sm font-bold text-gray-500 uppercase tracking-wider mt-0.5">
              TRACK VEHICLE WORKSHOP TIME
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-40">
              <input
                type="date"
                className="input pl-3 pr-3 py-2.5 !text-[12px]"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="relative w-full sm:w-40">
              <input
                type="date"
                className="input pl-3 pr-3 py-2.5 !text-[12px]"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="relative w-full sm:w-56 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              className="input pl-10 pr-4 py-2.5"
              placeholder="Search Invoice/Vehicle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 px-5 !rounded-xl">
              {loading ? <RotateCw className="animate-spin" size={15} /> : 'FILTER'}
            </button>
            {(startDate !== todayStr || endDate !== todayStr || search) && (
              <button type="button" onClick={resetToToday} className="btn-secondary w-full sm:w-auto flex items-center justify-center gap-2 px-4 !rounded-xl">
                <RotateCw size={15} />
              </button>
            )}
          </div>
        </form>
      </div>

      {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}

      {/* ── Table/List Area ── */}
      <div className="card overflow-hidden flex-1">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-200/50">
                <th className="py-4 px-6 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap bg-gray-50/50">Vehicle Details</th>
                <th className="py-4 px-6 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap bg-gray-50/50">Invoice</th>
                <th className="py-4 px-6 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap bg-gray-50/50">Services</th>
                <th className="py-4 px-6 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap bg-gray-50/50">Status (In/Out)</th>
                <th className="py-4 px-6 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap bg-gray-50/50">Total Time</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-100/50">
              {vehicles.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="py-16 text-center text-gray-400 font-bold">
                    <div className="flex flex-col items-center gap-2">
                      <Clock size={32} className="opacity-20" />
                      {startDate === todayStr && endDate === todayStr ? "NO ORDERS FOUND FOR TODAY" : "NO VEHICLES FOUND FOR THIS SEARCH"}
                    </div>
                  </td>
                </tr>
              )}

              {vehicles.map(v => {
                const items = allItemsFor(v);
                return (
                <tr key={v.invoice_vehicle_id} className="hover:bg-gray-50/50 transition-colors align-top group">
                  <td className="py-5 px-6">
                    <div className="font-bold text-sm text-gray-900 group-hover:text-black transition-colors">{v.vehicle_name}</div>
                    <div className="text-[12px] font-bold text-gray-500 mt-1 uppercase tracking-wide">
                      {v.license_vin} &bull; {v.client_name || 'Walk-in'}
                    </div>
                  </td>

                  <td className="py-5 px-6">
                    <span className="text-[13px] font-black text-black bg-gray-100 px-3 py-1 rounded-lg border border-gray-200">{v.invoice_number}</span>
                  </td>

                  <td className="py-4 px-6 min-w-[280px]">
                    {items.length === 0 ? (
                      <span className="text-[11px] text-gray-400 uppercase font-bold">No services</span>
                    ) : (
                      <div className="divide-y divide-gray-100/60">
                        {items.map(item => (
                          <ServiceStatusRow key={`${item.isThirdParty ? 'tp' : 's'}-${item.id}`} item={item} />
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="py-5 px-6">
                    <div className="flex flex-col gap-2 min-w-[150px]">
                      <div className="flex items-center justify-between gap-3 bg-gray-50/80 p-2 rounded-xl border border-gray-100">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">IN:</span>
                        {v.checkin_time ? (
                          <span className="text-[12px] font-bold text-emerald-700 bg-emerald-100/50 px-2.5 py-0.5 rounded-lg border border-emerald-200/50">
                            {new Date(v.checkin_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toLowerCase()}
                          </span>
                        ) : (
                          <button onClick={() => handleAction(v.invoice_vehicle_id, 'checkin')} className="px-3 py-1 bg-black text-[#F6CB59] hover:bg-gray-900 text-[10px] font-black uppercase rounded-lg transition-all shadow-sm">
                            CHECK IN
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3 bg-gray-50/80 p-2 rounded-xl border border-gray-100">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">OUT:</span>
                        {v.checkout_time ? (
                          <span className="text-[12px] font-bold text-rose-700 bg-rose-100/50 px-2.5 py-0.5 rounded-lg border border-rose-200/50">
                            {new Date(v.checkout_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toLowerCase()}
                          </span>
                        ) : v.checkin_time ? (
                          <button onClick={() => handleAction(v.invoice_vehicle_id, 'checkout')} className="px-3 py-1 bg-white border border-gray-200 text-black hover:bg-gray-100 text-[10px] font-black uppercase rounded-lg transition-all shadow-sm">
                            CHECK OUT
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-gray-300">--:--</span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-5 px-6 text-right">
                    <span className="text-[15px] font-black text-gray-900 bg-[#F6CB59]/20 px-3 py-1.5 rounded-xl text-[#5C4A0A] inline-block">
                      {calculateDuration(v.checkin_time, v.checkout_time)}
                    </span>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
