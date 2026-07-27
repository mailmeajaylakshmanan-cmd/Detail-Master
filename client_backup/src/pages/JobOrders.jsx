import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';

function JobOrderList() {
  const [jobOrders, setJobOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  
  const [formData, setFormData] = useState({ client_id: '', vehicle_id: '', status: 'draft', discount: 0, special_notes: '' });

  useEffect(() => {
    fetchJobOrders();
    fetchClientsAndVehicles();
  }, []);

  const fetchJobOrders = async () => {
    const res = await fetch('/api/job_orders');
    setJobOrders(await res.json());
  };

  const fetchClientsAndVehicles = async () => {
    const [cRes, vRes] = await Promise.all([fetch('/api/clients'), fetch('/api/vehicles')]);
    setClients(await cRes.json());
    setVehicles(await vRes.json());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/job_orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setFormData({ client_id: '', vehicle_id: '', status: 'draft', discount: 0, special_notes: '' });
      fetchJobOrders();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this job order?')) return;
    const res = await fetch(`/api/job_orders/${id}`, { method: 'DELETE' });
    if (res.ok) fetchJobOrders();
  };

  const filteredVehicles = vehicles.filter(v => v.client_id === formData.client_id);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Job Orders</h2>
      
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow border border-gray-200 space-y-4 max-w-4xl">
        <h3 className="font-semibold text-lg">Create New Job Order</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Client *</label>
            <select required className="w-full border p-2 rounded" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value, vehicle_id: ''})}>
              <option value="">-- Select Client --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Vehicle *</label>
            <select required className="w-full border p-2 rounded" value={formData.vehicle_id} onChange={e => setFormData({...formData, vehicle_id: e.target.value})} disabled={!formData.client_id}>
              <option value="">-- Select Vehicle --</option>
              {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.make_model} {v.license_vin ? `(${v.license_vin})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select className="w-full border p-2 rounded" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Create Job Order</button>
      </form>

      <div className="bg-white rounded shadow overflow-hidden border border-gray-200">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-3 text-sm font-semibold">Job #</th>
              <th className="p-3 text-sm font-semibold">Client</th>
              <th className="p-3 text-sm font-semibold">Vehicle</th>
              <th className="p-3 text-sm font-semibold">Status</th>
              <th className="p-3 text-sm font-semibold">Total</th>
              <th className="p-3 text-sm font-semibold">Balance</th>
              <th className="p-3 text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobOrders.map(jo => (
              <tr key={jo.id} className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm font-medium">{jo.job_number}</td>
                <td className="p-3 text-sm">{jo.client_name}</td>
                <td className="p-3 text-sm">{jo.vehicle_name}</td>
                <td className="p-3 text-sm capitalize">{jo.status}</td>
                <td className="p-3 text-sm">${parseFloat(jo.grand_total).toFixed(2)}</td>
                <td className="p-3 text-sm font-semibold text-red-600">${parseFloat(jo.balance_due).toFixed(2)}</td>
                <td className="p-3 text-sm space-x-3">
                  <Link to={`/job-orders/${jo.id}`} className="text-blue-600 hover:underline">View / Edit</Link>
                  <button onClick={() => handleDelete(jo.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {jobOrders.length === 0 && (
              <tr><td colSpan="7" className="p-4 text-center text-gray-500">No job orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JobOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [jobOrder, setJobOrder] = useState(null);
  
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({ service_id: '', quantity: 1, unit_price: 0 });
  
  const [newPayment, setNewPayment] = useState({ amount: '', payment_method: 'cash', reference_no: '' });

  useEffect(() => {
    fetchJobOrder();
    fetchServices();
  }, [id]);

  const fetchJobOrder = async () => {
    const res = await fetch(`/api/job_orders/${id}`);
    if (res.ok) setJobOrder(await res.json());
  };

  const fetchServices = async () => {
    const res = await fetch('/api/services');
    if (res.ok) setServices(await res.json());
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/job_order_services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newService, job_order_id: id })
    });
    if (res.ok) {
      setNewService({ service_id: '', quantity: 1, unit_price: 0 });
      fetchJobOrder(); // Refresh totals and line items
    }
  };

  const handleDeleteService = async (serviceId) => {
    await fetch(`/api/job_order_services/${serviceId}`, { method: 'DELETE' });
    fetchJobOrder();
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newPayment, job_order_id: id })
    });
    if (res.ok) {
      setNewPayment({ amount: '', payment_method: 'cash', reference_no: '' });
      fetchJobOrder();
    }
  };

  const handleUpdateStatus = async (status) => {
    await fetch(`/api/job_orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchJobOrder();
  };

  if (!jobOrder) return <div>Loading...</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/job-orders')} className="text-gray-500 hover:text-gray-800 font-bold">&larr; Back</button>
          <h2 className="text-2xl font-bold">Job Order: {jobOrder.job_number}</h2>
        </div>
        <div className="space-x-2">
          <span className="text-sm text-gray-500 font-semibold mr-2">Status:</span>
          <select 
            value={jobOrder.status} 
            onChange={(e) => handleUpdateStatus(e.target.value)}
            className="border p-2 rounded bg-white font-semibold"
          >
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded shadow border border-gray-200 grid grid-cols-2 gap-8">
        <div>
          <h3 className="font-bold text-gray-700 mb-2 border-b pb-2">Client Details</h3>
          <p><span className="font-semibold w-24 inline-block">Name:</span> {jobOrder.client_name}</p>
          <p><span className="font-semibold w-24 inline-block">Phone:</span> {jobOrder.phone}</p>
        </div>
        <div>
          <h3 className="font-bold text-gray-700 mb-2 border-b pb-2">Vehicle Details</h3>
          <p><span className="font-semibold w-24 inline-block">Make/Model:</span> {jobOrder.vehicle_name}</p>
          <p><span className="font-semibold w-24 inline-block">VIN/Plate:</span> {jobOrder.license_vin || 'N/A'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column: Line Items */}
        <div className="bg-white p-6 rounded shadow border border-gray-200">
          <h3 className="font-bold text-lg mb-4">Line Items (Services)</h3>
          <table className="w-full text-left mb-6 text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Service</th>
                <th className="py-2">Qty</th>
                <th className="py-2">Price</th>
                <th className="py-2">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {jobOrder.services.map(s => (
                <tr key={s.id} className="border-b">
                  <td className="py-2">{s.service_name}</td>
                  <td className="py-2">{s.quantity}</td>
                  <td className="py-2">${parseFloat(s.unit_price).toFixed(2)}</td>
                  <td className="py-2 font-semibold">${parseFloat(s.line_total).toFixed(2)}</td>
                  <td className="py-2 text-right"><button onClick={() => handleDeleteService(s.id)} className="text-red-500 text-xs">remove</button></td>
                </tr>
              ))}
              {jobOrder.services.length === 0 && <tr><td colSpan="5" className="py-4 text-center text-gray-500">No services added.</td></tr>}
            </tbody>
          </table>

          <form onSubmit={handleAddService} className="flex space-x-2 text-sm">
            <select required className="border p-2 rounded flex-1" value={newService.service_id} onChange={e => {
              const s = services.find(x => x.id === e.target.value);
              setNewService({ ...newService, service_id: e.target.value, unit_price: s ? s.base_price : 0 });
            }}>
              <option value="">-- Add Service --</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.service_name}</option>)}
            </select>
            <input type="number" min="1" className="border p-2 rounded w-16" value={newService.quantity} onChange={e => setNewService({...newService, quantity: parseInt(e.target.value)})} placeholder="Qty" />
            <input type="number" step="0.01" className="border p-2 rounded w-24" value={newService.unit_price} onChange={e => setNewService({...newService, unit_price: e.target.value})} placeholder="Price" />
            <button type="submit" className="bg-blue-600 text-white px-3 py-2 rounded font-semibold">+</button>
          </form>
        </div>

        {/* Right Column: Payments & Totals */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded shadow border border-gray-200">
            <h3 className="font-bold text-lg mb-4">Financial Summary</h3>
            <div className="flex justify-between py-2 border-b"><span className="text-gray-600">Subtotal:</span> <span className="font-semibold">${parseFloat(jobOrder.sub_total).toFixed(2)}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-gray-600">Discount:</span> <span className="font-semibold text-green-600">-${parseFloat(jobOrder.discount).toFixed(2)}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-gray-600">Grand Total:</span> <span className="font-bold text-lg">${parseFloat(jobOrder.grand_total).toFixed(2)}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-gray-600">Amount Paid:</span> <span className="font-semibold">${parseFloat(jobOrder.amount_paid).toFixed(2)}</span></div>
            <div className="flex justify-between py-2 bg-red-50 p-2 mt-2 rounded"><span className="font-bold text-red-800">Balance Due:</span> <span className="font-bold text-red-800">${parseFloat(jobOrder.balance_due).toFixed(2)}</span></div>
          </div>

          <div className="bg-white p-6 rounded shadow border border-gray-200">
            <h3 className="font-bold text-lg mb-4">Record Payment</h3>
            <form onSubmit={handleAddPayment} className="space-y-3">
              <div className="flex space-x-3">
                <input required type="number" step="0.01" max={jobOrder.balance_due} className="border p-2 rounded flex-1" placeholder="Amount" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} />
                <select className="border p-2 rounded w-32" value={newPayment.payment_method} onChange={e => setNewPayment({...newPayment, payment_method: e.target.value})}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <input type="text" className="border p-2 rounded w-full" placeholder="Reference No (Optional)" value={newPayment.reference_no} onChange={e => setNewPayment({...newPayment, reference_no: e.target.value})} />
              <button type="submit" className="bg-green-600 text-white w-full py-2 rounded font-semibold" disabled={jobOrder.balance_due <= 0}>Add Payment</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JobOrders() {
  return (
    <Routes>
      <Route path="/" element={<JobOrderList />} />
      <Route path="/:id" element={<JobOrderDetail />} />
    </Routes>
  );
}
