import { useState, useMemo } from 'react';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { Plus, X, Search, Gift, Settings } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Select from 'react-select';
import { useServices, useThirdPartyServices } from '../hooks/useQueries.js';
import { usePermissions } from '../hooks/usePermissions.js';

const selectStyles = () => ({
  control: (b, s) => ({
    ...b,
    borderColor: s.isFocused ? '#F6CB59' : 'rgba(255,255,255,0.4)',
    borderRadius: '0.75rem',
    boxShadow: s.isFocused ? '0 0 0 3px rgba(251,217,4,.15)' : 'inset 0 2px 4px rgba(0,0,0,0.02)',
    minHeight: '42px',
    fontSize: '13px',
    backgroundColor: 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(12px)',
    color: '#111827',
    transition: 'all .2s',
    '&:hover': { borderColor: '#F6CB59', backgroundColor: 'rgba(255,255,255,0.8)' },
  }),
  menuPortal: b => ({ ...b, zIndex: 9999 }),
  menu: b => ({
    ...b,
    backgroundColor: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(16px)',
    borderRadius: '0.75rem',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
    border: '1px solid rgba(255,255,255,0.5)',
    overflow: 'hidden',
  }),
  option: (b, s) => ({
    ...b,
    fontSize: '13px',
    backgroundColor: s.isFocused ? 'rgba(251,217,4,0.1)' : 'transparent',
    color: '#111827',
    cursor: 'pointer',
    '&:hover': { backgroundColor: 'rgba(251,217,4,0.2)' },
  }),
  multiValue: (styles) => ({
    ...styles,
    backgroundColor: '#111827',
    borderRadius: '6px',
  }),
  multiValueLabel: (styles) => ({
    ...styles,
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
  }),
  multiValueRemove: (styles) => ({
    ...styles,
    color: '#fff',
    ':hover': {
      backgroundColor: '#ef4444',
      color: 'white',
    },
  }),
});

