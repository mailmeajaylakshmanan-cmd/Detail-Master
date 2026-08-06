import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Printer, MessageCircle, Pencil,
  ChevronDown, FileText, X, Plus, IndianRupee,
  Car, Shield, Droplets, Sparkles, Wrench, CircleDashed
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

const ICONS = [Car, Shield, CircleDashed, Sparkles, Droplets, Wrench];

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
        {/* HEADER */}
        <div style={{ position: 'relative', height: '140px', backgroundColor: '#fff', width: '100%', overflow: 'hidden' }}>
          
          {/* Main Background with gradient */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, #0A0A0A 0%, #1F1F1F 100%)', clipPath: 'polygon(0 0, 56% 0, 71% 100%, 0 100%)', zIndex: 1 }}></div>

          {/* Top left yellow triangle */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100px', height: '100px', filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))', zIndex: 2 }}>
             <div style={{ width: '100%', height: '100%', backgroundColor: '#EDCB19', clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}></div>
          </div>
          
          {/* Thin white pinstripe with shadow */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', filter: 'drop-shadow(-1px 0px 3px rgba(0,0,0,0.4))', zIndex: 3 }}>
             <div style={{ width: '100%', height: '100%', backgroundColor: '#ffffff', clipPath: 'polygon(50.5% 0, 50.8% 0, 65.5% 100%, 65.8% 100%)' }}></div>
          </div>

          {/* Gold wedge with shadow */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', filter: 'drop-shadow(-3px 0px 5px rgba(0,0,0,0.5))', zIndex: 4 }}>
             <div style={{ width: '100%', height: '100%', backgroundColor: '#EDCB19', clipPath: 'polygon(51.8% 0, 54.5% 0, 66.8% 100%, 69.5% 100%)' }}></div>
          </div>

          {/* Right Black shape for INVOICE */}
          <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '65px', background: '#0A0A0A', clipPath: 'polygon(75% 0, 100% 0, 100% 100%, 80% 100%)', zIndex: 1 }}></div>
          
          {/* Right Yellow stripe below INVOICE */}
          <div style={{ position: 'absolute', top: '65px', right: 0, width: '100%', height: '12px', filter: 'drop-shadow(-2px 2px 4px rgba(0,0,0,0.4))', zIndex: 2 }}>
             <div style={{ width: '100%', height: '100%', backgroundColor: '#EDCB19', clipPath: 'polygon(80.5% 0, 100% 0, 100% 100%, 81.5% 100%)' }}></div>
          </div>

          <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', padding: '15px 40px', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Logo directly on gradient background */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={brandLogo} alt="Logo" style={{ height: 50, objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
              </div>
              <div style={{ lineHeight: 1.1 }}>
                <p style={{ 
                    fontFamily: "Georgia, serif", 
                    fontSize: 18, 
                    margin: 0, 
                    letterSpacing: '4px', 
                    fontWeight: 600,
                    background: 'linear-gradient(to bottom, #F4E5B2 0%, #B8860B 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.5))'
                }}>DETAILING</p>
                <p style={{ 
                    fontFamily: "Georgia, serif", 
                    fontSize: 28, 
                    margin: 0, 
                    letterSpacing: '2px', 
                    fontWeight: 700,
                    background: 'linear-gradient(to bottom, #FFFFFF 0%, #E8E8E8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.6))'
                }}>MASTERS</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', paddingRight: '15px', paddingTop: '10px' }}>
              <h1 style={{ 
                  fontFamily: "Georgia, serif",
                  fontSize: 32, 
                  fontWeight: 700, 
                  margin: 0, 
                  letterSpacing: '0.05em',
                  background: 'linear-gradient(to bottom, #FFFFFF 0%, #E8E8E8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.6))'
              }}>INVOICE</h1>
            </div>
          </div>
        </div>

        {/* INFO SECTIONS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '30px 40px', backgroundColor: '#f9fafb' }}>
           <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px 0', color: '#111', textTransform: 'uppercase' }}>INVOICE INFO</h3>
              <div style={{ fontSize: 13, color: '#333', lineHeight: 1.8 }}>
                 <div style={{ display: 'flex' }}><span style={{ width: 65, fontWeight: 600 }}>Address:</span> <span style={{ flex: 1 }}>Opposite KTM Bike Showroom, Kulasekharam, Kanyakumari</span></div>
                 <div style={{ display: 'flex' }}><span style={{ width: 65, fontWeight: 600 }}>Phone:</span> <span>+91 9994122652</span></div>
                 <div style={{ display: 'flex' }}><span style={{ width: 65, fontWeight: 600 }}>Email:</span> <span>detailingmasters@gmail.com</span></div>
              </div>
           </div>
           <div style={{ flex: 1, paddingLeft: 40 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px 0', color: '#111', textTransform: 'uppercase' }}>CLIENT INFO</h3>
              <div style={{ fontSize: 13, color: '#333', lineHeight: 1.8 }}>
                 <div style={{ display: 'flex' }}><span style={{ width: 75, fontWeight: 600 }}>Name:</span> <span>{invoice.customer?.name}</span></div>
                 <div style={{ display: 'flex' }}><span style={{ width: 75, fontWeight: 600 }}>Car Make:</span> <span>{invoice.carMake} {invoice.carModel}</span></div>
                 <div style={{ display: 'flex' }}><span style={{ width: 75, fontWeight: 600 }}>Plate:</span> <span>{invoice.licensePlate}</span></div>
                 <div style={{ display: 'flex' }}><span style={{ width: 75, fontWeight: 600 }}>Date:</span> <span>{dateStr}</span></div>
              </div>
           </div>
        </div>

        {/* SERVICES TABLE */}
        <div style={{ padding: '20px 40px 0 40px', flex: 1 }}>
           <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px 0', color: '#0A0A0A', textTransform: 'uppercase' }}>SERVICES RENDERED</h3>
           <div style={{ height: 2, backgroundColor: '#0A0A0A', marginBottom: 16 }}></div>
           
           <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.08, pointerEvents: 'none', zIndex: 0 }}>
                 <img src={brandLogo} style={{ width: '350px' }} />
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, border: '1px solid #e2e8f0', position: 'relative', zIndex: 1 }}>
                 <thead>
                    <tr style={{ backgroundColor: '#0A0A0A', color: '#fff' }}>
                       <th style={{ padding: '12px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #333', width: '50%' }}>Service</th>
                       <th style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600, border: '1px solid #333', width: '15%' }}>Quantity</th>
                       <th style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600, border: '1px solid #333', width: '17.5%' }}>Unit Price (₹)</th>
                       <th style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600, border: '1px solid #333', width: '17.5%' }}>Amount (₹)</th>
                    </tr>
                 </thead>
                 <tbody>
                    {invoice.services?.length > 0 ? invoice.services.map((s, idx) => {
                       const IconComponent = ICONS[idx % ICONS.length];
                       return (
                       <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f8fafc' : '#fff' }}>
                          <td style={{ padding: '10px 12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
                             <div style={{ backgroundColor: '#EDCB19', borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <IconComponent size={14} color="#0A0A0A" />
                             </div>
                             <div>
                                <div style={{ fontWeight: 500, color: '#111' }}>{s.service}</div>
                                {s.description && <div style={{ fontSize: 11, color: '#666' }}>{s.description}</div>}
                             </div>
                          </td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#111' }}>{s.quantity || 1}</td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#111' }}>₹{fmt(s.price)}</td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#111', fontWeight: 600 }}>₹{fmt(s.total)}</td>
                       </tr>
                    )}) : (
                       <tr style={{ backgroundColor: '#fff' }}>
                          <td colSpan="4" style={{ padding: '12px', textAlign: 'center', color: '#666', border: '1px solid #e2e8f0' }}>No services added</td>
                       </tr>
                    )}
                    <tr style={{ backgroundColor: '#EDCB19', color: '#0A0A0A' }}>
                       <td colSpan="3" style={{ padding: '16px', fontWeight: 800, fontSize: 15, textAlign: 'right', border: '1px solid #e2e8f0', textTransform: 'uppercase' }}>
                          TOTAL AMOUNT DUE:
                       </td>
                       <td style={{ padding: '16px', fontWeight: 800, fontSize: 16, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                          ₹{fmt(invoice.total)}
                       </td>
                    </tr>
                 </tbody>
              </table>
           </div>
        </div>

        {/* PAYMENT DETAILS */}
        <div style={{ padding: '20px 40px', marginTop: 20 }}>
           <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px 0', color: '#111', textTransform: 'uppercase' }}>PAYMENT DETAILS</h3>
           <div style={{ fontSize: 13, color: '#333', lineHeight: 1.6 }}>
              <div>+91 9994122652</div>
              <div>detailingmasters@gmail.com</div>
              {invoice.showTerms && invoice.termsAndConditions && (
                 <div style={{ marginTop: 12, fontSize: 11, color: '#666', maxWidth: '70%' }}>
                    <strong>Terms:</strong> {invoice.termsAndConditions}
                 </div>
              )}
           </div>
        </div>

        {/* FOOTER */}
        <div style={{ position: 'relative', width: '100%', marginTop: 'auto', overflow: 'hidden', minHeight: '110px' }}>
           <div style={{ position: 'relative', textAlign: 'center', fontSize: 11, color: '#0A0A0A', zIndex: 10, padding: '20px 40px 60px 40px' }}>
              <strong>Detailing Masters</strong>, Opposite KTM Bike Showroom, Kulasekharam, Kanyakumari.<br/>
              Ph: +91 9994122652 | E-mail: detailingmasters@gmail.com
           </div>
           
           {/* Diagonal closing band mirroring header */}
           <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '40px', backgroundColor: '#0A0A0A', clipPath: 'polygon(0 100%, 70% 100%, 60% 0, 0 0)', zIndex: 1 }}></div>
           
           <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '40px', backgroundColor: '#fff', clipPath: 'polygon(69.2% 100%, 70% 100%, 60% 0, 59.2% 0)', zIndex: 2 }}></div>
           <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '40px', backgroundColor: '#EDCB19', clipPath: 'polygon(69.5% 100%, 100% 100%, 100% 0, 59.5% 0)', zIndex: 1 }}></div>
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
    maxWidth: 820,
    minHeight: 'auto',
    margin: '0 auto',
    background: '#ffffff',
    boxShadow: '0 12px 40px rgba(0,0,0,0.06)',
    fontFamily: "'Inter', system-ui, sans-serif",
    position: 'relative',
    border: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
};
