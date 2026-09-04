import { useState, useMemo } from 'react';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { Plus, X, Search, Gift, Settings, Clock, Sparkles, Coins, ChevronRight } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Select from 'react-select';
import { useServices, useThirdPartyServices } from '../hooks/useQueries.js';
import { usePermissions } from '../hooks/usePermissions.js';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';

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
  const { canAdd, canEdit, canDelete } = usePermissions('Offers');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, offerId: null, offerName: '', loading: false });
  
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
  const [isSaving, setIsSaving] = useState(false);

  const filteredOffers = useMemo(() => {
    if (!searchQuery.trim()) return offers;
    const q = searchQuery.toLowerCase();
    return offers.filter(o =>
      (o.name || '').toLowerCase().includes(q) ||
      (o.description || '').toLowerCase().includes(q)
    );
  }, [offers, searchQuery]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSaving) return;
    if (!name.trim()) return toast.error('Offer template name is required');
    if (!defaultPrice) return toast.error('Default price is required');

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      defaultPrice: Number(defaultPrice) || 0,
      defaultValidityDays: Number(defaultValidityDays) || 365,
      totalWashes: Number(totalWashes) || 0,
      freeWashes: Number(freeWashes) || 0,
      terms: terms.trim() || null,
      serviceIds,
      thirdPartyServiceIds,
    };

    setIsSaving(true);
    try {
      if (editId) {
        const existing = offers.find(o => o.id === editId);
        await api.put('/offerMaster/' + editId, {
          ...payload,
          is_active: existing ? existing.isActive : true,
        });
        toast.success('Offer template updated');
      } else {
        await api.post('/offerMaster', payload);
        toast.success('Offer template added');
      }
      handleCancelEdit();
      queryClient.invalidateQueries({ queryKey: ['offerMasterData'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving offer template');
    } finally {
      setIsSaving(false);
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

  function handleDelete(id) {
    const offer = offers.find(o => o.id === id);
    setDeleteModal({
      isOpen: true,
      offerId: id,
      offerName: offer?.name || 'Offer Template',
      loading: false
    });
  }

  async function confirmDeleteOffer() {
    if (!deleteModal.offerId) return;
    setDeleteModal(prev => ({ ...prev, loading: true }));
    try {
      await api.delete('/offerMaster/' + deleteModal.offerId);
      toast.success('Offer template deleted successfully');
      setDeleteModal({ isOpen: false, offerId: null, offerName: '', loading: false });
      queryClient.invalidateQueries({ queryKey: ['offerMasterData'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting template');
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  }

  const offerMetrics = useMemo(() => {
    const total = offers.length;
    const prices = offers.map(o => Number(o.defaultPrice) || 0).filter(p => p > 0);
    const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    const maxVal = offers.length > 0 ? Math.max(...offers.map(o => Number(o.defaultValidityDays) || 0)) : 365;
    const totalFreeWashes = offers.reduce((acc, o) => acc + (Number(o.freeWashes) || 0), 0);
    return { total, avgPrice, maxVal, totalFreeWashes };
  }, [offers]);

  if (loading) return <div className="p-8 text-center text-gray-500 font-bold">Loading Offer Templates...</div>;

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-[1600px] mx-auto flex flex-col gap-4 sm:gap-6 bg-transparent animate-fade-in pb-20">
      
      {/* ── Toolbar ── */}
      <div className="bg-white/70 backdrop-blur-2xl rounded-2xl sm:rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-white/80 p-3.5 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-5 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-black text-[#F6CB59] flex items-center justify-center shadow-md shrink-0">
            <Gift className="w-4 h-4 sm:w-6 sm:h-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base sm:text-xl md:text-[22px] font-black text-gray-900 tracking-tight leading-none mb-1">
              Offer Master
            </h1>
            <p className="text-[10px] sm:text-[12px] font-bold text-gray-500 tracking-wide uppercase">
              Manage VIP packages, annual passes & detailing memberships
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 w-full lg:w-auto shrink-0">
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              className="w-full pl-9 sm:pl-10 pr-4 py-1.5 sm:py-2 bg-white/80 border border-gray-200/60 rounded-xl text-[12px] font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-xs"
              placeholder="Search offers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-center">
            <Link
              to="/assigned-offers"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 sm:py-2.5 rounded-xl bg-gray-100/90 text-gray-900 hover:bg-gray-200 border border-gray-200/80 transition-all font-bold text-[11px] sm:text-[12px] shadow-xs whitespace-nowrap"
            >
              <Settings size={13} strokeWidth={2.5} /> Manage Assigned
            </Link>
            {canAdd && (
              <button
                onClick={handleAdd}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 sm:py-2.5 rounded-xl bg-black text-[#F6CB59] hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-[11px] sm:text-[12px] shadow-md whitespace-nowrap"
              >
                <Plus size={13} strokeWidth={2.5} /> Add Offer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Executive Storytelling Analytics Strip ── */}
      <div className="flex lg:grid lg:grid-cols-4 gap-2.5 sm:gap-4 overflow-x-auto pb-1 hide-scrollbar">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black/90 text-[#F6CB59] flex items-center justify-center shadow-xs shrink-0">
            <Gift size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Active Packages
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight">
              {offerMetrics.total} <span className="text-xs font-bold text-gray-400">Templates</span>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center shadow-xs shrink-0">
            <Clock size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Max Validity
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
              {offerMetrics.maxVal} Days
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shadow-xs shrink-0">
            <Coins size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Avg Package Value
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
              ₹{offerMetrics.avgPrice.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[165px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shadow-xs shrink-0">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Bonus Benefits
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
              +{offerMetrics.totalFreeWashes} Free Washes
            </div>
          </div>
        </div>
      </div>

      {/* ── Ultra-Premium Storytelling Offer Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-5">
        {filteredOffers.map(offer => {
          const totalQuota = (Number(offer.totalWashes) || 0) + (Number(offer.freeWashes) || 0);
          const perWashVal = totalQuota > 0 ? Math.round(Number(offer.defaultPrice || 0) / totalQuota) : null;
          const serviceCount = (offer.serviceIds?.length || 0) + (offer.thirdPartyServiceIds?.length || 0);

          return (
            <div
              key={offer.id}
              onClick={() => { if(canEdit) handleEdit(offer) }}
              className={`bg-white/85 backdrop-blur-2xl rounded-3xl p-4 sm:p-6 border border-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.09)] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden ${
                canEdit ? 'cursor-pointer hover:-translate-y-0.5' : ''
              }`}
            >
              {/* Gold Ambient Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F6CB59] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div>
                {/* Header Row: Title & Actions */}
                <div className="flex items-start justify-between gap-2.5 mb-2">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-2xl bg-black text-[#F6CB59] flex items-center justify-center shadow-md shrink-0 border border-gray-800 group-hover:scale-105 transition-transform mt-0.5">
                      <Gift size={18} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-[18px] font-black text-gray-900 leading-tight group-hover:text-amber-800 transition-colors break-words">
                        {offer.name}
                      </h3>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(offer.id); }}
                      className="w-8 h-8 rounded-xl bg-white text-rose-600 border border-rose-200 shadow-xs flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shrink-0"
                      title="Delete Offer Template"
                    >
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  )}
                </div>

                {/* Description */}
                <p className="text-[12px] font-medium text-gray-600 mb-3.5 line-clamp-2 break-words">
                  {offer.description || <span className="italic text-gray-400">Standard detailing package template</span>}
                </p>

                {/* Storytelling Specification Chips */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 min-w-0">
                  <span className="bg-white/95 border border-gray-200/80 shadow-xs rounded-xl px-2.5 py-1 text-[11px] font-bold text-gray-800 flex items-center gap-1.5 shrink-0">
                    <Clock size={12} className="text-blue-600" />
                    <span>{offer.defaultValidityDays} Days</span>
                  </span>
                  <span className="bg-white/95 border border-gray-200/80 shadow-xs rounded-xl px-2.5 py-1 text-[11px] font-bold text-gray-800 flex items-center gap-1.5 shrink-0">
                    <Sparkles size={12} className="text-amber-600" />
                    <span>{offer.totalWashes} Washes</span>
                  </span>
                  {offer.freeWashes > 0 && (
                    <span className="bg-amber-100/80 border border-amber-300/80 text-amber-950 shadow-xs rounded-xl px-2.5 py-1 text-[11px] font-black flex items-center gap-1.5 shrink-0">
                      <span>✨ +{offer.freeWashes} Free</span>
                    </span>
                  )}
                  {serviceCount > 0 && (
                    <span className="bg-gray-100 border border-gray-200 shadow-xs rounded-xl px-2.5 py-1 text-[11px] font-bold text-gray-600 shrink-0">
                      {serviceCount} Services
                    </span>
                  )}
                </div>
              </div>

              {/* Price & Unit Economics Bar */}
              <div className="flex items-end justify-between pt-3 border-t border-gray-100/90">
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Package Price</div>
                  <div className="text-gray-950 font-black text-[24px] sm:text-[26px] tracking-tight leading-none font-mono">
                    ₹{Number(offer.defaultPrice || 0).toLocaleString('en-IN')}
                  </div>
                  {perWashVal && (
                    <div className="text-[10px] font-bold text-emerald-700 mt-1">
                      ~₹{perWashVal.toLocaleString('en-IN')} / wash value
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-gray-700 group-hover:text-black transition-colors">
                    <span>Edit Template</span>
                    <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {filteredOffers.length === 0 && (
          <div className="col-span-full py-16 text-center border-[2px] border-dashed border-gray-200 rounded-[24px] bg-white/60 backdrop-blur-md shadow-sm">
            <Gift size={40} className="mx-auto text-gray-400 mb-3" />
            <h3 className="text-[18px] font-black text-gray-800 mb-1">No offers found</h3>
            <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Try adjusting your search or add a new template</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white/95 backdrop-blur-2xl shadow-2xl border border-white/60 rounded-t-[28px] sm:rounded-[24px] flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden animate-scale-up">
            {/* Sticky Header */}
            <div className="flex justify-between items-center px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100/60 bg-white/60 shrink-0">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                  {editId ? 'Edit Offer Template' : 'Add New Offer Template'}
                </h3>
                <p className="text-[11px] font-bold text-gray-400">
                  Configure package services, washes, and validity
                </p>
              </div>
              <button onClick={handleCancelEdit} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-5 sm:px-6 py-4 sm:py-5 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  
                  {/* Left Column */}
                  <div className="space-y-3.5 sm:space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Package Name *</label>
                      <input required type="text" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. VIP Interior Detail" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Default Price (₹) *</label>
                        <input required type="number" min="0" step="1" className="input" value={defaultPrice} onChange={e => setDefaultPrice(e.target.value)} placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Validity (Days) *</label>
                        <input required type="number" min="1" step="1" className="input" value={defaultValidityDays} onChange={e => setDefaultValidityDays(e.target.value)} placeholder="365" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Total Washes *</label>
                        <input required type="number" min="0" step="1" className="input" value={totalWashes} onChange={e => setTotalWashes(e.target.value)} placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Free Washes</label>
                        <input required type="number" min="0" step="1" className="input" value={freeWashes} onChange={e => setFreeWashes(e.target.value)} placeholder="0" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Description (Optional)</label>
                      <textarea className="input min-h-[60px] resize-none" value={description} onChange={e => setDescription(e.target.value)} placeholder="Package details..." />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-3.5 sm:space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Standard Services (Included)</label>
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
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Third-Party Services (Included)</label>
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
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Terms (Optional)</label>
                      <textarea className="input min-h-[86px] resize-none" value={terms} onChange={e => setTerms(e.target.value)} placeholder="Terms & Conditions..." />
                    </div>
                  </div>

                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-gray-100/60 flex justify-end gap-3 bg-gray-50/70 backdrop-blur-xl shrink-0">
                <button type="button" onClick={handleCancelEdit} className="btn-secondary px-5" disabled={isSaving}>Cancel</button>
                <button type="submit" className="btn-primary px-6 flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none" disabled={isSaving}>
                  {isSaving ? 'Saving...' : (editId ? 'Update Template' : 'Save Template')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, offerId: null, offerName: '', loading: false })}
        onConfirm={confirmDeleteOffer}
        loading={deleteModal.loading}
        title="Delete Offer Template"
        itemName={deleteModal.offerName}
        message="Are you sure you want to delete this offer package template? Existing assigned client packages will remain active."
        confirmText="Yes, Delete Template"
        confirmVariant="danger"
      />
    </div>
  );
}
