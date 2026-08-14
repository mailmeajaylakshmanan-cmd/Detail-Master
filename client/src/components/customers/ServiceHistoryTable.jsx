import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, FileText, ArrowUpDown, ArrowUp, ArrowDown, Gift, Plus, ClipboardList } from 'lucide-react';
import { parseSafeDate, formatDate } from '../../utils/dateFormatter.js';
import { PaymentStatusBadge } from './Badge.jsx';
import Pagination from './Pagination.jsx';

const PAGE_SIZE = 6;

const COLUMNS = [
  { key: 'date', label: 'Date', sortable: true },
  { key: 'invoiceNo', label: 'Invoice', sortable: false },
  { key: 'vehicle', label: 'Vehicle', sortable: false },
  { key: 'service', label: 'Service', sortable: false },
  { key: 'total', label: 'Amount', sortable: true },
  { key: 'status', label: 'Payment', sortable: false },
  { key: 'view', label: '', sortable: false },
];

function SortIcon({ active, direction }) {
  if (!active) return <ArrowUpDown size={11} className="text-gray-300" />;
  return direction === 'asc'
    ? <ArrowUp size={11} className="text-blue-600" />
    : <ArrowDown size={11} className="text-blue-600" />;
}

export default function ServiceHistoryTable({ history, customerPhone, isVIP }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [search, statusFilter, history.length]);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'date' ? 'desc' : 'asc');
    }
  }

  const enriched = useMemo(() => {
    return history.map(inv => ({
      ...inv,
      _service: inv.services?.[0]?.service || 'Detailing Service',
      _vehicle: inv.vehicleName || [inv.carMake, inv.carModel].filter(Boolean).join(' ') || 'Unknown',
      _invoiceNo: inv.invoiceNo || inv.invoice_number || inv.id,
    }));
  }, [history]);

  const filtered = useMemo(() => {
    let rows = enriched;
    if (statusFilter !== 'all') {
      rows = rows.filter(inv => {
        const currentStatus = inv.displayStatus || inv.status;
        return statusFilter === 'paid' ? currentStatus === 'paid' : currentStatus !== 'paid';
      });
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(inv =>
        inv._service.toLowerCase().includes(q) ||
        inv._vehicle.toLowerCase().includes(q) ||
        String(inv._invoiceNo).toLowerCase().includes(q)
      );
    }
    return rows;
  }, [enriched, search, statusFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let av = sortKey === 'date' ? parseSafeDate(a.date).getTime() : a.total || 0;
      let bv = sortKey === 'date' ? parseSafeDate(b.date).getTime() : b.total || 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex-1 flex flex-col min-h-[340px]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 px-1">
        <h3 className="text-[14px] font-bold text-gray-900 uppercase tracking-wide flex items-center shrink-0">
          Service History
          <span className="text-gray-400 ml-1.5 normal-case tracking-normal text-sm font-semibold">
            ({sorted.length})
          </span>
        </h3>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search history..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-8 py-1.5 text-[12px] w-full lg:w-48 bg-white border-gray-200 shadow-sm rounded-full"
            />
          </div>
          <div className="flex bg-white shadow-sm border border-gray-200 rounded-full p-0.5 shrink-0">
            {['all', 'paid', 'pending'].map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`text-[10px] font-bold capitalize px-3 py-1.5 rounded-full transition-all ${statusFilter === f
                  ? 'bg-[#F0F4F8] text-[#1E293B]'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {f}
              </button>
            ))}
          </div>
          {isVIP && (
            <Link
              to={`/offers/new?phone=${customerPhone}`}
              className="text-[10px] font-black text-gray-900 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600
                flex items-center gap-1 uppercase tracking-wider px-3 py-1.5 rounded-full shadow-sm transition-all shrink-0"
            >
              <Gift size={11} /> Offer
            </Link>
          )}

        </div>
      </div>

      <div className="flex-1 bg-white rounded-[20px] shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-[720px]">
            <thead className="sticky top-0 z-10 bg-[#F8FAFC]">
              <tr>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && toggleSort(col.key)}
                    className={`text-left px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 ${col.sortable ? 'cursor-pointer select-none hover:text-gray-800' : ''
                      }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {col.label}
                      {col.sortable && <SortIcon active={sortKey === col.key} direction={sortDir} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((inv, idx) => (
                <tr
                  key={inv.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-5 py-4 text-[12px] font-semibold text-[#1E293B] whitespace-nowrap tabular-nums">
                    {formatDate(inv.date)}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F0F4F8] text-[#B45309]">
                      {inv._invoiceNo}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[12px] font-medium text-[#475569] truncate max-w-[140px]">{inv._vehicle}</td>
                  <td className="px-5 py-4 text-[12px] font-bold text-[#1E293B] truncate max-w-[160px]">{inv._service}</td>
                  <td className="px-5 py-4 text-[12px] font-black text-[#1E293B] tabular-nums whitespace-nowrap">
                    ₹{inv.total?.toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-4">
                    <PaymentStatusBadge status={inv.displayStatus || inv.status} />
                  </td>
                  <td className="px-5 py-4 text-right flex justify-end gap-2 items-center">
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="inline-flex items-center justify-center gap-1 text-[10px] font-bold text-[#475569]
                      bg-white px-3 py-1.5 rounded-md border border-gray-200 shadow-sm
                      hover:bg-gray-50 transition-colors whitespace-nowrap"
                    >
                      <FileText size={12} /> View
                    </Link>
                    <Link
                      to={`/invoices/${inv.id}/service-report`}
                      className="inline-flex items-center justify-center gap-1 text-[10px] font-bold text-white
                      bg-purple-600 px-3 py-1.5 rounded-md border border-purple-600 shadow-sm
                      hover:bg-purple-700 transition-colors whitespace-nowrap hover:text-white"
                    >
                      <ClipboardList size={12} /> Report
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-300">
              <ClipboardList size={40} className="mb-4 opacity-30 text-gray-400" />
              <p className="text-[12px] font-semibold text-gray-500">No further history found for this customer.</p>
            </div>
          )}
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} totalItems={sorted.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </div>
  );
}
