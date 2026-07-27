import { useState, useEffect } from 'react';

export default function MasterCustomer() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [formData, setFormData] = useState({ full_name: '', phone: '', email: '', address: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/clients/${editingId}` : '/api/clients';
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setFormData({ full_name: '', phone: '', email: '', address: '' });
        setEditingId(null);
        fetchClients();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (client) => {
    setFormData({
      full_name: client.full_name,
      phone: client.phone,
      email: client.email || '',
      address: client.address || ''
    });
    setEditingId(client.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (res.ok) fetchClients();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Master Customers</h2>
      
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow border border-gray-200 space-y-4 max-w-2xl">
        <h3 className="font-semibold text-lg">{editingId ? 'Edit Master Customer' : 'Add New Master Customer'}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name *</label>
            <input required className="w-full border p-2 rounded" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone *</label>
            <input required className="w-full border p-2 rounded" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" className="w-full border p-2 rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input className="w-full border p-2 rounded" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
            {editingId ? 'Update Master Customer' : 'Add Master Customer'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setFormData({ full_name: '', phone: '', email: '', address: '' }); }} className="bg-gray-300 px-4 py-2 rounded">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded shadow overflow-hidden border border-gray-200">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-3 text-sm font-semibold">Name</th>
              <th className="p-3 text-sm font-semibold">Phone</th>
              <th className="p-3 text-sm font-semibold">Email</th>
              <th className="p-3 text-sm font-semibold">Address</th>
              <th className="p-3 text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(client => (
              <tr key={client.id} className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm">{client.full_name}</td>
                <td className="p-3 text-sm">{client.phone}</td>
                <td className="p-3 text-sm">{client.email}</td>
                <td className="p-3 text-sm">{client.address}</td>
                <td className="p-3 text-sm space-x-2">
                  <button onClick={() => handleEdit(client)} className="text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(client.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr><td colSpan="5" className="p-4 text-center text-gray-500">No master customers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
