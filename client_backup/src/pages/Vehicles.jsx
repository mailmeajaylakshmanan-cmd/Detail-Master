import { useState, useEffect } from 'react';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({ client_id: '', make_model: '', license_vin: '', induction_date: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchVehicles();
    fetchClients();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await fetch('/api/vehicles');
      setVehicles(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      setClients(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/vehicles/${editingId}` : '/api/vehicles';
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setFormData({ client_id: '', make_model: '', license_vin: '', induction_date: '' });
        setEditingId(null);
        fetchVehicles();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (v) => {
    setFormData({
      client_id: v.client_id,
      make_model: v.make_model,
      license_vin: v.license_vin || '',
      induction_date: v.induction_date ? new Date(v.induction_date).toISOString().split('T')[0] : ''
    });
    setEditingId(v.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
      if (res.ok) fetchVehicles();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Vehicles</h2>
      
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow border border-gray-200 space-y-4 max-w-2xl">
        <h3 className="font-semibold text-lg">{editingId ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Client *</label>
            <select required className="w-full border p-2 rounded" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}>
              <option value="">-- Select Client --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Make & Model *</label>
            <input required className="w-full border p-2 rounded" value={formData.make_model} onChange={e => setFormData({...formData, make_model: e.target.value})} placeholder="e.g. BMW X5" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">License Plate / VIN</label>
            <input className="w-full border p-2 rounded" value={formData.license_vin} onChange={e => setFormData({...formData, license_vin: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Induction Date</label>
            <input type="date" className="w-full border p-2 rounded" value={formData.induction_date} onChange={e => setFormData({...formData, induction_date: e.target.value})} />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
            {editingId ? 'Update Vehicle' : 'Add Vehicle'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setFormData({ client_id: '', make_model: '', license_vin: '', induction_date: '' }); }} className="bg-gray-300 px-4 py-2 rounded">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded shadow overflow-hidden border border-gray-200">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-3 text-sm font-semibold">Client</th>
              <th className="p-3 text-sm font-semibold">Make/Model</th>
              <th className="p-3 text-sm font-semibold">License/VIN</th>
              <th className="p-3 text-sm font-semibold">Induction Date</th>
              <th className="p-3 text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map(v => (
              <tr key={v.id} className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm font-medium text-gray-800">{v.client_name}</td>
                <td className="p-3 text-sm">{v.make_model}</td>
                <td className="p-3 text-sm">{v.license_vin}</td>
                <td className="p-3 text-sm">{v.induction_date ? new Date(v.induction_date).toLocaleDateString() : ''}</td>
                <td className="p-3 text-sm space-x-2">
                  <button onClick={() => handleEdit(v)} className="text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(v.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr><td colSpan="5" className="p-4 text-center text-gray-500">No vehicles found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
