import { useState, useMemo } from 'react';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { Plus, Edit3, X, Search, Sparkles, Clock, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useServices } from '../hooks/useQueries.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { queryKeys } from '../api/queryKeys.js';

export default function MasterService() {
  const queryClient = useQueryClient();
  const { data: services = [], isLoading: loading } = useServices();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 250);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [estimateTime, setEstimateTime] = useState('');
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

    const payload = {
      service_name: name,
      category: description || null,
      base_price: Number(price) || 0,
      is_active: true,
      estimate_time: estimateTime || null,
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
    setIsModalOpen(true);
  }

  function handleEdit(srv) {
    setEditId(srv.id);
    setName(srv.name);
    setDescription(srv.description || '');
    setPrice(srv.price || '');
    setEstimateTime(srv.estimateTime || '');
    setIsModalOpen(true);
  }

  function handleCancelEdit() {
    setEditId(null);
    setName('');
    setDescription('');
    setPrice('');
    setEstimateTime('');
    setIsModalOpen(false);
  }

  async function handleStatusChange(id, newStatusStr) {
    const isActive = newStatusStr === 'Active';
    const existing = services.find(s => s.id === id);
    if (!existing) return;
    try {
      await api.put(`/services/${id}`, {
        service_name: existing.name,
        category: existing.description || null,
        base_price: existing.price,
        is_active: isActive,
        estimate_time: existing.estimateTime || null,
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
      <div className="card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="text-gray-900" /> Service Master
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage detailing services, packages, and pricing.</p>
        </div>

        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-500" />
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
            <Plus size={18} /> Add Service
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map(srv => (
          <div key={srv.id} onClick={() => handleEdit(srv)} className="card p-5 relative overflow-hidden flex flex-col cursor-pointer group hover:-translate-y-1 transition-all duration-300">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-bold text-gray-900 pr-24 group-hover:text-blue-600 transition-colors">{srv.name}</h3>
              <div className="absolute top-5 right-5 flex flex-col items-end">
                <span className="text-[10px] font-bold text-gray-500 tracking-tight mb-1">Popularity Trend</span>
                <svg width="64" height="24" viewBox="0 0 64 24" className="opacity-90">
                  <defs>
                    <linearGradient id={`grad-${srv.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={srv.isActive ? '#FBBF24' : '#9CA3AF'} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={srv.isActive ? '#FBBF24' : '#9CA3AF'} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,18 Q8,8 16,14 T32,10 T48,16 T64,6" fill="none" stroke={srv.isActive ? '#F59E0B' : '#9CA3AF'} strokeWidth="1.5" />
                  <path d="M0,18 Q8,8 16,14 T32,10 T48,16 T64,6 L64,24 L0,24 Z" fill={`url(#grad-${srv.id})`} />
                </svg>
              </div>
            </div>

            <p className="text-[13px] text-gray-500 mb-6 flex-1 pr-12 line-clamp-2">
              {srv.description || <span className="italic text-gray-400">No description provided</span>}
            </p>

            <div className="flex items-center justify-between mt-auto">
                <div className="text-gray-900 font-bold text-[22px] tracking-tight">
                  ₹{Number(srv.price || 0).toLocaleString('en-IN')}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {srv.estimateTime && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                      <Clock size={10} /> {srv.estimateTime}
                    </span>
                  )}
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
                </div>
                  <button
                    onClick={(e) => handleDeleteClick(e, srv.id)}
                    className="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors"
                    title="Delete Service"
                  >
                    <Trash2 size={14} />
                  </button>
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
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-white/50">
              <h3 className="text-lg font-bold text-gray-900">{editId ? 'Edit Service' : 'Add New Service'}</h3>
              <button onClick={handleCancelEdit} className="text-gray-500 hover:text-white transition-colors">
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
                  <label className="block text-sm font-medium text-gray-500 mb-1.5 flex items-center gap-1"><Clock size={13} className="text-blue-500" /> Estimate Time</label>
                  <input type="text" className="input" value={estimateTime} onChange={e => setEstimateTime(e.target.value)} placeholder="e.g. 2-3 hrs" />
                </div>
              </div>
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