export default function MasterOffers() {
  const queryClient = useQueryClient();
  const { can_delete, can_add, can_edit } = usePermissions('Offers');
  
  const { data: offers = [], isLoading: loading } = useQuery({
    queryKey: ['offerMasterData'],
    queryFn: async () => {
      try {
        const res = await api.get('/offerMaster');
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000
  });

  const { data: services = [] } = useServices();
  const { data: thirdPartyServices = [] } = useThirdPartyServices();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [defaultValidityDays, setDefaultValidityDays] = useState('365');
  const [totalWashes, setTotalWashes] = useState('0');
  const [freeWashes, setFreeWashes] = useState('0');
  const [terms, setTerms] = useState('');
  const [serviceIds, setServiceIds] = useState([]);
  const [thirdPartyServiceIds, setThirdPartyServiceIds] = useState([]);
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
      totalWashes: Number(totalWashes) || 0,
      freeWashes: Number(freeWashes) || 0,
      terms,
      serviceIds,
      thirdPartyServiceIds
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
    setTotalWashes('0');
    setFreeWashes('0');
    setTerms('');
    setServiceIds([]);
    setThirdPartyServiceIds([]);
    setIsModalOpen(true);
  }

  function handleEdit(offer) {
    setEditId(offer.id);
    setName(offer.name);
    setDescription(offer.description || '');
    setDefaultPrice(offer.defaultPrice || '');
    setDefaultValidityDays(offer.defaultValidityDays || '365');
    setTotalWashes(offer.totalWashes?.toString() || '0');
    setFreeWashes(offer.freeWashes?.toString() || '0');
    setTerms(offer.terms || '');
    setServiceIds(offer.serviceIds || []);
    setThirdPartyServiceIds(offer.thirdPartyServiceIds || []);
    setIsModalOpen(true);
  }

  function handleCancelEdit() {
    setEditId(null);
    setName('');
    setDescription('');
    setDefaultPrice('');
    setDefaultValidityDays('365');
    setTotalWashes('0');
    setFreeWashes('0');
    setTerms('');
    setServiceIds([]);
    setThirdPartyServiceIds([]);
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto flex flex-col gap-6 bg-transparent animate-fade-in pb-20">
      
      {/* ── Toolbar ── */}
      <div className="bg-white/60 backdrop-blur-2xl rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-white/80 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-black text-[#F6CB59] flex items-center justify-center shadow-md shrink-0">
            <Gift size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl md:text-[22px] font-black text-gray-900 tracking-tight leading-none mb-1">
              Offer Master
            </h1>
            <p className="text-[12px] font-bold text-gray-500 tracking-wide uppercase">
              Manage standard packages
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0">
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 bg-white/80 border border-gray-200/60 rounded-xl text-[12px] font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-sm"
              placeholder="Search offers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-center">
            <Link
              to="/assigned-offers"
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-200 text-gray-900 hover:bg-gray-300 transition-all font-bold text-[12px] shadow-sm whitespace-nowrap"
            >
              <Settings size={14} strokeWidth={2.5} /> Manage Assigned
            </Link>
            {can_add && (
              <button
                onClick={handleAdd}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-black text-[#F6CB59] hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-[12px] shadow-md whitespace-nowrap"
              >
                <Plus size={14} strokeWidth={2.5} /> Add Offer
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredOffers.map(offer => (
          <div key={offer.id} onClick={() => { if(can_edit) handleEdit(offer) }} className={`card p-6 relative flex flex-col group min-h-[220px] ${can_edit ? 'cursor-pointer' : ''}`}>
            <div className="flex flex-col flex-1">
              <h3 className="text-[20px] font-black text-gray-900 leading-tight mb-2 pr-2">{offer.name}</h3>
              <p className="text-[13px] font-medium text-gray-500 mb-4 line-clamp-2">
                {offer.description || <span className="italic text-gray-400">No description provided</span>}
              </p>
              
              <div className="flex flex-wrap gap-2 mt-auto mb-6">
                <span className="bg-white/50 border border-white/80 shadow-sm rounded-full px-3 py-1.5 text-[10px] font-bold text-gray-800 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="text-gray-400">Val</span> {offer.defaultValidityDays}d
                </span>
                <span className="bg-white/50 border border-white/80 shadow-sm rounded-full px-3 py-1.5 text-[10px] font-bold text-gray-800 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="text-gray-400">Washes</span> {offer.totalWashes}
                </span>
                {offer.freeWashes > 0 && (
                  <span className="bg-[#F6CB59]/20 border border-[#F6CB59]/30 text-[#854D0E] shadow-sm rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <span className="text-[#854D0E]/60">Free</span> {offer.freeWashes}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-end justify-between pt-4 border-t border-white/60">
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Price</div>
                <div className="text-gray-900 font-black text-[28px] tracking-tight leading-none">
                  ₹{Number(offer.defaultPrice || 0).toLocaleString('en-IN')}
                </div>
              </div>
              {can_delete && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(offer.id); }}
                  className="w-7 h-7 rounded-full bg-white text-rose-500 shadow-sm border border-rose-100 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                  <X size={14} strokeWidth={3} />
                </button>
              )}
            </div>
          </div>
        ))}
        {filteredOffers.length === 0 && (
          <div className="col-span-full py-16 text-center border-[3px] border-dashed border-white/50 rounded-[24px] bg-white/40 backdrop-blur-md shadow-sm">
            <Gift size={40} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-[18px] font-black text-gray-800 mb-1">No offers found</h3>
            <p className="text-[13px] font-bold text-gray-500 uppercase tracking-widest">Try adjusting your search or add a new template</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
          <div className="card w-full max-w-3xl overflow-hidden bg-white">
            <div className="flex justify-between items-center p-5 border-b border-white/50">
              <h3 className="text-lg font-bold text-gray-900">{editId ? 'Edit Offer Template' : 'Add New Offer Template'}</h3>
              <button onClick={handleCancelEdit} className="text-gray-500 hover:text-gray-900 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">Package Name *</label>
                    <input required type="text" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. VIP Interior Detail" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1.5">Default Price (₹) *</label>
                      <input required type="number" min="0" step="1" className="input" value={defaultPrice} onChange={e => setDefaultPrice(e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1.5">Validity (Days) *</label>
                      <input required type="number" min="1" step="1" className="input" value={defaultValidityDays} onChange={e => setDefaultValidityDays(e.target.value)} placeholder="365" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1.5">Total Washes *</label>
                      <input required type="number" min="0" step="1" className="input" value={totalWashes} onChange={e => setTotalWashes(e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1.5">Free Washes</label>
                      <input required type="number" min="0" step="1" className="input" value={freeWashes} onChange={e => setFreeWashes(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">Description (Optional)</label>
                    <textarea className="input min-h-[60px] resize-none" value={description} onChange={e => setDescription(e.target.value)} placeholder="Package details..." />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">Standard Services (Included)</label>
                    <Select
                      isMulti
                      styles={selectStyles()}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      options={services.map(s => ({ value: s.id, label: s.name }))}
                      value={services.filter(s => serviceIds.includes(s.id)).map(s => ({ value: s.id, label: s.name }))}
                      onChange={opts => setServiceIds(opts.map(o => o.value))}
                      placeholder="Select standard services..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">Third-Party Services (Included)</label>
                    <Select
                      isMulti
                      styles={selectStyles()}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      options={thirdPartyServices.map(s => ({ value: s.id, label: s.name }))}
                      value={thirdPartyServices.filter(s => thirdPartyServiceIds.includes(s.id)).map(s => ({ value: s.id, label: s.name }))}
                      onChange={opts => setThirdPartyServiceIds(opts.map(o => o.value))}
                      placeholder="Select third-party services..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">Terms (Optional)</label>
                    <textarea className="input min-h-[86px] resize-none" value={terms} onChange={e => setTerms(e.target.value)} placeholder="Terms & Conditions..." />
                  </div>
                </div>

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
