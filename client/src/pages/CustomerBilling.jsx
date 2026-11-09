import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, FileText, IndianRupee, TrendingUp, AlertCircle,
  Car, MessageCircle, Printer, Download, Copy, Share2,
  Calendar, Check, Search, Eye, Layers, RefreshCw
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import api from '../api/axios.js';
import { queryKeys } from '../api/queryKeys.js';
import { formatDate, parseSafeDate } from '../utils/dateFormatter.js';
import { downloadElementPDF, generatePDFBlob } from '../utils/pdfGenerator.js';
import BillingShareModal from '../components/BillingShareModal.jsx';
import BrandedBillingStatementDocument from '../components/BrandedBillingStatementDocument.jsx';
import toast from 'react-hot-toast';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const RANGE_PRESETS = {
  all: () => ({ from: null, to: null, label: 'All Time' }),
  thisMonth: () => ({ from: startOfMonth(new Date()), to: new Date(), label: 'This Month' }),
  lastMonth: () => {
    const last = subMonths(new Date(), 1);
    return { from: startOfMonth(last), to: endOfMonth(last), label: 'Last Month' };
  },
  thisYear: () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const startYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
    const fyStart = new Date(startYear, 3, 1);
    return { from: fyStart, to: now, label: `FY ${startYear}-${(startYear + 1).toString().slice(-2)}` };
  },
};

const STATUS_STYLE = {
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Paid' },
  open: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Open' },
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Pending' },
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', label: 'Draft' },
  cancelled: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Cancelled' },
};

