import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Printer, MessageCircle, FileText, X
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

export default function OfferView() {
  const { id } = useParams();
  const [offer, setOffer] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareFile, setShareFile] = useState(null);

  useEffect(() => {
    api.get('/offers/' + id).then(res => {
      setOffer(res.data);
    }).catch(() => {
      // offers table/route not connected yet
      toast.error('Offer not found in database');
      setOffer(null);
    });
  }, [id]);

  useEffect(() => {
    if (offer) {
      document.title = `Offer ${offer.offerNo} — DETAILING MASTERS`;
    } else {
      document.title = 'DETAILING MASTERS';
    }
    return () => { document.title = 'DETAILING MASTERS'; };
  }, [offer]);

  function handlePrint() {
    window.print();
  }

  async function fetchPDFBlob() {
    const response = await api.get(`/offers/${id}/pdf`);
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
    if (!offer) return;
    setDownloading(true);
    try {
      const blob = await fetchPDFBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DETAILING MASTERS-Offer-${offer.offerNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Could not download PDF');
    } finally {
      setDownloading(false);
    }
  }

  async function handleWhatsApp() {
    if (!offer) return;
    setShareModalOpen(true);
    setSharing(true);
    setShareFile(null);
    try {
      const blob = await fetchPDFBlob();
      const file = new File([blob], `DETAILING MASTERS-Offer-${offer.offerNo}.pdf`, { type: 'application/pdf' });
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
        title: `Offer ${offer.offerNo} — DETAILING MASTERS`,
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
      
      const phone = offer.customer?.phone?.replace(/\D/g, '') || '';
      window.open(`https://wa.me/${phone.length === 10 ? '91' + phone : phone}`, '_blank');
      toast.success("PDF downloaded. Attach it in WhatsApp!");
    }
    setShareModalOpen(false);
  }

  if (!offer) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid #FBD904`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const dateStr = fmtDate(offer.date);
  const brandGold = '#FBD904';
  const textDark = '#374151';
  const textMuted = '#6b7280';
  const borderCol = '#d1d5db';

  return (
    <div>
      <div className="print:hidden" style={bar.wrap}>
        <div style={bar.left}>
          <Link to="/master-customer" style={bar.back}>
            <ArrowLeft size={14} />
            <span>Customers</span>
          </Link>
          <span style={bar.sep}>/</span>
          <span style={bar.title}>{offer.offerNo}</span>
          <span style={{ ...bar.badge, background: '#ecfdf5', color: '#047857' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            Active
          </span>
        </div>
        <div style={bar.right}>
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
        </div>
      </div>

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
            <h1 style={{ fontSize: 30, fontWeight: 400, color: '#4b5563', margin: 0, letterSpacing: '0.05em' }}>OFFER PACKAGE</h1>
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
                <td style={{ border: `1px solid ${borderCol}`, padding: '8px', color: textMuted }}>{offer.licensePlate || 'N/A'}</td>
                <td style={{ border: `1px solid ${borderCol}`, padding: '8px', color: textMuted }}>{offer.carMake || 'N/A'}</td>
                <td style={{ border: `1px solid ${borderCol}`, padding: '8px', color: textMuted }}>{offer.carModel || 'N/A'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Client Info Grid */}
        <div style={{ padding: '24px 40px', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: textDark, width: 140 }}>Customer Name:</span>
              <span style={{ color: textMuted }}>{offer.customer?.name}</span>
            </div>
            <div style={{ display: 'flex', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: textDark, width: 140 }}>Offer No:</span>
              <span style={{ color: textMuted }}>{offer.offerNo}</span>
            </div>
          </div>
          <div style={{ flex: 1, paddingLeft: 40 }}>
            <div style={{ display: 'flex', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: textDark, width: 70 }}>Phone:</span>
              <span style={{ color: textMuted }}>{offer.customer?.phone}</span>
            </div>
            <div style={{ display: 'flex', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: textDark, width: 70 }}>Date:</span>
              <span style={{ color: textMuted }}>{dateStr}</span>
            </div>
          </div>
        </div>

        {/* Package Table */}
        <div style={{ padding: '0 40px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#e5e7eb', borderTop: `1px solid ${borderCol}` }}>
                <th style={{ border: `1px solid ${borderCol}`, borderLeft: 'none', padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: textDark }}>Package Name</th>
                <th style={{ border: `1px solid ${borderCol}`, padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: textDark, width: '25%' }}>Valid Until</th>
                <th style={{ border: `1px solid ${borderCol}`, borderRight: 'none', padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: textDark, width: '25%', backgroundColor: brandGold }}>PRICE (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ backgroundColor: '#ffffff' }}>
                <td style={{ border: `1px solid ${borderCol}`, borderLeft: 'none', padding: '12px', color: textMuted }}>
                  <div style={{ fontWeight: 600, color: textDark }}>{offer.packageName}</div>
                  {offer.description && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{offer.description}</div>}
                </td>
                <td style={{ border: `1px solid ${borderCol}`, padding: '12px', textAlign: 'center', color: textMuted }}>
                  {fmtDate(offer.validityDate) || 'N/A'}
                </td>
                <td style={{ border: `1px solid ${borderCol}`, borderRight: 'none', padding: '12px', textAlign: 'center', color: textDark, fontWeight: 600, fontVariantNumeric: 'tabular-nums', backgroundColor: brandGold }}>
                  ₹{fmt(offer.price)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Wash Tracking Summary */}
        {(offer.totalWashes > 0 || offer.freeWashes > 0) && (
          <div style={{ padding: '24px 40px 0' }}>
            <div style={{ border: `1px solid ${brandGold}`, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ backgroundColor: 'rgba(251,217,4,0.1)', padding: '12px 16px', fontWeight: 700, fontSize: 12, color: textDark, borderBottom: `1px solid ${brandGold}` }}>
                WASH TRACKING SUMMARY
              </div>
              <div style={{ display: 'flex', backgroundColor: '#fff', fontSize: 13, textAlign: 'center' }}>
                <div style={{ flex: 1, padding: '16px', borderRight: `1px solid #f3f4f6` }}>
                  <div style={{ color: textMuted, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>TOTAL WASHES</div>
                  <div style={{ color: textDark, fontSize: 18, fontWeight: 800 }}>{offer.totalWashes}</div>
                </div>
                <div style={{ flex: 1, padding: '16px', borderRight: `1px solid #f3f4f6` }}>
                  <div style={{ color: textMuted, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>COMPLETED</div>
                  <div style={{ color: '#10b981', fontSize: 18, fontWeight: 800 }}>{offer.completedWashes || 0}</div>
                </div>
                <div style={{ flex: 1, padding: '16px', borderRight: offer.freeWashes > 0 ? `1px solid #f3f4f6` : 'none' }}>
                  <div style={{ color: textMuted, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>BALANCE</div>
                  <div style={{ color: textDark, fontSize: 18, fontWeight: 800 }}>{Math.max(0, offer.totalWashes - (offer.completedWashes || 0))}</div>
                </div>
                {offer.freeWashes > 0 && (
                  <div style={{ flex: 1, padding: '16px', backgroundColor: '#fffbeb' }}>
                    <div style={{ color: '#d97706', fontSize: 11, fontWeight: 800, marginBottom: 4 }}>FREE WASHES</div>
                    <div style={{ color: '#b45309', fontSize: 18, fontWeight: 800 }}>
                      {(offer.freeWashesUsed || 0)} <span style={{ fontSize: 14, fontWeight: 600 }}>/ {offer.freeWashes}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer section (Terms) */}
        <div style={{ padding: '40px 40px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', minHeight: 180 }}>
          <div style={{ maxWidth: '65%' }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: textDark, marginBottom: 8 }}>TERMS & CONDITIONS</h4>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: textMuted, lineHeight: 1.5, listStyleType: 'disc' }}>
              <li>This offer package is bound to the specific customer and vehicle mentioned above.</li>
              <li>Cannot be combined with other promotional offers unless specified.</li>
              {offer.terms && (
                <li>{offer.terms}</li>
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
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}>VIP</div>
              <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2 }}>OFFER</div>
              <div style={{ fontSize: 8, marginTop: 4, opacity: 0.8, textTransform: 'uppercase' }}>Exclusive</div>
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
                <h3 style={{ margin: '0 0 4px', fontSize: 20, color: '#0f172a' }}>Share Offer Document</h3>
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
                <div style={{ fontWeight: 600, color: '#1e293b' }}>DETAILING MASTERS-Offer-{offer.offerNo}.pdf</div>
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
  }
};
const doc = {
  wrap: {
    maxWidth: 820, margin: '0 auto',
    background: '#ffffff',
    boxShadow: '0 12px 40px rgba(0,0,0,0.06)',
    fontFamily: "'Inter', system-ui, sans-serif",
    position: 'relative',
    border: '1px solid #e5e7eb',
  }
};
