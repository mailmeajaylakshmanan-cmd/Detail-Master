import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Eye,
  ArrowLeft,
  Gift,
  Trash2,
  Clock,
  Sparkles,
  Coins,
  LayoutGrid,
  List,
  Phone,
  Car,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { parseSafeDate } from '../utils/dateFormatter.js';
import { usePermissions } from '../hooks/usePermissions.js';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = parseSafeDate(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmt(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function ManageAssignedOffers() {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const queryClient = useQueryClient();
  const { canDelete } = usePermissions('Offers');

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['assignedOffers'],
    queryFn: async () => {
      const res = await api.get('/offers');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const filteredOffers = useMemo(() => {
    if (!search.trim()) return offers;
    const lower = search.toLowerCase();
    return offers.filter(
      (o) =>
        (o.offerNo && o.offerNo.toLowerCase().includes(lower)) ||
        (o.customer?.name && o.customer.name.toLowerCase().includes(lower)) ||
        (o.customer?.phone && o.customer.phone.includes(lower)) ||
        (o.packageName && o.packageName.toLowerCase().includes(lower)) ||
        (o.licensePlate && o.licensePlate.toLowerCase().includes(lower))
    );
  }, [offers, search]);

  const assignedMetrics = useMemo(() => {
    const total = offers.length;
    const activeCount = offers.filter((o) => o.status === 'active' || !o.status).length;
    const totalRemainingWashes = offers.reduce(
      (acc, o) => acc + Math.max(0, (o.totalWashes || 0) - (o.completedWashes || 0)),
      0
    );
    const totalFreeRemaining = offers.reduce(
      (acc, o) => acc + Math.max(0, (o.freeWashes || 0) - (o.freeWashesUsed || 0)),
      0
    );
    const totalRevenue = offers.reduce((acc, o) => acc + (Number(o.price) || 0), 0);

    return {
      total,
      activeCount,
      totalRemainingWashes,
      totalFreeRemaining,
      totalRevenue,
    };
  }, [offers]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this assigned offer?')) return;
    try {
      await api.delete('/offers/' + id);
      toast.success('Assigned offer deleted');
      queryClient.invalidateQueries(['assignedOffers']);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting assigned offer');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">
      {/* ── Top Header Toolbar ── */}
      <div className="bg-white/70 backdrop-blur-2xl rounded-2xl sm:rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-white/80 p-3.5 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-5 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/master-offers"
            className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl sm:rounded-2xl bg-white border border-gray-200/80 text-gray-700 hover:text-black hover:scale-105 shadow-xs transition-all shrink-0"
            title="Back to Offer Master"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-base sm:text-xl md:text-[22px] font-black text-gray-900 tracking-tight leading-none mb-1 flex items-center gap-2">
              <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-[#F6CB59]" />
              Manage Assigned Packages
            </h1>
            <p className="text-[10px] sm:text-[12px] font-bold text-gray-500 tracking-wide uppercase">
              Track customer detailing memberships, wash quotas & redemptions
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 w-full lg:w-auto shrink-0">
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              className="w-full pl-9 sm:pl-10 pr-4 py-1.5 sm:py-2.5 bg-white/80 border border-gray-200/60 rounded-xl text-[12px] sm:text-[13px] font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-xs"
              placeholder="Search offer #, customer, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100/90 p-1 rounded-xl border border-gray-200/60 shadow-xs self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'cards'
                  ? 'bg-black text-[#F6CB59] shadow-sm'
                  : 'text-gray-600 hover:text-gray-950'
              }`}
              title="Executive Cards View"
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-black text-[#F6CB59] shadow-sm'
                  : 'text-gray-600 hover:text-gray-950'
              }`}
              title="Table View"
            >
              <List size={13} />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Executive Storytelling Analytics Strip ── */}
      <div className="flex lg:grid lg:grid-cols-4 gap-2.5 sm:gap-4 overflow-x-auto pb-1 hide-scrollbar">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black/90 text-[#F6CB59] flex items-center justify-center shadow-xs shrink-0">
            <Gift size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Assigned Passes
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight">
              {assignedMetrics.activeCount}{' '}
              <span className="text-xs font-bold text-gray-400">/ {assignedMetrics.total}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center shadow-xs shrink-0">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Washes Remaining
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
              {assignedMetrics.totalRemainingWashes} Washes
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shadow-xs shrink-0">
            <Gift size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Free Bonus Left
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
              +{assignedMetrics.totalFreeRemaining} Bonus Washes
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[165px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shadow-xs shrink-0">
            <Coins size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Total Value
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
              {fmt(assignedMetrics.totalRevenue)}
            </div>
          </div>
        </div>
      </div>

      {/* ── View Mode: Ultra-Premium Storytelling Cards ── */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
          {isLoading ? (
            <div className="col-span-full py-16 text-center text-gray-400 font-bold">
              Loading assigned customer packages...
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 rounded-[24px] bg-white/60 backdrop-blur-md shadow-sm">
              <Gift size={36} className="mx-auto text-gray-400 mb-3" />
              <h3 className="text-base font-bold text-gray-800">No assigned packages found</h3>
              <p className="text-xs text-gray-500 mt-1">Try searching with customer name, phone, or package title.</p>
            </div>
          ) : (
            filteredOffers.map((offer) => {
              const washBal = Math.max(0, (offer.totalWashes || 0) - (offer.completedWashes || 0));
              const freeBal = Math.max(0, (offer.freeWashes || 0) - (offer.freeWashesUsed || 0));
              const totalInitial = (offer.totalWashes || 0);
              const progressPct = totalInitial > 0 ? Math.round(((offer.completedWashes || 0) / totalInitial) * 100) : 0;
              const isActive = offer.status === 'active' || !offer.status;

              return (
                <div
                  key={offer.id}
                  className="bg-white/85 backdrop-blur-2xl rounded-3xl p-4 sm:p-5 border border-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.09)] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Subtle Amber Top Accent */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F6CB59] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div>
                    {/* Card Header: Offer No, Customer, and Status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-2xl bg-black text-[#F6CB59] flex items-center justify-center shadow-md shrink-0 border border-gray-800 group-hover:scale-105 transition-transform mt-0.5">
                          <Gift size={18} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base sm:text-[17px] font-black text-gray-900 leading-tight group-hover:text-amber-800 transition-colors break-words">
                            {offer.customer?.name || 'Customer'}
                          </h3>
                          <div className="flex items-center gap-1 text-[11px] text-gray-500 font-bold mt-0.5">
                            <Phone size={10} className="text-gray-400 shrink-0" />
                            <span className="truncate">{offer.customer?.phone || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge & Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[10px] font-black uppercase rounded-full px-2.5 py-0.5 shadow-xs ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {offer.status || 'Active'}
                        </span>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(offer.id)}
                            className="w-7 h-7 rounded-xl bg-white text-rose-600 border border-rose-200 shadow-xs flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all"
                            title="Delete Assigned Package"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Offer Title & Ref Tag */}
                    <div className="flex items-center justify-between gap-2 my-2.5 min-w-0">
                      <div className="inline-flex items-center text-[11px] font-black text-amber-950 bg-[#F6CB59]/25 border border-[#F6CB59]/40 px-2.5 py-0.5 rounded-lg uppercase tracking-wider truncate min-w-0 flex-1">
                        <span className="truncate">{offer.packageName || 'Detailing Membership'}</span>
                      </div>
                      <span className="text-[10px] font-mono font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md shrink-0">
                        {offer.offerNo}
                      </span>
                    </div>

                    {/* Storytelling Wash Quota Meter */}
                    <div className="bg-gray-50/90 p-3 rounded-2xl border border-gray-200/60 my-2.5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Sparkles size={12} className="text-blue-600" />
                          <span>Standard Washes</span>
                        </span>
                        <span className="text-gray-900 font-black">
                          {washBal} / {offer.totalWashes || 0} Left
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, 100 - progressPct))}%` }}
                        />
                      </div>

                      {offer.freeWashes > 0 && (
                        <div className="flex items-center justify-between text-[11px] font-bold pt-1.5 border-t border-gray-200/50">
                          <span className="text-amber-800 flex items-center gap-1">
                            <span>✨ Complimentary Bonus:</span>
                          </span>
                          <span className="font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                            {freeBal} / {offer.freeWashes} Left
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Validity & Vehicle Info */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 font-bold mb-2">
                      <span className="bg-white px-2 py-0.5 rounded-lg border border-gray-200/80 shadow-xs flex items-center gap-1">
                        <Clock size={11} className="text-amber-600" />
                        <span>Valid till: {formatDate(offer.validityDate)}</span>
                      </span>
                      {offer.licensePlate && (
                        <span className="bg-white px-2 py-0.5 rounded-lg border border-gray-200/80 shadow-xs flex items-center gap-1 text-gray-700">
                          <Car size={11} className="text-gray-500" />
                          <span className="font-mono">{offer.licensePlate}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Price & Redeem CTA */}
                  <div className="flex items-end justify-between pt-3 border-t border-gray-100/90 mt-1">
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Package Value</div>
                      <div className="text-gray-950 font-black text-[20px] tracking-tight leading-none font-mono">
                        {fmt(offer.price)}
                      </div>
                    </div>

                    <Link
                      to={`/offers/${offer.id}`}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-black text-[#F6CB59] font-black text-[11px] hover:scale-105 shadow-sm transition-all"
                    >
                      <Eye size={12} />
                      <span>View Pass</span>
                      <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ── Compact Table View ── */
        <div className="bg-white/80 backdrop-blur-2xl rounded-2xl sm:rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-white/80 overflow-hidden">
          <div className="overflow-x-auto min-h-[350px]">
            <table className="w-full text-left text-[13px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-200/80 bg-gray-50/70 text-gray-700">
                  <th className="px-4 py-3.5 font-black text-[11px] uppercase tracking-wider">Offer No</th>
                  <th className="px-4 py-3.5 font-black text-[11px] uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3.5 font-black text-[11px] uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3.5 font-black text-[11px] uppercase tracking-wider">Package</th>
                  <th className="px-4 py-3.5 font-black text-[11px] uppercase tracking-wider text-right">Price</th>
                  <th className="px-4 py-3.5 font-black text-[11px] uppercase tracking-wider text-center">Standard Washes</th>
                  <th className="px-4 py-3.5 font-black text-[11px] uppercase tracking-wider text-center">Bonus Washes</th>
                  <th className="px-4 py-3.5 font-black text-[11px] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3.5 font-black text-[11px] uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/80">
                {isLoading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-gray-400 font-bold">
                      Loading offers...
                    </td>
                  </tr>
                ) : filteredOffers.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-gray-500 font-medium">
                      No assigned packages found.
                    </td>
                  </tr>
                ) : (
                  filteredOffers.map((offer) => {
                    const washBal = Math.max(0, (offer.totalWashes || 0) - (offer.completedWashes || 0));
                    const freeBal = Math.max(0, (offer.freeWashes || 0) - (offer.freeWashesUsed || 0));

                    return (
                      <tr key={offer.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-gray-900">{offer.offerNo}</td>
                        <td className="px-4 py-3 text-gray-500 font-medium">{formatDate(offer.date)}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900">{offer.customer?.name}</div>
                          <div className="text-[11px] text-gray-500">{offer.customer?.phone}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-800 leading-tight">{offer.packageName}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">Valid till: {formatDate(offer.validityDate)}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">{fmt(offer.price)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-800 font-bold border border-blue-200 text-xs">
                            {washBal} / {offer.totalWashes || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-900 font-bold border border-amber-200 text-xs">
                            {freeBal} / {offer.freeWashes || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              offer.status === 'active' || !offer.status
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {offer.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={`/offers/${offer.id}`}
                              className="w-7 h-7 inline-flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-black hover:text-[#F6CB59] transition-all shadow-xs"
                              title="View Offer Pass"
                            >
                              <Eye size={13} />
                            </Link>
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(offer.id)}
                                className="w-7 h-7 inline-flex items-center justify-center rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-xs"
                                title="Delete Assigned Offer"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
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
