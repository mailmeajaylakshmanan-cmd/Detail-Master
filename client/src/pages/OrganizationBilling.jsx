import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText, IndianRupee, TrendingUp, AlertCircle, Car } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { startOfMonth, endOfMonth, subMonths, format, parseISO } from 'date-fns';
import api from '../api/axios.js';
import { useOrganizations } from '../hooks/useQueries.js';
import { queryKeys } from '../api/queryKeys.js';
import { formatDate } from '../utils/dateFormatter.js';

function fmt(n) { return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const RANGE_PRESETS = {
  thisMonth: () => ({ from: startOfMonth(new Date()), to: new Date() }),
  lastMonth: () => {
    const last = subMonths(new Date(), 1);
    return { from: startOfMonth(last), to: endOfMonth(last) };
  },
};

const STATUS_LABEL = {
  draft: 'Draft', open: 'Open', pending: 'Pending', completed: 'Paid', cancelled: 'Cancelled',
};

function SummaryCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{label}</div>
        <div className="text-xl font-black text-gray-900 mt-0.5">{value}</div>
      </div>
    </div>
  );
}

export default function OrganizationBilling() {
  const { id } = useParams();
  const { data: organizations = [] } = useOrganizations();
  const organization = organizations.find(o => String(o.id) === id);

  const [preset, setPreset] = useState('thisMonth');
  const [customFrom, setCustomFrom] = useState(null);
  const [customTo, setCustomTo] = useState(null);

  const range = useMemo(() => {
    if (preset === 'custom') return { from: customFrom, to: customTo };
    return RANGE_PRESETS[preset]();
  }, [preset, customFrom, customTo]);

  const rangeKey = `${range.from ? range.from.toISOString().slice(0, 10) : ''}_${range.to ? range.to.toISOString().slice(0, 10) : ''}`;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.organizations.billing(id, rangeKey),
    enabled: !!id && !!range.from && !!range.to,
    queryFn: async () => {
      const res = await api.get(`/organizations/${id}/invoices`, {
        params: { from: range.from.toISOString(), to: new Date(range.to.getTime() + 24 * 60 * 60 * 1000).toISOString() },
      });
      return res.data;
    },
  });

  const invoices = data?.invoices || [];
  const summary = data?.summary || { invoiceCount: 0, totalRevenue: 0, totalProfit: 0, totalOutstanding: 0 };

  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/master-organization" className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1">
          <ArrowLeft size={16} /> Organizations
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{organization?.name || 'Organization'} — Billing</h1>
      </div>

      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center bg-gray-100 p-1 rounded-lg">
          <button type="button" onClick={() => setPreset('thisMonth')} className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-colors ${preset === 'thisMonth' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>This Month</button>
          <button type="button" onClick={() => setPreset('lastMonth')} className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-colors ${preset === 'lastMonth' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Last Month</button>
          <button type="button" onClick={() => setPreset('custom')} className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-colors ${preset === 'custom' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Custom Range</button>
        </div>
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <DatePicker
              selected={customFrom}
              onChange={setCustomFrom}
              selectsStart
              startDate={customFrom}
              endDate={customTo}
              dateFormat="dd/MM/yyyy"
              placeholderText="From"
              className="input py-2 px-3 text-[13px]"
              portalId="root"
            />
            <span className="text-gray-400 text-[12px]">to</span>
            <DatePicker
              selected={customTo}
              onChange={setCustomTo}
              selectsEnd
              startDate={customFrom}
              endDate={customTo}
              minDate={customFrom}
              dateFormat="dd/MM/yyyy"
              placeholderText="To"
              className="input py-2 px-3 text-[13px]"
              portalId="root"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={FileText} label="Invoices" value={summary.invoiceCount} tone="bg-gray-100 text-gray-700" />
        <SummaryCard icon={IndianRupee} label="Total Revenue" value={`₹${fmt(summary.totalRevenue)}`} tone="bg-blue-50 text-blue-600" />
        <SummaryCard icon={TrendingUp} label="Total Profit" value={`₹${fmt(summary.totalProfit)}`} tone="bg-emerald-50 text-emerald-600" />
        <SummaryCard icon={AlertCircle} label="Outstanding" value={`₹${fmt(summary.totalOutstanding)}`} tone="bg-rose-50 text-rose-600" />
      </div>

      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <th className="px-5 py-3">Invoice</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Vehicle / Visitor</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Revenue</th>
              <th className="px-5 py-3 text-right">Profit</th>
              <th className="px-5 py-3 text-right">Balance Due</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7" className="px-5 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan="7" className="px-5 py-8 text-center text-gray-400">No invoices in this range.</td></tr>
            ) : invoices.map(inv => (
              <tr key={inv.id} className="border-t border-gray-100 hover:bg-gray-50/60">
                <td className="px-5 py-3">
                  <Link to={`/invoices/${inv.id}`} className="font-bold text-gray-900 hover:underline">{inv.invoice_number}</Link>
                </td>
                <td className="px-5 py-3 text-gray-600">{formatDate ? formatDate(inv.created_at) : format(parseISO(inv.created_at), 'dd MMM yyyy')}</td>
                <td className="px-5 py-3">
                  {(inv.vehicles || []).map((v, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-gray-700">
                      <Car size={12} className="text-gray-400" />
                      <span>{v.makeModel}{v.licenseVin ? ` — ${v.licenseVin}` : ''}</span>
                      {v.visitorName && <span className="text-gray-400">({v.visitorName})</span>}
                    </div>
                  ))}
                </td>
                <td className="px-5 py-3">
                  <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-[11px] font-bold uppercase">{STATUS_LABEL[inv.status] || inv.status}</span>
                </td>
                <td className="px-5 py-3 text-right font-medium text-gray-900">₹{fmt(inv.revenue)}</td>
                <td className="px-5 py-3 text-right font-medium text-emerald-700">₹{fmt(inv.profit)}</td>
                <td className="px-5 py-3 text-right font-medium text-rose-700">₹{fmt(inv.balance_due)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
