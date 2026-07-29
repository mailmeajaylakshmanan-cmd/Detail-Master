import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar,
  Printer, MessageCircle, CheckCircle2,
  Camera, Film, Video, Image as ImageIcon, Sparkles, Download, Package,
  Aperture, Clapperboard, BookOpen, HardDrive, MonitorPlay, Plane
} from 'lucide-react';
import { parseSafeDate } from '../utils/dateFormatter.js';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import brandLogo from '../assets/brand_logo.png';

// ─── color palette ───────────────────────────────────────────────────────────
const C = {
  ink: '#0f172a',
  muted: '#64748b',
  faint: '#f8fafc',
  border: '#e2e8f0',
  white: '#ffffff',
  gold: '#d97706',
  brand: '#1e293b'
};

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmt(n) {
  return 'Rs. ' + Number(n || 0).toLocaleString('en-IN');
}

function fmtDate(d) {
  if (!d) return null;
  const parsed = parseSafeDate(d);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function displayDate(d) {
  if (!d) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(String(d))) {
    const formatted = fmtDate(d);
    if (formatted) return formatted;
  }
  return String(d);
}

// Map service names to distinct minimalist icons
function getIconForName(itemName, size = 13) {
  const name = (itemName || '').toLowerCase();

  if (name.includes('traditional')) return <Aperture size={size} color="#D4AF37" strokeWidth={1.5} />;
  if (name.includes('candid') || name.includes('photo') || name.includes('shoot') || name.includes('portrait')) return <Camera size={size} color="#D4AF37" strokeWidth={1.5} />;

  if (name.includes('cinematography')) return <Clapperboard size={size} color="#D4AF37" strokeWidth={1.5} />;
  if (name.includes('video') || name.includes('teaser') || name.includes('highlight') || name.includes('reels')) return <Video size={size} color="#D4AF37" strokeWidth={1.5} />;

  if (name.includes('book') || name.includes('magazine')) return <BookOpen size={size} color="#D4AF37" strokeWidth={1.5} />;
  if (name.includes('album') || name.includes('print') || name.includes('frame') || name.includes('canvas')) return <ImageIcon size={size} color="#D4AF37" strokeWidth={1.5} />;

  if (name.includes('pendrive') || name.includes('hard drive') || name.includes('usb') || name.includes('drive')) return <HardDrive size={size} color="#D4AF37" strokeWidth={1.5} />;

  if (name.includes('led') || name.includes('tv') || name.includes('screen') || name.includes('display')) return <MonitorPlay size={size} color="#D4AF37" strokeWidth={1.5} />;

  if (name.includes('drone') || name.includes('crane') || name.includes('aerial')) return <Plane size={size} color="#D4AF37" strokeWidth={1.5} />;

  return <Sparkles size={size} color="#D4AF37" strokeWidth={1.5} />;
}

