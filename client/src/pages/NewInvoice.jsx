import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';
import InvoiceForm from '../components/InvoiceForm.jsx';

export default function NewInvoice() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [existingInvoice, setExistingInvoice] = useState(null);

  async function handleClientSelect(client) {
    try {
      const res = await api.get('/invoices', { params: { search: client.name, limit: 10 } });
      const openInvoices = res.data.invoices.filter(i => i.status !== 'paid');
      if (openInvoices.length > 0) {
        setExistingInvoice(openInvoices[0]);
      } else {
        setExistingInvoice(null);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSubmit(data) {
    setLoading(true);
    try {
      const res = await api.post('/invoices', data);
      toast.success('Invoice created — ' + res.data.invoiceNo);
      navigate('/invoices/' + res.data._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating invoice');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto space-y-6">

      {existingInvoice && (
        <div className="card px-6 py-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-rose-50/50 border-rose-200">
          <div>
            <p className="font-bold text-[14px] text-rose-900 flex items-center gap-2 mb-1">
              <AlertCircle size={16} /> Open Bill Found
            </p>
            <p className="text-[13px] font-medium text-rose-700">This client already has an active bill ({existingInvoice.invoiceNo}). Would you like to continue with the old bill?</p>
          </div>
          <Link 
            to={`/invoices/${existingInvoice._id}/edit`} 
            className="shrink-0 bg-white shadow-sm border border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all uppercase tracking-wider"
          >
            Edit Old Bill
          </Link>
        </div>
      )}

      <InvoiceForm onSubmit={handleSubmit} loading={loading} onCustomerSelect={handleClientSelect} />
    </div>
  );
}
