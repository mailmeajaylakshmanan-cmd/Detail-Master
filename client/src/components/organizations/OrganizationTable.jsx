import { useMemo, useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpDown, ArrowUp, ArrowDown, MoreVertical, Edit3, Search, Receipt, Phone, User, Car, Trash2 } from 'lucide-react';
import { formatDate } from '../../utils/dateFormatter.js';
import Pagination from '../customers/Pagination.jsx';

const PAGE_SIZE = 8;

const COLUMNS = [
  { key: 'org_name', label: 'Organization', sortable: true },
  { key: 'contact_person', label: 'Contact', sortable: false },
  { key: 'phone', label: 'Phone', sortable: false },
  { key: 'vehicles', label: 'Vehicles', sortable: false },
  { key: 'actions', label: '', sortable: false },
];

function SortIcon({ active, direction }) {
  if (!active) return <ArrowUpDown size={11} className="text-gray-300" />;
  return direction === 'asc'
    ? <ArrowUp size={11} className="text-gray-700" />
    : <ArrowDown size={11} className="text-gray-700" />;
}

export default function OrganizationTable({ rows, onEdit, onDelete, canDelete }) {
  const [sortKey, setSortKey] = useState('org_name');
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
      <div className="flex-1 lg:overflow-y-auto lg:custom-scrollbar min-h-[280px]">
        <div className="hidden lg:block">
          <table className="w-full border-collapse">
          <thead className="sticky top-0 z-20 bg-white/80 backdrop-blur-md">
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
              const isNearBottom = (pageRows.length > 2 && idx >= pageRows.length - 2) || (pageRows.length <= 2 && idx === pageRows.length - 1 && pageRows.length > 1);
              const isMenuOpen = openMenuId === row.id;

              return (
                <tr
                  key={row.id}
                  className={`transition-colors border-b border-gray-100/50 hover:bg-white/60 ${
                    isMenuOpen ? 'relative z-40 bg-white/80 shadow-xs' : 'relative z-10'
                  }`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[13px] font-black shrink-0 shadow-xs"
                        style={{
                          backgroundColor: idx % 3 === 0 ? '#FEF9C3' : idx % 3 === 1 ? '#E0E7FF' : '#FFE4E6',
                          color: idx % 3 === 0 ? '#854D0E' : idx % 3 === 1 ? '#3730A3' : '#9F1239'
                        }}
                      >
                        {String(row.org_name || 'O').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[13px] text-gray-900 truncate leading-tight">{row.org_name}</span>
                        </div>
                        <div className="text-[10px] font-semibold text-gray-400 mt-0.5 tracking-wider uppercase">
                          ID: #{row.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[12px] font-semibold text-[#475569]">
                      {row.contact_person || 'N/A'}
                    </div>
                    {row.email && (
                      <div className="text-[10px] text-gray-500 mt-1">
                        {row.email}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[12px] font-semibold text-[#475569]">
                      {row.phone ? `+91 ${String(row.phone).replace('+91', '').trim()}` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1 max-w-[150px] truncate">
                      {row.address || "No address"}
                    </div>
                  </td>
                  <td className="px-5 py-4 min-w-[140px]">
                    <div className="flex flex-col gap-2">
                      {row.vehicles && row.vehicles.filter(v => v.isActive !== false).length > 0 ? (
                        row.vehicles.filter(v => v.isActive !== false).slice(0, 3).map((v, i) => (
                          <div key={v.id || i} className="flex flex-col">
                            <div className="text-[12px] font-bold text-[#1E293B] leading-tight">
                              {v.make} {v.model}
                            </div>
                            <div className="text-[10px] font-medium text-gray-500 mt-0.5 uppercase tracking-wider">
                              {v.plate || 'NO PLATE'}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-[12px] font-bold text-gray-400">No vehicles</div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right relative">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : row.id); }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        isMenuOpen ? 'bg-black text-[#F6CB59] shadow-xs' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                      }`}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {isMenuOpen && (
                      <div
                        ref={menuRef}
                        className={`absolute right-6 z-50 w-44 rounded-2xl border border-gray-200/80 bg-white/95 backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.12)] py-1.5 text-left animate-scale-up ${
                          isNearBottom ? 'bottom-10 origin-bottom-right' : 'top-10 origin-top-right'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onEdit(row.raw); setOpenMenuId(null); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-bold text-gray-700 hover:bg-gray-50 hover:text-gray-950 transition-colors"
                        >
                          <Edit3 size={14} className="text-gray-500" /> Edit
                        </button>
                        <Link
                          to={`/master-organization/${row.id}/billing`}
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-bold text-gray-700 hover:bg-gray-50 hover:text-gray-950 transition-colors"
                        >
                          <Receipt size={14} className="text-gray-500" /> View Billing
                        </Link>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onDelete(row.id); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>

        {/* ── Mobile B2B Corporate Storytelling Cards ── */}
        <div className="block lg:hidden flex flex-col gap-3.5 py-2">
          {pageRows.map((row, idx) => {
            const activeVehicles = row.vehicles && row.vehicles.filter(v => v.isActive !== false);

            return (
              <div
                key={row.id}
                className="bg-white/85 backdrop-blur-2xl border border-white/90 rounded-3xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.09)] flex flex-col gap-3 relative cursor-pointer active:scale-[0.99] transition-all overflow-hidden group"
              >
                {/* Gold Top Highlight */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F6CB59] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Line 1: Avatar, Org Name, and Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-2xl bg-black text-[#F6CB59] flex items-center justify-center text-[15px] font-black shrink-0 shadow-md border border-gray-800 group-hover:scale-105 transition-transform">
                      {String(row.org_name || 'O').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-[15px] sm:text-[16px] text-gray-900 truncate tracking-tight">
                        {row.org_name}
                      </h3>
                      <div className="text-[10px] font-bold text-gray-400 mt-0.5 tracking-wider uppercase">
                        Org ID #{row.id}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onEdit(row.raw)}
                      className="w-8 h-8 rounded-xl bg-white text-gray-700 border border-gray-200 shadow-xs flex items-center justify-center hover:bg-black hover:text-[#F6CB59] transition-all"
                      title="Edit Organization"
                    >
                      <Edit3 size={13} strokeWidth={2.5} />
                    </button>
                    <Link
                      to={`/master-organization/${row.id}/billing`}
                      className="w-8 h-8 rounded-xl bg-black text-[#F6CB59] shadow-xs flex items-center justify-center hover:scale-105 transition-transform"
                      title="Organization Billing & Invoices"
                    >
                      <Receipt size={13} strokeWidth={2.5} />
                    </Link>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(row.id)}
                        className="w-8 h-8 rounded-xl bg-white text-rose-600 border border-rose-200 shadow-xs flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all"
                        title="Delete Organization"
                      >
                        <Trash2 size={13} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Line 2: Corporate Fleet Story Strip */}
                <div className="bg-gray-50/90 p-2.5 rounded-2xl border border-gray-200/60">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider mb-1.5">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Car size={11} className="text-amber-600" />
                      <span>Corporate Fleet</span>
                    </span>
                    <span className="text-amber-900 font-bold bg-[#F6CB59]/30 px-2 py-0.5 rounded-md">
                      {activeVehicles?.length || 0} Fleet Vehicles
                    </span>
                  </div>
                  {activeVehicles && activeVehicles.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {activeVehicles.slice(0, 4).map((v, vIdx) => (
                        <span key={vIdx} className="bg-white px-2 py-1 rounded-xl text-[11px] font-bold text-gray-800 border border-gray-200 shadow-xs flex items-center gap-1 max-w-full min-w-0">
                          <span className="truncate">{v.make} {v.model}</span>
                          {v.plate && <span className="text-[10px] font-mono text-gray-400 shrink-0">({v.plate})</span>}
                        </span>
                      ))}
                      {activeVehicles.length > 4 && (
                        <span className="bg-gray-200/70 text-gray-600 text-[10px] font-bold px-2 py-1 rounded-xl shrink-0">
                          +{activeVehicles.length - 4} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No fleet vehicles registered</span>
                  )}
                </div>

                {/* Line 3: Contact Person & Phone */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                  <div className="flex items-center gap-1 text-gray-700 font-bold">
                    <User size={12} className="text-gray-400" />
                    <span>{row.contact_person || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-700 font-bold">
                    <Phone size={12} className="text-gray-400" />
                    <span>{row.phone ? `+91 ${String(row.phone).replace('+91', '').trim()}` : 'N/A'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Search size={36} className="mb-3 opacity-40" />
            <p className="text-sm font-bold text-gray-500">No organizations found</p>
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} totalItems={sorted.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </div>
  );
}
