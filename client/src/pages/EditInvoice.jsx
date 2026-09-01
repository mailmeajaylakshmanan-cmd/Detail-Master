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

      // Per-visit vehicle details (who brought it in, check-in/check-out) come
      // from the invoice_vehicles join. This also gives us the distinct set of
      // vehicles already attached to this invoice, for the org vehicle picker.
      const vehicleVisits = (row.vehicleVisits || []).map(v => ({
        vehicleId: v.vehicle_id,
        visitorName: v.visitor_name || '',
        visitorPhone: v.visitor_phone || '',
        checkinTime: v.checkin_time ? v.checkin_time.slice(0, 16) : '',
        checkoutTime: v.checkout_time ? v.checkout_time.slice(0, 16) : '',
      }));
      const orgVehicleOptions = (row.vehicleVisits || []).map(v => {
        const vParts = (v.make_model || '').trim().split(/\s+/);
        return {
          id: v.vehicle_id,
          make: vParts[0] || '',
          model: vParts.slice(1).join(' ') || '',
          plate: v.license_vin || '',
          vehicle_type_id: v.vehicle_type_id || null,
          type: v.vehicle_type_name || v.vehicle_type || '',
          isActive: true,
        };
      });

      setInvoice({
        ...row,
        invoiceNo: row.invoice_number,
        invoiceNumber: row.invoice_number,
        vehicleId: row.vehicle_id,
        organizationId: row.organization_id,
        vehicleVisits,
        customer: {
          id: row.organization_id || row.client_id,
          name: row.organization_name || row.client_name || '',
          phone: row.organization_phone || row.client_phone || '',
          address: row.organization_address || row.client_address || '',
          vehicles: row.organization_id ? orgVehicleOptions : [{
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
        services: Object.values((row.services || []).reduce((acc, s) => {
          if (acc[s.service_id]) {
            if (s.vehicle_id) acc[s.service_id].vehicle_ids.push(s.vehicle_id);
            acc[s.service_id].price += Number(s.unit_price ?? s.price) || 0;
            acc[s.service_id].total += Number(s.unit_price ?? s.total) || 0;
          } else {
            acc[s.service_id] = {
              service_id: s.service_id,
              service: s.service_name || s.service,
              description: s.category || s.description || '',
              price: Number(s.unit_price ?? s.price) || 0,
              total: Number(s.unit_price ?? s.total) || 0,
              vehicle_ids: s.vehicle_id ? [s.vehicle_id] : [],
            };
          }
          return acc;
        }, {})),
        thirdPartyServices: Object.values((row.thirdPartyServices || []).reduce((acc, t) => {
          const key = t.third_party_service_id || t.service_name;
          if (acc[key]) {
            if (t.vehicle_id) acc[key].vehicle_ids.push(t.vehicle_id);
            acc[key].selling_price += Number(t.selling_price) || 0;
            acc[key].total += Number(t.total) || 0;
          } else {
            acc[key] = {
              ...t,
              vehicle_ids: t.vehicle_id ? [t.vehicle_id] : [],
            };
          }
          return acc;
        }, {})),
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Link to={`/invoices/${id}`} className="text-gray-500 hover:text-gray-900 text-sm font-semibold flex items-center gap-1.5 transition-colors">
          ← View Invoice
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-lg font-bold text-gray-900">Edit {invoice.invoiceNo}</h1>
      </div>
      <InvoiceForm initial={invoice} onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
