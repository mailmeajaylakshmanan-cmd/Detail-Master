import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import InvoiceForm from '../components/InvoiceForm.jsx';

function mapMethodToLabel(method) {
  const map = {
    cash: 'Cash',
    upi: 'UPI',
    bank_transfer: 'Bank Transfer',
    card: 'Card',
  };
  return map[String(method || '').toLowerCase()] || method || 'Cash';
}

export default function EditInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(function () {
    api.get('/invoices/' + id).then(function (res) {
      const row = res.data;
      const makeModel = (row.vehicle_name || '').trim();
      const parts = makeModel.split(/\s+/);
      setInvoice({
        ...row,
        invoiceNo: row.invoice_number,
        invoiceNumber: row.invoice_number,
        vehicleId: row.vehicle_id,
        organizationId: row.organization_id,
        customer: {
          id: row.organization_id || row.client_id,
          name: row.organization_name || row.client_name || '',
          phone: row.organization_phone || row.client_phone || '',
          address: row.organization_address || row.client_address || '',
          vehicles: [{
            id: row.vehicle_id,
            make: parts[0] || '',
            model: parts.slice(1).join(' ') || '',
            plate: row.license_vin || '',
          }],
        },
        carMake: makeModel,
        licensePlate: row.license_vin || '',
        discount: Number(row.discount) || 0,
        subTotal: Number(row.sub_total) || 0,
        notes: row.special_notes || '',
        showTerms: row.include_terms !== false,
        termsAndConditions: row.terms_conditions || '',
        services: (row.services || []).map((s) => ({
          service_id: s.service_id,
          service: s.service_name || s.service,
          description: s.category || s.description || '',
          price: Number(s.unit_price ?? s.price) || 0,
          total: Number(s.unit_price ?? s.total) || 0,
        })),
        payments: (row.payments || []).map((p) => ({
          ...p,
          method: mapMethodToLabel(p.payment_method || p.method),
        })),
      });
    });
  }, [id]);

  async function handleSubmit(data) {
    setLoading(true);
    try {
      const { payments: newPayments = [], ...header } = data;

      // Update invoice header + services only (do not replace old payments)
      await api.put('/invoices/' + id, header);

      // Only add NEW payment rows against this invoice id
      for (const p of newPayments) {
        await api.post('/payments', {
          invoice_order_id: Number(id),
          amount: Number(p.amount),
          payment_method: p.method,
          payment_date: p.date || new Date(),
          reference_no: p.reference_no || null,
        });
      }

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
