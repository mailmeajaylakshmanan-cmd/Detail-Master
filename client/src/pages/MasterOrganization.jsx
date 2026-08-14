import { useState, useMemo } from 'react';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { Plus, Search, Briefcase, Filter, UserPlus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrganizations } from '../hooks/useQueries.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { queryKeys } from '../api/queryKeys.js';

import OrganizationTable from '../components/organizations/OrganizationTable.jsx';
import OrganizationFormModal from '../components/organizations/OrganizationFormModal.jsx';

export default function MasterOrganization() {
  const queryClient = useQueryClient();
  const { data: organizations = [], isLoading: loadingOrganizations } = useOrganizations();

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
    if (!orgName) return toast.error('Organization Name is required');

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
    <div className="w-full h-[calc(100vh-100px)] flex flex-col bg-transparent animate-fade-in">
      <div className="w-full flex flex-col h-full gap-4">
        {/* Toolbar */}
        <div className="bg-white/60 backdrop-blur-2xl rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-white/80 p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center justify-between gap-2 px-1 lg:px-0">
            <div className="flex items-center gap-2">
              <Briefcase size={18} className="text-gray-400" />
              <h2 className="text-sm font-bold text-gray-700">Organizations</h2>
            </div>
            
            <button
              onClick={handleAdd}
              className="w-[42px] h-[42px] shrink-0 rounded-[12px] border border-white/80 bg-white/50 shadow-sm flex items-center justify-center text-gray-500 hover:bg-white/80 transition-colors"
            >
              <Plus size={13} strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex items-center gap-2 lg:gap-3 px-1 lg:px-0">
            <div className="relative flex-1 lg:flex-none">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} strokeWidth={2.5} />
              <input
                type="text"
                placeholder="Search organizations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 pr-4 py-2.5 text-[12px] font-medium w-full lg:w-[220px] rounded-[12px]"
              />
            </div>

            <button
              onClick={handleAdd}
              className="btn-primary whitespace-nowrap hidden lg:flex items-center gap-1.5"
            >
              <Plus size={14} strokeWidth={2.5} /> Add New Organization
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">Loading...</div>
        ) : (
          <OrganizationTable
            rows={enrichedRows}
            onEdit={handleEdit}
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
    </div>
  );
}
