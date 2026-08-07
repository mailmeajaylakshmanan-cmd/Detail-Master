import { useState, useMemo } from 'react';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { Plus, X, Search, Truck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useThirdPartyServices } from '../hooks/useQueries.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { queryKeys } from '../api/queryKeys.js';

const emptyForm = { name: '', vendorName: '', labourCount: '1', labourCharge: '', serviceCost: '', sellingPrice: '' };

export default function MasterThirdPartyService() {
  const queryClient = useQueryClient();
  const { data: items = [], isLoading: loading } = useThirdPartyServices();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 250);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  const filteredItems = useMemo(() => {
    if (!debouncedSearch) return items;
    const q = debouncedSearch.toLowerCase();
    return items.filter(t =>
      (t.name || '').toLowerCase().includes(q) ||
      (t.vendorName || '').toLowerCase().includes(q)
    );
  }, [items, debouncedSearch]);

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) return toast.error('Service name is required');
    if (!form.sellingPrice) return toast.error('Selling price is required');

    const payload = {
      service_name: form.name,
      vendor_name: form.vendorName || null,
      labour_count: Number(form.labourCount) || 1,
      labour_charge: Number(form.labourCharge) || 0,
      service_cost: Number(form.serviceCost) || 0,
      selling_price: Number(form.sellingPrice) || 0,
      is_active: true,
    };

    try {
      if (editId) {
        const existing = items.find(t => t.id === editId);
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
      serviceCost: String(item.serviceCost ?? ''),
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
        service_cost: existing.serviceCost,
        selling_price: existing.sellingPrice,
        is_active: makeActive,
      });
      toast.success(`Marked ${makeActive ? 'Active' : 'Inactive'}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.thirdPartyServices.all });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating status');
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Third-Party Services...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="text-gray-900" /> Third-Party Services
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage vendor-provided services with their own labour and cost breakdown.</p>
        </div>

        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-500" />
            </div>
            <input
              type="text"
              className="input pl-10 bg-white/60"
              placeholder="Search vendor services..."
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
        {filteredItems.map(item => (
          <div key={item.id} onClick={() => handleEdit(item)} className="card p-5 relative overflow-hidden flex flex-col cursor-pointer group hover:-translate-y-1 transition-all duration-300">
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{item.name}</h3>
            <p className="text-[13px] text-gray-500 mb-4">
              {item.vendorName || <span className="italic text-gray-400">No vendor specified</span>}
            </p>

            <div className="text-[12px] text-gray-500 space-y-1 mb-4">
              <div className="flex justify-between"><span>Labour</span><span className="font-medium text-gray-700">{item.labourCount} × ₹{item.labourCharge.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span>Vendor Cost</span><span className="font-medium text-gray-700">₹{item.serviceCost.toLocaleString('en-IN')}</span></div>
            </div>

            <div className="flex items-center justify-between mt-auto">
              <div className="text-gray-900 font-bold text-[22px] tracking-tight">
                ₹{item.sellingPrice.toLocaleString('en-IN')}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleStatusChange(item.id, !item.isActive); }}
                className={`text-[11px] font-bold uppercase rounded-full px-4 py-1.5 transition-all shadow-sm ${
                  item.isActive
                    ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500'
                    : 'bg-rose-600 text-white hover:bg-rose-700'
                }`}
              >
                {item.isActive ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-white/50 rounded-2xl bg-white/30 backdrop-blur-sm">
            <Truck size={32} className="mx-auto text-gray-500 mb-3" />
            <h3 className="text-lg font-medium text-gray-500">No third-party services found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your search or add a new vendor service.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-white/50">
              <h3 className="text-lg font-bold text-gray-900">{editId ? 'Edit Third-Party Service' : 'Add Third-Party Service'}</h3>
              <button onClick={handleCancelEdit} className="text-gray-500 hover:text-white transition-colors">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1.5">Vendor Cost (₹)</label>
                  <input type="number" min="0" step="1" className="input" value={form.serviceCost} onChange={e => setField('serviceCost', e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1.5">Selling Price (₹) *</label>
                  <input required type="number" min="0" step="1" className="input" value={form.sellingPrice} onChange={e => setField('sellingPrice', e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                <button type="button" onClick={handleCancelEdit} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Service</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