export default function CustomerBilling() {
  const { phone } = useParams();

  const [preset, setPreset] = useState('all');
  const [customFrom, setCustomFrom] = useState(null);
  const [customTo, setCustomTo] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'document'

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pdfBlob, setPdfBlob] = useState(null);

  const range = useMemo(() => {
    if (preset === 'custom') {
      const label = customFrom && customTo
        ? `${format(customFrom, 'dd MMM yyyy')} - ${format(customTo, 'dd MMM yyyy')}`
        : 'Custom Range';
      return { from: customFrom, to: customTo, label };
    }
    return RANGE_PRESETS[preset] ? RANGE_PRESETS[preset]() : RANGE_PRESETS.all();
  }, [preset, customFrom, customTo]);

  const rangeKey = `${range.from ? range.from.toISOString().slice(0, 10) : 'all'}_${range.to ? range.to.toISOString().slice(0, 10) : 'all'}`;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.clients.billing(phone, rangeKey),
    enabled: !!phone,
    queryFn: async () => {
      const params = {};
      if (range.from) params.from = range.from.toISOString();
      if (range.to) {
        const toEnd = new Date(range.to.getTime() + 24 * 60 * 60 * 1000);
        params.to = toEnd.toISOString();
      }
      const res = await api.get(`/clients/${encodeURIComponent(phone)}/invoices`, { params });
      return res.data;
    },
  });

  const client = data?.client || {};
  const invoices = data?.invoices || [];
  const summary = data?.summary || {
    invoiceCount: 0,
    totalBilled: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    totalVehicles: 0,
  };

  const customerName = client.name || client.full_name || 'Customer';

  const filteredInvoices = useMemo(() => {
    let list = invoices;
    if (statusFilter !== 'all') {
      list = list.filter(inv => {
        if (statusFilter === 'paid') return (Number(inv.balance_due) || 0) <= 0;
        if (statusFilter === 'pending') return (Number(inv.balance_due) || 0) > 0;
        return inv.status === statusFilter;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(inv =>
        String(inv.invoice_number || '').toLowerCase().includes(q) ||
        (inv.vehicles || []).some(v =>
          String(v.makeModel || '').toLowerCase().includes(q) ||
          String(v.licenseVin || '').toLowerCase().includes(q)
        ) ||
        (inv.services || []).some(s => String(s).toLowerCase().includes(q))
      );
    }
    return list;
  }, [invoices, statusFilter, search]);

  async function handleDownloadPDF() {
    setDownloading(true);
    try {
      const filename = `Detailing-Masters-Statement-${customerName.replace(/[^a-zA-Z0-9]/g, '_')}-${format(new Date(), 'yyyyMMdd')}.pdf`;

      // 1. First attempt: Server-Side High-Fidelity Puppeteer Chrome PDF (Identical to Print!)
      try {
        const params = { periodLabel: range.label };
        if (range.from) params.from = range.from.toISOString();
        if (range.to) params.to = new Date(range.to.getTime() + 24 * 60 * 60 * 1000).toISOString();

        const res = await api.get(`/clients/${encodeURIComponent(phone)}/statement-pdf`, { params });
        if (res.data?.base64) {
          const byteCharacters = atob(res.data.base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
          toast.success('Vector statement PDF downloaded neatly!');
          return;
        }
      } catch (srvErr) {
        console.warn('[PDF] Server PDF generation fallback to client-side:', srvErr?.message);
      }

      // 2. Client-side fallback with SVG vector chevrons
      await downloadElementPDF('statement-print', filename);
      toast.success('Statement PDF downloaded neatly!');
    } catch (err) {
      console.error('PDF error:', err);
      toast.error('Could not generate PDF');
    } finally {
      setDownloading(false);
    }
  }

  async function handleOpenShare() {
    setShareModalOpen(true);
    try {
      const params = { periodLabel: range.label };
      if (range.from) params.from = range.from.toISOString();
      if (range.to) params.to = new Date(range.to.getTime() + 24 * 60 * 60 * 1000).toISOString();

      try {
        const res = await api.get(`/clients/${encodeURIComponent(phone)}/statement-pdf`, { params });
        if (res.data?.base64) {
          const byteCharacters = atob(res.data.base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          setPdfBlob(new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' }));
          return;
        }
      } catch (e) {}

      const blob = await generatePDFBlob('statement-print', 'statement.pdf');
      setPdfBlob(blob);
    } catch (e) {}
  }

  function handlePrint() {
    window.print();
  }

  async function handleCopySummary() {
    const isCleared = (Number(summary.totalOutstanding) || 0) <= 0;
    const text = `✨ DETAILING MASTERS | BILLING STATEMENT ✨\n` +
      `Customer: ${customerName} (${phone})\n` +
      `Period: ${range.label}\n` +
      `Total Invoices: ${summary.invoiceCount}\n` +
      `Total Billed: ₹${fmt(summary.totalBilled)}\n` +
      `Total Paid: ₹${fmt(summary.totalPaid)}\n` +
      `Balance Due: ₹${fmt(summary.totalOutstanding)} ${isCleared ? '(Fully Cleared ✅)' : '(Pending ⚠️)'}\n` +
      `Detailing Masters Studio • +91 9111977721`;

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Summary copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  }

  return (
    <div className="p-3 sm:p-4 lg:p-8 max-w-[1400px] mx-auto space-y-4 sm:space-y-6 animate-fade-in">
      {/* ── Screen-Only Interactive Controls ── */}
      <div className="print:hidden space-y-4 sm:space-y-6">
        {/* Top Breadcrumb & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Link
              to={`/master-customer/${phone}`}
              className="text-gray-500 hover:text-gray-700 text-xs sm:text-sm flex items-center gap-1 font-semibold"
            >
              <ArrowLeft size={14} /> Customer Profile
            </Link>
            <span className="text-gray-300">/</span>
            <h1 className="text-base sm:text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>{customerName}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200 uppercase">
                Overall Billing
              </span>
            </h1>
          </div>

          {/* Global Share & Action Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Layers size={13} /> Dashboard
              </button>
              <button
                type="button"
                onClick={() => setViewMode('document')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'document' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Eye size={13} /> A4 Statement
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopySummary}
              className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-xs shadow-xs transition-colors"
              title="Copy Text Summary"
            >
              <Copy size={15} />
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-xs shadow-xs transition-colors"
              title="Print Statement (A4)"
            >
              <Printer size={15} />
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl font-bold text-xs shadow-xs transition-all disabled:opacity-50"
            >
              <Download size={14} />
              <span className="hidden sm:inline">{downloading ? 'Downloading...' : 'PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenShare}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-black text-xs shadow-md transition-all active:scale-[0.98]"
            >
              <MessageCircle size={15} />
              <span>Share Statement</span>
            </button>
          </div>
        </div>

        {/* Date Range Selector Card */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center bg-gray-100 p-1 rounded-xl flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setPreset('all')}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-lg transition-colors ${
                preset === 'all' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setPreset('thisMonth')}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-lg transition-colors ${
                preset === 'thisMonth' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setPreset('lastMonth')}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-lg transition-colors ${
                preset === 'lastMonth' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => setPreset('thisYear')}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-lg transition-colors ${
                preset === 'thisYear' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              This FY
            </button>
            <button
              type="button"
              onClick={() => setPreset('custom')}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-lg transition-colors ${
                preset === 'custom' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Custom Range
            </button>
          </div>

          {preset === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <DatePicker
                selected={customFrom}
                onChange={setCustomFrom}
                selectsStart
                startDate={customFrom}
                endDate={customTo}
                dateFormat="dd/MM/yyyy"
                placeholderText="From"
                className="input py-1.5 px-3 text-[12px] rounded-lg border-gray-200"
                portalId="root"
              />
              <span className="text-gray-400 text-xs font-bold">to</span>
              <DatePicker
                selected={customTo}
                onChange={setCustomTo}
                selectsEnd
                startDate={customFrom}
                endDate={customTo}
                minDate={customFrom}
                dateFormat="dd/MM/yyyy"
                placeholderText="To"
                className="input py-1.5 px-3 text-[12px] rounded-lg border-gray-200"
                portalId="root"
              />
            </div>
          )}

          <div className="text-xs text-gray-500 font-semibold flex items-center gap-1.5">
            <Calendar size={13} className="text-gray-400" />
            <span>Showing: <strong className="text-gray-800">{range.label}</strong></span>
          </div>
        </div>

        {/* Error banner if failed */}
        {isError && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-rose-800">
            <div className="flex items-center gap-2 text-xs font-bold">
              <AlertCircle size={16} className="text-rose-600" />
              Failed to load billing records. Please check your database connection.
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xs border border-gray-200 p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
              <FileText size={18} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Invoices</div>
              <div className="text-lg font-black text-gray-900 mt-0.5">{summary.invoiceCount}</div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xs border border-gray-200 p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Car size={18} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vehicles</div>
              <div className="text-lg font-black text-gray-900 mt-0.5">{summary.totalVehicles || 0}</div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xs border border-gray-200 p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <IndianRupee size={18} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Billed</div>
              <div className="text-lg font-black text-gray-900 mt-0.5">₹{fmt(summary.totalBilled)}</div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xs border border-gray-200 p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp size={18} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Paid</div>
              <div className="text-lg font-black text-emerald-600 mt-0.5">₹{fmt(summary.totalPaid)}</div>
            </div>
          </div>

          <div className={`col-span-2 lg:col-span-1 bg-white/90 backdrop-blur-md rounded-2xl shadow-xs border p-4 flex items-center gap-3.5 ${
            (Number(summary.totalOutstanding) || 0) > 0 ? 'border-rose-200 bg-rose-50/20' : 'border-emerald-200 bg-emerald-50/20'
          }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              (Number(summary.totalOutstanding) || 0) > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
            }`}>
              <AlertCircle size={18} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Balance Due</div>
              <div className={`text-lg font-black mt-0.5 ${
                (Number(summary.totalOutstanding) || 0) > 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}>
                ₹{fmt(summary.totalOutstanding)}
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Table View (Screen Only) */}
        {viewMode === 'table' && (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 overflow-hidden space-y-3 p-4">
            {/* Table Filters Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by invoice, vehicle, service..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-8 py-2 text-xs w-full bg-gray-50 focus:bg-white rounded-xl border-gray-200"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {['all', 'paid', 'pending'].map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all shrink-0 ${
                      statusFilter === st
                        ? 'bg-black text-[#F6CB59] shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-y border-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Services</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Billed</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center text-gray-400 font-medium">
                        Loading invoices...
                      </td>
                    </tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center text-gray-400">
                        No invoices found for this period.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const isFullyPaid = (Number(inv.balance_due) || 0) <= 0;

                      return (
                        <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <Link
                              to={`/invoices/${inv.id}`}
                              className="font-bold text-gray-900 hover:text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <span>{inv.invoice_number}</span>
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {formatDate ? formatDate(inv.created_at) : format(parseSafeDate(inv.created_at), 'dd MMM yyyy')}
                          </td>
                          <td className="px-4 py-3">
                            {(inv.vehicles || []).length > 0 ? (
                              inv.vehicles.map((v, i) => (
                                <div key={i} className="flex items-center gap-1 text-gray-800 font-medium">
                                  <Car size={12} className="text-gray-400 shrink-0" />
                                  <span>{v.makeModel}</span>
                                  {v.licenseVin && <span className="text-gray-400">({v.licenseVin})</span>}
                                </div>
                              ))
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {(inv.services || []).length > 0 ? (
                                inv.services.map((svc, i) => (
                                  <span
                                    key={i}
                                    className="inline-block px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-semibold"
                                  >
                                    {svc}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                isFullyPaid
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {isFullyPaid ? 'Paid' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                            ₹{fmt(inv.grand_total)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-emerald-600 whitespace-nowrap">
                            ₹{fmt(inv.amount_paid)}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${
                            (Number(inv.balance_due) || 0) > 0 ? 'text-rose-600' : 'text-gray-400'
                          }`}>
                            ₹{fmt(inv.balance_due)}
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

      {/* ── Document Preview Mode (Screen-only when document mode active) ── */}
      {viewMode === 'document' && (
        <div className="print:hidden bg-gray-100/90 p-3 sm:p-6 rounded-2xl flex justify-center overflow-x-auto shadow-inner border border-gray-200">
          <BrandedBillingStatementDocument
            customerName={customerName}
            phone={client.phone || phone}
            address={client.address || ''}
            email={client.email || ''}
            periodLabel={range.label}
            summary={summary}
            invoices={invoices}
          />
        </div>
      )}

      {/* ── Pristine Isolated Container for Print & PDF Generation ── */}
      {/* Visible ONLY during print (window.print()) OR captured by PDF generator */}
      <div className={viewMode === 'document' ? 'hidden print:block' : 'hidden print:block'}>
        <BrandedBillingStatementDocument
          customerName={customerName}
          phone={client.phone || phone}
          address={client.address || ''}
          email={client.email || ''}
          periodLabel={range.label}
          summary={summary}
          invoices={invoices}
        />
      </div>

      {/* Offscreen element for html2pdf when in table mode */}
      {viewMode === 'table' && (
        <div style={{ position: 'fixed', left: '-99999px', top: '0', width: '794px', pointerEvents: 'none', zIndex: -999 }}>
          <BrandedBillingStatementDocument
            customerName={customerName}
            phone={client.phone || phone}
            address={client.address || ''}
            email={client.email || ''}
            periodLabel={range.label}
            summary={summary}
            invoices={invoices}
          />
        </div>
      )}

      {/* WhatsApp & PDF Share Modal */}
      {shareModalOpen && (
        <BillingShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          customerName={customerName}
          phone={client.phone || phone}
          periodLabel={range.label}
          summary={summary}
          invoices={invoices}
          isOrganization={false}
          onDownloadPDF={handleDownloadPDF}
          pdfBlob={pdfBlob}
        />
      )}
    </div>
  );
}
