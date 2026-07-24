import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import InvoiceForm from '../components/InvoiceForm.jsx';

export default function EditInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(function () {
    api.get('/invoices/' + id).then(function (res) { setInvoice(res.data); });
  }, [id]);

  async function handleSubmit(data) {
    setLoading(true);
    try {
      await api.put('/invoices/' + id, data);
      toast.success('Invoice updated');
      navigate('/invoices/' + id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating invoice');
    } finally {
      setLoading(false);
    }
  }

  if (!invoice) return <div className="text-gray-500 text-center py-20">Loading...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/invoices/${id}`} className="text-gray-500 hover:text-gray-500 text-sm">← View Invoice</Link>
        <span className="text-gray-500">/</span>
        <h1 className="text-xl font-semibold text-gray-900">Edit {invoice.invoiceNo}</h1>
      </div>
      <InvoiceForm initial={invoice} onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
