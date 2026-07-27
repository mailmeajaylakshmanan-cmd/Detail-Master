import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Payments() {
  const [jobOrders, setJobOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // We can just reuse the job orders list since we record payments in the job order details, 
  // or fetch all payments if there was a GET /api/payments endpoint. Since we didn't make a GET payments endpoint,
  // we will just list Job Orders that have a balance due.
  
  useEffect(() => {
    fetchJobOrders();
  }, []);

  const fetchJobOrders = async () => {
    try {
      const res = await fetch('/api/job_orders');
      const data = await res.json();
      setJobOrders(data.filter(jo => parseFloat(jo.balance_due) > 0));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Payments (Outstanding Balances)</h2>
      
      <div className="bg-white rounded shadow overflow-hidden border border-gray-200">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-3 text-sm font-semibold">Job #</th>
              <th className="p-3 text-sm font-semibold">Client</th>
              <th className="p-3 text-sm font-semibold">Status</th>
              <th className="p-3 text-sm font-semibold">Total</th>
              <th className="p-3 text-sm font-semibold">Balance Due</th>
              <th className="p-3 text-sm font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {jobOrders.map(jo => (
              <tr key={jo.id} className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm font-medium">{jo.job_number}</td>
                <td className="p-3 text-sm">{jo.client_name}</td>
                <td className="p-3 text-sm capitalize">{jo.status}</td>
                <td className="p-3 text-sm">${parseFloat(jo.grand_total).toFixed(2)}</td>
                <td className="p-3 text-sm font-bold text-red-600">${parseFloat(jo.balance_due).toFixed(2)}</td>
                <td className="p-3 text-sm">
                  <Link to={`/job-orders/${jo.id}`} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-green-700">Record Payment</Link>
                </td>
              </tr>
            ))}
            {jobOrders.length === 0 && (
              <tr><td colSpan="6" className="p-4 text-center text-gray-500">No outstanding balances.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
