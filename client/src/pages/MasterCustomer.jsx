import { useState, useMemo, useEffect } from 'react';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { Plus, Search, Users, ArrowUp, Clock, Car, Activity, Filter, UserPlus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { parseSafeDate, formatDate } from '../utils/dateFormatter.js';
import { useClients, useInvoices } from '../hooks/useQueries.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { queryKeys } from '../api/queryKeys.js';

import { useNavigate } from 'react-router-dom';
import CustomerTable from '../components/customers/CustomerTable.jsx';
import CustomerTableSkeleton from '../components/customers/CustomerTableSkeleton.jsx';
import CustomerFormModal from '../components/customers/CustomerFormModal.jsx';

export default function MasterCustomer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [limit, setLimit] = useState(50);

  const { data: customerData, isLoading: loadingCustomers, isFetching: fetchingCustomers } = useClients({
    page: 1,
    limit,
    search: debouncedSearch,
  });
  const customers = customerData?.clients || [];
  const totalCustomers = customerData?.pagination?.total ?? customers.length;
  const { data: invoiceData, isLoading: loadingInvoices } = useInvoices({ page: 1, limit: 100 });
  const invoices = invoiceData?.invoices || [];

  const offers = [];
  const loadingOffers = false;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [formVehicles, setFormVehicles] = useState([{ make: '', model: '', plate: '' }]);
  const [editId, setEditId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (activeFilter === 'VIP') {
      return customers.filter(c => (c.phone || '').includes('VIP'));
    }
    return customers;
  }, [customers, activeFilter]);

  const enrichedRows = useMemo(() => {
    // Pre-group invoices for O(1) lookups
    const invoicesByClient = new Map();
    const invoicesByPhone = new Map();

    for (const inv of invoices) {
      if (inv.clientId || inv.client_id) {
        const id = String(inv.clientId || inv.client_id);
        if (!invoicesByClient.has(id)) invoicesByClient.set(id, []);
        invoicesByClient.get(id).push(inv);
      }
      if (inv.customer?.phone) {
        const phone = String(inv.customer.phone);
        if (!invoicesByPhone.has(phone)) invoicesByPhone.set(phone, []);
        invoicesByPhone.get(phone).push(inv);
      }
    }

    return filteredCustomers.map((c, index) => {
      const byId = invoicesByClient.get(String(c.id)) || [];
      const byPhone = invoicesByPhone.get(String(c.phone)) || [];
      
      // Merge unique invoices for this client
      const uniqueInvoices = new Map();
      for (const inv of byId) uniqueInvoices.set(inv.id, inv);
      for (const inv of byPhone) uniqueInvoices.set(inv.id, inv);
      
      const history = Array.from(uniqueInvoices.values());
      const rowSpend = history.reduce((s, inv) => s + (inv.total || 0), 0);
      
      return {
        id: c.id,
        customId: `#DM-${8000 + ((c.id || index) % 2000)}`,
        name: c.name || 'Unknown',
        phone: c.phone || 'N/A',
        address: c.address || '',
        vehicles: c.vehicles || [],
        lastVisit: history.length > 0 ? history.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date : null,
        totalSpend: rowSpend,
        isVIP: rowSpend > 50000,
        hasActiveOffer: false,
        raw: c,
      };
    });
  }, [filteredCustomers, invoices]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !phone) return toast.error('Name and Phone are required');

    const validVehicles = formVehicles.filter(v => v.make || v.model || v.plate);

    setIsSaving(true);
    try {
      if (editId) {
        const res = await api.put('/clients/' + editId, { full_name: name, phone, address, vehicles: validVehicles });
        
        // Optimistically update React Query Cache to avoid UI wait
        queryClient.setQueryData(queryKeys.clients.all, (oldData) => {
          if (!oldData) return oldData;
          const patch = c => (c.id === editId ? { ...c, ...res.data, name: res.data.full_name } : c);
          if (Array.isArray(oldData)) return oldData.map(patch);
          if (oldData?.clients) return { ...oldData, clients: oldData.clients.map(patch) };
          return oldData;
        });
        toast.success('Customer updated');
      } else {
        const res = await api.post('/clients', { full_name: name, phone, address, vehicles: validVehicles });
        
        // Optimistically update React Query Cache to avoid UI wait
        queryClient.setQueryData(queryKeys.clients.all, (oldData) => {
          if (!oldData) return oldData;
          const newRow = { ...res.data, name: res.data.full_name };
          if (Array.isArray(oldData)) return [newRow, ...oldData];
          if (oldData?.clients) return { ...oldData, clients: [newRow, ...oldData.clients] };
          return oldData;
        });
        toast.success('Customer added');
      }
      handleCancelEdit();
      
      // Invalidate in background to ensure data consistency without blocking UI update
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving customer');
    } finally {
      setIsSaving(false);
    }
  }

  function handleAdd() {
    setEditId(null);
    setName('');
    setPhone('');
    setAddress('');
    setFormVehicles([{ make: '', model: '', plate: '' }]);
    setIsModalOpen(true);
  }

  function handleEdit(customer) {
    setEditId(customer.id);
    setName(customer.name);
    setPhone(customer.phone);
    setAddress(customer.address || '');
    setFormVehicles(customer.vehicles && customer.vehicles.length > 0 ? customer.vehicles : [{ make: '', model: '', plate: '' }]);
    setIsModalOpen(true);
  }

  function handleCancelEdit() {
    setEditId(null);
    setName('');
    setPhone('');
    setAddress('');
    setIsModalOpen(false);
  }

  function handleQuickSelect(e) {
    const custId = e.target.value;
    const cust = customers.find(c => String(c.id) === String(custId));
    if (cust) {
      setEditId(cust.id);
      setName(cust.name || '');
      setPhone(cust.phone || '');
      setAddress(cust.address || '');
      setFormVehicles(cust.vehicles && cust.vehicles.length > 0 ? cust.vehicles : [{ make: '', model: '', plate: '' }]);
    }
  }

  const isLoading = loadingCustomers || loadingInvoices || loadingOffers;
  const canLoadMore = customers.length < totalCustomers;

  return (
    <div className="w-full h-[calc(100vh-100px)] flex flex-col bg-transparent animate-fade-in">

      {/* ── Full Width: Customer List ── */}
      <div className="w-full flex flex-col h-full gap-4">
        {/* ── Toolbar ── */}
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 px-2 py-2 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex gap-1 ml-2">
            {['All Customers', 'VIP'].map(f => {
              const filterValue = f === 'All Customers' ? 'All' : f;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(filterValue)}
                  className={`text-[12px] font-bold px-4 py-2.5 rounded-[12px] transition-all capitalize ${activeFilter === filterValue
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                >
                  {f}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 pr-2">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} strokeWidth={2.5} />
              <input
                type="text"
                placeholder="Search customers..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setLimit(50); }}
                className="input pl-9 pr-4 py-2.5 text-[12px] font-medium w-[220px] border-gray-200 bg-gray-50 rounded-[12px]"
              />
            </div>

            <button className="w-10 h-10 rounded-[12px] border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
              <Filter size={15} strokeWidth={2.5} />
            </button>

            <button
              onClick={handleAdd}
              className="btn-primary whitespace-nowrap flex items-center gap-1.5"
            >
              <UserPlus size={14} strokeWidth={2.5} /> Add New Customer
            </button>
          </div>
        </div>

        {isLoading ? (
          <CustomerTableSkeleton />
        ) : (
          <CustomerTable
            rows={enrichedRows}
            selectedId={null}
            onSelect={(phone) => navigate(`/master-customer/${phone}`)}
            onEdit={handleEdit}
          />
        )}

        {!isLoading && canLoadMore && (
          <div className="flex justify-center pb-2 shrink-0">
            <button
              type="button"
              disabled={fetchingCustomers}
              onClick={() => setLimit(l => l + 50)}
              className="text-[12px] font-bold px-5 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              {fetchingCustomers ? 'Loading…' : `Load more (${customers.length} / ${totalCustomers})`}
            </button>
          </div>
        )}
      </div>

      <CustomerFormModal
        isOpen={isModalOpen}
        editId={editId}
        customers={customers}
        name={name} setName={setName}
        phone={phone} setPhone={setPhone}
        address={address} setAddress={setAddress}
        formVehicles={formVehicles} setFormVehicles={setFormVehicles}
        onSubmit={handleSubmit}
        onCancel={handleCancelEdit}
        onQuickSelect={handleQuickSelect}
        isSaving={isSaving}
      />
    </div>
  );
}