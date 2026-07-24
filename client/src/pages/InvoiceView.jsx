import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Printer, MessageCircle, Pencil,
  ChevronDown, FileText, X
} from 'lucide-react';
import { parseSafeDate } from '../utils/dateFormatter.js';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import brandLogo from '../assets/brand_logo.png';

// ─── helpers ─────────────────────────────────────────────────────────────────
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
  pending: { dot: '#f59e0b', bg: '#fffbeb', text: '#b45309', label: 'Pending' },
  partial: { dot: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8', label: 'Partial' },
  paid: { dot: '#10b981', bg: '#ecfdf5', text: '#047857', label: 'Paid' },
};

function buildPayments(invoice) {
  if (invoice.payments?.length > 0) return invoice.payments;
  return [];
}
function sumPayments(payments) {
  return payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
}

// ─── component ───────────────────────────────────────────────────────────────
export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareFile, setShareFile] = useState(null);

  useEffect(() => {
    api.get('/invoices/' + id).then(res => {
      setInvoice(res.data);
    }).catch(err => {
      // Mock data fallback
      setInvoice({
        _id: id,
        invoiceNo: 'INV-1001',
        date: new Date().toISOString(),
        customer: { name: 'John Doe', phone: '+91 9876543210', address: 'Mumbai' },
        carMake: 'BMW',
        carModel: 'X5',
        licensePlate: 'MH01AB1234',
        status: 'paid',
        services: [
          { service: 'Premium Exterior Wash', description: 'Foam wash', price: 999, quantity: 1, amount: 999 },
          { service: 'Interior Vacuum', description: 'Deep clean', price: 799, quantity: 1, amount: 799 }
        ],
        subTotal: 1798,
        discount: 0,
        taxAmount: 323.64,
        total: 2121.64,
        balance: 0,
        payments: [{ date: new Date().toISOString(), amount: 2121.64, method: 'Card' }],
        notes: 'Thank you for your business!'
      });
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
    await api.patch('/invoices/' + id + '/status', { status });
    setInvoice(inv => ({ ...inv, status }));
    toast.success('Status updated to ' + status);
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
      toast.success("PDF downloaded. Attach it in WhatsApp!");
    }
    setShareModalOpen(false);
  }

  if (!invoice) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid #FBD904`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const st = STATUS[invoice.status] ?? STATUS.pending;
  const dateStr = fmtDate(invoice.date);
  
  const brandGold = '#FBD904';
  const textDark = '#374151'; // darker gray for high contrast but not pure black
  const textMuted = '#6b7280';
  const borderCol = '#d1d5db'; // medium gray for borders

  return (
    <div>
      {/* ── Action bar (hidden on print) ── */}
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
            <select
              value={invoice.status}
              onChange={e => updateStatus(e.target.value)}
              style={bar.select}
            >
              {Object.entries(STATUS).map(([v, s]) => (
                <option key={v} value={v}>{s.label}</option>
              ))}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#888' }} />
          </div>
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

      {/* ── Invoice document ── */}
      <div id="invoice-print" style={doc.wrap}>
        
        {/* Header */}
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

        {/* Vehicle Specs Table */}
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

        {/* Client Info Grid */}
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

        {/* Services Table */}
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
                  <td style={{ border: `1px solid ${borderCol}`, padding: '12px', textAlign: 'center', color: textMuted }}>1</td>
                  <td style={{ border: `1px solid ${borderCol}`, padding: '12px', textAlign: 'center', color: textMuted, fontVariantNumeric: 'tabular-nums' }}>₹{fmt(s.price)}</td>
                  <td style={{ border: `1px solid ${borderCol}`, borderRight: 'none', padding: '12px', textAlign: 'center', color: textDark, fontWeight: 600, fontVariantNumeric: 'tabular-nums', backgroundColor: brandGold }}>₹{fmt(s.total)}</td>
                </tr>
              )) : (
                <tr style={{ backgroundColor: '#ffffff' }}>
                  <td colSpan="4" style={{ border: `1px solid ${borderCol}`, borderLeft: 'none', borderRight: 'none', padding: '12px', textAlign: 'center', color: textMuted }}>No services added</td>
                </tr>
              )}

              {/* Discount Row (if applicable) */}
              {invoice.discount > 0 && (
                <tr style={{ backgroundColor: '#ffffff' }}>
                  <td colSpan="3" style={{ border: `1px solid ${borderCol}`, borderLeft: 'none', padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: textDark }}>
                    Discount
                  </td>
                  <td style={{ border: `1px solid ${borderCol}`, borderRight: 'none', padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#dc2626', fontVariantNumeric: 'tabular-nums', backgroundColor: brandGold }}>
                    − ₹{fmt(invoice.discount)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Total Amount Due Block */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ padding: '12px 16px', fontWeight: 700, fontSize: 14, color: textDark, textTransform: 'uppercase' }}>
                TOTAL AMOUNT DUE
              </div>
              <div style={{ backgroundColor: brandGold, padding: '12px 24px', fontWeight: 700, fontSize: 16, color: textDark, fontVariantNumeric: 'tabular-nums', width: '25%', textAlign: 'center', boxSizing: 'border-box', borderBottom: `1px solid ${borderCol}` }}>
                ₹{fmt(invoice.total)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer section (Terms & Warranty) */}
        <div style={{ padding: '40px 40px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', minHeight: 180 }}>
          <div style={{ maxWidth: '65%' }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: textDark, marginBottom: 8 }}>TERMS & CONDITIONS</h4>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: textMuted, lineHeight: 1.5, listStyleType: 'disc' }}>
              <li>20% advance payment is required to confirm the booking.</li>
              <li>Balance payment must be completed before delivery.</li>
              <li>{invoice.notes || "Thank you for choosing Detailing Masters!"}</li>
              {invoice.showTerms && invoice.termsAndConditions && (
                <li>{invoice.termsAndConditions}</li>
              )}
            </ul>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ 
              backgroundColor: '#111827', 
              color: '#FBD904', 
              width: 80, 
              height: 90, 
              clipPath: 'polygon(50% 0%, 100% 0, 100% 70%, 50% 100%, 0 70%, 0 0)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              padding: '10px 4px 16px'
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}>WARRANTY</div>
              <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2 }}>BADGE</div>
              <div style={{ fontSize: 8, marginTop: 4, opacity: 0.8, textTransform: 'uppercase' }}>Guaranteed</div>
            </div>
          </div>
        </div>

        {/* Bottom address bar */}
        <div style={{ borderTop: `1px solid ${borderCol}`, padding: '16px 40px', textAlign: 'center', backgroundColor: '#f9fafb' }}>
          <p style={{ margin: 0, fontSize: 12, color: textDark, fontWeight: 500 }}>
            <strong>Detailing Masters</strong>, Opposite KTM Bike Showroom, Kulasekharam, Kanyakumari.
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: textMuted }}>
            Ph: +91 9994122652 | E-mail: detailingmasters@gmail.com
          </p>
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

      {/* Share Modal */}
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
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>PDF Document • {shareFile ? (shareFile.size / 1024).toFixed(0) + ' KB' : 'Generating...'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => { setShareModalOpen(false); handleDownloadPDF(); }} 
                style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
              >
                Download Only
              </button>
              <button 
                onClick={handleDirectShare}
                disabled={!shareFile}
                style={{ flex: 1, padding: '10px', background: '#25d366', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: shareFile ? 'pointer' : 'not-allowed', opacity: shareFile ? 1 : 0.5 }}
              >
                Share Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── action bar styles ────────────────────────────────────────────────────────
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
    cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s'
  },
  select: {
    appearance: 'none', padding: '0 32px 0 16px', height: 36, borderRadius: 8,
    border: '1px solid #cbd5e1', background: '#fff',
    fontSize: 13, color: '#334155', cursor: 'pointer', fontWeight: 500
  },
};

// ─── invoice document styles ──────────────────────────────────────────────────
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
