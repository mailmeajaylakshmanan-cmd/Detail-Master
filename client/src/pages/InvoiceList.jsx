import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios.js';
import { Plus, Search, Eye, Edit3, FileText, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { parseSafeDate } from '../utils/dateFormatter.js';

function fmt(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  if (typeof dateStr === 'string' && dateStr.includes('&')) {
    return dateStr.split('&').map(s => {
       const d = parseSafeDate(s.trim());
       if (isNaN(d.getTime())) return s.trim();
       return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }).join(' & ');
  }
  const date = parseSafeDate(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr;
  }
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_STYLES = {
  paid:    'bg-emerald-50 text-emerald-700 border-emerald-100',
  partial: 'bg-amber-50 text-amber-700 border-amber-100',
  sent:    'bg-blue-50 text-blue-700 border-blue-100',
  pending: 'bg-slate-100 text-slate-500 border-slate-200',
};

const STAFFING_STYLES = {
  'Fully Staffed':     'bg-emerald-50 text-emerald-700 border-emerald-100',
  'Partially Staffed': 'bg-amber-50 text-amber-700 border-amber-100',
  'Staffing Pending':  'bg-rose-50 text-rose-600 border-rose-100',
};

export default function InvoiceList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState('All');
  const [selectedPaymentInvoiceId, setSelectedPaymentInvoiceId] = useState(null);

  React.useEffect(() => {
    const s = searchParams.get('search');
    if (s !== null && s !== search) setSearch(s);
  }, [searchParams]);

  const { data, isLoading: loading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.get('/invoices', { params: { limit: 10000 } }).then(res => {
      let serverData = res.data.invoices || res.data || [];
      const mockData = [
        { _id: 'inv1', invoiceNo: 'DM-1001', customer: { name: 'John Doe', phone: '+91 9876543210' }, carMake: 'BMW', carModel: 'X5', total: 15000, balance: 5000, status: 'partial', staffingStatus: 'Fully Staffed', date: new Date().toISOString() },
        { _id: 'inv2', invoiceNo: 'DM-1002', customer: { name: 'Jane Smith', phone: '+91 8765432109' }, carMake: 'Audi', carModel: 'Q7', total: 8000, balance: 0, status: 'paid', staffingStatus: 'Staffing Pending', date: new Date(Date.now() - 86400000).toISOString() },
        { _id: 'inv3', invoiceNo: 'DM-1003', customer: { name: 'Raj Kumar', phone: '+91 9111111111' }, carMake: 'Range Rover', carModel: 'Sport', total: 35000, balance: 35000, status: 'pending', staffingStatus: 'Partially Staffed', date: new Date(Date.now() - 172800000).toISOString() }
      ];
      
      let all = [...serverData, ...mockData];
      
      return {
        all,
        stats: {
          totalRevenue: all.reduce((s, i) => s + (i.total || 0), 0),
          balanceDue:   all.reduce((s, i) => s + (i.balance || 0), 0),
          fullyStaffed: all.filter(i => i.staffingStatus === 'Fully Staffed').length,
          staffingPending: all.filter(i => i.staffingStatus !== 'Fully Staffed').length,
        },
      };
    }),
    staleTime: 5 * 60 * 1000,
  });

  const invoices = data?.all || [];
  const stats = data?.stats || {};
  const selectedInv = selectedPaymentInvoiceId ? invoices.find(i => i._id === selectedPaymentInvoiceId) : null;

  const filtered = invoices.filter(inv => {
    if (status === 'Fully Staffed'   && inv.staffingStatus !== 'Fully Staffed') return false;
    if (status === 'Pending Staff'   && inv.staffingStatus === 'Fully Staffed') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        inv.invoiceNo?.toLowerCase().includes(q) ||
        inv.customer?.name?.toLowerCase().includes(q) ||
        inv.event?.toLowerCase().includes(q) ||
        inv.eventCategoryName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5 pb-20">

      {/* ── Header ── */}
      <header className="flex flex-row justify-between items-center gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Invoice Management</h1>
          <p className="text-[11px] sm:text-sm text-slate-500 mt-0.5">Manage bookings and track payments</p>
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

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue',    value: fmt(stats.totalRevenue) },
          { label: 'Balance Due',      value: fmt(stats.balanceDue) },
          { label: 'Fully Staffed',    value: String(stats.fullyStaffed   || 0) },
          { label: 'Staffing Pending', value: String(stats.staffingPending || 0) },
        ].map((s, i) => (
          <div key={i} className="bg-white shadow-sm border border-gray-100 rounded-2xl px-4 py-3.5 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
            <p className="text-lg font-extrabold text-slate-800 mt-0.5 truncate">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search customer, invoice ID…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all text-slate-700"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Fully Staffed">Fully Staffed</option>
          <option value="Pending Staff">Pending Staff</option>
        </select>
      </div>

      {/* ── Desktop Table ── */}
      <div className="hidden md:block bg-white shadow-sm border border-gray-100 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoice</th>
              <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client / Vehicle</th>
              <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
              <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Staffing</th>
              <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Payment</th>
              <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan="6" className="text-center py-12 text-slate-400 text-sm">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan="6" className="text-center py-12 text-slate-400 text-sm">No invoices found</td></tr>
            )}
            {!loading && filtered.map(inv => (
              <tr key={inv._id} className="hover:bg-slate-50/60 transition-colors group">
                <td className="px-5 py-3.5">
                  <span className="font-bold text-orange-500 text-sm">#{inv.invoiceNo || 'DM-XXXX'}</span>
                </td>
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-slate-800 text-sm leading-tight">{inv.customer?.name || 'Walk-in Client'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{inv.carMake ? `${inv.carMake} ${inv.carModel || ''}` : (inv.eventCategoryName || inv.event || 'Vehicle Info Pending')}</p>
                </td>
                <td className="px-5 py-3.5 text-sm text-slate-600">{formatDate(inv.date || inv.eventDate)}</td>
                <td className="px-5 py-3.5 text-center">
                  <button
                    onClick={() => navigate('/dispatcher?search=' + encodeURIComponent(inv.customer?.name || ''))}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border transition-all hover:opacity-80 ${STAFFING_STYLES[inv.staffingStatus] || STAFFING_STYLES['Staffing Pending']}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                    {inv.staffingStatus === 'Staffing Pending' ? 'Pending' : inv.staffingStatus}
                  </button>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_STYLES[inv.status] || STATUS_STYLES.pending}`}>
                      {inv.status}
                    </span>
                    <button
                      onClick={() => setSelectedPaymentInvoiceId(inv._id)}
                      className="p-1 text-slate-300 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors"
                    >
                      <Eye size={12} />
                    </button>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                    <Link to={`/invoices/${inv._id}/report`} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Report"><FileText size={14}/></Link>
                    <Link to={`/invoices/${inv._id}`}        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="View"><Eye size={14}/></Link>
                    <Link to={`/invoices/${inv._id}/edit`}   className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg" title="Edit"><Edit3 size={14}/></Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile Card List ── */}
      <div className="md:hidden space-y-2">
        {loading && <div className="text-center py-10 text-slate-400 text-sm">Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-sm">No invoices found</div>
        )}
        {!loading && filtered.map(inv => (
          <div key={inv._id} className="bg-white shadow-sm border border-gray-100 rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            {/* Top row: invoice no + status badges */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-orange-500 text-sm">#{inv.invoiceNo || '—'}</span>
              <div className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_STYLES[inv.status] || STATUS_STYLES.pending}`}>
                  {inv.status}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STAFFING_STYLES[inv.staffingStatus] || STAFFING_STYLES['Staffing Pending']}`}>
                  {inv.staffingStatus === 'Staffing Pending' ? 'Pending Staff' : inv.staffingStatus}
                </span>
              </div>
            </div>

            {/* Client + Event */}
            <div>
              <p className="font-semibold text-slate-800 text-[15px] leading-tight">{inv.customer?.name || 'Walk-in Client'}</p>
              <p className="text-xs text-slate-400 mt-0.5">{inv.carMake ? `${inv.carMake} ${inv.carModel || ''}` : (inv.eventCategoryName || inv.event || 'Vehicle Info Pending')} · {formatDate(inv.date || inv.eventDate)}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <button
                onClick={() => setSelectedPaymentInvoiceId(inv._id)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-500 transition-colors"
              >
                <Eye size={13}/> Payment details
              </button>
              <div className="flex gap-1">
                <Link to={`/invoices/${inv._id}/report`} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><FileText size={15}/></Link>
                <Link to={`/invoices/${inv._id}`}        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Eye size={15}/></Link>
                <Link to={`/invoices/${inv._id}/edit`}   className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg"><Edit3 size={15}/></Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Payment Modal ── */}
      {selectedInv && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white shadow-sm border border-gray-100 rounded-2xl w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800">Payment Overview</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedInv.invoiceNo} · {selectedInv.customer?.name}</p>
              </div>
              <button onClick={() => setSelectedPaymentInvoiceId(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Amount</span>
                  <span className="text-base font-extrabold text-slate-800 mt-1 block">{fmt(selectedInv.total)}</span>
                </div>
                <div className={`p-3.5 rounded-xl border ${selectedInv.balance > 0 ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 block">Balance Due</span>
                  <span className="text-base font-extrabold mt-1 block">{fmt(selectedInv.balance)}</span>
                </div>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-sm">
                {[
                  { label: 'Subtotal',             value: fmt(selectedInv.subTotal) },
                  { label: 'Discount',             value: '-' + fmt(selectedInv.discount) },
                  ...((selectedInv.payments || []).map(p => ({
                    label: p.type || 'Payment',
                    value: fmt(p.amount),
                    sub: `${p.date ? (typeof p.date === 'string' ? p.date.substring(0,10) : new Date(p.date).toISOString().substring(0,10)) : '—'} · ${p.method || 'Cash'}`
                  }))),
                  ...(!(selectedInv.payments && selectedInv.payments.length > 0) ? [
                    { label: '1st Advance',          value: fmt(selectedInv.advancePaid),  sub: selectedInv.advancePaid  > 0 ? `${selectedInv.advancePaymentDate || '—'}  · ${selectedInv.advancePaymentMethod || 'Cash'}` : null },
                    { label: '2nd Advance',          value: fmt(selectedInv.advancePaid2), sub: selectedInv.advancePaid2 > 0 ? `${selectedInv.advancePaymentDate2 || '—'} · ${selectedInv.advancePaymentMethod2 || 'Cash'}` : null },
                    { label: '3rd Advance',          value: fmt(selectedInv.advancePaid3), sub: selectedInv.advancePaid3 > 0 ? `${selectedInv.advancePaymentDate3 || '—'} · ${selectedInv.advancePaymentMethod3 || 'Cash'}` : null },
                    { label: 'Final Settlement',     value: fmt(selectedInv.totalPaid),    sub: selectedInv.totalPaid    > 0 ? `${selectedInv.totalPaymentDate || '—'} · ${selectedInv.totalPaymentMethod || 'Cash'}` : null },
                  ] : [])
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-start p-3 bg-slate-50/30">
                    <div>
                      <span className="text-slate-500 text-xs">{row.label}</span>
                      {row.sub && <p className="text-[10px] text-slate-400 mt-0.5">{row.sub}</p>}
                    </div>
                    <span className="font-semibold text-slate-800 text-xs">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedPaymentInvoiceId(null)}
                className="bg-white shadow-sm border border-gray-100 rounded-2xl hover:bg-slate-100 text-slate-700 font-semibold px-4 py-2 rounded-lg border border-slate-200 text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
