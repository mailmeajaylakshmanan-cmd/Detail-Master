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
import brandLogo from '../assets/brand-logo-for-invoice.png';
import goldenCar from '../assets/new-invoice-add.png';

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
    isOrganization: !!(row.organization_id || row.organizationId),
    customer: {
      name: row.client_name || row.organization_name || row.customer?.name || '—',
      phone: row.client_phone || row.organization_phone || row.customer?.phone || '',
      address: row.client_address || row.organization_address || row.customer?.address || '',
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
    services: Object.values((row.services || []).reduce((acc, s) => {
      const name = s.service_name || s.service;
      if (!acc[name]) {
        acc[name] = {
          service: name,
          description: s.category || s.description || '',
          price: Number(s.unit_price ?? s.price) || 0,
          total: 0,
          quantity: 0,
          plates: []
        };
      }
      acc[name].quantity += (s.quantity || 1);
      acc[name].total += (Number(s.unit_price ?? s.total ?? s.grand_total) || 0);
      if (s.vehicle_plate) acc[name].plates.push(s.vehicle_plate);
      return acc;
    }, {})).map(s => ({ ...s, vehicle_plate: s.plates.join(', ') })),
    thirdPartyServices: Object.values((row.thirdPartyServices || []).reduce((acc, t) => {
      const name = t.service_name || t.service;
      if (!acc[name]) {
        acc[name] = {
          ...t,
          selling_price: Number(t.selling_price) || 0,
          quantity: 0,
          total: 0,
          plates: []
        };
      }
      acc[name].quantity += (t.quantity || 1);
      acc[name].total += (Number(t.selling_price) || 0);
      if (t.vehicle_plate) acc[name].plates.push(t.vehicle_plate);
      return acc;
    }, {})).map(t => ({ ...t, vehicle_plate: t.plates.join(', ') })),
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
      <div style={{ position: 'fixed', inset: 0, backgroundColor: '#FFFFFF', zIndex: -10 }}></div>
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

      <div className="print:hidden" style={{ maxWidth: 820, margin: '0 auto 20px', background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
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
        <div style={{ position: 'relative', height: '115px', backgroundColor: '#EBEBED', width: '100%', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          {/* Layer 1: Top Left Yellow Square */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100px', height: '100px', background: '#FFD700', zIndex: 1 }}></div>

          {/* Layer 2: Right Black Polygon */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#000000', clipPath: 'polygon(65% 0, 100% 0, 100% 75%, 57.5% 75%)', zIndex: 2 }}></div>
          
          {/* Layer 3: Right Yellow Bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#FFD700', clipPath: 'polygon(57.5% 75%, 100% 75%, 100% 85%, 56.5% 85%)', zIndex: 3 }}></div>

          {/* Layer 4: Black Splinter */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#000000', clipPath: 'polygon(50% 0, 65% 0, 49% 100%, 35% 100%)', zIndex: 4 }}></div>

          {/* Layer 5: Yellow Stripe */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#FFD700', clipPath: 'polygon(50% 0, 61% 0, 49% 100%, 35% 100%)', zIndex: 5 }}></div>

          {/* Layer 6: Main Left Black Polygon */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#2B2A2A', clipPath: 'polygon(4% 0, 60% 0, 45% 100%, 0 100%, 0 25%)', zIndex: 6 }}></div>

          <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', padding: '2px 40px 2px 45px', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              {/* Logo with pure white shield background */}
              <div style={{ position: 'relative', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))', zIndex: 20 }}>
                <svg width="0" height="0" style={{ position: 'absolute' }}>
                  <clipPath id="shield-clip" clipPathUnits="objectBoundingBox">
                    <path d="M 0 0.02 Q 0.5 -0.02 1 0.02 L 1 0.65 C 1 0.88 0.7 1 0.5 1 C 0.3 1 0 0.88 0 0.65 Z" />
                  </clipPath>
                </svg>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', clipPath: 'url(#shield-clip)', width: 88, height: 108, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <img src={brandLogo} alt="Logo" style={{ height: '100%', width: '100%', objectFit: 'fill', filter: 'drop-shadow(0 0 1px #fff) drop-shadow(0 0 2px rgba(255,255,255,0.9))' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                <span style={{ 
                    fontFamily: "'Cinzel', 'Trajan Pro', 'Georgia', serif", 
                    fontSize: 28, 
                    margin: 0, 
                    letterSpacing: '3px', 
                    fontWeight: 600,
                    background: 'linear-gradient(to right, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                }}>DETAILING</span>
                <span style={{ 
                    fontFamily: "'Cinzel', 'Trajan Pro', 'Georgia', serif", 
                    fontSize: 28, 
                    margin: 0, 
                    letterSpacing: '3px', 
                    fontWeight: 600,
                    background: 'linear-gradient(to right, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                }}>MASTERS</span>
              </div>
            </div>

            {/* Center Accent Logo */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <img src={goldenCar} alt="Car Accent" style={{ height: '80px', objectFit: 'contain', filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.4))', position: 'relative', left: '20%', top: '10px' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', paddingRight: '15px', paddingTop: '20px' }}>
              <h1 style={{ 
                  fontFamily: "'Montserrat', 'Open Sans', sans-serif",
                  fontSize: 36, 
                  fontWeight: 500, 
                  margin: 0, 
                  letterSpacing: '0.05em',
                  color: '#FFFFFF',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                  filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.6))'
              }}>INVOICE</h1>
            </div>
          </div>
        </div>

        {/* Global Watermark */}
        <div style={{ position: 'absolute', top: '115px', bottom: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 50 }}>
           <img src={brandLogo} style={{ width: '450px', opacity: 0.04, filter: 'grayscale(100%)' }} />
        </div>

        {/* INFO SECTIONS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '30px 40px', backgroundColor: 'transparent', position: 'relative', zIndex: 1 }}>
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
                 <div style={{ display: 'flex' }}><span style={{ width: 75, fontWeight: 600 }}>Name:</span> <span>{invoice.customer?.name || 'John Doe'}</span></div>
                 <div style={{ display: 'flex' }}><span style={{ width: 75, fontWeight: 600 }}>Car Make:</span> <span>{invoice.carMake || 'Porsche 911 GT3'}</span></div>
                 <div style={{ display: 'flex' }}><span style={{ width: 75, fontWeight: 600 }}>Plate:</span> <span>{invoice.licensePlate || 'DL-XX-YYYY'}</span></div>
                 <div style={{ display: 'flex' }}><span style={{ width: 75, fontWeight: 600 }}>Date:</span> <span>{dateStr || '26 Oct 2023'}</span></div>
              </div>
           </div>
        </div>

        {/* SERVICES TABLE */}
        <div style={{ padding: '20px 40px 0 40px', flex: 1 }}>
           <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px 0', color: '#0A0A0A', textTransform: 'uppercase' }}>SERVICES</h3>
           <div style={{ height: 2, backgroundColor: '#0A0A0A', marginBottom: 16 }}></div>
           
           <div style={{ position: 'relative' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, position: 'relative', zIndex: 1, backgroundColor: 'transparent' }}>
                 <thead>
                    <tr style={{ backgroundColor: '#0A0A0A', color: '#fff' }}>
                       <th style={{ padding: '12px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #000', width: '50%' }}>Service</th>
                       <th style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600, border: '1px solid #000', width: '15%' }}>Quantity</th>
                       <th style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600, border: '1px solid #000', width: '17.5%' }}>Unit Price (₹)</th>
                       <th style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600, border: '1px solid #000', width: '17.5%' }}>Amount (₹)</th>
                    </tr>
                 </thead>
                 <tbody>
                    {(invoice.services?.length > 0 || invoice.thirdPartyServices?.length > 0) ? (
                       <>
                       {invoice.services?.map((s, idx) => {
                          const IconComponent = ICONS[idx % ICONS.length];
                          const globalIdx = idx;
                          return (
                          <tr key={`s-${idx}`} style={{ backgroundColor: globalIdx % 2 === 0 ? '#FFFFFF' : '#f8fafc' }}>
                             <td style={{ padding: '10px 12px', border: '1px solid #000', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ backgroundColor: '#FBD904', borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                   <IconComponent size={14} color="#000" />
                                </div>
                                <div>
                                   <div style={{ fontWeight: 500, color: '#000' }}>{s.service}</div>
                                   {(s.description || s.vehicle_plate) && (
                                      <div style={{ fontSize: 11, color: '#666' }}>
                                         {s.vehicle_plate && <span style={{ fontWeight: 600, color: '#444' }}>[{s.vehicle_plate}] </span>}
                                         {s.description}
                                      </div>
                                   )}
                                </div>
                             </td>
                             <td style={{ padding: '10px 12px', border: '1px solid #000', textAlign: 'center', color: '#000' }}>{s.quantity || 1}</td>
                             <td style={{ padding: '10px 12px', border: '1px solid #000', textAlign: 'center', color: '#000' }}>₹{fmt(s.price)}</td>
                             <td style={{ padding: '10px 12px', border: '1px solid #000', textAlign: 'center', color: '#000', fontWeight: 600 }}>₹{fmt(s.total)}</td>
                          </tr>
                       )})}
                       {invoice.thirdPartyServices?.map((t, idx) => {
                          const globalIdx = (invoice.services?.length || 0) + idx;
                          const IconComponent = ICONS[globalIdx % ICONS.length];
                          return (
                          <tr key={`tp-${idx}`} style={{ backgroundColor: globalIdx % 2 === 0 ? '#FFFFFF' : '#f8fafc' }}>
                             <td style={{ padding: '10px 12px', border: '1px solid #000', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ backgroundColor: '#FBD904', borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                   <IconComponent size={14} color="#000" />
                                </div>
                                <div>
                                   <div style={{ fontWeight: 500, color: '#000' }}>{t.service_name}</div>
                                   {(t.vendor_name || t.vehicle_plate) && (
                                      <div style={{ fontSize: 11, color: '#666' }}>
                                         {t.vehicle_plate && <span style={{ fontWeight: 600, color: '#444' }}>[{t.vehicle_plate}] </span>}
                                         {t.vendor_name && `Vendor: ${t.vendor_name}`}
                                      </div>
                                   )}
                                </div>
                             </td>
                             <td style={{ padding: '10px 12px', border: '1px solid #000', textAlign: 'center', color: '#000' }}>{t.quantity || 1}</td>
                             <td style={{ padding: '10px 12px', border: '1px solid #000', textAlign: 'center', color: '#000' }}>₹{fmt(t.selling_price)}</td>
                             <td style={{ padding: '10px 12px', border: '1px solid #000', textAlign: 'center', color: '#000', fontWeight: 600 }}>₹{fmt(t.total)}</td>
                          </tr>
                       )})}
                       </>
                    ) : (
                       <tr style={{ backgroundColor: '#FFFFFF' }}>
                          <td colSpan="4" style={{ padding: '12px', textAlign: 'center', color: '#666', border: '1px solid #000' }}>No services added</td>
                       </tr>
                    )}
                    <tr>
                       <td style={{ border: 'none', backgroundColor: 'transparent' }}></td>
                       <td colSpan="3" style={{ border: 'none', padding: 0, backgroundColor: 'transparent' }}>
                          <div style={{ backgroundColor: '#FBD904', color: '#000', padding: '12px 16px', fontWeight: 800, fontSize: 16, textAlign: 'center', width: '100%' }}>
                             TOTAL AMOUNT DUE: ₹{fmt(invoice.total || 45000)}
                          </div>
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
              <div>+91 1234567890</div>
              <div>contact@detailingmasters.com</div>
              {invoice.showTerms && invoice.termsAndConditions && (
                 <div style={{ marginTop: 12, fontSize: 11, color: '#666', maxWidth: '70%' }}>
                    <strong>Terms:</strong> {invoice.termsAndConditions}
                 </div>
              )}
           </div>
        </div>

        {/* FOOTER */}
        <div style={{ position: 'relative', width: '100%', marginTop: 40, overflow: 'hidden' }}>
           <div style={{ margin: '0 40px', borderTop: '1.5px solid #111', paddingTop: '15px', paddingBottom: '30px', textAlign: 'center', fontSize: 13, color: '#111', zIndex: 10, position: 'relative' }}>
              <strong>Detailing Masters</strong>, 123 High Street, Opp. KTM Bike Showroom, Bengaluru, India.<br/>
              Ph: +91 (23 367 7873 | E-mail: infi@detailingmasters.com
           </div>
        </div>
      </div>

      {/* Running Cars Marquee */}
      <div className="print:hidden" style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', marginTop: '40px', padding: '20px 0', opacity: 0.8, maxWidth: 820, margin: '40px auto 0' }}>
        <style>{`
          @keyframes scrollCars {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .car-track {
            display: inline-block;
            white-space: nowrap;
            animation: scrollCars 25s linear infinite;
          }
        `}</style>
        <div className="car-track">
           {[...Array(20)].map((_, i) => (
             <img key={i} src={goldenCar} alt="Running Car" style={{ height: '40px', objectFit: 'contain', marginRight: '100px', display: 'inline-block', filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.1))' }} />
           ))}
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
    width: '800px',
    margin: '0 auto',
    background: '#EBEBED',
    boxShadow: '0 12px 40px rgba(0,0,0,0.06)',
    fontFamily: "'Inter', system-ui, sans-serif",
    position: 'relative',
    border: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
};
