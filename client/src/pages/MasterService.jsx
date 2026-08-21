import { useState, useMemo } from 'react';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { Plus, Edit3, X, Search, Sparkles, Clock, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useServices, useVehicleTypes } from '../hooks/useQueries.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { queryKeys } from '../api/queryKeys.js';

export default function MasterService() {
  const queryClient = useQueryClient();
  const { data: services = [], isLoading: loading } = useServices();
  const { data: vehicleTypes = [] } = useVehicleTypes();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 250);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [estimateTime, setEstimateTime] = useState('');
  const [vehiclePrices, setVehiclePrices] = useState({});
  const [editId, setEditId] = useState(null);

  const [deleteServiceId, setDeleteServiceId] = useState(null);
  const [deleteDependencies, setDeleteDependencies] = useState(null);
  const [checkingDependencies, setCheckingDependencies] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filteredServices = useMemo(() => {
    if (!debouncedSearch) return services;
    const q = debouncedSearch.toLowerCase();
    return services.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  }, [services, debouncedSearch]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name) return toast.error('Name is required');

    const formattedVehiclePrices = Object.entries(vehiclePrices)
      .filter(([vtId, p]) => p !== '' && p !== null)
      .map(([vtId, p]) => ({
        vehicle_type_id: Number(vtId),
        price: Number(p)
      }));

    const payload = {
      service_name: name,
      category: description || null,

      is_active: true,
      estimate_time: estimateTime || null,
      vehicle_prices: formattedVehiclePrices,
    };

    try {
      if (editId) {
        const existing = services.find(s => s.id === editId);
        await api.put('/services/' + editId, {
          ...payload,
          is_active: existing ? existing.isActive : true
        });
        toast.success('Service updated');
      } else {
        await api.post('/services', payload);
        toast.success('Service added');
      }
      handleCancelEdit();
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving service');
    }
  }

  function handleAdd() {
    setEditId(null);
    setName('');
    setDescription('');
    setPrice('');
    setEstimateTime('');
    setVehiclePrices({});
    setIsModalOpen(true);
  }

  function handleEdit(srv) {
    setEditId(srv.id);
    setName(srv.name);
    setDescription(srv.description || '');
    setPrice(srv.price || '');
    setEstimateTime(srv.estimateTime || '');
    setVehiclePrices(srv.vehiclePricesMap || {});
    setIsModalOpen(true);
  }

  function handleCancelEdit() {
    setEditId(null);
    setName('');
    setDescription('');
    setPrice('');
    setEstimateTime('');
    setVehiclePrices({});
    setIsModalOpen(false);
  }

  async function handleStatusChange(id, newStatusStr) {
    const isActive = newStatusStr === 'Active';
    const existing = services.find(s => s.id === id);
    if (!existing) return;
    try {
      const vpPayload = (existing.vehiclePrices || []).map(vp => ({
        vehicle_type_id: vp.vehicle_type_id,
        price: Number(vp.price) || 0
      }));

      await api.put(`/services/${id}`, {
        service_name: existing.name,
        category: existing.description || null,
        is_active: isActive,
        estimate_time: existing.estimateTime || null,
        vehicle_prices: vpPayload
      });
      toast.success(`Service marked ${newStatusStr}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating status');
    }
  }

  async function handleDeleteClick(e, id) {
    e.stopPropagation();
    setDeleteServiceId(id);
    setCheckingDependencies(true);
    setDeleteDependencies(null);
    try {
      const res = await api.get(`/services/${id}/dependencies`);
      setDeleteDependencies(res.data);
    } catch (err) {
      toast.error('Failed to check dependencies');
      setDeleteServiceId(null);
    } finally {
      setCheckingDependencies(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.delete(`/services/${deleteServiceId}`);
      toast.success('Service deleted successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
      setDeleteServiceId(null);
      setDeleteDependencies(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete service');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Services...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white/60 backdrop-blur-2xl rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-white/80 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-black text-[#F6CB59] flex items-center justify-center shadow-md shrink-0">
            <Sparkles size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl md:text-[22px] font-black text-gray-900 tracking-tight leading-none mb-1">
              Service Master
            </h1>
            <p className="text-[12px] font-bold text-gray-500 tracking-wide uppercase">
              Manage detailing services & pricing
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0">
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-gray-200/60 rounded-xl text-[13px] font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-sm"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={handleAdd} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-black text-[#F6CB59] hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-[13px] shadow-md whitespace-nowrap">
            <Plus size={16} strokeWidth={2.5} /> Add Service
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map(srv => (
          <div key={srv.id} onClick={() => handleEdit(srv)} className="card p-6 relative flex flex-col cursor-pointer group hover:-translate-y-1 transition-all duration-300 min-h-[220px]">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-[20px] font-black text-gray-900 leading-tight pr-24 group-hover:text-[#F6CB59] transition-colors">{srv.name}</h3>
              <div className="absolute top-5 right-5 flex flex-col items-end">
                <span className="text-[10px] font-bold text-gray-500 tracking-tight mb-1">Popularity Trend</span>
                <svg width="64" height="24" viewBox="0 0 64 24" className="opacity-90">
                  <defs>
                    <linearGradient id={`grad-${srv.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={srv.isActive ? '#FBBF24' : '#9CA3AF'} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={srv.isActive ? '#FBBF24' : '#9CA3AF'} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,18 Q8,8 16,14 T32,10 T48,16 T64,6" fill="none" stroke={srv.isActive ? '#F6CB59' : '#9CA3AF'} strokeWidth="1.5" />
                  <path d="M0,18 Q8,8 16,14 T32,10 T48,16 T64,6 L64,24 L0,24 Z" fill={`url(#grad-${srv.id})`} />
                </svg>
              </div>
            </div>

            <p className="text-[13px] font-medium text-gray-500 mb-6 flex-1 pr-12 line-clamp-2">
              {srv.description || <span className="italic text-gray-400">No description provided</span>}
            </p>

            <div className="flex items-center justify-between mt-auto">
                <div className="text-gray-900 font-bold text-[22px] tracking-tight">
                  ₹{Number(srv.price || 0).toLocaleString('en-IN')}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {srv.estimateTime && (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-800 bg-[#F6CB59]/20 border border-[#F6CB59]/30 rounded-full px-2.5 py-1 uppercase tracking-widest shadow-sm">
                      <Clock size={10} className="text-[#854D0E]/60" /> {srv.estimateTime}
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStatusChange(srv.id, srv.isActive ? 'Inactive' : 'Active'); }}
                      className={`text-[11px] font-bold uppercase rounded-full px-4 py-1.5 transition-all shadow-sm ${
                        srv.isActive
                          ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500'
                          : 'bg-rose-600 text-white hover:bg-rose-700'
                      }`}
                    >
                      {srv.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(e, srv.id)}
                      className="w-7 h-7 rounded-full bg-white text-rose-500 shadow-sm border border-rose-100 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Delete Service"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
          </div>
        ))}
        {filteredServices.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-white/50 rounded-2xl bg-white/30 backdrop-blur-sm">
            <Sparkles size={32} className="mx-auto text-gray-500 mb-3" />
            <h3 className="text-lg font-medium text-gray-500">No services found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your search or add a new service.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
          <div className="card w-full max-w-md bg-white">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">{editId ? 'Edit Service' : 'Add New Service'}</h3>
              <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-900 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">Service Name *</label>
                <input required type="text" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ceramic Coating" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1.5">Base Price (₹) *</label>
                  <input required type="number" min="0" step="1" className="input" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1.5 flex items-center gap-1"><Clock size={13} className="text-[#854D0E]/60" /> Estimate Time</label>
                  <input type="text" className="input" value={estimateTime} onChange={e => setEstimateTime(e.target.value)} placeholder="e.g. 2-3 hrs" />
                </div>
              </div>
              {vehicleTypes.length > 0 && (
                <div className="pt-2">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Vehicle Type Specific Pricing (Optional)</label>
                  <div className="grid grid-cols-2 gap-3 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                    {vehicleTypes.filter(vt => vt.isActive).map(vt => (
                      <div key={vt.id} className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-700">{vt.name}</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="input !py-1.5 !px-3 w-24 text-right"
                          placeholder={price || "Base"}
                          value={vehiclePrices[vt.id] !== undefined ? vehiclePrices[vt.id] : ''}
                          onChange={(e) => setVehiclePrices({ ...vehiclePrices, [vt.id]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">Category / Description (Optional)</label>
                <textarea className="input min-h-[80px] resize-none" value={description} onChange={e => setDescription(e.target.value)} placeholder="Service details..." />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                <button type="button" onClick={handleCancelEdit} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Service</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dependency Warning Modal */}
      {deleteServiceId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-red-50/50 shrink-0">
              <h2 className="text-lg font-bold text-red-700 flex items-center gap-2">
                <AlertTriangle size={20} /> Confirm Deletion
              </h2>
              <button
                type="button"
                onClick={() => { setDeleteServiceId(null); setDeleteDependencies(null); }}
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
                    Are you sure you want to delete this service?
                  </p>
                  
                  {deleteDependencies.total > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                      <p className="text-sm font-bold text-orange-800 mb-2">⚠️ Warning: Active Dependencies</p>
                      <p className="text-xs font-medium text-orange-700 mb-3">
                        This service has historical usage. Soft deleting it will hide it from the active master list, but preserve historical invoices.
                      </p>
                      <ul className="text-xs font-bold text-orange-800 space-y-1 ml-4 list-disc">
                        {deleteDependencies.invoices > 0 && (
                          <li>Linked to {deleteDependencies.invoices} Invoices</li>
                        )}
                        {deleteDependencies.jobOrders > 0 && (
                          <li>Linked to {deleteDependencies.jobOrders} Job Orders</li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-2">
                    <button
                      type="button"
                      onClick={() => { setDeleteServiceId(null); setDeleteDependencies(null); }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmDelete}
                      disabled={deleting}
                      className="btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500 flex items-center justify-center gap-2 min-w-[100px]"
                    >
                      {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      <span>Delete</span>
                    </button>
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
