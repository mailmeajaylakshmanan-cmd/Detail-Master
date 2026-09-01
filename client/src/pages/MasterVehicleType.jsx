import { useState, useMemo } from 'react';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { Plus, X, Search, Car, Trash2, AlertTriangle, Loader2, Edit3, ShieldCheck, Layers, Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useVehicleTypes } from '../hooks/useQueries.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { queryKeys } from '../api/queryKeys.js';
import { usePermissions } from '../hooks/usePermissions.js';

export default function MasterVehicleType() {
  const queryClient = useQueryClient();
  const { data: vehicleTypes = [], isLoading: loading } = useVehicleTypes();
  const { canAdd, canEdit, canDelete } = usePermissions('Vehicle Types');

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 250);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTypeId, setDeleteTypeId] = useState(null);
  const [deleteDependencies, setDeleteDependencies] = useState(null);
  const [checkingDependencies, setCheckingDependencies] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filteredTypes = useMemo(() => {
    if (!debouncedSearch.trim()) return vehicleTypes;
    const q = debouncedSearch.toLowerCase();
    return vehicleTypes.filter((vt) => (vt.name || '').toLowerCase().includes(q));
  }, [vehicleTypes, debouncedSearch]);

  const vehicleMetrics = useMemo(() => {
    const total = vehicleTypes.length;
    const activeCount = vehicleTypes.filter(vt => vt.isActive).length;
    return {
      total,
      activeCount,
      inactiveCount: total - activeCount
    };
  }, [vehicleTypes]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSaving) return;
    if (!name.trim()) return toast.error('Vehicle type name is required');

    setIsSaving(true);
    try {
      if (editId) {
        const existing = vehicleTypes.find((vt) => vt.id === editId);
        await api.put('/vehicle_types/' + editId, {
          name: name.trim(),
          is_active: existing ? existing.isActive : true,
        });
        toast.success('Vehicle type updated');
      } else {
        await api.post('/vehicle_types', { name: name.trim(), is_active: true });
        toast.success('Vehicle type created');
      }
      handleCancelEdit();
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicleTypes.all });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving vehicle type');
    } finally {
      setIsSaving(false);
    }
  }

  function handleAdd() {
    setEditId(null);
    setName('');
    setIsModalOpen(true);
  }

  function handleEdit(vt) {
    setEditId(vt.id);
    setName(vt.name);
    setIsModalOpen(true);
  }

  function handleCancelEdit() {
    setEditId(null);
    setName('');
    setIsModalOpen(false);
  }

  async function handleStatusChange(id, newStatusStr) {
    const isActive = newStatusStr === 'Active';
    const existing = vehicleTypes.find(vt => vt.id === id);
    if (!existing) return;
    try {
      await api.put(`/vehicle_types/${id}`, {
        name: existing.name,
        is_active: isActive,
      });
      toast.success(`Vehicle type marked ${newStatusStr}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicleTypes.all });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating status');
    }
  }

  async function handleDeleteClick(e, id) {
    e.stopPropagation();
    setDeleteTypeId(id);
    setCheckingDependencies(true);
    setDeleteDependencies(null);
    try {
      const res = await api.get(`/vehicle_types/${id}/dependencies`);
      setDeleteDependencies(res.data);
    } catch (err) {
      toast.error('Failed to check dependencies');
      setDeleteTypeId(null);
    } finally {
      setCheckingDependencies(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.delete(`/vehicle_types/${deleteTypeId}`);
      toast.success('Vehicle type deleted successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicleTypes.all });
      setDeleteTypeId(null);
      setDeleteDependencies(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete vehicle type');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-gray-500 gap-3">
        <Loader2 className="animate-spin text-gray-900" size={32} />
        <p className="font-bold text-sm">Loading vehicle types...</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-20">
      {/* ── Toolbar Header ── */}
      <div className="bg-white/70 backdrop-blur-2xl rounded-2xl sm:rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-white/80 p-3.5 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-5 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-black text-[#F6CB59] flex items-center justify-center shadow-md shrink-0">
            <Car className="w-4 h-4 sm:w-6 sm:h-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base sm:text-xl md:text-[22px] font-black text-gray-900 tracking-tight leading-none mb-1">
              Vehicle Type Master
            </h1>
            <p className="text-[10px] sm:text-[12px] font-bold text-gray-500 tracking-wide uppercase">
              Manage vehicle categories, pricing segments & matrix tiers
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 w-full lg:w-auto shrink-0">
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              className="w-full pl-9 sm:pl-10 pr-4 py-1.5 sm:py-2.5 bg-white/80 border border-gray-200/60 rounded-xl text-[12px] sm:text-[13px] font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-xs"
              placeholder="Search vehicle types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {canAdd && (
            <button onClick={handleAdd} className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-1.5 sm:py-2.5 rounded-xl bg-black text-[#F6CB59] hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-[12px] sm:text-[13px] shadow-md whitespace-nowrap">
              <Plus size={14} strokeWidth={2.5} /> Add Vehicle Type
            </button>
          )}
        </div>
      </div>

      {/* ── Executive Storytelling Analytics Strip ── */}
      <div className="flex lg:grid lg:grid-cols-3 gap-2.5 sm:gap-4 overflow-x-auto pb-1 hide-scrollbar">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black/90 text-[#F6CB59] flex items-center justify-center shadow-xs shrink-0">
            <Car size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Total Categories
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight">
              {vehicleMetrics.total} <span className="text-xs font-bold text-gray-400">Classes</span>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shadow-xs shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Active Tiers
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
              {vehicleMetrics.activeCount} Live in Matrix
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[165px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shadow-xs shrink-0">
            <Layers size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Matrix Coverage
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
              100% Configured
            </div>
          </div>
        </div>
      </div>

      {/* ── Ultra-Premium Vehicle Type Storytelling Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
        {filteredTypes.map(vt => (
          <div
            key={vt.id}
            onClick={() => { if(canEdit) handleEdit(vt); }}
            className={`bg-white/85 backdrop-blur-2xl rounded-3xl p-4 sm:p-6 border border-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.09)] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden ${
              canEdit ? 'cursor-pointer hover:-translate-y-0.5' : ''
            }`}
          >
            {/* Ambient Gold Header Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F6CB59] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div>
              {/* Header Row: Title & Actions */}
              <div className="flex items-start justify-between gap-2.5 mb-2.5">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-2xl bg-black text-[#F6CB59] flex items-center justify-center shadow-md shrink-0 border border-gray-800 group-hover:scale-105 transition-transform mt-0.5">
                    <Car size={20} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-[18px] font-black text-gray-900 leading-tight group-hover:text-amber-800 transition-colors break-words">
                      {vt.name}
                    </h3>
                    <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block mt-0.5">
                      Tier ID #{vt.id}
                    </span>
                  </div>
                </div>

                {canDelete && (
                  <button
                    onClick={(e) => handleDeleteClick(e, vt.id)}
                    className="w-8 h-8 rounded-xl bg-white text-rose-600 border border-rose-200 shadow-xs flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shrink-0"
                    title="Delete Vehicle Type"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {/* Storytelling Specification Tag */}
              <div className="p-3 my-3 bg-gray-50/90 rounded-2xl border border-gray-200/60 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                  <Sparkles size={13} className="text-amber-600" />
                  <span>Detailing Matrix Tier</span>
                </div>
                <span className="text-[10px] font-black uppercase text-amber-900 bg-[#F6CB59]/30 px-2 py-0.5 rounded-md">
                  Active in Matrix
                </span>
              </div>
            </div>

            {/* Footer Status Toggle & Action */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100/90 mt-2">
              <div onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleStatusChange(vt.id, vt.isActive ? 'Inactive' : 'Active')}
                  className={`text-[10px] font-black uppercase rounded-full px-3 py-1 transition-all shadow-xs ${
                    vt.isActive
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                      : 'bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200'
                  }`}
                >
                  {vt.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-black text-gray-700 group-hover:text-black transition-colors">
                <span>Configure Tier</span>
                <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        ))}
        {filteredTypes.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 rounded-[24px] bg-white/60 backdrop-blur-md shadow-sm">
            <Car size={36} className="mx-auto text-gray-400 mb-3" />
            <h3 className="text-base font-bold text-gray-800">No vehicle types found</h3>
            <p className="text-xs text-gray-500 mt-1">Try adjusting your search or add a new vehicle type.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-white/50">
              <h3 className="text-lg font-bold text-gray-900">{editId ? 'Edit Vehicle Type' : 'Add New Vehicle Type'}</h3>
              <button onClick={handleCancelEdit} className="text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">Vehicle Type Name *</label>
                <input required type="text" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. SUV, Hatchback, Luxury" />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                <button type="button" onClick={handleCancelEdit} className="btn-secondary" disabled={isSaving}>Cancel</button>
                <button type="submit" className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none" disabled={isSaving}>
                  {isSaving ? 'Saving...' : (editId ? 'Update Vehicle Type' : 'Save Vehicle Type')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dependency Warning Modal */}
      {deleteTypeId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-red-50/50 shrink-0">
              <h2 className="text-lg font-bold text-red-700 flex items-center gap-2">
                <AlertTriangle size={20} /> Confirm Deletion
              </h2>
              <button
                type="button"
                onClick={() => { setDeleteTypeId(null); setDeleteDependencies(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-100 text-red-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6">
              {checkingDependencies ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <Loader2 className="animate-spin text-red-500 mb-2" size={32} />
                  <p className="text-sm text-gray-500 font-medium">Checking relationships...</p>
                </div>
              ) : deleteDependencies ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-gray-800">
                    Are you sure you want to delete this vehicle type?
                  </p>
                  
                  {deleteDependencies.total > 0 ? (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                      <p className="text-sm font-bold text-orange-800 mb-2">⚠️ Cannot Delete: Active References</p>
                      <p className="text-xs font-medium text-orange-700 mb-3">
                        This vehicle type is currently linked to registered vehicles or services. Please deactivate it instead of deleting.
                      </p>
                      <ul className="text-xs font-bold text-orange-800 space-y-1 ml-4 list-disc">
                        {deleteDependencies.vehicles > 0 && (
                          <li>Linked to {deleteDependencies.vehicles} Registered Vehicles</li>
                        )}
                        {deleteDependencies.webBookings > 0 && (
                          <li>Linked to {deleteDependencies.webBookings} Web Bookings</li>
                        )}
                        {deleteDependencies.servicePrices > 0 && (
                          <li>Linked to {deleteDependencies.servicePrices} Service Pricing Tiers</li>
                        )}
                      </ul>
                    </div>
                  ) : null}
                  
                  <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-2">
                    <button
                      type="button"
                      onClick={() => { setDeleteTypeId(null); setDeleteDependencies(null); }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    {deleteDependencies.total === 0 && (
                      <button
                        type="button"
                        onClick={confirmDelete}
                        disabled={deleting}
                        className="btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500 flex items-center justify-center gap-2 min-w-[100px]"
                      >
                        {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
