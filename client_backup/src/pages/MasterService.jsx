import { useState, useEffect } from 'react';

export default function MasterService() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({ service_name: '', category: '', base_price: '', is_active: true });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services');
      setServices(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/services/${editingId}` : '/api/services';
      const method = editingId ? 'PUT' : 'POST';
      
      const payload = { ...formData, base_price: parseFloat(formData.base_price) };
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setFormData({ service_name: '', category: '', base_price: '', is_active: true });
        setEditingId(null);
        fetchServices();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (s) => {
    setFormData({
      service_name: s.service_name,
      category: s.category || '',
      base_price: s.base_price,
      is_active: s.is_active
    });
    setEditingId(s.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
      if (res.ok) fetchServices();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Master Services</h2>
      
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow border border-gray-200 space-y-4 max-w-2xl">
        <h3 className="font-semibold text-lg">{editingId ? 'Edit Master Service' : 'Add New Master Service'}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Service Name *</label>
            <input required className="w-full border p-2 rounded" value={formData.service_name} onChange={e => setFormData({...formData, service_name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input className="w-full border p-2 rounded" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g. Wash, Coating, Polish" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Base Price ($) *</label>
            <input required type="number" step="0.01" className="w-full border p-2 rounded" value={formData.base_price} onChange={e => setFormData({...formData, base_price: e.target.value})} />
          </div>
          <div className="flex items-center mt-6">
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="rounded" />
              <span className="text-sm font-medium">Is Active</span>
            </label>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
            {editingId ? 'Update Master Service' : 'Add Master Service'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setFormData({ service_name: '', category: '', base_price: '', is_active: true }); }} className="bg-gray-300 px-4 py-2 rounded">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded shadow overflow-hidden border border-gray-200">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-3 text-sm font-semibold">Service Name</th>
              <th className="p-3 text-sm font-semibold">Category</th>
              <th className="p-3 text-sm font-semibold">Base Price</th>
              <th className="p-3 text-sm font-semibold">Status</th>
              <th className="p-3 text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map(s => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm font-medium">{s.service_name}</td>
                <td className="p-3 text-sm">{s.category}</td>
                <td className="p-3 text-sm">${parseFloat(s.base_price).toFixed(2)}</td>
                <td className="p-3 text-sm">{s.is_active ? <span className="text-green-600 font-semibold">Active</span> : <span className="text-gray-400">Inactive</span>}</td>
                <td className="p-3 text-sm space-x-2">
                  <button onClick={() => handleEdit(s)} className="text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr><td colSpan="5" className="p-4 text-center text-gray-500">No master services found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
