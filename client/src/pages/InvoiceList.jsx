import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Eye, Edit3, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useInvoices } from '../hooks/useQueries.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { parseSafeDate } from '../utils/dateFormatter.js';

function fmt(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = parseSafeDate(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_STYLES = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  partial: 'bg-amber-50 text-amber-700 border-amber-100',
  open: 'bg-blue-50 text-blue-700 border-blue-100',
  pending: 'bg-slate-100 text-slate-600 border-slate-200',
  draft: 'bg-slate-50 text-slate-500 border-slate-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-100',
};

const PAGE_SIZE = 20;

export default function InvoiceList() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [selectedPaymentInvoiceId, setSelectedPaymentInvoiceId] = useState(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading: loading, isFetching, isError, error, refetch } = useInvoices({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    status: status === 'All' ? '' : status,
  });

  const invoices = data?.invoices || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const stats = useMemo(() => ({
    totalRevenue: invoices.reduce((s, i) => s + (i.total || 0), 0),
    balanceDue: invoices.reduce((s, i) => s + (i.balance || 0), 0),
    pageCount: invoices.length,
    total: pagination.total || 0,
  }), [invoices, pagination.total]);

  const selectedInv = selectedPaymentInvoiceId
    ? invoices.find(i => i.id === selectedPaymentInvoiceId)
    : null;

  function badgeStatus(inv) {
    return inv.displayStatus || inv.status || 'draft';
  }

  function vehicleLine(inv) {
    const name = inv.vehicleName || '';
    const plate = inv.licenseVin || '';
    if (name && plate) return `${name} · ${plate}`;
    return name || plate || '—';
  }

  return (
    <div className="space-y-5 pb-20">
      <header className="flex flex-row justify-between items-center gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Invoice Management</h1>
          <p className="text-[11px] sm:text-sm text-slate-500 mt-0.5">Invoices from Postgres · payments & balance</p>
        </div>
        <Link
          to="/invoices/new"
          className="flex items-center justify-center gap-1.5 sm:gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-orange-200 shrink-0 whitespace-nowrap"
        >
          <Plus size={16} className="w-4 h-4" />
          <span className="hidden sm:inline">New Invoice</span>
          <span className="sm:hidden">New</span>
        </Link>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Page Revenue', value: fmt(stats.totalRevenue) },
          { label: 'Page Balance', value: fmt(stats.balanceDue) },
          { label: 'On This Page', value: String(stats.pageCount) },
          { label: 'Total Invoices', value: String(stats.total) },
        ].map((s, i) => (
          <div key={i} className="bg-white shadow-sm border border-gray-100 rounded-2xl px-4 py-3.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
            <p className="text-lg font-extrabold text-slate-800 mt-0.5 truncate">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search invoice no, client, vehicle…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all text-slate-700"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="All">All Statuses</option>
          <option value="open">Open (unpaid)</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed / Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {isError && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3">
          <span>{error?.response?.data?.message || error?.message || 'Failed to load invoices'}</span>
          <button type="button" onClick={() => refetch()} className="font-semibold underline">Retry</button>
        </div>
      )}

      <div className="hidden md:block bg-white shadow-sm border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-left min-w-[860px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoice</th>
              <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client / Vehicle</th>
              <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
              <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Total</th>
              <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Balance</th>
              <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
              <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(loading || isFetching) && (
              <tr><td colSpan="7" className="text-center py-12 text-slate-400 text-sm">Loading invoices…</td></tr>
            )}
            {!loading && !isFetching && invoices.length === 0 && (
              <tr><td colSpan="7" className="text-center py-12 text-slate-400 text-sm">No invoices found</td></tr>
            )}
            {!loading && invoices.map(inv => {
              const badge = badgeStatus(inv);
              return (
                <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-orange-500 text-sm">{inv.invoiceNo || '—'}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-800 text-sm leading-tight">{inv.organization_name || inv.client_name || inv.customer?.name || '—'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{vehicleLine(inv)}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{formatDate(inv.date)}</td>
                  <td className="px-5 py-3.5 text-sm text-right font-semibold text-slate-800">{fmt(inv.total)}</td>
                  <td className={`px-5 py-3.5 text-sm text-right font-semibold ${inv.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {fmt(inv.balance)}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_STYLES[badge] || STATUS_STYLES.pending}`}>
                        {badge}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentInvoiceId(inv.id)}
                        className="p-1 text-slate-300 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors"
                        title="Payment overview"
                      >
                        <Eye size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                      <Link to={`/invoices/${inv.id}`} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="View"><Eye size={14}/></Link>
                      <Link to={`/invoices/${inv.id}/edit`} className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg" title="Edit"><Edit3 size={14}/></Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-2">
        {(loading || isFetching) && <div className="text-center py-10 text-slate-400 text-sm">Loading invoices…</div>}
        {!loading && !isFetching && invoices.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-sm">No invoices found</div>
        )}
        {!loading && invoices.map(inv => {
          const badge = badgeStatus(inv);
          return (
            <div key={inv.id} className="bg-white shadow-sm border border-slate-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-orange-500 text-sm">{inv.invoiceNo || '—'}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_STYLES[badge] || STATUS_STYLES.pending}`}>
                  {badge}
                </span>
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-[15px] leading-tight">{inv.organization_name || inv.client_name || inv.customer?.name || '—'}</p>
                <p className="text-xs text-slate-400 mt-0.5">{vehicleLine(inv)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(inv.date)}</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">{fmt(inv.total)}</span>
                <span className={`font-semibold ${inv.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>Due {fmt(inv.balance)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <button type="button" onClick={() => setSelectedPaymentInvoiceId(inv.id)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-500 transition-colors">
                  <Eye size={13}/> Payment details
                </button>
                <div className="flex gap-1">
                  <Link to={`/invoices/${inv.id}`} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Eye size={15}/></Link>
                  <Link to={`/invoices/${inv.id}/edit`} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg"><Edit3 size={15}/></Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 disabled:opacity-40"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <span className="text-sm text-slate-500 font-medium">
            Page {pagination.page} / {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(p => p + 1)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 disabled:opacity-40"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {selectedInv && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800">Payment Overview</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedInv.invoiceNo} · {selectedInv.customer?.name}</p>
              </div>
              <button type="button" onClick={() => setSelectedPaymentInvoiceId(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Grand Total</span>
                <span className="text-base font-extrabold text-slate-800 mt-1 block">{fmt(selectedInv.total)}</span>
              </div>
              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100 text-emerald-700">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 block">Amount Paid</span>
                <span className="text-base font-extrabold mt-1 block">{fmt(selectedInv.amountPaid)}</span>
              </div>
              <div className={`col-span-2 p-3.5 rounded-xl border ${selectedInv.balance > 0 ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 block">Balance Due</span>
                <span className="text-base font-extrabold mt-1 block">{fmt(selectedInv.balance)}</span>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex justify-between gap-2">
              <Link
                to={`/invoices/${selectedInv.id}`}
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                Open invoice
              </Link>
              <button type="button" onClick={() => setSelectedPaymentInvoiceId(null)} className="hover:bg-slate-100 text-slate-700 font-semibold px-4 py-2 rounded-lg border border-slate-200 text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
