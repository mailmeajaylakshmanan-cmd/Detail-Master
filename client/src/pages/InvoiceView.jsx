import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Printer, MessageCircle, Pencil,
  ChevronDown, FileText, X, Plus, IndianRupee
} from 'lucide-react';
import { parseSafeDate } from '../utils/dateFormatter.js';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import brandLogo from '../assets/brand_logo.png';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d) {
  if (!d) return null;
  const parsed = parseSafeDate(d);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
const STATUS = {
  draft: { dot: '#94a3b8', bg: '#f8fafc', text: '#475569', label: 'Draft' },
  open: { dot: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8', label: 'Open' },
  pending: { dot: '#f59e0b', bg: '#fffbeb', text: '#b45309', label: 'Pending' },
  completed: { dot: '#10b981', bg: '#ecfdf5', text: '#047857', label: 'Paid' },
  cancelled: { dot: '#ef4444', bg: '#fef2f2', text: '#b91c1c', label: 'Cancelled' },
};

function mapMethodLabel(m) {
  const map = {
    cash: 'Cash',
    upi: 'UPI',
    bank_transfer: 'Bank Transfer',
    card: 'Card',
    other: 'Other',
  };
  return map[String(m || '').toLowerCase()] || m || '—';
}

function normalizeInvoice(row) {
  const makeModel = (row.vehicle_name || '').trim();
  const parts = makeModel.split(/\s+/);
  return {
    ...row,
    id: row.id,
    invoiceNo: row.invoice_number || row.invoiceNo,
    date: row.created_at || row.date,
    customer: {
      name: row.client_name || row.customer?.name || '—',
      phone: row.client_phone || row.customer?.phone || '',
      address: row.client_address || row.customer?.address || '',
    },
    carMake: parts[0] || row.carMake || '',
    carModel: parts.slice(1).join(' ') || row.carModel || '',
    licensePlate: row.license_vin || row.licensePlate || '',
    total: Number(row.grand_total ?? row.total) || 0,
    discount: Number(row.discount) || 0,
    balance: Number(row.balance_due ?? row.balance) || 0,
    amountPaid: Number(row.amount_paid) || 0,
    notes: row.special_notes || row.notes || '',
    showTerms: row.include_terms !== false,
    termsAndConditions: row.terms_conditions || '',
    services: (row.services || []).map((s) => ({
      service: s.service_name || s.service,
      description: s.category || s.description || '',
      price: Number(s.unit_price ?? s.price) || 0,
      total: Number(s.unit_price ?? s.total ?? s.grand_total) || 0,
      quantity: s.quantity || 1,
    })),
    payments: row.payments || [],
  };
}

export default function InvoiceView() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareFile, setShareFile] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: '',
    method: 'Cash',
    date: new Date().toISOString().slice(0, 10),
    reference_no: '',
  });

  async function loadInvoice() {
    const res = await api.get('/invoices/' + id);
    setInvoice(normalizeInvoice(res.data));
  }

  useEffect(() => {
    loadInvoice().catch(() => {
      toast.error('Invoice not found in database');
      setInvoice(null);
    });
  }, [id]);

  useEffect(() => {
    if (invoice) {
      document.title = `Invoice ${invoice.invoiceNo} — DETAILING MASTERS`;
    } else {
      document.title = 'DETAILING MASTERS';
    }
    return () => { document.title = 'DETAILING MASTERS'; };
  }, [invoice]);

  async function updateStatus(status) {
    await api.put('/invoices/' + id, { status });
    setInvoice(inv => ({ ...inv, status }));
    toast.success('Status updated to ' + status);
  }

  async function handleAddPayment(e) {
    e.preventDefault();
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0) return toast.error('Enter a valid paid amount');

    setPaying(true);
    try {
      const needsRef = payForm.method === 'UPI' || payForm.method === 'Bank Transfer';
      await api.post('/payments', {
        invoice_order_id: Number(id),
        amount,
        payment_method: payForm.method,
        payment_date: payForm.date || new Date(),
        reference_no: needsRef ? (payForm.reference_no || null) : null,
      });
      toast.success('Payment saved');
      setPayForm({
        amount: '',
        method: 'Cash',
        date: new Date().toISOString().slice(0, 10),
        reference_no: '',
      });
      setPayOpen(false);
      await loadInvoice();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save payment');
    } finally {
      setPaying(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function fetchPDFBlob() {
    const response = await api.get(`/invoices/${id}/pdf`);
    const base64 = response.data.base64;
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'application/pdf' });
  }

  async function handleDownloadPDF() {
    if (!invoice) return;
    setDownloading(true);
    try {
      const blob = await fetchPDFBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DETAILING MASTERS-Invoice-${invoice.invoiceNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Could not download PDF');
    } finally {
      setDownloading(false);
    }
  }

  async function handleWhatsApp() {
    if (!invoice) return;
    setShareModalOpen(true);
    setSharing(true);
    setShareFile(null);
    try {
      const blob = await fetchPDFBlob();
      const file = new File([blob], `DETAILING MASTERS-Invoice-${invoice.invoiceNo}.pdf`, { type: 'application/pdf' });
      setShareFile(file);
    } catch (err) {
      toast.error('Could not generate PDF for sharing');
      setShareModalOpen(false);
    } finally {
      setSharing(false);
    }
  }

  function handleDirectShare() {
    if (navigator.share && navigator.canShare?.({ files: [shareFile] })) {
      navigator.share({
        title: `Invoice ${invoice.invoiceNo} — DETAILING MASTERS`,
        files: [shareFile],
      }).catch(e => {
        if (e.name !== 'AbortError') console.error(e);
      });
    } else {
      const url = URL.createObjectURL(shareFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = shareFile.name;
      a.click();
      URL.revokeObjectURL(url);

      const phone = invoice.customer?.phone?.replace(/\D/g, '') || '';
      window.open(`https://wa.me/${phone.length === 10 ? '91' + phone : phone}`, '_blank');
      toast.success('PDF downloaded. Attach it in WhatsApp!');
    }
    setShareModalOpen(false);
  }

  if (!invoice) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #FBD904', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const st = STATUS[invoice.status] ?? STATUS.pending;
  const dateStr = fmtDate(invoice.date);
  const needsRef = payForm.method === 'UPI' || payForm.method === 'Bank Transfer';
  const brandGold = '#FBD904';
  const textDark = '#374151';
  const textMuted = '#6b7280';
  const borderCol = '#d1d5db';

  return (
    <div>
      <div className="print:hidden" style={bar.wrap}>
        <div style={bar.left}>
          <Link to="/invoices" style={bar.back}>
            <ArrowLeft size={14} />
            <span>Invoices</span>
          </Link>
          <span style={bar.sep}>/</span>
          <span style={bar.title}>{invoice.invoiceNo}</span>
          <span style={{ ...bar.badge, background: st.bg, color: st.text }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot, display: 'inline-block' }} />
            {st.label}
          </span>
        </div>
        <div style={bar.right}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <select value={invoice.status} onChange={e => updateStatus(e.target.value)} style={bar.select}>
              {['draft', 'open', 'pending', 'completed', 'cancelled'].map((v) => (
                <option key={v} value={v}>{STATUS[v]?.label || v}</option>
              ))}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#888' }} />
          </div>
          <button onClick={() => setPayOpen(true)} style={{ ...bar.btn, background: '#111827', color: '#fff', borderColor: '#111827' }}>
            <Plus size={14} />
            Add Payment
          </button>
          <button onClick={handleWhatsApp} disabled={sharing} style={{ ...bar.btn, background: '#25d366', color: '#fff', borderColor: '#25d366', opacity: sharing ? 0.7 : 1 }}>
            <MessageCircle size={14} />
            {sharing ? 'Generating...' : 'WhatsApp'}
          </button>
          <button onClick={handleDownloadPDF} disabled={downloading} style={{ ...bar.btn, opacity: downloading ? 0.7 : 1 }}>
            <Printer size={14} />
            {downloading ? 'Downloading...' : 'Download PDF'}
          </button>
          <button onClick={handlePrint} style={bar.btn}>
            <Printer size={14} />
            Print
          </button>
          <Link to={`/invoices/${id}/edit`} style={{ ...bar.btn, background: '#111827', color: '#fff', borderColor: '#111827', textDecoration: 'none' }}>
            <Pencil size={14} />
            Edit
          </Link>
        </div>
      </div>

      <div className="print:hidden" style={{ maxWidth: 820, margin: '0 auto 20px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Amount Paid</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>₹{fmt(invoice.amountPaid)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Balance Due</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: invoice.balance > 0 ? '#e11d48' : '#059669' }}>₹{fmt(Math.max(0, invoice.balance))}</div>
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>Payment records</div>
        {invoice.payments?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {invoice.payments.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, padding: '8px 10px', background: '#f8fafc', borderRadius: 8 }}>
                <span>
                  {mapMethodLabel(p.payment_method)} · {fmtDate(p.payment_date) || '—'}
                  {p.reference_no ? ` · Ref: ${p.reference_no}` : ''}
                </span>
                <strong>₹{fmt(p.amount)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#94a3b8' }}>No payments yet. Use Add Payment for due balance.</div>
        )}
      </div>

      <div id="invoice-print" style={doc.wrap}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '40px 40px 20px', backgroundColor: '#fafafa' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ background: '#000', padding: 8, borderRadius: '6px' }}>
              <img src={brandLogo} alt="Logo" style={{ height: 48, objectFit: 'contain' }} />
            </div>
            <div style={{ lineHeight: 1 }}>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 300, color: '#374151', margin: 0 }}>DETAIL</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 700, color: '#374151', margin: '4px 0 0' }}>MASTERS</p>
            </div>
          </div>
          <div>
            <h1 style={{ fontSize: 36, fontWeight: 400, color: '#4b5563', margin: 0, letterSpacing: '0.05em' }}>INVOICE</h1>
          </div>
        </div>

        <div style={{ padding: '0 40px', marginTop: 20 }}>
          <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#111827' }}>VEHICLE SPECS</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: 12 }}>
            <thead>
              <tr style={{ backgroundColor: '#e5e7eb' }}>
                <th style={{ border: `1px solid ${borderCol}`, padding: '8px', fontWeight: 600, color: textDark, width: '33.33%' }}>VEHICLE NO</th>
                <th style={{ border: `1px solid ${borderCol}`, padding: '8px', fontWeight: 600, color: textDark, width: '33.33%' }}>CAR MAKE</th>
                <th style={{ border: `1px solid ${borderCol}`, padding: '8px', fontWeight: 600, color: textDark, width: '33.33%' }}>CAR MODEL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: `1px solid ${borderCol}`, padding: '8px', color: textMuted }}>{invoice.licensePlate || 'N/A'}</td>
                <td style={{ border: `1px solid ${borderCol}`, padding: '8px', color: textMuted }}>{invoice.carMake || 'N/A'}</td>
                <td style={{ border: `1px solid ${borderCol}`, padding: '8px', color: textMuted }}>{invoice.carModel || 'N/A'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ padding: '24px 40px', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: textDark, width: 140 }}>Customer Name:</span>
              <span style={{ color: textMuted }}>{invoice.customer?.name}</span>
            </div>
            <div style={{ display: 'flex', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: textDark, width: 140 }}>Car Make/Model:</span>
              <span style={{ color: textMuted }}>{invoice.carMake} {invoice.carModel}</span>
            </div>
            <div style={{ display: 'flex', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: textDark, width: 140 }}>Invoice No:</span>
              <span style={{ color: textMuted }}>{invoice.invoiceNo}</span>
            </div>
          </div>
          <div style={{ flex: 1, paddingLeft: 40 }}>
            <div style={{ display: 'flex', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: textDark, width: 70 }}>Phone:</span>
              <span style={{ color: textMuted }}>{invoice.customer?.phone}</span>
            </div>
            <div style={{ display: 'flex', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: textDark, width: 70 }}>Email:</span>
              <span style={{ color: textMuted }}>detailingmasters@gmail.com</span>
            </div>
            <div style={{ display: 'flex', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: textDark, width: 70 }}>Date:</span>
              <span style={{ color: textMuted }}>{dateStr}</span>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 40px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#e5e7eb', borderTop: `1px solid ${borderCol}` }}>
                <th style={{ border: `1px solid ${borderCol}`, borderLeft: 'none', padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: textDark }}>Services</th>
                <th style={{ border: `1px solid ${borderCol}`, padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: textDark, width: '10%' }}>Qty</th>
                <th style={{ border: `1px solid ${borderCol}`, padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: textDark, width: '20%' }}>Unit Price</th>
                <th style={{ border: `1px solid ${borderCol}`, borderRight: 'none', padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: textDark, width: '25%', backgroundColor: brandGold }}>TOTAL (₹)</th>
              </tr>
            </thead>
            <tbody>
              {invoice.services?.length > 0 ? invoice.services.map((s, idx) => (
                <tr key={idx} style={{ backgroundColor: '#ffffff' }}>
                  <td style={{ border: `1px solid ${borderCol}`, borderLeft: 'none', padding: '12px', color: textMuted }}>
                    {s.service}
                    {s.description && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{s.description}</div>}
                  </td>
                  <td style={{ border: `1px solid ${borderCol}`, padding: '12px', textAlign: 'center', color: textMuted }}>{s.quantity || 1}</td>
                  <td style={{ border: `1px solid ${borderCol}`, padding: '12px', textAlign: 'center', color: textMuted, fontVariantNumeric: 'tabular-nums' }}>₹{fmt(s.price)}</td>
                  <td style={{ border: `1px solid ${borderCol}`, borderRight: 'none', padding: '12px', textAlign: 'center', color: textDark, fontWeight: 600, fontVariantNumeric: 'tabular-nums', backgroundColor: brandGold }}>₹{fmt(s.total)}</td>
                </tr>
              )) : (
                <tr style={{ backgroundColor: '#ffffff' }}>
                  <td colSpan="4" style={{ border: `1px solid ${borderCol}`, borderLeft: 'none', borderRight: 'none', padding: '12px', textAlign: 'center', color: textMuted }}>No services added</td>
                </tr>
              )}
              {invoice.discount > 0 && (
                <tr style={{ backgroundColor: '#ffffff' }}>
                  <td colSpan="3" style={{ border: `1px solid ${borderCol}`, borderLeft: 'none', padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: textDark }}>Discount</td>
                  <td style={{ border: `1px solid ${borderCol}`, borderRight: 'none', padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#dc2626', fontVariantNumeric: 'tabular-nums', backgroundColor: brandGold }}>− ₹{fmt(invoice.discount)}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ padding: '12px 16px', fontWeight: 700, fontSize: 14, color: textDark, textTransform: 'uppercase' }}>TOTAL AMOUNT DUE</div>
              <div style={{ backgroundColor: brandGold, padding: '12px 24px', fontWeight: 700, fontSize: 16, color: textDark, fontVariantNumeric: 'tabular-nums', width: '25%', textAlign: 'center', boxSizing: 'border-box', borderBottom: `1px solid ${borderCol}` }}>₹{fmt(invoice.total)}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '40px 40px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', minHeight: 180 }}>
          <div style={{ maxWidth: '65%' }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: textDark, marginBottom: 8 }}>TERMS & CONDITIONS</h4>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: textMuted, lineHeight: 1.5, listStyleType: 'disc' }}>
              <li>20% advance payment is required to confirm the booking.</li>
              <li>Balance payment must be completed before delivery.</li>
              <li>{invoice.notes || 'Thank you for choosing Detailing Masters!'}</li>
              {invoice.showTerms && invoice.termsAndConditions && <li>{invoice.termsAndConditions}</li>}
            </ul>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ backgroundColor: '#111827', color: '#FBD904', width: 80, height: 90, clipPath: 'polygon(50% 0%, 100% 0, 100% 70%, 50% 100%, 0 70%, 0 0)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '10px 4px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}>WARRANTY</div>
              <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2 }}>BADGE</div>
              <div style={{ fontSize: 8, marginTop: 4, opacity: 0.8, textTransform: 'uppercase' }}>Guaranteed</div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${borderCol}`, padding: '16px 40px', textAlign: 'center', backgroundColor: '#f9fafb' }}>
          <p style={{ margin: 0, fontSize: 12, color: textDark, fontWeight: 500 }}>
            <strong>Detailing Masters</strong>, Opposite KTM Bike Showroom, Kulasekharam, Kanyakumari.
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: textMuted }}>Ph: +91 9994122652 | E-mail: detailingmasters@gmail.com</p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print {
          .print\\:hidden { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #invoice-print {
            max-width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      {payOpen && (
        <div
          className="print:hidden"
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.5)', padding: 16 }}
          onClick={() => !paying && setPayOpen(false)}
        >
          <form
            onSubmit={handleAddPayment}
            style={{ background: '#fff', padding: 24, borderRadius: 16, width: 420, boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Add Payment</h3>
              <button type="button" onClick={() => setPayOpen(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: 6, cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              Balance due: <strong>₹{fmt(Math.max(0, invoice.balance))}</strong>. Saved as another payment row on this invoice.
            </p>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>PAID AMOUNT</label>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <IndianRupee size={14} style={{ position: 'absolute', left: 10, top: 12, color: '#94a3b8' }} />
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={payForm.amount}
                onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px 10px 28px', borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>METHOD</label>
            <select
              value={payForm.method}
              onChange={e => setPayForm(f => ({ ...f, method: e.target.value, reference_no: '' }))}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 12 }}
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Card">Card</option>
            </select>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>DATE</label>
            <input
              type="date"
              value={payForm.date}
              onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 12 }}
            />
            {needsRef && (
              <>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>TRANSACTION NO (OPTIONAL)</label>
                <input
                  value={payForm.reference_no}
                  onChange={e => setPayForm(f => ({ ...f, reference_no: e.target.value }))}
                  placeholder="UPI / bank reference"
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 12 }}
                />
              </>
            )}
            <button
              type="submit"
              disabled={paying}
              style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: '#FBD904', fontWeight: 800, cursor: 'pointer', opacity: paying ? 0.7 : 1 }}
            >
              {paying ? 'Saving…' : 'Save Payment'}
            </button>
          </form>
        </div>
      )}

      {shareModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', padding: 16 }} onClick={() => setShareModalOpen(false)}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 16, width: 440, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 20, color: '#0f172a' }}>Share Document</h3>
                <p style={{ margin: '0 0 16px', fontSize: 14, color: '#64748b' }}>Send the PDF directly via WhatsApp or download it to your device.</p>
              </div>
              <button onClick={() => setShareModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', padding: 6, borderRadius: '50%', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 24, background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <FileText size={24} color="#FBD904" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>DETAILING MASTERS-Invoice-{invoice.invoiceNo}.pdf</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>PDF Document • {shareFile ? `${(shareFile.size / 1024).toFixed(0)} KB` : 'Generating...'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setShareModalOpen(false); handleDownloadPDF(); }} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                Download Only
              </button>
              <button onClick={handleDirectShare} disabled={!shareFile} style={{ flex: 1, padding: '10px', background: '#25d366', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: shareFile ? 'pointer' : 'not-allowed', opacity: shareFile ? 1 : 0.5 }}>
                Share Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const bar = {
  wrap: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 },
  left: { display: 'flex', alignItems: 'center', gap: 10 },
  right: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  back: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#64748b', textDecoration: 'none', fontWeight: 500 },
  sep: { color: '#cbd5e1', fontSize: 14 },
  title: { fontSize: 18, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20 },
  btn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '0 16px', height: 36, borderRadius: 8,
    border: '1px solid #cbd5e1', background: '#fff',
    fontSize: 13, fontWeight: 500, color: '#334155',
    cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s',
  },
  select: {
    appearance: 'none', padding: '0 32px 0 16px', height: 36, borderRadius: 8,
    border: '1px solid #cbd5e1', background: '#fff',
    fontSize: 13, color: '#334155', cursor: 'pointer', fontWeight: 500,
  },
};

const doc = {
  wrap: {
    maxWidth: 820, margin: '0 auto',
    background: '#ffffff',
    boxShadow: '0 12px 40px rgba(0,0,0,0.06)',
    fontFamily: "'Inter', system-ui, sans-serif",
    position: 'relative',
    border: '1px solid #e5e7eb',
  },
};
