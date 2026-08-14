import { useMemo, useState, useRef, useEffect } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, MoreVertical, Eye, Edit3, Search, Phone, Car, Calendar } from 'lucide-react';
import { formatDate } from '../../utils/dateFormatter.js';
import CustomerAvatar from './CustomerAvatar.jsx';
import { VipBadge, OfferBadge } from './Badge.jsx';
import Pagination from './Pagination.jsx';

const PAGE_SIZE = 8;

const COLUMNS = [
  { key: 'name', label: 'Customer', sortable: true },
  { key: 'phone', label: 'Phone', sortable: false },
  { key: 'vehicles', label: 'Vehicles', sortable: false },
  { key: 'lastVisit', label: 'Last Visit', sortable: true },
  { key: 'totalSpend', label: 'Total Spent', sortable: true },
  { key: 'actions', label: '', sortable: false },
];

function SortIcon({ active, direction }) {
  if (!active) return <ArrowUpDown size={11} className="text-gray-300" />;
  return direction === 'asc'
    ? <ArrowUp size={11} className="text-gray-700" />
    : <ArrowDown size={11} className="text-gray-700" />;
}



export default function CustomerTable({ rows, selectedId, onSelect, onEdit }) {
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => setPage(1), [rows.length]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === 'lastVisit') {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
      }
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex-1 flex flex-col lg:overflow-hidden bg-transparent lg:bg-white/60 lg:backdrop-blur-xl lg:rounded-[24px] lg:shadow-[0_8px_32px_rgba(0,0,0,0.04)] lg:border lg:border-white/50">
      <div className="flex-1 lg:overflow-y-auto lg:custom-scrollbar">
        <div className="hidden lg:block">
          <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-white/40 backdrop-blur-md">
            <tr>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && toggleSort(col.key)}
                  className={`text-left px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-[#475569] ${col.sortable ? 'cursor-pointer select-none hover:text-gray-900' : ''
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
            {pageRows.map((row, idx) => {
              const isSelected = selectedId === row.phone;
              return (
                <tr
                  key={row.id}
                  onClick={() => onSelect(row.phone)}
                  className={`cursor-pointer transition-colors border-b border-gray-100/50 ${isSelected
                    ? 'bg-[#F6CB59]/10'
                    : 'hover:bg-white/60'
                    }`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      {/* Using inline styles for pastel backgrounds based on index or ID to simulate the screenshot */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-black shrink-0"
                        style={{
                          backgroundColor: idx % 3 === 0 ? '#FEF9C3' : idx % 3 === 1 ? '#E0E7FF' : '#FFE4E6',
                          color: idx % 3 === 0 ? '#854D0E' : idx % 3 === 1 ? '#3730A3' : '#9F1239'
                        }}
                      >
                        {String(row.name).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[13px] text-gray-900 truncate leading-tight">{row.name}</span>
                          {row.isVIP && <VipBadge />}
                        </div>
                        <div className="text-[10px] font-semibold text-gray-400 mt-0.5 tracking-wider uppercase">
                          ID: {row.customId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[12px] font-semibold text-[#475569]">
                      +91 {String(row.phone).replace('+91', '').trim()}
                    </div>

                    <div className="text-[10px] text-gray-500 mt-1">
                      {row.address || "No address"}
                    </div>
                  </td>
                  <td className="px-5 py-4 min-w-[140px]">
                    <div className="flex flex-col gap-2">
                      {row.vehicles && row.vehicles.length > 0 ? (
                        row.vehicles.map((v, i) => (
                          <div key={i} className="flex flex-col">
                            <div className="text-[12px] font-bold text-[#1E293B] leading-tight">
                              {v.make} {v.model}
                            </div>
                            <div className="text-[10px] font-medium text-gray-500 mt-0.5 uppercase tracking-wider">
                              {v.plate || 'NO PLATE'}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-[12px] font-bold text-gray-400">No vehicles listed</div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[12px] font-semibold text-[#475569] tabular-nums whitespace-nowrap">
                    {row.lastVisit ? formatDate(row.lastVisit) : 'Never'}
                  </td>
                  <td className="px-5 py-4 text-[13px] font-black text-[#1E293B] tabular-nums">
                    ₹{row.totalSpend.toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-4 text-right relative">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === row.id ? null : row.id); }}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === row.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-8 top-10 z-20 w-40 rounded-xl border border-gray-100 bg-white shadow-xl py-1 text-left"
                      >
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onSelect(row.phone); setOpenMenuId(null); }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Eye size={14} /> View Profile
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onEdit(row.raw); setOpenMenuId(null); }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Edit3 size={14} /> Edit Customer
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="block lg:hidden flex flex-col gap-5 py-2">
          {pageRows.map((row, idx) => {
            return (
              <div key={row.id} className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[24px] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.06)] flex flex-col gap-4 relative cursor-pointer active:scale-[0.98] transition-all" onClick={() => onSelect(row.phone)}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-black shrink-0 shadow-sm border border-white/50"
                      style={{
                        backgroundColor: idx % 3 === 0 ? '#FEF9C3' : idx % 3 === 1 ? '#E0E7FF' : '#FFE4E6',
                        color: idx % 3 === 0 ? '#854D0E' : idx % 3 === 1 ? '#3730A3' : '#9F1239'
                      }}
                    >
                      {String(row.name).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-[16px] text-gray-900 truncate tracking-tight">{row.name}</span>
                        {row.isVIP && <VipBadge />}
                      </div>
                      <div className="text-[11px] font-bold text-gray-500 mt-0.5 tracking-wider uppercase">
                        ID: {row.customId}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onSelect(row.phone); }}
                      className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white shadow-md active:scale-95 transition-transform"
                    >
                      <Eye size={15} strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEdit(row.raw); }}
                      className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white shadow-md active:scale-95 transition-transform"
                    >
                      <Edit3 size={15} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 bg-white/50 p-4 rounded-2xl border border-white/60 mt-1 shadow-sm">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-gray-800 min-w-0">
                    <Phone size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate">+91 {String(row.phone).replace('+91', '').trim()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] font-bold text-gray-800 justify-end">
                    <span className="text-[15px] font-black text-gray-900">₹{row.totalSpend.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-start gap-2 text-[13px] font-bold text-gray-800 col-span-2 pt-3 mt-1 border-t border-gray-200/50">
                    <Car size={14} className="text-gray-400 shrink-0 mt-0.5" />
                    <span className="truncate whitespace-normal leading-tight">
                      {row.vehicles && row.vehicles.length > 0 ? (
                        row.vehicles.map(v => `${v.make} ${v.model}`).join(', ')
                      ) : (
                        <span className="text-gray-400">No vehicles</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] font-bold text-gray-800 col-span-2 pt-3 border-t border-gray-200/50">
                    <Calendar size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate text-gray-600">Last visit: {row.lastVisit ? formatDate(row.lastVisit) : 'Never'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Search size={36} className="mb-3 opacity-40" />
            <p className="text-sm font-bold text-gray-500">No customers found</p>
            <p className="text-xs mt-1">Try a different search term or filter.</p>
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} totalItems={sorted.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </div>
  );
}
