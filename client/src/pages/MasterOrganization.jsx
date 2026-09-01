import { useState, useMemo } from 'react';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { Plus, Search, Briefcase, Filter, UserPlus, Building2, Car } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { queryKeys } from '../api/queryKeys.js';
import { usePermissions } from '../hooks/usePermissions.js';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';

import OrganizationTable from '../components/organizations/OrganizationTable.jsx';
import OrganizationFormModal from '../components/organizations/OrganizationFormModal.jsx';

export default function MasterOrganization() {
  const queryClient = useQueryClient();
  const { data: organizations = [], isLoading: loadingOrganizations } = useOrganizations();
  const { canAdd, canEdit, canDelete } = usePermissions('Organizations');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, orgId: null, orgName: '', loading: false });

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [activeFilter, setActiveFilter] = useState('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [formVehicles, setFormVehicles] = useState([]);
  const [editId, setEditId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const filteredOrganizations = useMemo(() => {
    let filtered = organizations;
    if (debouncedSearch) {
      filtered = filtered.filter(o =>
        (o.org_name || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (o.contact_person || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (o.phone || '').includes(debouncedSearch)
      );
    }
    return filtered;
  }, [organizations, debouncedSearch, activeFilter]);

  const enrichedRows = useMemo(() => {
    return filteredOrganizations.map(o => ({
      ...o,
      raw: o,
    }));
  }, [filteredOrganizations]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSaving) return;
    if (!orgName.trim()) return toast.error('Organization Name is required');

    setIsSaving(true);
    try {
      let orgId = editId;
      if (editId) {
        await api.put('/organizations/' + editId, { org_name: orgName, contact_person: contactPerson, phone, email, address });
      } else {
        const res = await api.post('/organizations', { org_name: orgName, contact_person: contactPerson, phone, email, address });
        orgId = res.data.id;
      }

      // Vehicles: add new rows, update edited existing rows. Removal is handled
      // immediately (deactivate) when the user clicks remove, not deferred here.
      for (const v of formVehicles) {
        if (!v.make && !v.model && !v.plate) continue;
        const make_model = `${v.make || ''} ${v.model || ''}`.trim();
        const vtId = v.vehicle_type_id || null;
        const vtName = v.type || null;
        if (v.id) {
          await api.put('/vehicles/' + v.id, {
            organization_id: orgId,
            make_model,
            license_vin: v.plate,
            vehicle_type_id: vtId,
            vehicle_type: vtName,
            is_active: true
          });
        } else {
          await api.post('/vehicles', {
            organization_id: orgId,
            make_model,
            license_vin: v.plate,
            vehicle_type_id: vtId,
            vehicle_type: vtName,
            is_active: true
          });
        }
      }

      toast.success(editId ? 'Organization updated' : 'Organization added');
      handleCancelEdit();
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Error saving organization');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveVehicle(idx) {
    const v = formVehicles[idx];
    if (v.id) {
      try {
        await api.put('/vehicles/' + v.id, { organization_id: editId, make_model: `${v.make || ''} ${v.model || ''}`.trim(), license_vin: v.plate, is_active: false });
        queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      } catch (err) {
        toast.error(err.response?.data?.message || 'Error removing vehicle');
        return;
      }
    }
    setFormVehicles(fv => fv.filter((_, i) => i !== idx));
  }
  
  function handleDelete(id) {
    const org = organizations.find(o => o.id === id);
    setDeleteModal({
      isOpen: true,
      orgId: id,
      orgName: org?.org_name || 'Organization',
      loading: false
    });
  }

  async function confirmDeleteOrganization() {
    if (!deleteModal.orgId) return;
    setDeleteModal(prev => ({ ...prev, loading: true }));
    try {
      await api.delete('/organizations/' + deleteModal.orgId);
      toast.success('Organization archived successfully');
      setDeleteModal({ isOpen: false, orgId: null, orgName: '', loading: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting organization');
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  }

  function handleAdd() {
    setEditId(null);
    setOrgName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setFormVehicles([]);
    setIsModalOpen(true);
  }

  function handleEdit(organization) {
    setEditId(organization.id);
    setOrgName(organization.org_name || '');
    setContactPerson(organization.contact_person || '');
    setPhone(organization.phone || '');
    setEmail(organization.email || '');
    setAddress(organization.address || '');
    setFormVehicles((organization.vehicles || []).filter(v => v.isActive !== false));
    setIsModalOpen(true);
  }

  function handleCancelEdit() {
    setEditId(null);
    setOrgName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setIsModalOpen(false);
  }

  const isLoading = loadingOrganizations;

  return (
    <div className="w-full min-h-[calc(100vh-100px)] flex flex-col bg-transparent animate-fade-in p-2 sm:p-4">
      <div className="w-full flex flex-col h-full gap-3 sm:gap-4">
        {/* Toolbar */}
        <div className="bg-white/60 backdrop-blur-2xl rounded-2xl sm:rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-white/80 p-3.5 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-5 shrink-0">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-black text-[#F6CB59] flex items-center justify-center shadow-md shrink-0">
                <Briefcase className="w-4 h-4 sm:w-6 sm:h-6" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-base sm:text-xl md:text-[22px] font-black text-gray-900 tracking-tight leading-none mb-1">
                  Organization Master
                </h1>
                <p className="text-[10px] sm:text-[12px] font-bold text-gray-500 tracking-wide uppercase">
                  Manage corporate clients & fleet accounts
                </p>
              </div>
            </div>
            
            {canAdd && (
              <button
                onClick={handleAdd}
                className="btn-primary whitespace-nowrap flex lg:hidden items-center gap-1 text-[11px] px-2.5 py-1.5 shrink-0"
              >
                <Plus size={13} strokeWidth={2.5} /> Add New
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <div className="relative flex-1 lg:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} strokeWidth={2.5} />
              <input
                type="text"
                placeholder="Search organizations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 pr-4 py-1.5 sm:py-2.5 text-[12px] sm:text-[13px] font-medium w-full rounded-xl"
              />
            </div>

            {canAdd && (
              <button
                onClick={handleAdd}
                className="btn-primary whitespace-nowrap hidden lg:flex items-center gap-1.5"
              >
                <Plus size={14} strokeWidth={2.5} /> Add New Organization
              </button>
            )}
          </div>
        </div>

        {/* ── Executive Storytelling Analytics Strip ── */}
        <div className="flex lg:grid lg:grid-cols-3 gap-2.5 sm:gap-4 overflow-x-auto pb-1 hide-scrollbar">
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black/90 text-[#F6CB59] flex items-center justify-center shadow-xs shrink-0">
              <Briefcase size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Corporate Clients
              </div>
              <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight">
                {organizations.length} <span className="text-xs font-bold text-gray-400">Accounts</span>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shadow-xs shrink-0">
              <Car size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Fleet Fleet Roster
              </div>
              <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
                {organizations.reduce((acc, o) => acc + (o.vehicles?.filter(v => v.isActive !== false)?.length || 0), 0)} Vehicles
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[165px] sm:min-w-0 flex-1 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shadow-xs shrink-0">
              <Building2 size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                B2B Billing Status
              </div>
              <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
                Active Corporate Ledger
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">Loading...</div>
        ) : (
          <OrganizationTable
            rows={enrichedRows}
            onEdit={handleEdit}
            onDelete={handleDelete}
            canDelete={canDelete}
          />
        )}
      </div>

      <OrganizationFormModal
        isOpen={isModalOpen}
        editId={editId}
        orgName={orgName} setOrgName={setOrgName}
        contactPerson={contactPerson} setContactPerson={setContactPerson}
        phone={phone} setPhone={setPhone}
        email={email} setEmail={setEmail}
        address={address} setAddress={setAddress}
        formVehicles={formVehicles} setFormVehicles={setFormVehicles}
        onRemoveVehicle={handleRemoveVehicle}
        onSubmit={handleSubmit}
        onCancel={handleCancelEdit}
        isSaving={isSaving}
      />

      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, orgId: null, orgName: '', loading: false })}
        onConfirm={confirmDeleteOrganization}
        loading={deleteModal.loading}
        title="Archive Organization Profile"
        itemName={deleteModal.orgName}
        message="Are you sure you want to archive this organization? Fleet invoice records will remain fully preserved."
        confirmText="Yes, Archive Organization"
        confirmVariant="danger"
      />
    </div>
  );
}
