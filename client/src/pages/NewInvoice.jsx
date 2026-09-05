import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';
import InvoiceForm from '../components/InvoiceForm.jsx';
import { useQuery } from '@tanstack/react-query';
import { queryKeys, mapInvoice } from '../api/queryKeys.js';

export default function NewInvoice() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const isOrg = selectedCustomer?.isOrganization || selectedCustomer?.clientType === 'organization';
  const customerId = selectedCustomer?.id || null;

  const { data: openInvoices = [] } = useQuery({
    queryKey: ['invoices', 'open', isOrg ? 'org' : 'client', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const params = { status: 'open', limit: 5 };
      if (isOrg) {
        params.organization_id = customerId;
      } else {
        params.client_id = customerId;
      }
      const res = await api.get('/invoices', { params });
      const rows = Array.isArray(res.data?.invoices) ? res.data.invoices : [];
      return rows.map(mapInvoice);
    },
  });

  const existingInvoice = openInvoices[0] || null;

  function handleClientSelect(customer) {
    setSelectedCustomer(customer || null);
  }

  async function handleSubmit(data) {
    setLoading(true);
    try {
      // InvoiceForm already sends Neon-shaped payload:
      // client_id, vehicle_id, service_ids, discount, payments, notes/terms
      const res = await api.post('/invoices', data);
      toast.success('Invoice created — ' + (res.data.invoice_number || res.data.id));
      navigate('/invoices/' + res.data.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating invoice');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-full mx-auto space-y-5">
      {existingInvoice && (
        <div className="card px-4 sm:px-6 py-3.5 sm:py-4 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-rose-50/50 border-rose-200">
          <div>
            <p className="font-bold text-[14px] text-rose-900 flex items-center gap-2 mb-1">
              <AlertCircle size={16} /> Open Bill Found
            </p>
            <p className="text-[13px] font-medium text-rose-700">
              This client already has an active bill ({existingInvoice.invoiceNo || existingInvoice.invoice_number}). Would you like to continue with the old bill?
            </p>
          </div>
          <Link
            to={`/invoices/${existingInvoice.id || existingInvoice._id}/edit`}
            className="shrink-0 bg-white shadow-sm border border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider"
          >
            Edit Old Bill
          </Link>
        </div>
      )}

      <InvoiceForm onSubmit={handleSubmit} loading={loading} onCustomerSelect={handleClientSelect} />
    </div>
  );
}
