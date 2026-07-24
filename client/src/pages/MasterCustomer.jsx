import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { Plus, Edit3, X, Search, Car, Calendar, FileText, Phone, MapPin, Star, Edit2, Sparkles, Droplets, PenTool, CheckSquare, Gift } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { parseSafeDate } from '../utils/dateFormatter.js';

export default function MasterCustomer() {
  const queryClient = useQueryClient();

  // Fetch Customers
  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ['masterCustomer_customers'],
    queryFn: () => api.get('/customers').then(res => {
      const serverData = (res.data && Array.isArray(res.data)) ? res.data : [];
      const mockData = [
        { _id: 'c_vip2', name: 'Raj Kumar', phone: '+91 9111111111', address: '12 VIP Road, Delhi' },
        { _id: 'c_vip', name: 'Alex VIP Rodriguez', phone: '+91 9999999999', address: '1 Luxury Ave, Mumbai' },
        { _id: 'c1', name: 'John Doe', phone: '+91 9876543210', address: '123 Main St, Mumbai' },
        { _id: 'c2', name: 'Jane Smith', phone: '+91 8765432109', address: '456 Park Ave, Delhi' },
        { _id: 'c3', name: 'Mike Johnson', phone: '+91 7654321098', address: '789 Elm St, Bangalore' },
        { _id: 'c4', name: 'Emily Davis', phone: '+91 6543210987', address: '321 Oak Ln, Chennai' }
      ];
      return [...serverData, ...mockData];
    }),
    staleTime: 5 * 60 * 1000
  });

  // Fetch Invoices (to get vehicle details and service history)
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['masterCustomer_invoices'],
    queryFn: () => api.get('/invoices').then(res => {
      const serverData = Array.isArray(res.data?.invoices) ? res.data.invoices : (Array.isArray(res.data) ? res.data : []);
      const mockData = [
        // Raj Kumar Visits (3 cars)
        { _id: 'i_raj1', invoiceNumber: 'INV-007', date: new Date().toISOString(), total: 35000, customer: { phone: '+91 9111111111' }, carMake: 'Range Rover', carModel: 'Sport', licensePlate: 'DL01RAJ001', services: [{ service: 'Ceramic Coating' }] },
        { _id: 'i_raj2', invoiceNumber: 'INV-008', date: new Date(Date.now() - 15 * 86400000).toISOString(), total: 8000, customer: { phone: '+91 9111111111' }, carMake: 'BMW', carModel: 'X5', licensePlate: 'DL01RAJ002', services: [{ service: 'Interior Detailing' }] },
        { _id: 'i_raj3', invoiceNumber: 'INV-009', date: new Date(Date.now() - 45 * 86400000).toISOString(), total: 12000, customer: { phone: '+91 9111111111' }, carMake: 'Audi', carModel: 'Q7', licensePlate: 'DL01RAJ003', services: [{ service: 'Premium Wash' }] },
        { _id: 'i_raj4', invoiceNumber: 'INV-010', date: new Date(Date.now() - 60 * 86400000).toISOString(), total: 5000, customer: { phone: '+91 9111111111' }, carMake: 'BMW', carModel: 'X5', licensePlate: 'DL01RAJ002', services: [{ service: 'Exterior Polish' }] },
        
        // VIP Customer Visits with multiple cars
        { _id: 'i_vip1', invoiceNumber: 'INV-004', date: new Date().toISOString(), total: 15000, customer: { phone: '+91 9999999999' }, carMake: 'Porsche', carModel: '911 GT3', licensePlate: 'MH01VIP001', services: [{ service: 'Paint Correction' }] },
        { _id: 'i_vip2', invoiceNumber: 'INV-003', date: new Date(Date.now() - 30 * 86400000).toISOString(), total: 25000, customer: { phone: '+91 9999999999' }, carMake: 'Mercedes-Benz', carModel: 'G-Class', licensePlate: 'MH01VIP002', services: [{ service: 'Full Detailing' }] },
        { _id: 'i_vip3', invoiceNumber: 'INV-002', date: new Date(Date.now() - 60 * 86400000).toISOString(), total: 12000, customer: { phone: '+91 9999999999' }, carMake: 'Porsche', carModel: '911 GT3', licensePlate: 'MH01VIP001', services: [{ service: 'Maintenance Wash' }] },
        { _id: 'i_vip4', invoiceNumber: 'INV-001', date: new Date(Date.now() - 90 * 86400000).toISOString(), total: 18000, customer: { phone: '+91 9999999999' }, carMake: 'Mercedes-Benz', carModel: 'G-Class', licensePlate: 'MH01VIP002', services: [{ service: 'Interior Spa' }] },
        // Other Customers
        { _id: 'i1', invoiceNumber: 'INV-005', date: new Date().toISOString(), total: 15000, customer: { phone: '+91 9876543210' }, carMake: 'BMW', carModel: 'X5', licensePlate: 'MH01AB1234', services: [{ service: 'Ceramic Wash' }] },
        { _id: 'i2', invoiceNumber: 'INV-006', date: new Date(Date.now() - 86400000).toISOString(), total: 8000, customer: { phone: '+91 8765432109' }, carMake: 'Audi', carModel: 'Q7', licensePlate: 'MH02CD5678', services: [{ service: 'Ozone Treatment' }] }
      ];
      return [...serverData, ...mockData];
    }),
    staleTime: 5 * 60 * 1000
  });

  // Fetch Offers
  const { data: offers = [], isLoading: loadingOffers } = useQuery({
    queryKey: ['masterCustomer_offers'],
    queryFn: () => api.get('/offers').then(res => {
      const data = Array.isArray(res.data) ? res.data : [];
      if (data.length > 0) return data;
      return [
        { _id: 'o1', name: 'Summer Special Detailing', description: 'Complete interior and exterior detailing', defaultPrice: 4999 },
        { _id: 'o2', name: 'Ceramic Coating Package', description: '9H Ceramic coating with 3 years warranty', defaultPrice: 24999 }
      ];
    }),
    staleTime: 5 * 60 * 1000
  });

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedPhone, setSelectedPhone] = useState(null);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [formVehicles, setFormVehicles] = useState([{ make: '', model: '', plate: '' }]);
  const [editId, setEditId] = useState(null);
  
  const [selectedVehicleIdx, setSelectedVehicleIdx] = useState(0);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    let filtered = customers;
    if (search) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search)
      );
    }
    // Mocking VIP/Pending/New logic based on random logic or empty implementation since we don't have DB fields for it yet
    if (activeFilter === 'VIP') {
      filtered = filtered.filter((_, i) => i % 3 === 0); // Mock VIP logic
    }
    return filtered;
  }, [customers, search, activeFilter]);

  // Selected Customer Logic
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.phone === selectedPhone) || filteredCustomers[0];
  }, [selectedPhone, filteredCustomers, customers]);

  // Selected Customer's History
  const customerHistory = useMemo(() => {
    if (!selectedCustomer) return [];
    return invoices
      .filter(inv => inv.customer?.phone === selectedCustomer.phone)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [selectedCustomer, invoices]);

  // All Vehicles from their history + explicitly added ones
  const allVehicles = useMemo(() => {
    const vehicles = [];
    const seen = new Set();
    
    // Explicitly added vehicles from Customer schema
    if (selectedCustomer?.vehicles) {
      selectedCustomer.vehicles.forEach(v => {
        if (v.make || v.plate) {
          const key = `${v.make}-${v.model}-${v.plate}`;
          seen.add(key);
          vehicles.push({ make: v.make || 'Unknown', model: v.model || '', plate: v.plate || 'N/A' });
        }
      });
    }

    // Historical vehicles from invoices
    if (customerHistory.length > 0) {
      customerHistory.forEach(inv => {
        if (inv.carMake || inv.licensePlate) {
          const key = `${inv.carMake}-${inv.carModel}-${inv.licensePlate}`;
          if (!seen.has(key)) {
            seen.add(key);
            vehicles.push({
              make: inv.carMake || 'Unknown',
              model: inv.carModel || '',
              plate: inv.licensePlate || 'N/A'
            });
          }
        }
      });
    }
    return vehicles;
  }, [customerHistory, selectedCustomer]);

  const vehicleDetails = allVehicles[selectedVehicleIdx] || allVehicles[0] || null;

  // Reset selected vehicle when customer changes
  useMemo(() => {
    setSelectedVehicleIdx(0);
  }, [selectedCustomer]);

  const filteredHistory = useMemo(() => {
    if (allVehicles.length <= 1) return customerHistory;
    const selectedVeh = allVehicles[selectedVehicleIdx];
    if (!selectedVeh) return customerHistory;
    
    return customerHistory.filter(inv => {
      // Check if this invoice matches the selected vehicle
      return (inv.licensePlate === selectedVeh.plate) || 
             (inv.carMake === selectedVeh.make && inv.carModel === selectedVeh.model);
    });
  }, [customerHistory, allVehicles, selectedVehicleIdx]);

  const totalSpend = useMemo(() => customerHistory.reduce((s, i) => s + (i.total || 0), 0), [customerHistory]);
  const isVIP = totalSpend > 50000 || (selectedCustomer && customers.indexOf(selectedCustomer) % 3 === 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !phone) return toast.error('Name and Phone are required');
    
    const validVehicles = formVehicles.filter(v => v.make || v.model || v.plate);

    try {
      if (editId) {
        await api.put('/customers/' + editId, { name, phone, address, vehicles: validVehicles });
        toast.success('Customer updated');
      } else {
        await api.post('/customers', { name, phone, address, vehicles: validVehicles });
        toast.success('Customer added');
      }
      handleCancelEdit();
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving customer');
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
    setEditId(customer._id);
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

  if (loadingCustomers || loadingInvoices || loadingOffers) {
    return <div className="p-8 text-center text-gray-500">Loading Customer Profiles...</div>;
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto h-[calc(100vh-100px)] flex gap-6">
      
      {/* ── Left Pane: Customer List ── */}
      <div className="w-[450px] flex flex-col h-full gap-4">
        <div className="card p-4 flex flex-col gap-4 shadow-md bg-white/60">
          <div className="flex justify-between items-center">
            <h2 className="text-[15px] font-black text-gray-900">Customer List</h2>
            <div className="flex gap-2">
              <button 
                onClick={handleAdd}
                className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-all flex items-center gap-1"
              >
                <Plus size={12} /> Add New
              </button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {['All', 'VIP', 'Pending', 'New'].map(f => (
              <button 
                key={f} 
                onClick={() => setActiveFilter(f)}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-full transition-all shrink-0 ${
                  activeFilter === f 
                    ? 'bg-gray-900 text-white shadow-sm' 
                    : 'bg-white/50 text-gray-600 hover:bg-gray-100 border border-white/60'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              className="input pl-9 border-white/60 shadow-inner"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 gap-3 content-start pb-10">
          {filteredCustomers.map((c, i) => {
            const isSelected = selectedCustomer?.phone === c.phone;
            const mockCar = vehicleDetails ? `${vehicleDetails.make} ${vehicleDetails.model}` : (i % 2 === 0 ? 'Porsche 911 GT3' : 'BMW M4');
            const cVIP = i % 3 === 0;
            const customerOffers = offers.filter(o => o.customer?.phone === c.phone);
            const hasActiveOffer = customerOffers.some(o => o.status === 'active');
            
            return (
              <div 
                key={c._id}
                onClick={() => setSelectedPhone(c.phone)}
                className={`card p-3 cursor-pointer group transition-all duration-300 ${
                  isSelected 
                    ? 'border-gray-900 bg-white shadow-md scale-[1.02]' 
                    : 'border-white/60 hover:bg-white/80 hover:scale-[1.01]'
                }`}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <h4 className={`font-bold text-sm tracking-tight ${isSelected ? 'text-gray-900' : 'text-gray-900'}`}>{c.name}</h4>
                    {cVIP && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#FBBF24] text-yellow-900">VIP</span>}
                    {hasActiveOffer && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-100 text-green-700">OFFER</span>}
                  </div>
                  <Star size={12} className={cVIP ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} />
                </div>
                <p className="text-[10px] text-gray-500 font-medium">
                  {c.phone} | {mockCar}
                </p>
              </div>
            );
          })}
          {filteredCustomers.length === 0 && (
            <div className="col-span-2 text-center py-10 text-gray-500 text-sm italic border border-dashed border-white/50 rounded-2xl bg-white/30">
              No customers found.
            </div>
          )}
        </div>
      </div>

      {/* ── Right Pane: Customer Profile ── */}
      {selectedCustomer ? (
        <div className="flex-1 flex flex-col h-full gap-4 overflow-y-auto pr-2 pb-10">
          
          {/* Top Row Stats */}
          <div className="flex gap-4">
            {/* Avatar Card */}
            <div className="card p-5 flex items-center justify-between gap-5 w-[360px] bg-white/70 shadow-md">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-full bg-[#FBBF24] flex items-center justify-center text-gray-900 text-3xl font-black shadow-inner shrink-0 relative">
                   {selectedCustomer.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-[26px] font-black text-gray-900 tracking-tight leading-none mb-2">
                     {selectedCustomer.name}
                  </h1>
                  {isVIP && (
                    <span className="inline-block px-3 py-0.5 bg-rose-600 text-white text-[10px] font-bold uppercase rounded-full tracking-widest shadow-sm">
                       VIP
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => handleEdit(selectedCustomer)}
                className="w-10 h-10 rounded-xl bg-gray-100/80 hover:bg-blue-50 text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-200 flex items-center justify-center transition-all shadow-sm shrink-0"
                title="Edit Customer"
              >
                <Edit3 size={18} />
              </button>
            </div>

            {/* Total Spend */}
            <div className="card p-5 flex flex-col justify-center flex-1 bg-white/70 shadow-md">
               <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                 <div className="w-5 h-5 rounded-md flex items-center justify-center bg-gray-100/50 border border-white"><FileText size={10} className="text-gray-400"/></div> Total Spend
               </div>
               <div className="text-[26px] font-black text-gray-900 tracking-tight leading-none">
                 ₹{totalSpend.toLocaleString('en-IN')}
               </div>
            </div>

            {/* Visits */}
            <div className="card p-5 flex flex-col justify-center flex-1 bg-white/70 shadow-md shrink-0">
               <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                 <div className="w-5 h-5 rounded-md flex items-center justify-center bg-gray-100/50 border border-white"><Calendar size={10} className="text-gray-400"/></div> Visits
               </div>
               <div className="text-[26px] font-black text-gray-900 tracking-tight leading-none">
                 {customerHistory.length}
               </div>
               <div className="text-[10px] text-gray-400 font-medium mt-1">since {customerHistory.length > 0 ? parseSafeDate(customerHistory[customerHistory.length-1].date).toLocaleString('default', { month: 'short', year: 'numeric' }) : 'N/A'}</div>
            </div>

            {/* Next Due */}
            <div className="card p-5 flex flex-col justify-center flex-1 bg-white/70 shadow-md">
               <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                 <div className="w-5 h-5 rounded-md flex items-center justify-center bg-gray-100/50 border border-white"><Calendar size={10} className="text-gray-400"/></div> Next Service Due
               </div>
               <div className="text-[22px] font-black text-gray-900 tracking-tight leading-none">
                 {customerHistory.length > 0 ? (() => { const d = parseSafeDate(customerHistory[0].date); d.setMonth(d.getMonth() + 6); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); })() : 'Not Set'}
               </div>
            </div>
          </div>

          {/* Vehicle Selector */}
          {allVehicles.length > 1 && (
            <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-2 custom-scrollbar shrink-0">
              {allVehicles.map((v, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedVehicleIdx(i)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border whitespace-nowrap ${
                    selectedVehicleIdx === i
                      ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20'
                      : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <Car size={16} />
                  {v.make} {v.model}
                  <span className={`px-2 py-0.5 rounded-md text-[10px] ml-1 ${selectedVehicleIdx === i ? 'bg-blue-700/50 text-blue-50' : 'bg-gray-100 text-gray-500'}`}>
                    {v.plate}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Wireframe Car Section */}
          <div className="card shrink-0 relative h-[220px] overflow-hidden border-white/60 bg-gradient-to-br from-gray-100/80 to-white/40 shadow-md">
            {/* Background Car Wireframe Image */}
            <div 
              className="absolute inset-0 opacity-[0.4] mix-blend-multiply bg-center bg-no-repeat bg-cover"
              style={{ backgroundImage: 'url("/car_wireframe.png")', backgroundPosition: 'center 60%' }}
            />
            
            <div className="absolute inset-0 p-6 z-10 flex justify-between">
               {/* Left Column Data */}
               <div className="space-y-4 w-1/3">
                 <div>
                   <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Chassis No</label>
                   <div className="flex items-center gap-2 bg-gray-400/20 backdrop-blur-md rounded-lg px-3 py-2 mt-1 border border-white/50 shadow-inner">
                     <span className="text-xs font-mono text-gray-800 font-bold truncate">WP0ZZZWWWVPYPZ...</span>
                     <Edit2 size={12} className="text-gray-400 ml-auto" />
                   </div>
                 </div>
                 <div>
                   <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Plate</label>
                   <div className="flex items-center gap-2 bg-gray-400/20 backdrop-blur-md rounded-lg px-3 py-2 mt-1 border border-white/50 shadow-inner w-2/3">
                     <span className="text-xs font-mono text-gray-800 font-bold">{vehicleDetails?.plate || 'DL-01-XXXX'}</span>
                     <Edit2 size={12} className="text-gray-400 ml-auto" />
                   </div>
                 </div>
               </div>

               {/* Center Data (Overlay over car) */}
               <div className="self-end pb-4 text-center">
                 <div className="inline-block bg-white/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white shadow-sm">
                   <h3 className="text-sm font-bold text-gray-900 tracking-tight">Vehicle: {vehicleDetails?.make || 'Porsche'}</h3>
                   <p className="text-xs text-gray-600 font-mono">{vehicleDetails?.model || '911 GT3'}</p>
                 </div>
               </div>

               {/* Right Column Data */}
               <div className="space-y-4 w-1/3 flex flex-col items-end text-right">
                 <div className="w-3/4">
                   <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Paint Code</label>
                   <div className="flex items-center justify-between gap-2 bg-gray-400/20 backdrop-blur-md rounded-lg px-3 py-2 mt-1 border border-white/50 shadow-inner">
                     <span className="text-xs font-mono text-gray-800 font-bold">C10</span>
                     <span className="flex items-center gap-1 text-[10px] text-gray-500 font-medium italic">edit <Edit2 size={10} /></span>
                   </div>
                 </div>
                 
                 <div className="flex gap-3 w-full justify-end">
                   <div className="w-1/3">
                     <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Year</label>
                     <div className="flex items-center justify-between gap-2 bg-gray-400/20 backdrop-blur-md rounded-lg px-3 py-2 mt-1 border border-white/50 shadow-inner">
                       <Plus size={12} className="text-gray-400 ml-auto" />
                     </div>
                   </div>
                   <div className="w-1/2">
                     <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Model</label>
                     <div className="flex items-center justify-between gap-2 bg-gray-400/20 backdrop-blur-md rounded-lg px-3 py-2 mt-1 border border-white/50 shadow-inner">
                       <Plus size={12} className="text-gray-400 ml-auto" />
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="card p-6 flex-1 shadow-md bg-white/70 overflow-visible min-h-[300px]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-[13px] font-bold text-gray-500 uppercase tracking-widest">
                Service History <span className="font-semibold text-gray-400 normal-case tracking-normal ml-1">(Activity Timeline)</span>
              </h3>
              <div className="flex items-center gap-4">
                {isVIP && (
                  <Link 
                    to={`/offers/new?phone=${selectedCustomer.phone}`}
                    className="text-[10px] font-black text-gray-900 bg-[#FBBF24] hover:bg-[#F59E0B] flex items-center gap-1.5 uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md transition-all hover:scale-[1.02]"
                  >
                    <Gift size={12} /> Assign Offer Package
                  </Link>
                )}
                <Link to={`/invoices/new?phone=${selectedCustomer.phone}`} className="text-[11px] font-black text-gray-900 hover:text-blue-600 flex items-center gap-1 uppercase tracking-widest">
                  <Plus size={14} /> New Invoice
                </Link>
              </div>
            </div>
            
            <div className="relative pl-9 space-y-6 before:absolute before:inset-y-0 before:left-[15px] before:w-0.5 before:bg-gray-300/50 pt-2 pb-4">
               {filteredHistory.map((inv, idx) => {
                 const srvName = inv.services?.[0]?.service || 'Detailing Service';
                 const isPaid = inv.status === 'paid';
                 let IconComp = Sparkles;
                 if (srvName.toLowerCase().includes('wash')) IconComp = Droplets;
                 if (srvName.toLowerCase().includes('polish')) IconComp = PenTool;
                 if (srvName.toLowerCase().includes('ceramic')) IconComp = Car;

                 return (
                   <div key={inv._id} className="relative flex items-center gap-5 group">
                     {/* Circle node */}
                     <div className="absolute -left-[29px] w-4 h-4 rounded-full bg-gray-300 border-[3px] border-white shadow-sm z-10 group-hover:bg-blue-500 group-hover:border-blue-100 transition-colors" />
                     
                     {/* Icon Box */}
                     <div className="w-11 h-11 rounded-2xl bg-white/80 border border-white flex items-center justify-center shrink-0 shadow-sm text-gray-500 group-hover:text-blue-600 transition-colors">
                       <IconComp size={20} strokeWidth={1.5} />
                     </div>
                     
                     {/* Timeline Content */}
                     <div className="flex-1 flex justify-between items-center bg-white/50 backdrop-blur-md p-3 px-4 rounded-2xl border border-white/60 hover:bg-white/80 transition-colors">
                       <div className="flex flex-col gap-1.5">
                         <h4 className="font-bold text-gray-900 text-sm">{srvName}</h4>
                         <div className="flex items-center gap-2">
                           <span className="bg-gray-200/50 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-md">INV-{inv.invoiceNumber || inv.invoiceNo}</span>
                           <span className="text-gray-400 text-[10px] font-medium px-1">Detailing Service</span>
                           <span className="text-[12px] font-black text-gray-900">₹{inv.total?.toLocaleString('en-IN')}</span>
                           <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow-sm ${isPaid ? 'bg-emerald-800 text-white' : 'bg-[#FBBF24] text-yellow-900'}`}>
                             {isPaid ? 'Paid' : 'Payment Pending'}
                           </span>
                         </div>
                       </div>

                       <div className="text-right flex flex-col items-end gap-2.5">
                         <span className="text-[11px] text-gray-600 font-bold">
                           {parseSafeDate(inv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                         </span>
                         <Link to={`/invoices/${inv._id}`} className="flex items-center gap-1.5 text-[10px] font-bold text-blue-700 bg-blue-100/50 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                           <FileText size={12} /> View PDF
                         </Link>
                       </div>
                     </div>
                   </div>
                 );
               })}
               {filteredHistory.length === 0 && (
                 <div className="text-sm text-gray-400 italic">No activity recorded for this vehicle yet.</div>
               )}
            </div>
          </div>

        </div>
      ) : (
        <div className="flex-1 card p-8 flex items-center justify-center flex-col text-gray-400">
           <Search size={48} className="mb-4 text-gray-300 opacity-50" />
           <p className="text-lg font-bold">No Customer Selected</p>
           <p className="text-sm">Select a customer from the left to view their profile.</p>
        </div>
      )}

      {/* Modal for Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md overflow-hidden bg-white/90">
            <div className="flex justify-between items-center p-5 border-b border-white/60">
              <h3 className="text-lg font-bold text-gray-900">{editId ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button onClick={handleCancelEdit} className="text-gray-500 hover:text-gray-900 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {!editId && (
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <label className="block text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1.5">Quick Select Existing Customer?</label>
                  <select 
                    className="input bg-blue-50/50 border-blue-100 text-sm font-bold text-gray-700"
                    onChange={(e) => {
                      const c = customers.find(x => x._id === e.target.value);
                      if (c) handleEdit(c);
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>-- Select to add a vehicle to them --</option>
                    {customers.map(c => (
                      <option key={c._id} value={c._id}>{c.name} - {c.phone}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Customer Name *</label>
                <input required type="text" className="input bg-white/70" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Phone Number *</label>
                <input required type="tel" className="input bg-white/70" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Address (Optional)</label>
                <textarea className="input bg-white/70 min-h-[60px] resize-none" value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address..." />
              </div>
              
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Vehicles</label>
                <div className="space-y-3">
                  {formVehicles.map((v, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                      <input type="text" className="input bg-white text-xs py-2 px-3 flex-1" placeholder="Make (e.g. BMW)" value={v.make} onChange={e => {
                        const newV = [...formVehicles];
                        newV[idx].make = e.target.value;
                        setFormVehicles(newV);
                      }} />
                      <input type="text" className="input bg-white text-xs py-2 px-3 flex-1" placeholder="Model" value={v.model} onChange={e => {
                        const newV = [...formVehicles];
                        newV[idx].model = e.target.value;
                        setFormVehicles(newV);
                      }} />
                      <input type="text" className="input bg-white text-xs py-2 px-3 flex-1" placeholder="Plate No." value={v.plate} onChange={e => {
                        const newV = [...formVehicles];
                        newV[idx].plate = e.target.value;
                        setFormVehicles(newV);
                      }} />
                      <button type="button" onClick={() => {
                        const newV = formVehicles.filter((_, i) => i !== idx);
                        setFormVehicles(newV.length ? newV : [{ make: '', model: '', plate: '' }]);
                      }} className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setFormVehicles([...formVehicles, { make: '', model: '', plate: '' }])} className="text-[11px] font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700">
                    <Plus size={12} /> Add Another Vehicle
                  </button>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-white/60 mt-6">
                <button type="button" onClick={handleCancelEdit} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
