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
  const [formVehicles, setFormVehicles] = useState([{ make: '', model: '', plate: '' }]);
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

    const validVehicles = formVehicles.filter(v => v.make || v.model || v.plate);

    setIsSaving(true);
    try {
      if (editId) {
        await api.put('/organizations/' + editId, { org_name: orgName, contact_person: contactPerson, phone, email, address, vehicles: validVehicles });
        toast.success('Organization updated');
      } else {
        await api.post('/organizations', { org_name: orgName, contact_person: contactPerson, phone, email, address, vehicles: validVehicles });
        toast.success('Organization added');
      }
      handleCancelEdit();
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving organization');
    } finally {
      setIsSaving(false);
    }
  }

  function handleAdd() {
    setEditId(null);
    setOrgName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setFormVehicles([{ make: '', model: '', plate: '' }]);
    setIsModalOpen(true);
  }

  function handleEdit(organization) {
    setEditId(organization.id);
    setOrgName(organization.org_name || '');
    setContactPerson(organization.contact_person || '');
    setPhone(organization.phone || '');
    setEmail(organization.email || '');
    setAddress(organization.address || '');
    setFormVehicles(organization.vehicles && organization.vehicles.length > 0 ? organization.vehicles : [{ make: '', model: '', plate: '' }]);
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
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 px-2 py-2 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 ml-2">
            <Briefcase size={18} className="text-gray-400" />
            <h2 className="text-sm font-bold text-gray-700">Organizations</h2>
          </div>

          <div className="flex items-center gap-3 pr-2 ml-auto">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} strokeWidth={2.5} />
              <input
                type="text"
                placeholder="Search organizations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 pr-4 py-2.5 text-[12px] font-medium w-[220px] border-gray-200 bg-gray-50 rounded-[12px]"
              />
            </div>

            <button
              onClick={handleAdd}
              className="text-[12px] font-bold px-5 py-2.5 rounded-[12px] bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-all flex items-center gap-1.5"
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
        onSubmit={handleSubmit}
        onCancel={handleCancelEdit}
        isSaving={isSaving}
      />
    </div>
  );
}
