import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useClientByPhone, useInvoices } from '../hooks/useQueries.js';
import { formatDate } from '../utils/dateFormatter.js';
import CustomerProfileHeader from '../components/customers/CustomerProfileHeader.jsx';
import StatsGrid from '../components/customers/StatsGrid.jsx';
import VehicleTable from '../components/customers/VehicleCard.jsx';
import ServiceHistoryTable from '../components/customers/ServiceHistoryTable.jsx';
import CustomerFormModal from '../components/customers/CustomerFormModal.jsx';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys.js';
import { Gift } from 'lucide-react';

export default function CustomerProfile() {
  const { phone: routePhone } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: selectedCustomer, isLoading: loadingCustomers } = useClientByPhone(routePhone);
  const { data: invoiceData, isLoading: loadingInvoices } = useInvoices({ page: 1, limit: 100 });
  const invoices = invoiceData?.invoices || [];

  const [selectedVehicleIdx, setSelectedVehicleIdx] = useState(0);

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [formVehicles, setFormVehicles] = useState([{ make: '', model: '', plate: '' }]);
  const [editId, setEditId] = useState(null);

  const { data: assignedOffers = [], isLoading: loadingOffers } = useQuery({
    queryKey: ['customerOffers', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer?.id) return [];
      const res = await api.get(`/offers?client_id=${selectedCustomer.id}`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!selectedCustomer?.id
  });

  const customerHistory = useMemo(() => {
    if (!selectedCustomer) return [];
    return invoices
      .filter(inv =>
        (inv.clientId && inv.clientId === selectedCustomer.id) ||
        (inv.client_id && inv.client_id === selectedCustomer.id) ||
        (inv.customer?.phone && inv.customer.phone === selectedCustomer.phone) ||
        (inv.customer?.name && inv.customer.name === selectedCustomer.name) ||
        (inv.client_name && inv.client_name === selectedCustomer.name)
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [selectedCustomer, invoices]);

  const allVehicles = useMemo(() => {
    if (!selectedCustomer?.vehicles) return [];
    
    return selectedCustomer.vehicles.map(v => {
      const vehicleHistory = customerHistory.filter(inv => 
         inv.vehicle_id === v.id || 
         (inv.licenseVin && inv.licenseVin === v.plate) ||
         (inv.licensePlate && inv.licensePlate === v.plate)
      );
      
      const visits = vehicleHistory.length;
      const spend = vehicleHistory.reduce((sum, inv) => sum + (Number(inv.total || inv.grand_total) || 0), 0);
      
      return {
        ...v,
        make: v.make || 'Unknown',
        model: v.model || '',
        plate: v.plate || 'N/A',
        type: v.type || 'Sedan',
        totalVisits: visits,
        totalSpend: spend
      };
    });
  }, [customerHistory, selectedCustomer]);

  useEffect(() => {
    setSelectedVehicleIdx(0);
  }, [selectedCustomer]);

  const filteredHistory = useMemo(() => {
    if (allVehicles.length <= 1) return customerHistory;
    const selectedVeh = allVehicles[selectedVehicleIdx];
    if (!selectedVeh) return customerHistory;

    return customerHistory.filter(inv => {
      const plate = inv.licenseVin || inv.licensePlate || '';
      const makeModel = (inv.vehicleName || '').trim();
      const parts = makeModel.split(/\s+/);
      const make = inv.carMake || parts[0] || '';
      const model = inv.carModel || parts.slice(1).join(' ') || '';
      return (
        (plate && plate === selectedVeh.plate) ||
        (make === selectedVeh.make && model === selectedVeh.model)
      );
    });
  }, [customerHistory, allVehicles, selectedVehicleIdx]);

  const totalSpend = useMemo(() => customerHistory.reduce((s, i) => s + (i.total || 0), 0), [customerHistory]);
  const isVIP = totalSpend > 50000;

  const memberSince = selectedCustomer?.createdAt 
    ? formatDate(selectedCustomer.createdAt)
    : 'Unknown';

  const lastVisitDate = customerHistory.length > 0
    ? formatDate(customerHistory[0].date)
    : null;

  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !phone) return toast.error('Name and Phone are required');
    const validVehicles = formVehicles.filter(v => v.make || v.model || v.plate);
    
    setIsSaving(true);
    try {
      await api.put('/clients/' + editId, { full_name: name, phone, address, vehicles: validVehicles });
      toast.success('Customer updated');
      handleCancelEdit();
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      if (phone !== routePhone) {
        navigate(`/master-customer/${phone}`, { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving customer');
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit() {
    if (!selectedCustomer) return;
    setEditId(selectedCustomer.id);
    setName(selectedCustomer.name);
    setPhone(selectedCustomer.phone);
    setAddress(selectedCustomer.address || '');
    setFormVehicles(selectedCustomer.vehicles && selectedCustomer.vehicles.length > 0 ? selectedCustomer.vehicles : [{ make: '', model: '', plate: '' }]);
    setIsModalOpen(true);
  }

  function handleCancelEdit() {
    setEditId(null);
    setName('');
    setPhone('');
    setAddress('');
    setIsModalOpen(false);
  }

  if (loadingCustomers || loadingInvoices) {
    return <div className="p-8 text-center text-gray-500">Loading Customer Profile...</div>;
  }

  if (!selectedCustomer) {
    return (
      <div className="p-6 max-w-[1200px] mx-auto text-center flex flex-col items-center justify-center h-[50vh]">
        <h2 className="text-xl font-bold mb-4 text-gray-700">Customer not found</h2>
        <Link to="/master-customer" className="text-blue-600 font-bold hover:underline">
          &larr; Back to Customers
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 bg-transparent animate-fade-in pb-10">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/master-customer" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/60 border border-white/60 hover:bg-white text-gray-600 shadow-sm transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">Customer Profile</h1>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <CustomerProfileHeader 
          customer={selectedCustomer} 
          isVIP={isVIP} 
          memberSince={memberSince} 
          onEdit={handleEdit} 
        />

        <StatsGrid 
          totalVisits={customerHistory.length}
          totalSpend={totalSpend}
          activeVehicles={allVehicles.length}
          lastVisit={lastVisitDate}
          nextService="Not Set"
          loyaltyPoints={Math.floor(totalSpend * 0.05)}
        />

        <div className="flex flex-col gap-8">
          <div className="w-full">
            <VehicleTable 
              vehicles={allVehicles}
              selectedIdx={selectedVehicleIdx}
              onSelect={setSelectedVehicleIdx}
            />
          </div>

          {assignedOffers.length > 0 && (
            <div className="w-full card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <h3 className="text-[15px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <Gift size={18} className="text-blue-600" /> Active Assigned Packages
                </h3>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50/50">
                {assignedOffers.map(offer => {
                  const washBal = Math.max(0, (offer.totalWashes || 0) - (offer.completedWashes || 0));
                  const freeBal = Math.max(0, (offer.freeWashes || 0) - (offer.freeWashesUsed || 0));
                  return (
                    <Link key={offer.id} to={`/offers/${offer.id}`} className="bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{offer.packageName}</h4>
                          <p className="text-[11px] text-gray-500 font-medium">{offer.offerNo}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          offer.status === 'active' || !offer.status ? 'bg-emerald-100 text-emerald-700' :
                          offer.status === 'expired' ? 'bg-rose-100 text-rose-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {offer.status || 'Active'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[12px]">
                        <div className="flex flex-col">
                          <span className="text-gray-400 font-semibold mb-1">Washes</span>
                          <span className="font-black text-gray-800">{washBal} <span className="text-gray-400 font-medium">/ {offer.totalWashes || 0}</span></span>
                        </div>
                        <div className="w-px h-8 bg-gray-100"></div>
                        <div className="flex flex-col">
                          <span className="text-gray-400 font-semibold mb-1">Free</span>
                          <span className="font-black text-gray-800">{freeBal} <span className="text-gray-400 font-medium">/ {offer.freeWashes || 0}</span></span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div className="w-full">
            <ServiceHistoryTable 
              history={filteredHistory}
              customerPhone={selectedCustomer.phone}
              isVIP={isVIP}
            />
          </div>
        </div>
      </div>

      <CustomerFormModal
        isOpen={isModalOpen}
        editId={editId}
        customers={[]}
        name={name} setName={setName}
        phone={phone} setPhone={setPhone}
        address={address} setAddress={setAddress}
        formVehicles={formVehicles} setFormVehicles={setFormVehicles}
        onSubmit={handleSubmit}
        onCancel={handleCancelEdit}
        onQuickSelect={() => {}}
        isSaving={isSaving}
      />
    </div>
  );
}
