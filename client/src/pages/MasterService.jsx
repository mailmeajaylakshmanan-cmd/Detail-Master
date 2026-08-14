import { useState, useMemo } from 'react';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { Plus, Edit3, X, Search, Sparkles, Clock, Trash2, AlertTriangle, Loader2, Car } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useServices, useVehicleTypes } from '../hooks/useQueries.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { queryKeys } from '../api/queryKeys.js';

export default function MasterService() {
  const queryClient = useQueryClient();
  const { data: services = [], isLoading: loading } = useServices();
  const { data: vehicleTypes = [] } = useVehicleTypes();

  const activeVehicleTypes = useMemo(() => {
    return vehicleTypes.filter(vt => vt.isActive);
  }, [vehicleTypes]);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 250);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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

  function handleVehiclePriceChange(vtId, val) {
    setVehiclePrices(prev => ({
      ...prev,
      [vtId]: val,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name) return toast.error('Service Name is required');

    const vpPayload = activeVehicleTypes.map(vt => ({
      vehicle_type_id: vt.id,
      price: Number(vehiclePrices[vt.id]) || 0,
    }));

    const validPrices = vpPayload.map(v => v.price).filter(p => p > 0);
    if (validPrices.length === 0) {
      return toast.error('Please enter a price for at least one vehicle type');
    }

    const computedBasePrice = Math.min(...validPrices);

    const payload = {
      service_name: name,
      category: description || null,
      base_price: computedBasePrice,
      is_active: true,
      estimate_time: estimateTime || null,
      vehicle_prices: vpPayload,
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
    setEstimateTime('');
    setVehiclePrices({});
    setIsModalOpen(true);
  }

  function handleEdit(srv) {
    setEditId(srv.id);
    setName(srv.name);
    setDescription(srv.description || '');
    setEstimateTime(srv.estimateTime || '');

    const vpMap = {};
    if (Array.isArray(srv.vehiclePrices)) {
      srv.vehiclePrices.forEach(vp => {
        vpMap[vp.vehicle_type_id] = vp.price;
      });
    }
    setVehiclePrices(vpMap);
    setIsModalOpen(true);
  }

  function handleCancelEdit() {
    setEditId(null);
    setName('');
    setDescription('');
    setEstimateTime('');
    setVehiclePrices({});
    setIsModalOpen(false);
  }

  async function handleToggleStatus(srv) {
    try {
      const vpPayload = (srv.vehiclePrices || []).map(vp => ({
        vehicle_type_id: vp.vehicle_type_id,
        price: Number(vp.price) || 0
      }));

      await api.put('/services/' + srv.id, {
        service_name: srv.name,
        category: srv.description || null,
        base_price: srv.price || 0,
        is_active: !srv.isActive,
        estimate_time: srv.estimateTime || null,
        vehicle_prices: vpPayload
      });
      toast.success(`Marked ${!srv.isActive ? 'Active' : 'Inactive'}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error toggling service status');
    }
  }

  async function onRequestDelete(id) {
    setDeleteServiceId(id);
    setCheckingDependencies(true);
    try {
      const res = await api.get(`/services/${id}/dependencies`);
      setDeleteDependencies(res.data);
    } catch (err) {
      toast.error('Failed to check service usage');
      setDeleteServiceId(null);
    } finally {
      setCheckingDependencies(false);
    }
  }

  async function confirmDelete() {
    if (!deleteServiceId) return;
    setDeleting(true);
    try {
      await api.delete(`/services/${deleteServiceId}`);
      toast.success('Service deleted successfully');
      setDeleteServiceId(null);
      setDeleteDependencies(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting service');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Master Services...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="text-amber-500" /> Master Services & Rates
          </h1>
          <p className="text-gray-500 text-sm mt-1">Configure service catalog and pricing rates per vehicle type.</p>
        </div>

        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="input pl-10 bg-white/60"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={handleAdd} className="btn-primary whitespace-nowrap flex items-center gap-2">
            <Plus size={18} /> Add New Service
          </button>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((srv) => (
          <div key={srv.id} onClick={() => handleEdit(srv)} className="card p-5 relative overflow-hidden flex flex-col cursor-pointer group hover:-translate-y-1 transition-all duration-300">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                {srv.name}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRequestDelete(srv.id); }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete Service"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleToggleStatus(srv); }}
                  className={`text-[10px] font-bold uppercase rounded-full px-3 py-1 transition-all shadow-sm ${
                    srv.isActive
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                  }`}
                >
                  {srv.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500 line-clamp-2 mb-3 min-h-[32px]">
              {srv.description || <span className="italic text-gray-400">No category description</span>}
            </p>

            {/* Per Vehicle Type Pricing List */}
            <div className="mb-4 bg-slate-50/80 p-3 rounded-xl border border-slate-100/80 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Pricing By Vehicle Type</span>
              {srv.vehiclePrices && srv.vehiclePrices.length > 0 ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {srv.vehiclePrices.map(vp => (
                    <div key={vp.vehicle_type_id} className="text-xs font-semibold text-slate-700 flex justify-between bg-white px-2.5 py-1 rounded-md border border-slate-200/60 shadow-2xs">
                      <span className="flex items-center gap-1 text-slate-500 font-medium">
                        <Car size={11} className="text-blue-500" /> {vp.vehicle_type_name}:
                      </span>
                      <span className="font-bold text-gray-900">₹{Number(vp.price).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs font-bold text-gray-900">
                  ₹{Number(srv.price || 0).toLocaleString('en-IN')}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100/80">
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                <Clock size={13} className="text-blue-500" />
                {srv.estimateTime ? srv.estimateTime : 'Est. time not set'}
              </span>
              <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                Edit Rates →
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-white/50 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editId ? 'Edit Service Rates' : 'Add New Service'}</h3>
              <button onClick={handleCancelEdit} className="text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">Service Name *</label>
                <input required type="text" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Premium Foam Wash" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5 flex items-center gap-1"><Clock size={13} className="text-blue-500" /> Estimate Time</label>
                <input type="text" className="input" value={estimateTime} onChange={e => setEstimateTime(e.target.value)} placeholder="e.g. 2-3 hrs" />
              </div>

              {/* Per Vehicle Type Pricing Inputs */}
              {activeVehicleTypes.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Car size={14} className="text-blue-600" /> Vehicle Type Service Prices (₹) *
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">Enter rate for each vehicle category</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {activeVehicleTypes.map(vt => (
                      <div key={vt.id}>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">{vt.name} (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="input bg-white py-1.5 text-xs font-semibold"
                          placeholder="0"
                          value={vehiclePrices[vt.id] !== undefined ? vehiclePrices[vt.id] : ''}
                          onChange={e => handleVehiclePriceChange(vt.id, e.target.value)}
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
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6 shrink-0">
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
