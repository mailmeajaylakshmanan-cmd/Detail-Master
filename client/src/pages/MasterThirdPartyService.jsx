import { useState, useMemo } from 'react';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { Plus, X, Search, Truck, Edit3, Trash2, Users, Wrench, Coins, Layers, ChevronRight, Sparkles } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useThirdPartyServices } from '../hooks/useQueries.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { usePermissions } from '../hooks/usePermissions.js';
import { queryKeys } from '../api/queryKeys.js';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';

const emptyForm = { name: '', vendorName: '', labourCount: '1', labourCharge: '', sellingPrice: '' };

export default function MasterThirdPartyService() {
  const queryClient = useQueryClient();
  const { data: items = [], isLoading: loading } = useThirdPartyServices();
  const { canAdd, canEdit, canDelete } = usePermissions('Third-Party Services');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, itemId: null, itemName: '', loading: false });

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 250);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const filteredItems = useMemo(() => {
    if (!debouncedSearch.trim()) return items;
    const q = debouncedSearch.toLowerCase();
    return items.filter(
      (item) =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.vendorName || '').toLowerCase().includes(q)
    );
  }, [items, debouncedSearch]);

  const vendorMetrics = useMemo(() => {
    const total = items.length;
    const activeCount = items.filter(i => i.isActive).length;
    const uniqueVendors = new Set(items.map(i => i.vendorName?.trim()).filter(Boolean));
    const totals = items.map(item => (Number(item.sellingPrice || 0)) + ((Number(item.labourCount) || 1) * Number(item.labourCharge || 0)));
    const avgPrice = totals.length > 0 ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0;
    return {
      total,
      activeCount,
      vendorCount: uniqueVendors.size,
      avgPrice
    };
  }, [items]);

  function setField(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSaving) return;
    if (!form.name.trim()) return toast.error('Service name is required');

    const payload = {
      service_name: form.name.trim(),
      vendor_name: form.vendorName.trim() || null,
      labour_count: Number(form.labourCount) || 1,
      labour_charge: Number(form.labourCharge) || 0,
      selling_price: Number(form.sellingPrice) || 0,
      is_active: true,
    };

    setIsSaving(true);
    try {
      if (editId) {
        const existing = items.find((t) => t.id === editId);
        await api.put('/third_party_services/' + editId, {
          ...payload,
          is_active: existing ? existing.isActive : true,
        });
        toast.success('Third-party service updated');
      } else {
        await api.post('/third_party_services', payload);
        toast.success('Third-party service added');
      }
      handleCancelEdit();
      queryClient.invalidateQueries({ queryKey: queryKeys.thirdPartyServices.all });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving third-party service');
    } finally {
      setIsSaving(false);
    }
  }

  function handleDelete(id) {
    const item = items.find(t => t.id === id);
    setDeleteModal({
      isOpen: true,
      itemId: id,
      itemName: item?.name || 'Third-Party Service',
      loading: false
    });
  }

  async function confirmDeleteService() {
    if (!deleteModal.itemId) return;
    setDeleteModal(prev => ({ ...prev, loading: true }));
    try {
      await api.delete('/third_party_services/' + deleteModal.itemId);
      toast.success('Third-party service archived/deleted successfully');
      setDeleteModal({ isOpen: false, itemId: null, itemName: '', loading: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.thirdPartyServices.all });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting service');
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  }

  function handleAdd() {
    setEditId(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  }

  function handleEdit(item) {
    setEditId(item.id);
    setForm({
      name: item.name || '',
      vendorName: item.vendorName || '',
      labourCount: String(item.labourCount ?? 1),
      labourCharge: String(item.labourCharge ?? ''),
      sellingPrice: String(item.sellingPrice ?? ''),
    });
    setIsModalOpen(true);
  }

  function handleCancelEdit() {
    setEditId(null);
    setForm(emptyForm);
    setIsModalOpen(false);
  }

  async function handleStatusChange(id, makeActive) {
    const existing = items.find(t => t.id === id);
    if (!existing) return;
    try {
      await api.put(`/third_party_services/${id}`, {
        service_name: existing.name,
        vendor_name: existing.vendorName || null,
        labour_count: existing.labourCount,
        labour_charge: existing.labourCharge,
        selling_price: existing.sellingPrice,
        is_active: makeActive,
      });
      toast.success(`Marked ${makeActive ? 'Active' : 'Inactive'}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.thirdPartyServices.all });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating status');
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500 font-bold">Loading Third-Party Services...</div>;

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-20">
      {/* ── Header Toolbar ── */}
      <div className="bg-white/70 backdrop-blur-2xl rounded-2xl sm:rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-white/80 p-3.5 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-5 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-black text-[#F6CB59] flex items-center justify-center shadow-md shrink-0">
            <Truck className="w-4 h-4 sm:w-6 sm:h-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base sm:text-xl md:text-[22px] font-black text-gray-900 tracking-tight leading-none mb-1">
              Third-Party Services
            </h1>
            <p className="text-[10px] sm:text-[12px] font-bold text-gray-500 tracking-wide uppercase">
              Manage outsourced vendor services, specialist labour & margins
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 w-full lg:w-auto shrink-0">
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              className="w-full pl-9 sm:pl-10 pr-4 py-1.5 sm:py-2.5 bg-white/80 border border-gray-200/60 rounded-xl text-[12px] sm:text-[13px] font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-xs"
              placeholder="Search vendor services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {canAdd && (
            <button onClick={handleAdd} className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-1.5 sm:py-2.5 rounded-xl bg-black text-[#F6CB59] hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-[12px] sm:text-[13px] shadow-md whitespace-nowrap">
              <Plus size={14} strokeWidth={2.5} /> Add Service
            </button>
          )}
        </div>
      </div>

      {/* ── Executive Storytelling Analytics Strip ── */}
      <div className="flex lg:grid lg:grid-cols-4 gap-2.5 sm:gap-4 overflow-x-auto pb-1 hide-scrollbar">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black/90 text-[#F6CB59] flex items-center justify-center shadow-xs shrink-0">
            <Truck size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Outsourced Jobs
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight">
              {vendorMetrics.activeCount} <span className="text-xs font-bold text-gray-400">/ {vendorMetrics.total}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shadow-xs shrink-0">
            <Users size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Partner Vendors
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
              {vendorMetrics.vendorCount} Specialists
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shadow-xs shrink-0">
            <Coins size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Avg Job Price
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
              ₹{vendorMetrics.avgPrice.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[165px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center shadow-xs shrink-0">
            <Wrench size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Service Health
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
              100% Operational
            </div>
          </div>
        </div>
      </div>

      {/* ── Ultra-Premium Vendor Storytelling Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
        {filteredItems.map(item => {
          const labourTotal = (Number(item.labourCount) || 1) * Number(item.labourCharge || 0);
          const grandTotal = (Number(item.sellingPrice || 0)) + labourTotal;

          return (
            <div
              key={item.id}
              onClick={() => { if(canEdit) handleEdit(item) }}
              className={`bg-white/85 backdrop-blur-2xl rounded-3xl p-4 sm:p-6 border border-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.09)] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden ${
                canEdit ? 'cursor-pointer hover:-translate-y-0.5' : ''
              }`}
            >
              {/* Amber Top Border Highlight */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F6CB59] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div>
                {/* Header Row: Title & Actions */}
                <div className="flex items-start justify-between gap-2.5 mb-2">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-2xl bg-black text-[#F6CB59] flex items-center justify-center shadow-md shrink-0 border border-gray-800 group-hover:scale-105 transition-transform mt-0.5">
                      <Truck size={18} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-[18px] font-black text-gray-900 leading-tight group-hover:text-amber-800 transition-colors break-words">
                        {item.name}
                      </h3>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className="w-8 h-8 rounded-xl bg-white text-rose-600 border border-rose-200 shadow-xs flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shrink-0"
                      title="Delete Service"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* Vendor Partner Badge */}
                <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
                  {item.vendorName ? (
                    <div className="inline-flex items-center gap-1 text-[11px] font-black text-amber-950 bg-[#F6CB59]/25 border border-[#F6CB59]/40 px-2.5 py-0.5 rounded-lg uppercase tracking-wider truncate max-w-[65%] min-w-0">
                      <span className="truncate">🏭 {item.vendorName}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] font-bold text-gray-400 italic">In-house / Partner Direct</span>
                  )}

                  <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                    <button
                      onClick={() => handleStatusChange(item.id, !item.isActive)}
                      className={`text-[10px] font-black uppercase rounded-full px-2.5 py-0.5 transition-all shadow-xs ${
                        item.isActive
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                          : 'bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200'
                      }`}
                    >
                      {item.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>

                {/* Financial Breakdown Matrix */}
                <div className="grid grid-cols-2 gap-2 my-3 p-2.5 bg-gray-50/90 rounded-2xl border border-gray-200/60">
                  <div className="bg-white/95 p-2 rounded-xl border border-gray-200/80 shadow-xs">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Base Service Fee</div>
                    <div className="text-sm font-black text-gray-900 mt-0.5 font-mono">
                      ₹{Number(item.sellingPrice || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="bg-white/95 p-2 rounded-xl border border-gray-200/80 shadow-xs">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Specialist Labour</div>
                    <div className="text-sm font-black text-gray-900 mt-0.5 font-mono">
                      {item.labourCount || 1} × ₹{Number(item.labourCharge || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Customer Charge & CTA */}
              <div className="flex items-end justify-between pt-3 border-t border-gray-100/90">
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Total Customer Price</div>
                  <div className="text-gray-950 font-black text-[22px] sm:text-[24px] tracking-tight leading-none font-mono">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-gray-700 group-hover:text-black transition-colors">
                    <span>Edit Charges</span>
                    <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {filteredItems.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 rounded-[24px] bg-white/60 backdrop-blur-md shadow-sm">
            <Truck size={36} className="mx-auto text-gray-400 mb-3" />
            <h3 className="text-base font-bold text-gray-800">No third-party services found</h3>
            <p className="text-xs text-gray-500 mt-1">Try adjusting your search or add a new vendor service.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
          <div className="card w-full max-w-md bg-white">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">{editId ? 'Edit Third-Party Service' : 'Add Third-Party Service'}</h3>
              <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-900 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">Service Name *</label>
                <input required type="text" className="input" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Full Body Painting" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">Vendor Name</label>
                <input type="text" className="input" value={form.vendorName} onChange={e => setField('vendorName', e.target.value)} placeholder="e.g. XYZ Paint Works" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1.5">Labour Count</label>
                  <input type="number" min="1" step="1" className="input" value={form.labourCount} onChange={e => setField('labourCount', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1.5">Labour Charge (₹)</label>
                  <input type="number" min="0" step="1" className="input" value={form.labourCharge} onChange={e => setField('labourCharge', e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1.5">Selling Price (₹) *</label>
                  <input required type="number" min="0" step="1" className="input" value={form.sellingPrice} onChange={e => setField('sellingPrice', e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                <button type="button" onClick={handleCancelEdit} className="btn-secondary" disabled={isSaving}>Cancel</button>
                <button type="submit" className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none" disabled={isSaving}>
                  {isSaving ? 'Saving...' : (editId ? 'Update Service' : 'Save Service')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, itemId: null, itemName: '', loading: false })}
        onConfirm={confirmDeleteService}
        loading={deleteModal.loading}
        title="Delete / Archive Third-Party Service"
        itemName={deleteModal.itemName}
        message="Are you sure you want to delete this third-party service? If used in historical invoices, it will be safely archived to protect financial records."
        confirmText="Yes, Proceed"
        confirmVariant="danger"
      />
    </div>
  );
}
