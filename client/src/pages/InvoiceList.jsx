import React, { useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Eye, Pencil, ClipboardList } from 'lucide-react';
import { useInvoices } from '../hooks/useQueries.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { parseSafeDate } from '../utils/dateFormatter.js';

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = parseSafeDate(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TABS = [
  { id: 'All', label: 'All Invoices', count: 157 },
  { id: 'draft', label: 'Draft', count: 5 },
  { id: 'completed', label: 'Paid', count: 120 },
  { id: 'open', label: 'Due', count: 17 },
];

const PAGE_SIZE = 15;

export default function InvoiceList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading: loading, isFetching, isError, error, refetch } = useInvoices({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    status: status === 'All' ? '' : status,
  });

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
    <div className="space-y-6 pb-20 p-2 sm:p-6 lg:p-8 bg-transparent min-h-full">
      <header className="flex flex-row justify-between items-center pb-2 border-b border-slate-100">
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <Link
          to="/invoices/new"
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-lg font-medium transition-colors"
        >
          <span>Create Invoice</span>
        </Link>
      </header>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex overflow-x-auto hide-scrollbar w-full sm:w-auto gap-2">
          {TABS.map((tab) => {
            const isActive = status === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setStatus(tab.id); setPage(1); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  isActive 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 border-b border-slate-100 sm:border-none pb-3 sm:pb-0">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
            <ArrowUpDown size={16} className="text-slate-400" />
            Sort
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
            <Filter size={16} className="text-slate-400" />
            Filter
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-200">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search invoice"
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Showing <select className="bg-transparent font-semibold text-slate-700 cursor-pointer focus:outline-none" value={PAGE_SIZE} readOnly><option>{PAGE_SIZE}</option></select> of {totalResults} results
          </div>
        </div>

        {/* Error handling */}
        {isError && (
          <div className="m-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
            <span>{error?.response?.data?.message || error?.message || 'Failed to load invoices'}</span>
            <button type="button" onClick={() => refetch()} className="font-semibold underline">Retry</button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-slate-500">
                <th className="px-5 py-3 w-12"><input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" /></th>
                <th className="px-5 py-3 text-sm font-medium"><div className="flex items-center gap-1 cursor-pointer hover:text-slate-800">Invoice <ArrowUpDown size={14} className="opacity-50" /></div></th>
                <th className="px-5 py-3 text-sm font-medium">Client/Customer</th>
                <th className="px-5 py-3 text-sm font-medium"><div className="flex items-center gap-1 cursor-pointer hover:text-slate-800">Amount <ArrowUpDown size={14} className="opacity-50" /></div></th>
                <th className="px-5 py-3 text-sm font-medium"><div className="flex items-center gap-1 cursor-pointer hover:text-slate-800">Due Date <ArrowUpDown size={14} className="opacity-50" /></div></th>
                <th className="px-5 py-3 text-sm font-medium"><div className="flex items-center gap-1 cursor-pointer hover:text-slate-800">Status <ArrowUpDown size={14} className="opacity-50" /></div></th>
                <th className="px-5 py-3 text-sm font-medium text-center">Action</th>
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
                      <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
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
                        <button onClick={() => navigate(`/invoices/${inv.id}`)} title="View Invoice" className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors inline-flex">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => navigate(`/invoices/${inv.id}/service-report`)} title="Service Report" className="p-1.5 text-slate-700 bg-slate-100 hover:bg-yellow-100 hover:text-yellow-800 rounded-lg transition-colors inline-flex">
                          <ClipboardList size={18} />
                        </button>
                        <button onClick={() => navigate(`/invoices/${inv.id}/edit`)} title="Edit Invoice" className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 hover:text-amber-700 rounded-lg transition-colors inline-flex">
                          <Pencil size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 flex items-center justify-center sm:justify-end border-t border-slate-200 bg-white">
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
                       ? 'bg-slate-100 text-slate-900 border border-slate-200'
                       : 'text-slate-600 hover:bg-slate-50 border border-transparent'
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
    </div>
  );
}