// ─── component ───────────────────────────────────────────────────────────────
export default function QuotationView() {
  const { id } = useParams();
  const [quotation, setQuotation] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareFile, setShareFile] = useState(null);

  useEffect(() => {
    // Uses invoices table when a GET-by-id route exists; no mock fallback
    api.get('/invoices/' + id).then(res => {
      const row = res.data;
      setQuotation({
        ...row,
        id: row.id,
        invoiceNo: row.invoice_number || row.invoiceNo,
        date: row.invoice_date || row.created_at || row.date,
        customer: row.customer || { name: row.client_name || '—' },
        total: row.total ?? row.grand_total,
        services: row.services || []
      });
    }).catch(() => {
      toast.error('Quotation not found in database');
      setQuotation(null);
    });
  }, [id]);

  useEffect(() => {
    if (quotation) {
      document.title = `Quotation ${quotation.invoiceNo} — DETAILING MASTERS`;
    } else {
      document.title = 'DETAILING MASTERS';
    }
    return () => { document.title = 'DETAILING MASTERS'; };
  }, [quotation]);

  function handlePrint() {
    window.print();
  }

  async function fetchPDFBlob() {
    const response = await api.get(`/invoices/${id}/quotation/pdf`);
    const base64 = response.data.base64;

    // Decode base64 to Blob
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'application/pdf' });
  }

  async function handleDownloadPDF() {
    if (!quotation) return;
    setDownloading(true);
    try {
      const blob = await fetchPDFBlob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DETAILING MASTERS-Quotation-${quotation.invoiceNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF Download Error:", err);
      let errMsg = 'Could not download PDF';
      if (err.response?.data) {
        try {
          const decodedString = String.fromCharCode.apply(null, new Uint8Array(err.response.data));
          const errorData = JSON.parse(decodedString);
          errMsg = errorData.error || errorData.message || errMsg;
        } catch (e) { }
      }
      toast.error(errMsg);
    } finally {
      setDownloading(false);
    }
  }

  async function handleWhatsApp() {
    if (!quotation) return;
    setShareModalOpen(true);
    setSharing(true);
    setShareFile(null);
    try {
      const blob = await fetchPDFBlob();
      const file = new File([blob], `DETAILING MASTERS-Quotation-${quotation.invoiceNo}.pdf`, { type: 'application/pdf' });
      setShareFile(file);
    } catch (err) {
      console.error("PDF Generation Error:", err);
      let errMsg = 'Could not generate PDF for sharing';
      if (err.response?.data) {
        try {
          const decodedString = String.fromCharCode.apply(null, new Uint8Array(err.response.data));
          const errorData = JSON.parse(decodedString);
          errMsg = errorData.error || errorData.message || errMsg;
        } catch (e) { }
      }
      toast.error(errMsg);
      setShareModalOpen(false);
    } finally {
      setSharing(false);
    }
  }

  function executeShare() {
    if (navigator.share && navigator.canShare?.({ files: [shareFile] })) {
      navigator.share({
        title: `Quotation ${quotation.invoiceNo} — DETAILING MASTERS`,
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

      const phone = quotation.customer?.phone?.replace(/\D/g, '') || '';
      window.open(`https://wa.me/${phone.length === 10 ? '91' + phone : phone}`, '_blank');
      toast.success("PDF downloaded. Attach it in WhatsApp!");
    }
    setShareModalOpen(false);
  }

  if (!quotation) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${C.gold}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const date = fmtDate(quotation.date);
  const eventDate = displayDate(quotation.eventDate);

  const staticTerms = [
    "20% advance payment is required to confirm the booking.",
    "Balance payment must be completed on or before the event date.",
    "Photo and video editing will be done in our professional style.",
    "Delivery time for photos, videos, and album will be 30–45 working days.",
    "Any additional hours or services will be charged extra.",
    "Album printing will start only after client approval of the design.",
    "Travel and accommodation charges may apply for outstation events.",
    "Raw photos will be provided only if the client provides their own SSD or storage device."
  ];

  const categoryName = quotation.eventCategoryName || quotation.eventCategory?.name || '';
  const iconStyle = { verticalAlign: 'middle', marginRight: 8, position: 'relative', top: '-1px' };

  return (
    <div>
      {/* ── Action bar (hidden on print) ── */}
      <div className="print:hidden" style={bar.wrap}>
        <div style={bar.left}>
          <Link to={`/invoices/${id}`} style={bar.back}>
            <ArrowLeft size={14} />
            <span>Back to Invoice</span>
          </Link>
          <span style={bar.sep}>/</span>
          <span style={bar.title}>Quotation {quotation.invoiceNo}</span>
        </div>
        <div style={bar.right}>
          <button onClick={handleWhatsApp} disabled={sharing} style={{ ...bar.btn, background: '#25d366', color: '#fff', borderColor: '#25d366', opacity: sharing ? 0.7 : 1 }}>
            <MessageCircle size={14} />
            {sharing ? 'Generating...' : 'WhatsApp'}
          </button>

          <button onClick={handleDownloadPDF} disabled={downloading} style={{ ...bar.btn, opacity: downloading ? 0.7 : 1 }}>
            <Download size={14} />
            {downloading ? 'Downloading...' : 'Download PDF'}
          </button>

          <button onClick={handlePrint} style={bar.btn}>
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>

      {/* ── QUOTATION DOCUMENT ── */}
      <div id="invoice-print" style={doc.wrap}>
        {/* Header Band */}
        <div className="quotation-header" style={doc.headerBand}>
          <div className="quotation-logo-zone" style={doc.logoZone}>
            <img src={brandLogo} alt="Logo" style={doc.logo} />
            <div>
              <h1 style={doc.brandName}>DETAILING MASTERS</h1>
              <p style={doc.brandTagline}>Turning moments into memories</p>
            </div>
          </div>
          <div className="quotation-meta" style={doc.invoiceMeta}>
            <h2 style={doc.invoiceWord}>QUOTATION</h2>
            <p style={doc.invoiceNum}>{quotation.invoiceNo}</p>
            <p style={doc.invoiceDate}>
              <Calendar size={12} color="#cbd5e1" />
              {date}
            </p>
          </div>
        </div>

        {/* Client & Event Info */}
        <div className="invoice-parties" style={doc.partiesWrap}>
          <div style={doc.partyCard}>
            <h3 style={doc.sectionLabel}>Prepared For</h3>
            <div style={doc.partyName}>{quotation.customer?.name}</div>
            <div style={doc.partyLines}>
              {quotation.customer?.phone && (
                <div style={doc.partyLine}><Phone size={11} color={C.muted} /> {quotation.customer.phone}</div>
              )}
              {quotation.customer?.email && (
                <div style={doc.partyLine}><Mail size={11} color={C.muted} /> {quotation.customer.email}</div>
              )}
            </div>
          </div>

          <div style={doc.partyCard}>
            <h3 style={doc.sectionLabel}>Event Details</h3>
            <div style={doc.partyName}>{quotation.eventName || 'Wedding Event'}</div>
            <div style={doc.partyLines}>
              {categoryName && (
                <div style={doc.partyLine}><Sparkles size={11} color={C.muted} /> {categoryName}</div>
              )}
              {eventDate && (
                <div style={doc.partyLine}><Calendar size={11} color={C.muted} /> {eventDate}</div>
              )}
              {quotation.eventLocation && (
                <div style={doc.partyLine}><MapPin size={11} color={C.muted} /> {quotation.eventLocation}</div>
              )}
            </div>
          </div>
        </div>

        {/* Services List (Minimalist Icon Layout) */}
        {quotation.services && quotation.services.length > 0 && (
          <div className="services-wrap" style={doc.servicesWrap}>
            <div style={doc.sectionHeading}>
              <span>Scope of Work</span>
            </div>

            <div className="quotation-services" style={doc.servicesFlex}>
              {quotation.services.map(s => s.service).filter(Boolean).join(', ').split(',').filter(x => x.trim()).map((service, index) => (
                <div key={index} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#f8fafc',
                  border: `1px solid #e2e8f0`,
                  color: '#334155',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}>
                  {getIconForName(service.trim(), 14)}
                  <span>{service.trim()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deliverables List */}
        {quotation.assignedDeliverables && quotation.assignedDeliverables.length > 0 && (
          <div className="services-wrap" style={{ ...doc.servicesWrap, marginTop: 32 }}>
            <div style={doc.sectionHeading}>
              <span>Deliverables</span>
            </div>

            <div className="quotation-services" style={doc.servicesFlex}>
              {quotation.assignedDeliverables.map(d => d.name).filter(Boolean).join(', ').split(',').filter(x => x.trim()).map((name, index) => (
                <div key={index} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#f8fafc',
                  border: `1px solid #e2e8f0`,
                  color: '#334155',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}>
                  {getIconForName(name.trim(), 14)}
                  <span>{name.trim()}</span>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Totals */}
        <div style={doc.totalsWrap}>
          <div className="quotation-totals" style={doc.premiumTotalsBox}>
            <div style={doc.premiumTotalsInner}>
              <div style={doc.totalRowCentered}>
                <span style={doc.premiumTotalLabel}>Total Amount</span>
              </div>
              <div style={doc.premiumDivider} />
              <div style={doc.totalRowCentered}>
                <span style={doc.premiumTotalVal}>₹ {fmt(quotation.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="terms-page-break" style={doc.termsBox}>
          <p style={doc.termsTitle}>Terms &amp; Conditions</p>
          <ul style={{ margin: 0, paddingLeft: 18, color: C.muted, fontSize: 11, lineHeight: 1.4, listStyleType: 'disc' }}>
            {staticTerms.map((term, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{term}</li>
            ))}
          </ul>
        </div>

        {/* Footer Sign-off */}
        <div style={doc.footer}>
          <Sparkles size={14} color={C.gold} style={{ flexShrink: 0 }} />
          <span>Thank you for considering <strong style={{ color: C.white, fontWeight: 600 }}>DETAILING MASTERS</strong>. We look forward to capturing your beautiful moments.</span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .invoice-parties { grid-template-columns: 1fr !important; gap: 24px !important; }
          .quotation-services { grid-template-columns: 1fr !important; }
          .quotation-header { flex-direction: column !important; align-items: flex-start !important; gap: 20px !important; }
          .quotation-logo-zone { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .quotation-meta { text-align: left !important; }
          .quotation-meta p { justify-content: flex-start !important; }
          .quotation-totals { float: none !important; width: 100% !important; max-width: 100% !important; }
        }
        @media print {
          .print\\:hidden { display: none !important; }
          .terms-page-break { page-break-inside: avoid; margin-top: 8px !important; border: none !important; background: transparent !important; }
          #invoice-print {
            max-width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
            overflow: visible !important;
          }
          .invoice-parties { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
          
          /* Ensure grid flows nicely across pages */
          .services-wrap { page-break-inside: auto; break-inside: auto; }
          .quotation-services { 
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 10px !important;
            page-break-inside: auto;
            break-inside: auto;
          }
        }
      `}</style>

      {/* ── Share Modal ── */}
      {shareModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '340px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', color: '#111827' }}>Share to WhatsApp</h3>

            {sharing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', margin: '24px 0' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', border: `3px solid #25d366`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ color: '#4b5563', fontSize: '14px' }}>Generating premium PDF...</span>
              </div>
            ) : shareFile ? (
              <div style={{ margin: '24px 0' }}>
                <div style={{ width: '48px', height: '48px', background: '#ecfdf5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <CheckCircle2 size={24} color="#10b981" />
                </div>
                <span style={{ color: '#10b981', fontWeight: '600', display: 'block' }}>PDF Ready!</span>
                <span style={{ color: '#6b7280', fontSize: '13px', display: 'block', marginTop: '4px' }}>Click the button below to open WhatsApp</span>
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setShareModalOpen(false)}
                style={{ flex: 1, padding: '10px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={executeShare}
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
  btn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '0 16px', height: 36, borderRadius: 8,
    border: '1px solid #cbd5e1', background: '#fff',
    fontSize: 13, fontWeight: 500, color: '#334155',
    cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s'
  }
};

// ─── document styles ──────────────────────────────────────────────────────────
const SECTION_GAP = 16;
const PAGE_PAD = 32;

const doc = {
  wrap: {
    maxWidth: 820, margin: '0 auto',
    backgroundColor: '#FCFCFA',
    borderRadius: 12,
    boxShadow: '0 16px 50px rgba(0,0,0,0.08)',
    overflow: 'hidden', fontFamily: "'Outfit', system-ui, sans-serif",
    boxSizing: 'border-box', border: '1px solid #e2e8f0',
  },

  headerBand: {
    background: C.brand,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: `20px ${PAGE_PAD}px`,
    width: '100%',
    boxSizing: 'border-box',
    borderBottom: '1px solid #0f172a',
  },
  logoZone: { display: 'flex', alignItems: 'center', gap: 16 },
  logo: { height: 60, width: 'auto', objectFit: 'contain' },
  brandName: { fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800, color: '#ffffff', letterSpacing: '0.02em', margin: 0 },
  brandTagline: { fontSize: 12, color: '#94a3b8', margin: '4px 0 0', letterSpacing: '0.08em', textTransform: 'uppercase' },
  invoiceMeta: { textAlign: 'right' },
  invoiceWord: { fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#D4AF37', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0 },
  invoiceNum: { fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 800, color: '#ffffff', margin: '6px 0 0', letterSpacing: '-0.02em' },
  invoiceDate: { fontFamily: "'Outfit', sans-serif", fontSize: 13, color: '#cbd5e1', margin: '8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  goldBadge: {
    display: 'inline-block', border: '1px solid #D4AF37', color: '#D4AF37',
    padding: '6px 14px', fontSize: 11, letterSpacing: '0.15em', fontWeight: 600,
    marginTop: 18, textTransform: 'uppercase', fontFamily: "'Playfair Display', serif",
    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.03) 100%)',
  },

  partiesWrap: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40,
    margin: `20px ${PAGE_PAD}px`,
    boxSizing: 'border-box',
  },
  partyCard: {
    boxSizing: 'border-box', minWidth: 0,
  },
  sectionLabel: {
    fontSize: 12, fontWeight: 600, color: '#D4AF37', fontFamily: "'Playfair Display', serif",
    letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 12px',
    borderBottom: 'none', paddingBottom: 0,
  },
  sectionHeading: {
    fontSize: 18, fontWeight: 700, color: C.ink, fontFamily: "'Playfair Display', serif",
    letterSpacing: '0.05em', textTransform: 'uppercase',
    marginBottom: 20, borderBottom: 'none', paddingBottom: 0,
  },
  partyName: { fontSize: 16, fontWeight: 700, color: C.ink, margin: '0 0 8px', lineHeight: 1.3, wordBreak: 'break-word' },
  partyLines: { display: 'flex', flexDirection: 'column', gap: 4 },
  partyLine: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#4b5563', lineHeight: 1.5, wordBreak: 'break-word' },

  servicesWrap: { padding: `0 ${PAGE_PAD}px`, marginBottom: 16, boxSizing: 'border-box' },
  servicesFlex: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  serviceIconWrap: {
    background: '#fcf8f2', padding: 8, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    width: 36, height: 36, boxSizing: 'border-box'
  },
  serviceContent: { flex: 1, display: 'flex', alignItems: 'center' },
  serviceTitle: { margin: 0, fontSize: 13, fontWeight: 700, color: C.ink, display: 'inline-block' },
  serviceDesc: { fontSize: 13, fontWeight: 400, color: '#64748b' },
  servicePricing: { textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4 },
  serviceTotal: { fontSize: 16, fontWeight: 700, color: C.ink, fontVariantNumeric: 'tabular-nums' },
  serviceBasePrice: { fontSize: 13, color: C.muted, textDecoration: 'line-through' },

  totalsWrap: { padding: `0 ${PAGE_PAD}px`, marginBottom: SECTION_GAP, boxSizing: 'border-box', width: '100%', display: 'flex', justifyContent: 'center' },
  premiumTotalsBox: {
    pageBreakInside: 'avoid', width: '100%', maxWidth: 400,
    background: 'linear-gradient(145deg, #fcfcfc, #f3f4f6)',
    borderRadius: 16, padding: '24px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
  },
  premiumTotalsInner: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  totalRowCentered: { display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' },
  premiumTotalLabel: { fontSize: 14, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' },
  premiumTotalVal: { fontSize: 32, fontWeight: 800, color: C.ink, fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' },
  premiumDivider: { width: '40px', height: '2px', background: '#D4AF37', margin: '8px 0', borderRadius: 2 },

  termsBox: {
    margin: `0 ${PAGE_PAD}px ${SECTION_GAP}px`,
    boxSizing: 'border-box', pageBreakInside: 'avoid'
  },
  termsTitle: { margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: C.ink, letterSpacing: '0.1em', textTransform: 'uppercase' },

  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    background: C.brand,
    padding: `12px ${PAGE_PAD}px`,
    fontSize: 12, color: '#94a3b8', textAlign: 'center',
    width: '100%',
    boxSizing: 'border-box',
  },
};
