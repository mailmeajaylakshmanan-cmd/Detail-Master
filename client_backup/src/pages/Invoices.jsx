import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [jobOrders, setJobOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({ job_order_id: '', invoice_number: '', status: 'pending' });

  useEffect(() => {
    fetchInvoices();
    fetchJobOrders();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/invoices');
      setInvoices(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const fetchJobOrders = async () => {
    const res = await fetch('/api/job_orders');
    setJobOrders(await res.json());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setFormData({ job_order_id: '', invoice_number: '', status: 'pending' });
      fetchInvoices();
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Invoices</h2>
      
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow border border-gray-200 space-y-4 max-w-2xl">
        <h3 className="font-semibold text-lg">Generate Invoice</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Job Order *</label>
            <select required className="w-full border p-2 rounded" value={formData.job_order_id} onChange={e => setFormData({...formData, job_order_id: e.target.value})}>
              <option value="">-- Select Job --</option>
              {jobOrders.map(jo => <option key={jo.id} value={jo.id}>{jo.job_number} ({jo.client_name})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Invoice # *</label>
            <input required className="w-full border p-2 rounded" value={formData.invoice_number} onChange={e => setFormData({...formData, invoice_number: e.target.value})} placeholder="INV-1001" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select className="w-full border p-2 rounded" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="void">Void</option>
            </select>
          </div>
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Generate Invoice</button>
      </form>

      <div className="bg-white rounded shadow overflow-hidden border border-gray-200">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-3 text-sm font-semibold">Invoice #</th>
              <th className="p-3 text-sm font-semibold">Date</th>
              <th className="p-3 text-sm font-semibold">Client</th>
              <th className="p-3 text-sm font-semibold">Job Order</th>
              <th className="p-3 text-sm font-semibold">Total</th>
              <th className="p-3 text-sm font-semibold">Balance</th>
              <th className="p-3 text-sm font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(i => (
              <tr key={i.id} className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm font-medium">{i.invoice_number}</td>
                <td className="p-3 text-sm">{new Date(i.invoice_date).toLocaleDateString()}</td>
                <td className="p-3 text-sm">{i.client_name}</td>
                <td className="p-3 text-sm"><Link to={`/job-orders/${i.job_order_id}`} className="text-blue-600 hover:underline">{i.job_number}</Link></td>
                <td className="p-3 text-sm">${parseFloat(i.grand_total).toFixed(2)}</td>
                <td className="p-3 text-sm">${parseFloat(i.balance_due).toFixed(2)}</td>
                <td className="p-3 text-sm capitalize">{i.status}</td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan="7" className="p-4 text-center text-gray-500">No invoices found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
