import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Clock, CheckCircle2, RotateCw, Calendar, Plus } from 'lucide-react';
import api from '../api/axios';

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
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto min-h-[calc(100vh-64px)] space-y-6">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Service Time Management</h1>
          <p className="text-sm font-semibold text-gray-500 mt-1">Track actual time spent by vehicles in the workshop</p>
        </div>
        <Link 
          to="/invoices/new" 
          className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
        >
          <Plus size={18} /> New Job
        </Link>
      </div>

      <div className="bg-white/60 backdrop-blur-xl border border-white p-6 rounded-2xl shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-[13px] font-bold text-gray-700 mb-1.5 ml-1">Search Invoice / Vehicle</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Invoice No, License/VIN, or Customer"
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-1.5 ml-1">From Date</label>
            <input
              type="date"
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-1.5 ml-1">To Date</label>
            <input
              type="date"
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2 h-[42px]"
          >
            {loading ? <RotateCw className="animate-spin" size={16} /> : 'Filter'}
          </button>
          
          {(startDate !== todayStr || endDate !== todayStr || search) && (
            <button
              type="button"
              onClick={resetToToday}
              className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-xl transition-colors flex items-center gap-2 h-[42px]"
            >
              <Calendar size={16} /> Reset
            </button>
          )}
        </form>
        {error && <p className="text-red-500 text-sm font-semibold mt-4">{error}</p>}
      </div>

      {vehicles.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <Calendar className="text-blue-600" size={20} />
          <h2 className="text-lg font-bold text-gray-800">
            {startDate === todayStr && endDate === todayStr ? "Today's Orders" : "Filtered Orders"} ({vehicles.length})
          </h2>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-blue-50/50 border-b border-gray-100">
              <th className="py-4 px-6 text-[11px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Vehicle Details</th>
              <th className="py-4 px-6 text-[11px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Invoice</th>
              <th className="py-4 px-6 text-[11px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Services</th>
              <th className="py-4 px-6 text-[11px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Status (In/Out)</th>
              <th className="py-4 px-6 text-[11px] font-black text-gray-500 uppercase tracking-widest text-right whitespace-nowrap">Total Time</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-50">
            {vehicles.length === 0 && !loading && (
              <tr>
                <td colSpan="5" className="py-12 text-center text-gray-500 font-semibold bg-gray-50/30">
                  {startDate === todayStr && endDate === todayStr ? "No orders found for today." : "No vehicles found for this search criteria."}
                </td>
              </tr>
            )}

            {vehicles.map(v => (
              <tr key={v.invoice_vehicle_id} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-5 px-6">
                  <div className="font-bold text-sm text-gray-900">{v.vehicle_name}</div>
                  <div className="text-[12px] font-semibold text-gray-500 mt-1">
                    {v.license_vin} &bull; {v.client_name || 'Walk-in'}
                  </div>
                </td>

                <td className="py-5 px-6">
                  <span className="text-sm font-bold text-blue-600">{v.invoice_number}</span>
                </td>

                <td className="py-5 px-6">
                  <div className="flex flex-wrap gap-2 max-w-xs">
                    {v.services?.map(s => (
                      <span key={s.id} className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold">
                        {s.service_name} {s.quantity > 1 ? `(x${s.quantity})` : ''}
                      </span>
                    ))}
                    {v.third_party_services?.map(tps => (
                      <span key={tps.id} className="inline-flex items-center px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 text-[11px] font-bold">
                        {tps.service_name}
                      </span>
                    ))}
                    {!(v.services?.length) && !(v.third_party_services?.length) && (
                      <span className="text-xs text-gray-400 italic font-medium">No services</span>
                    )}
                  </div>
                </td>

                <td className="py-5 px-6">
                  <div className="flex flex-col gap-2 min-w-[140px]">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-bold w-16 ${v.checkin_time ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {v.checkin_time ? new Date(v.checkin_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toLowerCase() : '--:--'}
                      </span>
                      {!v.checkin_time && (
                        <button 
                          onClick={() => handleAction(v.invoice_vehicle_id, 'checkin')}
                          className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-[10px] font-bold rounded transition-colors"
                        >
                          CHECK IN
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-bold w-16 ${v.checkout_time ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'}`}>
                        {v.checkout_time ? new Date(v.checkout_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toLowerCase() : '--:--'}
                      </span>
                      {v.checkin_time && !v.checkout_time && (
                        <button 
                          onClick={() => handleAction(v.invoice_vehicle_id, 'checkout')}
                          className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 text-[10px] font-bold rounded transition-colors"
                        >
                          CHECK OUT
                        </button>
                      )}
                    </div>
                  </div>
                </td>

                <td className="py-5 px-6 text-right">
                  <span className="text-sm font-black text-gray-900">
                    {calculateDuration(v.checkin_time, v.checkout_time)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
