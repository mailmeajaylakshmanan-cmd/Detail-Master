import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, ArrowLeft, Gift, Trash2 } from 'lucide-react';
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
  const queryClient = useQueryClient();
  const { can_delete } = usePermissions('Offers');

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['assignedOffers'],
    queryFn: async () => {
      const res = await api.get('/offers');
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  const filteredOffers = useMemo(() => {
    if (!search.trim()) return offers;
    const lower = search.toLowerCase();
    return offers.filter(o => 
      (o.offerNo && o.offerNo.toLowerCase().includes(lower)) ||
      (o.customer?.name && o.customer.name.toLowerCase().includes(lower)) ||
      (o.customer?.phone && o.customer.phone.includes(lower)) ||
      (o.packageName && o.packageName.toLowerCase().includes(lower)) ||
      (o.licensePlate && o.licensePlate.toLowerCase().includes(lower))
    );
  }, [offers, search]);
  
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
    <div className="space-y-5 pb-20 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link to="/master-offers" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-900 shadow-sm transition-colors shrink-0">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Gift size={20} className="text-blue-600" /> Manage Assigned Packages
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Track and manage packages assigned to customers.</p>
          </div>
        </div>
        
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="input pl-9 h-10 w-full bg-white shadow-sm"
            placeholder="Search packages, customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-[13px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-500">
                <th className="px-3 py-3 font-semibold w-24">Offer No</th>
                <th className="px-3 py-3 font-semibold">Date</th>
                <th className="px-3 py-3 font-semibold">Customer</th>
                <th className="px-3 py-3 font-semibold">Package Name</th>
                <th className="px-3 py-3 font-semibold text-right">Price</th>
                <th className="px-3 py-3 font-semibold text-center">Washes (Bal/Total)</th>
                <th className="px-3 py-3 font-semibold text-center">Free (Bal/Total)</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold text-right w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/70">
              {isLoading ? (
                <tr><td colSpan="9" className="text-center py-8 text-gray-400">Loading offers...</td></tr>
              ) : filteredOffers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12">
                    <p className="text-gray-500 font-medium">No assigned packages found.</p>
                  </td>
                </tr>
              ) : (
                filteredOffers.map((offer) => {
                  const washBal = Math.max(0, (offer.totalWashes || 0) - (offer.completedWashes || 0));
                  const freeBal = Math.max(0, (offer.freeWashes || 0) - (offer.freeWashesUsed || 0));
                  
                  return (
                    <tr key={offer.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-3 py-3 font-bold text-gray-900">{offer.offerNo}</td>
                      <td className="px-3 py-3 text-gray-500">{formatDate(offer.date)}</td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-gray-900">{offer.customer?.name}</div>
                        <div className="text-[11px] text-gray-500">{offer.customer?.phone}</div>
                      </td>
                      <td className="px-3 py-3 whitespace-normal break-words max-w-[180px]">
                        <div className="font-semibold text-gray-700 leading-tight">{offer.packageName}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">Valid till: {formatDate(offer.validityDate)}</div>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-gray-900">{fmt(offer.price)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-100">
                          {washBal} <span className="text-blue-400 font-normal">/ {offer.totalWashes || 0}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">
                          {freeBal} <span className="text-emerald-400 font-normal">/ {offer.freeWashes || 0}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          offer.status === 'active' || !offer.status ? 'bg-emerald-100 text-emerald-700' :
                          offer.status === 'expired' ? 'bg-rose-100 text-rose-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {offer.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link 
                            to={`/offers/${offer.id}`} 
                            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-white transition-colors border border-transparent hover:border-blue-100 shadow-sm"
                          >
                            <Eye size={16} />
                          </Link>
                          {can_delete && (
                            <button
                              onClick={() => handleDelete(offer.id)}
                              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-100 shadow-sm"
                            >
                              <Trash2 size={16} />
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
    </div>
  );
}
