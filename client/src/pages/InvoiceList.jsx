import React, { useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Eye, Pencil, ClipboardList, Car, Calendar, User, XCircle, Trash2, Download } from 'lucide-react';
import { useInvoices } from '../hooks/useQueries.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { parseSafeDate } from '../utils/dateFormatter.js';
import { usePermissions } from '../hooks/usePermissions.js';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { useQueryClient, useMutation } from '@tanstack/react-query';

function fmt(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = parseSafeDate(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TABS = [
  { id: 'All', label: 'All Invoices' },
  { id: 'draft', label: 'Draft' },
  { id: 'completed', label: 'Paid' },
  { id: 'open', label: 'Due' },
];

const PAGE_SIZE = 15;

export default function InvoiceList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);
  const queryClient = useQueryClient();
  const { canAdd, canEdit, canDelete } = usePermissions('Invoicing & Records');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, invoice: null, loading: false });

  const dropMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/invoices/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Invoice cancelled/deleted successfully');
      setDeleteModal({ isOpen: false, invoice: null, loading: false });
      queryClient.invalidateQueries(['invoices']);
      refetch();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel invoice');
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  });

  const { data, isLoading: loading, isFetching, isError, error, refetch } = useInvoices({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    status: status === 'All' ? '' : status,
  });

  const handleExportCSV = () => {
    if (!invoices || invoices.length === 0) {
      toast.error('No invoices to export');
      return;
    }
    const headers = ['Invoice Number', 'Date', 'Customer', 'Vehicle Make/Model', 'Vehicle Plate', 'Subtotal (INR)', 'Discount (INR)', 'Grand Total (INR)', 'Amount Paid (INR)', 'Balance Due (INR)', 'Status'];
    const rows = invoices.map(inv => [
      inv.invoice_number || `INV-${inv.id}`,
      formatDate(inv.created_at),
      `"${(inv.customer_name || 'Valued Customer').replace(/"/g, '""')}"`,
      `"${(inv.vehicle_name || '').replace(/"/g, '""')}"`,
      inv.license_vin || '',
      inv.sub_total || 0,
      inv.discount || 0,
      inv.grand_total || 0,
      inv.amount_paid || 0,
      inv.balance_due || 0,
      inv.status || 'open'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Detailing_Masters_Invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Invoices exported successfully!');
  };

  const invoices = data?.invoices || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };
  const totalResults = pagination.total || 0;

  function badgeStatus(inv) {
    const s = (inv.displayStatus || inv.status || 'draft').toLowerCase();
    if (s === 'completed' || s === 'paid') return 'Paid';
    if (s === 'overdue') return 'Overdue';
    if (s === 'open' || s === 'due') return 'Due';
    if (s === 'cancelled') return 'Cancelled';
    return 'Draft';
  }

  function vehicleLine(inv) {
    const name = inv.vehicleName || '';
    const plate = inv.licenseVin || '';
    if (name && plate) return `${name} · ${plate}`;
    return name || plate || '—';
  }
  
  const getBadgeStyle = (status) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-100 text-emerald-700';
      case 'Due':
        return 'bg-orange-100 text-orange-600';
      case 'Overdue':
        return 'bg-rose-100 text-rose-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="space-y-4 w-full min-w-0 pb-16 bg-transparent">
      <div className="bg-white/60 backdrop-blur-2xl rounded-2xl sm:rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-white/80 p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-black text-[#F6CB59] flex items-center justify-center shadow-md shrink-0">
            <ClipboardList className="w-4 h-4 sm:w-6 sm:h-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base sm:text-xl md:text-[22px] font-black text-gray-900 tracking-tight leading-none mb-1">
              Invoices
            </h1>
            <p className="text-[10px] sm:text-[12px] font-bold text-gray-500 tracking-wide uppercase">
              Manage and track billing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all font-bold text-[11px] sm:text-[12px] shadow-xs whitespace-nowrap"
          >
            <Download size={13} strokeWidth={2.5} className="text-slate-500" /> Export CSV
          </button>
          <Link
            to="/invoices/new"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-black text-[#F6CB59] hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-[11px] sm:text-[12px] shadow-md whitespace-nowrap"
          >
            <Plus size={13} strokeWidth={2.5} /> Create Invoice
          </Link>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex overflow-x-auto hide-scrollbar w-full sm:w-auto gap-2">
          {TABS.map((tab) => {
            const isActive = status === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setStatus(tab.id); setPage(1); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${
                  isActive 
                    ? 'border-gray-900 text-gray-900' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                    {totalResults}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 border-b border-slate-100 sm:border-none pb-2 sm:pb-0">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs">
            <ArrowUpDown size={14} className="text-slate-400" />
            Sort
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs">
            <Filter size={14} className="text-slate-400" />
            Filter
          </button>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        {/* Toolbar */}
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-center gap-3 border-b border-slate-200">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search invoice"
              className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F6CB59]/30 focus:border-[#F6CB59] transition-all text-slate-800 placeholder:text-slate-400 shadow-sm backdrop-blur-md font-medium"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="text-xs sm:text-sm text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-700">{totalResults === 0 ? 0 : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalResults)}`}</span> of <span className="font-bold text-slate-700">{totalResults}</span> results
          </div>
        </div>

        {/* Error handling */}
        {isError && (
          <div className="m-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
            <span>{error?.response?.data?.message || error?.message || 'Failed to load invoices'}</span>
            <button type="button" onClick={() => refetch()} className="font-semibold underline">Retry</button>
          </div>
        )}

        {/* Table - Desktop Only */}
        <div className="hidden lg:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-slate-500">
                <th className="px-3.5 sm:px-5 py-3 w-10"><input type="checkbox" className="rounded border-slate-300 text-gray-900 focus:ring-gray-900 w-4 h-4 cursor-pointer" /></th>
                <th className="px-3.5 sm:px-5 py-3 text-xs sm:text-sm font-bold"><div className="flex items-center gap-1 cursor-pointer hover:text-slate-800">Invoice <ArrowUpDown size={13} className="opacity-50" /></div></th>
                <th className="px-3.5 sm:px-5 py-3 text-xs sm:text-sm font-bold">Client/Customer</th>
                <th className="px-3.5 sm:px-5 py-3 text-xs sm:text-sm font-bold"><div className="flex items-center gap-1 cursor-pointer hover:text-slate-800">Amount <ArrowUpDown size={13} className="opacity-50" /></div></th>
                <th className="px-3.5 sm:px-5 py-3 text-xs sm:text-sm font-bold"><div className="flex items-center gap-1 cursor-pointer hover:text-slate-800">Due Date <ArrowUpDown size={13} className="opacity-50" /></div></th>
                <th className="px-3.5 sm:px-5 py-3 text-xs sm:text-sm font-bold"><div className="flex items-center gap-1 cursor-pointer hover:text-slate-800">Status <ArrowUpDown size={13} className="opacity-50" /></div></th>
                <th className="px-3.5 sm:px-5 py-3 text-xs sm:text-sm font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(loading || isFetching) && (
                <tr><td colSpan="9" className="text-center py-12 text-slate-500 text-sm font-medium">Loading invoices…</td></tr>
              )}
              {!loading && !isFetching && invoices.length === 0 && (
                <tr><td colSpan="9" className="text-center py-12 text-slate-500 text-sm font-medium">No invoices found.</td></tr>
              )}
              {!loading && invoices.map(inv => {
                const badge = badgeStatus(inv);
                const total = inv.total || 0;
                const balance = inv.balance || 0;
                const paid = total - balance;
                
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors group bg-white">
                    <td className="px-5 py-4">
                      <input type="checkbox" className="rounded border-slate-300 text-gray-900 focus:ring-gray-900 w-4 h-4 cursor-pointer" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 text-[15px]">{inv.invoiceNo || '—'}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Created on: {formatDate(inv.date)}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800 text-[15px]">{inv.organization_name || inv.client_name || inv.customer?.name || '—'}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                         <span className="opacity-70">👤</span> {vehicleLine(inv)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-[15px] font-bold text-slate-900">{fmt(total)}</div>
                      <div className="text-xs mt-1 font-medium flex items-center gap-1.5">
                        <span className="text-emerald-600">Paid: {fmt(paid)}</span>
                        <span className="text-slate-300">•</span>
                        <span className={balance > 0 ? 'text-rose-600' : 'text-slate-500'}>Due: {fmt(balance)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[15px] font-semibold text-slate-900">
                       {inv.status?.toLowerCase() === 'recurring' ? 'Recurring' : formatDate(inv.date)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getBadgeStyle(badge)}`}>
                        {badge}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => navigate(`/invoices/${inv.id}`)} title="View Invoice" className="p-1.5 text-gray-900 bg-gray-100 hover:bg-[#F6CB59] hover:text-gray-900 rounded-lg transition-colors inline-flex">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => navigate(`/invoices/${inv.id}/service-report`)} title="Service Report" className="p-1.5 text-slate-700 bg-slate-100 hover:bg-yellow-100 hover:text-yellow-800 rounded-lg transition-colors inline-flex">
                          <ClipboardList size={18} />
                        </button>
                        {canEdit && (
                          <button onClick={() => navigate(`/invoices/${inv.id}/edit`)} title="Edit Invoice" className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 hover:text-amber-700 rounded-lg transition-colors inline-flex">
                            <Pencil size={18} />
                          </button>
                        )}
                        {canDelete && inv.status !== 'cancelled' && (
                          <button
                            onClick={() => {
                              setDeleteModal({ isOpen: true, invoice: inv, loading: false });
                            }}
                            title="Cancel / Void Invoice"
                            className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-colors inline-flex"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="block lg:hidden flex flex-col gap-4 p-4 bg-transparent border-t border-white/30">
          {(loading || isFetching) && (
            <div className="text-center py-12 text-slate-500 text-sm font-medium">Loading invoices…</div>
          )}
          {!loading && !isFetching && invoices.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm font-medium">No invoices found.</div>
          )}
          {!loading && invoices.map(inv => {
            const badge = badgeStatus(inv);
            const total = inv.total || 0;
            const balance = inv.balance || 0;
            
            return (
              <div key={inv.id} className="bg-white/80 backdrop-blur-md border border-white/60 rounded-[20px] p-5 shadow-[0_2px_15px_rgba(0,0,0,0.03)] flex flex-col gap-4 relative active:scale-[0.98] transition-transform cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                 <div className="flex justify-between items-start">
                   <div>
                     <h3 className="font-bold text-slate-900 text-[16px] tracking-tight">{inv.organization_name || inv.client_name || inv.customer?.name || '—'}</h3>
                     <p className="text-xs text-slate-500 font-medium mt-1">{inv.invoiceNo || '—'}</p>
                   </div>
                   <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getBadgeStyle(badge)} shadow-sm`}>
                     {badge}
                   </span>
                 </div>
                 <div className="grid grid-cols-2 gap-3 bg-white/50 p-3.5 rounded-xl border border-white/60 shadow-sm backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-[13px] font-medium text-slate-700">
                      <Calendar size={14} className="text-slate-400 shrink-0" /> 
                      {inv.status?.toLowerCase() === 'recurring' ? 'Recurring' : formatDate(inv.date)}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-[15px] font-bold text-slate-900">
                      {fmt(total)}
                    </div>
                    <div className="flex items-center gap-2 text-[13px] font-medium text-slate-700 col-span-2 mt-1 pt-2.5 border-t border-slate-200/50">
                      <Car size={14} className="text-slate-400 shrink-0" /> 
                      <span className="truncate">{vehicleLine(inv)}</span>
                    </div>
                 </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 flex items-center justify-center sm:justify-end border-t border-white/40 bg-white/30 backdrop-blur-md">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 text-slate-400 hover:text-slate-700 disabled:opacity-50 rounded-lg"
            >
              <ChevronLeft size={18} />
            </button>
            
            {Array.from({ length: Math.min(5, pagination.totalPages || 1) }, (_, i) => {
               const p = i + 1;
               return (
                 <button
                   key={p}
                   onClick={() => setPage(p)}
                   className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${
                     page === p
                       ? 'bg-gray-900 text-[#F6CB59]'
                       : 'text-slate-600 hover:bg-slate-100'
                   }`}
                 >
                   {p}
                 </button>
               );
            })}
            
            {(pagination.totalPages || 1) > 5 && (
              <>
                <span className="px-2 text-slate-400">...</span>
                <button
                  onClick={() => setPage(pagination.totalPages)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${
                     page === pagination.totalPages
                       ? 'bg-slate-100 text-slate-900 border border-slate-200'
                       : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                   }`}
                >
                  {pagination.totalPages}
                </button>
              </>
            )}

            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages || 1, p + 1))}
              disabled={page >= (pagination.totalPages || 1)}
              className="p-2 text-slate-400 hover:text-slate-700 disabled:opacity-50 rounded-lg"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, invoice: null, loading: false })}
        onConfirm={() => {
          if (deleteModal.invoice) {
            setDeleteModal(prev => ({ ...prev, loading: true }));
            dropMutation.mutate(deleteModal.invoice.id);
          }
        }}
        loading={deleteModal.loading}
        title="Cancel / Void Invoice"
        itemName={deleteModal.invoice?.invoiceNo || deleteModal.invoice?.invoice_number || `INV-${deleteModal.invoice?.id}`}
        message="Are you sure you want to cancel this invoice? If draft, it will be deleted permanently. If active, it will be marked as cancelled and any redeemed package washes will be restored."
        confirmText="Yes, Cancel Invoice"
        confirmVariant="danger"
      />
    </div>
  );
}
