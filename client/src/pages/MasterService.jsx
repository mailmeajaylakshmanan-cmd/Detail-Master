import { useState, useMemo } from 'react';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import {
  Plus,
  Edit3,
  X,
  Search,
  Sparkles,
  Clock,
  Trash2,
  AlertTriangle,
  Loader2,
  Car,
  Zap,
  LayoutGrid,
  List,
  TrendingUp,
  Layers,
  Coins,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useServices, useVehicleTypes } from '../hooks/useQueries.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { queryKeys } from '../api/queryKeys.js';
import { usePermissions } from '../hooks/usePermissions.js';

export default function MasterService() {
  const queryClient = useQueryClient();
  const { data: services = [], isLoading: loading } = useServices();
  const { data: vehicleTypes = [] } = useVehicleTypes();
  const { canAdd, canEdit, canDelete } = usePermissions('Services');

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 250);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [estimateTime, setEstimateTime] = useState('');
  const [vehiclePrices, setVehiclePrices] = useState({});
  const [quickFillPrice, setQuickFillPrice] = useState('');
  const [editId, setEditId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete Confirmation State
  const [deleteServiceId, setDeleteServiceId] = useState(null);
  const [deleteDependencies, setDeleteDependencies] = useState(null);
  const [checkingDependencies, setCheckingDependencies] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Active Vehicle Types
  const activeVehicleTypes = useMemo(() => {
    return vehicleTypes.filter((vt) => vt.isActive);
  }, [vehicleTypes]);

  // Extract unique categories for filtering
  const categories = useMemo(() => {
    const set = new Set();
    services.forEach((s) => {
      if (s.description && s.description.trim()) {
        set.add(s.description.trim());
      }
    });
    return Array.from(set);
  }, [services]);

  // Executive Analytics Metrics
  const executiveMetrics = useMemo(() => {
    const total = services.length;
    const activeCount = services.filter((s) => s.isActive).length;

    // Calculate price spectrum
    const allPrices = [];
    services.forEach((s) => {
      if (s.vehiclePricesMap) {
        Object.values(s.vehiclePricesMap).forEach((p) => {
          const num = Number(p);
          if (!isNaN(num) && num > 0) allPrices.push(num);
        });
      }
    });

    const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
    const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;

    // Average duration in minutes
    const validDurations = services
      .map((s) => {
        const match = (s.estimateTime || '').match(/\d+/);
        return match ? parseInt(match[0], 10) : null;
      })
      .filter((d) => d !== null);

    const avgDuration =
      validDurations.length > 0
        ? Math.round(validDurations.reduce((a, b) => a + b, 0) / validDurations.length)
        : null;

    return {
      total,
      activeCount,
      categoriesCount: categories.length,
      minPrice,
      maxPrice,
      avgDuration,
      coveragePercent:
        total > 0
          ? Math.round(
              (services.filter((s) => Object.keys(s.vehiclePricesMap || {}).length > 0).length /
                total) *
                100
            )
          : 0,
    };
  }, [services, categories]);

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const q = debouncedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === 'ALL' ||
        (s.description || '').trim().toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [services, debouncedSearch, selectedCategory]);

  // Quick fill all vehicle types in modal
  function handleApplyQuickFill() {
    if (!quickFillPrice || isNaN(Number(quickFillPrice))) {
      return toast.error('Please enter a valid price to apply');
    }
    const newPrices = { ...vehiclePrices };
    activeVehicleTypes.forEach((vt) => {
      newPrices[vt.id] = quickFillPrice;
    });
    setVehiclePrices(newPrices);
    toast.success(`Applied ₹${Number(quickFillPrice).toLocaleString('en-IN')} to all vehicle types`);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSaving) return;
    if (!name.trim()) return toast.error('Service name is required');

    const formattedVehiclePrices = Object.entries(vehiclePrices)
      .filter(([vtId, p]) => p !== '' && p !== null && !isNaN(Number(p)))
      .map(([vtId, p]) => ({
        vehicle_type_id: Number(vtId),
        price: Number(p),
      }));

    const payload = {
      service_name: name.trim(),
      category: description.trim() || null,
      is_active: true,
      estimate_time: estimateTime.trim() || null,
      vehicle_prices: formattedVehiclePrices,
    };

    setIsSaving(true);
    try {
      if (editId) {
        const existing = services.find((s) => s.id === editId);
        await api.put('/services/' + editId, {
          ...payload,
          is_active: existing ? existing.isActive : true,
        });
        toast.success('Service updated successfully');
      } else {
        await api.post('/services', payload);
        toast.success('Service created successfully');
      }
      handleCancelEdit();
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving service');
    } finally {
      setIsSaving(false);
    }
  }

  function handleAdd() {
    setEditId(null);
    setName('');
    setDescription('');
    setEstimateTime('');
    setVehiclePrices({});
    setQuickFillPrice('');
    setIsModalOpen(true);
  }

  function handleEdit(srv) {
    setEditId(srv.id);
    setName(srv.name || '');
    setDescription(srv.description || '');
    setEstimateTime(srv.estimateTime || '');
    setVehiclePrices(srv.vehiclePricesMap || {});
    setQuickFillPrice('');
    setIsModalOpen(true);
  }

  function handleCancelEdit() {
    setEditId(null);
    setName('');
    setDescription('');
    setEstimateTime('');
    setVehiclePrices({});
    setQuickFillPrice('');
    setIsModalOpen(false);
  }

  async function handleStatusChange(id, newStatusStr) {
    const isActive = newStatusStr === 'Active';
    const existing = services.find((s) => s.id === id);
    if (!existing) return;
    try {
      const vpPayload = (existing.vehiclePrices || []).map((vp) => ({
        vehicle_type_id: vp.vehicle_type_id,
        price: Number(vp.price) || 0,
      }));

      await api.put(`/services/${id}`, {
        service_name: existing.name,
        category: existing.description || null,
        is_active: isActive,
        estimate_time: existing.estimateTime || null,
        vehicle_prices: vpPayload,
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

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-gray-500 gap-3">
        <Loader2 className="animate-spin text-gray-900" size={32} />
        <p className="font-bold text-sm">Loading services and pricing matrix...</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-[1500px] mx-auto space-y-4 sm:space-y-6">
      {/* ── Top Header Banner ── */}
      <div className="bg-white/70 backdrop-blur-2xl rounded-2xl sm:rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-white/80 p-3.5 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-5 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-black text-[#F6CB59] flex items-center justify-center shadow-md shrink-0">
            <Sparkles className="w-4 h-4 sm:w-6 sm:h-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base sm:text-xl md:text-[22px] font-black text-gray-900 tracking-tight leading-none mb-1">
              Service Master
            </h1>
            <p className="text-[10px] sm:text-[12px] font-bold text-gray-500 tracking-wide uppercase">
              Manage detailing services & vehicle-type pricing matrix
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 w-full lg:w-auto shrink-0">
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              className="w-full pl-9 sm:pl-10 pr-4 py-1.5 sm:py-2.5 bg-white/80 border border-gray-200/60 rounded-xl text-[12px] sm:text-[13px] font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-xs"
              placeholder="Search services or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* View Mode Toggle Switch */}
            <div className="flex items-center bg-gray-100/90 p-1 rounded-xl border border-gray-200/60 shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'cards'
                    ? 'bg-black text-[#F6CB59] shadow-sm'
                    : 'text-gray-600 hover:text-gray-950'
                }`}
                title="Executive Cards View"
              >
                <LayoutGrid size={13} />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-black text-[#F6CB59] shadow-sm'
                    : 'text-gray-600 hover:text-gray-950'
                }`}
                title="Matrix Table View"
              >
                <List size={13} />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>

            {canAdd && (
              <button
                onClick={handleAdd}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 sm:py-2.5 rounded-xl bg-black text-[#F6CB59] hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-[12px] sm:text-[13px] shadow-md whitespace-nowrap"
              >
                <Plus size={14} strokeWidth={2.5} /> Add Service
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Executive Storytelling Analytics Strip ── */}
      <div className="flex lg:grid lg:grid-cols-4 gap-2.5 sm:gap-4 overflow-x-auto pb-1 hide-scrollbar">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black/90 text-[#F6CB59] flex items-center justify-center shadow-xs shrink-0">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Active Packages
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight">
              {executiveMetrics.activeCount} <span className="text-xs font-bold text-gray-400">/ {executiveMetrics.total}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shadow-xs shrink-0">
            <Layers size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Segments
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
              {executiveMetrics.categoriesCount} <span className="text-xs font-bold text-gray-400">Categories</span>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center shadow-xs shrink-0">
            <Clock size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Avg. Duration
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
              {executiveMetrics.avgDuration ? `~${executiveMetrics.avgDuration} mins` : 'Flexible'}
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[165px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shadow-xs shrink-0">
            <Coins size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Pricing Spectrum
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
              {executiveMetrics.minPrice > 0
                ? `₹${executiveMetrics.minPrice.toLocaleString('en-IN')} – ₹${executiveMetrics.maxPrice.toLocaleString('en-IN')}`
                : 'Configurable'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Category Filter Pills & Counter ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full hide-scrollbar">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-[12px] font-black transition-all whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-black text-[#F6CB59] shadow-sm'
                : 'bg-white/80 hover:bg-white text-gray-600 border border-gray-200/60'
            }`}
          >
            All Services ({services.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-[12px] font-black transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-black text-[#F6CB59] shadow-sm'
                  : 'bg-white/80 hover:bg-white text-gray-600 border border-gray-200/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="text-[12px] font-bold text-gray-500 bg-white/60 px-3 py-1.5 rounded-xl border border-gray-200/50 backdrop-blur-sm">
          Showing <span className="text-gray-900 font-black">{filteredServices.length}</span> of {services.length} services
        </div>
      </div>

      {/* ── Ultra-Premium Executive Storytelling Cards Model ── */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-5 pb-12">
          {filteredServices.map((srv) => {
            const configuredPrices = activeVehicleTypes
              .map((vt) => ({
                vtId: vt.id,
                name: vt.name,
                price: srv.vehiclePricesMap?.[vt.id],
              }))
              .filter((item) => item.price !== undefined && item.price !== null && item.price > 0);

            const pricesList = configuredPrices.map((p) => Number(p.price));
            const cardMinPrice = pricesList.length > 0 ? Math.min(...pricesList) : null;
            const cardMaxPrice = pricesList.length > 0 ? Math.max(...pricesList) : null;

            return (
              <div
                key={srv.id}
                onClick={() => {
                  if (canEdit) handleEdit(srv);
                }}
                className={`bg-white/85 backdrop-blur-2xl rounded-3xl p-4 sm:p-5 border border-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.09)] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden ${
                  canEdit ? 'cursor-pointer hover:-translate-y-0.5' : ''
                }`}
              >
                {/* Top Subtle Amber Border Highlight */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F6CB59] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div>
                  {/* Card Header: Line 1 - Icon & Title + Action Buttons */}
                  <div className="flex items-start justify-between gap-2.5 mb-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-2xl bg-black text-[#F6CB59] flex items-center justify-center shadow-md shrink-0 border border-gray-800 group-hover:scale-105 transition-transform mt-0.5">
                        <Sparkles size={18} strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-[17px] font-black text-gray-900 leading-tight group-hover:text-amber-800 transition-colors break-words">
                          {srv.name}
                        </h3>
                      </div>
                    </div>

                    {/* Edit & Delete Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <button
                          onClick={() => handleEdit(srv)}
                          className="w-8 h-8 rounded-xl bg-white text-gray-700 border border-gray-200 shadow-xs flex items-center justify-center hover:bg-black hover:text-[#F6CB59] transition-all"
                          title="Edit Service Pricing"
                        >
                          <Edit3 size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={(e) => handleDeleteClick(e, srv.id)}
                          className="w-8 h-8 rounded-xl bg-white text-rose-600 border border-rose-200 shadow-xs flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all"
                          title="Delete Service"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Header: Line 2 - Category Badge & Status Pill */}
                  <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
                    {srv.description ? (
                      <div className="inline-flex items-center text-[10px] font-black text-amber-950 bg-[#F6CB59]/25 border border-[#F6CB59]/40 px-2.5 py-0.5 rounded-lg uppercase tracking-wider truncate max-w-[65%] min-w-0">
                        <span className="truncate">{srv.description}</span>
                      </div>
                    ) : (
                      <div className="text-[10px] font-bold text-gray-400 italic">Standard Detailing</div>
                    )}

                    <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                      <button
                        onClick={() => handleStatusChange(srv.id, srv.isActive ? 'Inactive' : 'Active')}
                        className={`text-[10px] font-black uppercase rounded-full px-2.5 py-0.5 transition-all shadow-xs ${
                          srv.isActive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200'
                        }`}
                      >
                        {srv.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>

                  {/* Value / Storytelling Strip */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 my-2.5 p-2 bg-gray-50/90 rounded-xl border border-gray-200/60 min-w-0">
                    {srv.estimateTime && (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700 bg-white px-2 py-0.5 rounded-lg shadow-xs border border-gray-200/60 shrink-0">
                        <Clock size={11} className="text-amber-600" />
                        <span>{srv.estimateTime}</span>
                      </div>
                    )}
                    {cardMinPrice !== null ? (
                      <div className="flex items-center gap-1.5 text-[11px] font-black text-gray-800 bg-white px-2 py-0.5 rounded-lg shadow-xs border border-gray-200/60 shrink-0">
                        <Coins size={11} className="text-[#F6CB59]" />
                        <span>
                          {cardMinPrice === cardMaxPrice
                            ? `₹${cardMinPrice.toLocaleString('en-IN')}`
                            : `₹${cardMinPrice.toLocaleString('en-IN')} – ₹${cardMaxPrice.toLocaleString('en-IN')}`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold text-gray-400 italic">No pricing tiers active</span>
                    )}
                    <div className="ml-auto text-[10px] font-black text-gray-500 uppercase tracking-wider shrink-0">
                      {configuredPrices.length} / {activeVehicleTypes.length} Tiers
                    </div>
                  </div>

                  {/* Vehicle Pricing Micro-Grid */}
                  {configuredPrices.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 my-2.5">
                      {configuredPrices.map((item) => (
                        <div
                          key={item.vtId}
                          className="bg-white/95 hover:bg-white rounded-xl p-2 sm:p-2.5 border border-gray-200/80 hover:border-amber-400 shadow-xs transition-all flex flex-col justify-between group/tier min-w-0 overflow-hidden"
                        >
                          <div className="flex items-center gap-1 text-[11px] font-bold text-gray-600 truncate min-w-0">
                            <Car size={11} className="text-gray-400 group-hover/tier:text-amber-600 transition-colors shrink-0" />
                            <span className="truncate">{item.name}</span>
                          </div>
                          <div className="text-[13px] sm:text-[14px] font-black font-mono text-gray-950 mt-1 truncate">
                            ₹{Number(item.price).toLocaleString('en-IN')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 my-2.5 text-center rounded-xl bg-amber-50/50 border border-dashed border-amber-200 text-amber-800 text-[11px] font-bold">
                      ⚡ Tap to configure vehicle pricing tiers
                    </div>
                  )}
                </div>

                {/* Card Footer CTA */}
                <div className="mt-1 pt-2.5 border-t border-gray-100/90 flex items-center justify-between text-xs">
                  <span className="font-extrabold text-gray-500 group-hover:text-gray-900 transition-colors flex items-center gap-1 text-[11px]">
                    <span>Configure Matrix</span>
                    <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    configuredPrices.length === activeVehicleTypes.length
                      ? 'text-emerald-800 bg-emerald-50'
                      : 'text-amber-800 bg-amber-50'
                  }`}>
                    {configuredPrices.length === activeVehicleTypes.length ? '100% Configured' : 'Partial Setup'}
                  </span>
                </div>
              </div>
            );
          })}

          {filteredServices.length === 0 && (
            <div className="col-span-full py-16 text-center text-gray-500 bg-white/60 rounded-3xl border border-white/80">
              <Sparkles size={36} className="mx-auto text-gray-400 mb-3" />
              <h3 className="text-base font-bold text-gray-800">No services found</h3>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your category or search term</p>
            </div>
          )}
        </div>
      ) : (
        /* ── Compact Matrix Table Container ── */
        <div className="bg-white/80 backdrop-blur-2xl rounded-2xl sm:rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-white/80 overflow-hidden pb-12">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 via-gray-100/70 to-gray-50 border-b border-gray-200/80">
                  <th className="py-3.5 px-5 text-[11px] font-black text-gray-700 uppercase tracking-wider w-[260px]">
                    Service Details
                  </th>
                  <th className="py-3.5 px-4 text-[11px] font-black text-gray-700 uppercase tracking-wider text-center w-[120px]">
                    Est. Duration
                  </th>
                  <th className="py-3.5 px-5 text-[11px] font-black text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Car size={13} className="text-gray-500" />
                      <span>Pricing Matrix by Vehicle Type</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-[11px] font-black text-gray-700 uppercase tracking-wider text-center w-[110px]">
                    Status
                  </th>
                  <th className="py-3.5 px-5 text-[11px] font-black text-gray-700 uppercase tracking-wider text-right w-[100px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/80">
                {filteredServices.map((srv) => {
                  const configuredPrices = activeVehicleTypes
                    .map((vt) => ({
                      vtId: vt.id,
                      name: vt.name,
                      price: srv.vehiclePricesMap?.[vt.id],
                    }))
                    .filter((item) => item.price !== undefined && item.price !== null && item.price > 0);

                  return (
                    <tr
                      key={srv.id}
                      onClick={() => handleEdit(srv)}
                      className="hover:bg-amber-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Service Details */}
                      <td className="py-3.5 px-5 align-middle">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gray-100 border border-gray-200/60 flex items-center justify-center text-gray-700 group-hover:bg-[#F6CB59]/20 group-hover:text-amber-900 transition-colors shrink-0 mt-0.5">
                            <Sparkles size={14} />
                          </div>
                          <div>
                            <div className="font-black text-[14px] text-gray-900 group-hover:text-amber-800 transition-colors leading-snug">
                              {srv.name}
                            </div>
                            {srv.description && (
                              <div className="inline-flex items-center mt-0.5 text-[10px] font-black text-amber-900 bg-[#F6CB59]/20 border border-[#F6CB59]/30 px-2 py-0.5 rounded-md">
                                {srv.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Estimated Time */}
                      <td className="py-3.5 px-4 text-center align-middle">
                        {srv.estimateTime ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-700 bg-amber-50 border border-amber-200/60 rounded-full px-2.5 py-0.5">
                            <Clock size={11} className="text-amber-700" />
                            {srv.estimateTime}
                          </span>
                        ) : (
                          <span className="text-gray-300 font-bold text-[12px]">—</span>
                        )}
                      </td>

                      {/* Pricing Matrix */}
                      <td className="py-3.5 px-5 align-middle">
                        {configuredPrices.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {configuredPrices.map((item) => (
                              <div
                                key={item.vtId}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-gray-200 shadow-xs group-hover:border-amber-300 transition-all text-xs"
                              >
                                <span className="font-bold text-gray-600 text-[11px]">{item.name}:</span>
                                <span className="font-mono font-black text-gray-900 text-[11px]">
                                  ₹{Number(item.price).toLocaleString('en-IN')}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic font-medium">
                            No vehicle pricing configured
                          </span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4 text-center align-middle">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(srv.id, srv.isActive ? 'Inactive' : 'Active');
                          }}
                          className={`text-[10px] font-black uppercase rounded-full px-3 py-1 transition-all shadow-xs ${
                            srv.isActive
                              ? 'bg-amber-400 text-amber-950 hover:bg-amber-500'
                              : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                          }`}
                        >
                          {srv.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right align-middle">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {canEdit && (
                            <button
                              onClick={() => handleEdit(srv)}
                              className="w-7 h-7 rounded-xl bg-white text-gray-700 border border-gray-200/80 shadow-xs flex items-center justify-center hover:bg-black hover:text-[#F6CB59] hover:border-black transition-all"
                              title="Edit Service Pricing"
                            >
                              <Edit3 size={13} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={(e) => handleDeleteClick(e, srv.id)}
                              className="w-7 h-7 rounded-xl bg-white text-rose-600 border border-rose-100 shadow-xs flex items-center justify-center hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all"
                              title="Delete Service"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredServices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-gray-500">
                      <Sparkles size={36} className="mx-auto text-gray-400 mb-3" />
                      <h3 className="text-base font-bold text-gray-800">No services found</h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Try adjusting your search query, filter, or click "Add Service" to create one.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Service Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white/95 backdrop-blur-2xl shadow-2xl border border-white/60 rounded-t-[28px] sm:rounded-[24px] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-scale-up">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100/60 bg-white/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-black text-[#F6CB59] flex items-center justify-center shadow-md shrink-0">
                  <Sparkles size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-gray-900 leading-tight">
                    {editId ? 'Edit Service & Pricing' : 'Add New Service'}
                  </h3>
                  <p className="text-[11px] font-bold text-gray-400">
                    Set service details and vehicle category rates
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelEdit}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-5 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      Service Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      className="input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Foam Wash & Wax"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <Clock size={12} className="text-amber-700" />
                      Estimate Duration
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={estimateTime}
                      onChange={(e) => setEstimateTime(e.target.value)}
                      placeholder="e.g. 45 mins, 2-3 hrs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Category / Description (Optional)
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Wash, Interior, Exterior, Detailing"
                  />
                </div>

                {/* Vehicle Type Pricing Matrix Box */}
                <div className="border border-gray-200/80 rounded-2xl p-4 sm:p-5 bg-slate-50/60 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/80">
                    <div>
                      <span className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Car size={15} className="text-gray-700" />
                        Vehicle Type Pricing
                      </span>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                        Enter the rate for each vehicle category
                      </p>
                    </div>

                    {/* Quick Fill Box */}
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-xs shrink-0">
                      <span className="text-xs font-bold text-gray-500">Quick Set:</span>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={quickFillPrice}
                          onChange={(e) => setQuickFillPrice(e.target.value)}
                          className="w-20 pl-5 pr-2 py-1 text-xs font-mono font-bold bg-gray-50 border border-gray-200 rounded-lg text-right focus:bg-white focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyQuickFill}
                        className="px-2.5 py-1 bg-black text-[#F6CB59] rounded-lg text-xs font-black hover:bg-gray-800 transition-all flex items-center gap-1 shadow-xs"
                      >
                        <Zap size={12} /> Apply All
                      </button>
                    </div>
                  </div>

                  {/* Neatly Styled 2-Column Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
                    {activeVehicleTypes.map((vt) => (
                      <div
                        key={vt.id}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-white border border-gray-200/90 shadow-2xs hover:border-gray-300 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-900 flex items-center justify-center font-black text-xs shrink-0">
                            {vt.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-gray-900 truncate">{vt.name}</div>
                            <div className="text-[9px] font-bold text-gray-400 uppercase">Category</div>
                          </div>
                        </div>

                        <div className="relative shrink-0">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="w-24 sm:w-28 pl-5 sm:pl-6 pr-2.5 py-1.5 text-xs font-mono font-black text-gray-900 bg-gray-50 border border-gray-200 rounded-xl text-right focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all"
                            placeholder="0"
                            value={vehiclePrices[vt.id] !== undefined ? vehiclePrices[vt.id] : ''}
                            onChange={(e) =>
                              setVehiclePrices({ ...vehiclePrices, [vt.id]: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-gray-100/60 flex justify-end gap-3 bg-gray-50/70 backdrop-blur-xl shrink-0">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn-secondary px-5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary px-6 flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editId ? 'Update Service' : 'Create Service'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dependency Warning Modal */}
      {deleteServiceId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-t-[28px] sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col animate-scale-up">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-red-50/50 shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-red-700 flex items-center gap-2">
                <AlertTriangle size={20} /> Confirm Deletion
              </h2>
              <button
                type="button"
                onClick={() => {
                  setDeleteServiceId(null);
                  setDeleteDependencies(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-100 text-red-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6">
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
                        {deleteDependencies.webBookings > 0 && (
                          <li>Linked to {deleteDependencies.webBookings} Online Bookings</li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteServiceId(null);
                        setDeleteDependencies(null);
                      }}
                      className="px-4 py-2 rounded-xl border border-gray-200 font-bold text-xs text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmDelete}
                      disabled={deleting}
                      className="px-5 py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 flex items-center justify-center gap-2 min-w-[100px] shadow-sm"
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
