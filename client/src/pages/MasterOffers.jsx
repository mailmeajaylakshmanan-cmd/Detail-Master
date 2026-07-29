import { useState, useMemo } from 'react';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { Plus, X, Search, Gift } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function MasterOffers() {
  const queryClient = useQueryClient();
  
  const { data: offers = [], isLoading: loading } = useQuery({
    queryKey: ['offerMasterData'],
    queryFn: async () => {
      // No offerMaster Postgres table/route yet — do not invent connection
      try {
        const res = await api.get('/offerMaster');
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [defaultValidityDays, setDefaultValidityDays] = useState('365');
  const [terms, setTerms] = useState('');
  const [editId, setEditId] = useState(null);

  const filteredOffers = useMemo(() => {
    let filtered = offers;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(o => 
        o.name.toLowerCase().includes(q) || 
        (o.description && o.description.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [offers, searchQuery]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name) return toast.error('Name is required');
    
    const payload = {
      name,
      description,
      defaultPrice: Number(defaultPrice) || 0,
      defaultValidityDays: Number(defaultValidityDays) || 365,
      terms
    };
    
    try {
      if (editId) {
        await api.put('/offerMaster/' + editId, payload);
        toast.success('Offer template updated');
      } else {
        await api.post('/offerMaster', payload);
        toast.success('Offer template added');
      }
      handleCancelEdit();
      queryClient.invalidateQueries({ queryKey: ['offerMasterData'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving offer template');
    }
  }

  function handleAdd() {
    setEditId(null);
    setName('');
    setDescription('');
    setDefaultPrice('');
    setDefaultValidityDays('365');
    setTerms('');
    setIsModalOpen(true);
  }

  function handleEdit(offer) {
    setEditId(offer.id);
    setName(offer.name);
    setDescription(offer.description || '');
    setDefaultPrice(offer.defaultPrice || '');
    setDefaultValidityDays(offer.defaultValidityDays || '365');
    setTerms(offer.terms || '');
    setIsModalOpen(true);
  }

  function handleCancelEdit() {
    setEditId(null);
    setName('');
    setDescription('');
    setDefaultPrice('');
    setDefaultValidityDays('365');
    setTerms('');
    setIsModalOpen(false);
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this offer template?')) return;
    try {
      await api.delete('/offerMaster/' + id);
      toast.success('Offer template deleted');
      queryClient.invalidateQueries({ queryKey: ['offerMasterData'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting template');
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Offer Templates...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Gift className="text-gray-900" /> Offer Master
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage standard offer packages and pricing templates.</p>
        </div>
        
        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-500" />
            </div>
            <input
              type="text"
              className="input pl-10 bg-white/60"
              placeholder="Search offers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={handleAdd} className="btn-primary whitespace-nowrap flex items-center gap-2">
            <Plus size={18} /> Add Offer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOffers.map(offer => (
          <div key={offer.id} onClick={() => handleEdit(offer)} className="card p-5 relative overflow-hidden flex flex-col cursor-pointer group hover:-translate-y-1 transition-all duration-300">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-bold text-gray-900 pr-12 group-hover:text-blue-600 transition-colors">{offer.name}</h3>
            </div>
            
            <p className="text-[13px] text-gray-500 mb-2 flex-1 pr-12 line-clamp-2">
              {offer.description || <span className="italic text-gray-400">No description provided</span>}
            </p>
            <p className="text-[12px] text-gray-500 mb-6 font-medium">
              Validity: {offer.defaultValidityDays} Days
            </p>

            <div className="flex items-center justify-between mt-auto">
              <div className="text-gray-900 font-bold text-[22px] tracking-tight">
                ₹{Number(offer.defaultPrice || 0).toLocaleString('en-IN')}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(offer.id); }}
                className="text-[11px] font-bold uppercase rounded-full px-4 py-1.5 transition-all shadow-sm bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {filteredOffers.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-white/50 rounded-2xl bg-white/30 backdrop-blur-sm">
            <Gift size={32} className="mx-auto text-gray-500 mb-3" />
            <h3 className="text-lg font-medium text-gray-500">No offers found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your search or add a new offer template.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-white/50">
              <h3 className="text-lg font-bold text-gray-900">{editId ? 'Edit Offer Template' : 'Add New Offer Template'}</h3>
              <button onClick={handleCancelEdit} className="text-gray-500 hover:text-gray-900 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">Package Name *</label>
                <input required type="text" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. VIP Interior Detail" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1.5">Default Price (₹) *</label>
                  <input required type="number" min="0" step="1" className="input" value={defaultPrice} onChange={e => setDefaultPrice(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1.5">Validity (Days) *</label>
                  <input required type="number" min="1" step="1" className="input" value={defaultValidityDays} onChange={e => setDefaultValidityDays(e.target.value)} placeholder="365" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">Description (Optional)</label>
                <textarea className="input min-h-[60px] resize-none" value={description} onChange={e => setDescription(e.target.value)} placeholder="Package details..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">Terms (Optional)</label>
                <textarea className="input min-h-[60px] resize-none" value={terms} onChange={e => setTerms(e.target.value)} placeholder="Terms & Conditions..." />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                <button type="button" onClick={handleCancelEdit} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Template</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
