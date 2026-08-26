import { useState, useMemo } from 'react';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { Plus, X, Search, Car, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useVehicleTypes } from '../hooks/useQueries.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { queryKeys } from '../api/queryKeys.js';
import { usePermissions } from '../hooks/usePermissions.js';

export default function MasterVehicleType() {
  const queryClient = useQueryClient();
  const { data: vehicleTypes = [], isLoading: loading } = useVehicleTypes();
  const { can_delete } = usePermissions('Vehicle Types');

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 250);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);

  const [deleteTypeId, setDeleteTypeId] = useState(null);
  const [deleteDependencies, setDeleteDependencies] = useState(null);
  const [checkingDependencies, setCheckingDependencies] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filteredTypes = useMemo(() => {
    if (!debouncedSearch) return vehicleTypes;
    const q = debouncedSearch.toLowerCase();
    return vehicleTypes.filter(vt =>
      (vt.name || '').toLowerCase().includes(q)
    );
  }, [vehicleTypes, debouncedSearch]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return toast.error('Vehicle type name is required');

    const payload = {
      name: name.trim(),
      is_active: true,
    };

    try {
      if (editId) {
        const existing = vehicleTypes.find(vt => vt.id === editId);
        await api.put('/vehicle_types/' + editId, {
          ...payload,
          is_active: existing ? existing.isActive : true,
        });
        toast.success('Vehicle type updated');
      } else {
        await api.post('/vehicle_types', payload);
        toast.success('Vehicle type added');
      }
      handleCancelEdit();
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicleTypes.all });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving vehicle type');
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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Vehicle Types...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Car className="text-gray-900" /> Vehicle Type Master
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage vehicle categories and pricing tiers.</p>
        </div>

        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-500" />
            </div>
            <input
              type="text"
              className="input pl-10 bg-white/60"
              placeholder="Search vehicle types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={handleAdd} className="btn-primary whitespace-nowrap flex items-center gap-2">
            <Plus size={18} /> Add Vehicle Type
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTypes.map(vt => (
          <div key={vt.id} onClick={() => handleEdit(vt)} className="card p-5 relative overflow-hidden flex flex-col cursor-pointer group hover:-translate-y-1 transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-50 border border-yellow-200 flex items-center justify-center text-yellow-700">
                  <Car size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{vt.name}</h3>
                  <span className="text-xs text-gray-400 font-medium">ID #{vt.id}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
              <span className={`text-[11px] font-bold uppercase rounded-full px-3 py-1 ${vt.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>
                {vt.isActive ? 'Active' : 'Inactive'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleStatusChange(vt.id, vt.isActive ? 'Inactive' : 'Active'); }}
                  className={`text-[11px] font-bold uppercase rounded-full px-3 py-1 transition-all shadow-sm ${
                    vt.isActive
                      ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500'
                      : 'bg-rose-600 text-white hover:bg-rose-700'
                  }`}
                >
                  {vt.isActive ? 'Deactivate' : 'Activate'}
                </button>
                {can_delete && (
                  <button
                    onClick={(e) => handleDeleteClick(e, vt.id)}
                    className="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors"
                    title="Delete Vehicle Type"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredTypes.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-white/50 rounded-2xl bg-white/30 backdrop-blur-sm">
            <Car size={32} className="mx-auto text-gray-500 mb-3" />
            <h3 className="text-lg font-medium text-gray-500">No vehicle types found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your search or add a new vehicle type.</p>
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
                <button type="button" onClick={handleCancelEdit} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Vehicle Type</button>
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
