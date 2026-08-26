import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Printer, MessageCircle, FileText, X,
  CheckCircle2, Star, Calendar, Car, Shield, Droplets,
  Sparkles, Wrench, Check
} from 'lucide-react';
import { parseSafeDate } from '../utils/dateFormatter.js';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import brandLogo from '../assets/brand-logo-for-invoice.png';
import goldenCar from '../assets/new-invoice-add.png';
import ResponsiveDocumentWrapper from '../components/ResponsiveDocumentWrapper.jsx';

function fmtDate(d) {
  if (!d) return null;
  const parsed = parseSafeDate(d);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
    services: (row.services || []).map(s => ({
      service: s.service_name || s.service,
      description: s.category || s.description || '',
      price: Number(s.unit_price ?? s.price) || 0,
      vehicle_name: s.vehicle_name || '',
      vehicle_plate: s.vehicle_plate || '',
    })),
    thirdPartyServices: (row.thirdPartyServices || []).map(t => ({
      service_name: t.service_name || t.service,
      vendor_name: t.vendor_name || '',
      vehicle_name: t.vehicle_name || '',
      vehicle_plate: t.vehicle_plate || '',
    })),
    payments: row.payments || [],
  };
}

export default function VehicleServiceReport() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareFile, setShareFile] = useState(null);

  const vehicles = invoice
    ? (invoice.vehicleVisits && invoice.vehicleVisits.length > 0
        ? invoice.vehicleVisits.map(v => ({ make_model: v.make_model, license_vin: v.license_vin }))
        : (invoice.vehicle_name || invoice.license_vin
            ? [{ make_model: invoice.vehicle_name, license_vin: invoice.license_vin }]
            : []))
    : [];

  const isMultiVehicle = vehicles.length > 1;

  const allServices = invoice?.services || [];
  const allThirdParty = invoice?.thirdPartyServices || [];

  const servicesByVehicle = (() => {
    if (!invoice) return [];
    const map = {};
    const order = [];

    const addEntry = (plate, item, kind) => {
      const key = plate || '__unknown__';
      if (!map[key]) {
        map[key] = { plate: key, make_model: item.vehicle_name || 'Vehicle', services: [], thirdParty: [] };
        order.push(key);
      }
      if (kind === 'service') map[key].services.push(item);
      else map[key].thirdParty.push(item);
    };

    allServices.forEach(s => addEntry(s.vehicle_plate, s, 'service'));
    allThirdParty.forEach(t => addEntry(t.vehicle_plate, t, 'third'));

    return order.map(k => map[k]);
  })();

  async function loadInvoice() {
    const res = await api.get('/invoices/' + id);
    setInvoice(normalizeInvoice(res.data));
  }

  useEffect(() => {
    loadInvoice().catch(() => {
      toast.error('Invoice details not found');
      setInvoice(null);
    });
  }, [id]);

  useEffect(() => {
    if (invoice) {
      document.title = `Service Report ${invoice.invoiceNo} — DETAILING MASTERS`;
    } else {
      document.title = 'DETAILING MASTERS';
    }
    return () => { document.title = 'DETAILING MASTERS'; };
  }, [invoice]);

  function handlePrint() {
    window.print();
  }

  async function fetchPDFBlob() {
    const response = await api.get(`/invoices/${id}/service-report/pdf`);
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
      a.download = `DETAILING MASTERS-ServiceReport-${invoice.invoiceNo}.pdf`;
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
      const file = new File([blob], `DETAILING MASTERS-ServiceReport-${invoice.invoiceNo}.pdf`, { type: 'application/pdf' });
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
        title: `Service Report ${invoice.invoiceNo} — DETAILING MASTERS`,
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

  const dateStr = fmtDate(invoice.date);

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
          <span style={bar.title}>Service Report ({invoice.invoiceNo})</span>
        </div>
        <div style={bar.right}>
          <button onClick={handleWhatsApp} disabled={sharing} style={{ ...bar.btn, background: '#25d366', color: '#fff', borderColor: '#25d366', opacity: sharing ? 0.7 : 1 }}>
            <MessageCircle size={14} />
            {sharing ? 'Generating...' : 'WhatsApp'}
          </button>
          <button onClick={handleDownloadPDF} disabled={downloading} style={{ ...bar.btn, opacity: downloading ? 0.7 : 1 }}>
            <FileText size={14} />
            {downloading ? 'Downloading...' : 'Download PDF'}
          </button>
          <button onClick={handlePrint} style={bar.btn}>
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>

      <div className="pb-8">
      <ResponsiveDocumentWrapper documentWidth={820}>
        <div id="invoice-print" style={doc.wrap}>
        
        <div style={{ position: 'relative', height: '115px', backgroundColor: '#EBEBED', width: '100%', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100px', height: '100px', background: '#FFD700', zIndex: 1 }}></div>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#000000', clipPath: 'polygon(65% 0, 100% 0, 100% 75%, 57.5% 75%)', zIndex: 2 }}></div>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#FFD700', clipPath: 'polygon(57.5% 75%, 100% 75%, 100% 85%, 56.5% 85%)', zIndex: 3 }}></div>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#000000', clipPath: 'polygon(50% 0, 65% 0, 49% 100%, 35% 100%)', zIndex: 4 }}></div>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#FFD700', clipPath: 'polygon(50% 0, 61% 0, 49% 100%, 35% 100%)', zIndex: 5 }}></div>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#2B2A2A', clipPath: 'polygon(4% 0, 60% 0, 45% 100%, 0 100%, 0 25%)', zIndex: 6 }}></div>

          <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', padding: '2px 40px 2px 45px', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
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

            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <img src={goldenCar} alt="Car Accent" style={{ height: '80px', objectFit: 'contain', filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.4))', position: 'relative', left: '35%', top: '10px' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', paddingRight: '5px', paddingTop: '20px' }}>
              <h1 style={{ 
                  fontFamily: "'Montserrat', 'Open Sans', sans-serif",
                  fontSize: 26, 
                  fontWeight: 500, 
                  margin: 0, 
                  letterSpacing: '0.05em',
                  color: '#FFFFFF',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                  filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.6))',
                  textAlign: 'right'
              }}>VEHICLE REPORT</h1>
            </div>
          </div>
        </div>

        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 50 }}>
           <img src={brandLogo} style={{ width: '380px', opacity: 0.03, filter: 'grayscale(100%)' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '24px 40px', backgroundColor: 'transparent', position: 'relative', zIndex: 1, borderBottom: '1px solid #e2e8f0' }}>
           <div style={{ flex: 1, background: '#f8fafc', padding: '16px 20px', borderRadius: 8, marginRight: '15px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, margin: '0 0 10px 0', color: '#111', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #FBD904', paddingBottom: 4, display: 'inline-block' }}>STUDIO DETAILS</h3>
              <div style={{ fontSize: 12, color: '#333', lineHeight: 1.8 }}>
                 <div style={{ display: 'flex' }}><span style={{ width: 65, fontWeight: 600, color: '#64748b' }}>Address:</span> <span style={{ flex: 1, fontWeight: 500 }}>Opposite KTM Bike Showroom, Chankai, Marthandam, Tamil Nadu 629155</span></div>
                 <div style={{ display: 'flex' }}><span style={{ width: 65, fontWeight: 600, color: '#64748b' }}>Phone:</span> <span style={{ fontWeight: 500 }}>+91 9994122652</span></div>
                 <div style={{ display: 'flex' }}><span style={{ width: 65, fontWeight: 600, color: '#64748b' }}>Email:</span> <span style={{ fontWeight: 500 }}>detailingmasters2024@gmail.com</span></div>
              </div>
           </div>
           <div style={{ flex: 1, background: '#f8fafc', padding: '16px 20px', borderRadius: 8, marginLeft: '15px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, margin: '0 0 10px 0', color: '#111', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #FBD904', paddingBottom: 4, display: 'inline-block' }}>{isMultiVehicle ? 'FLEET & OWNER' : 'VEHICLE & OWNER'}</h3>
              <div style={{ fontSize: 12, color: '#333', lineHeight: 1.8 }}>
                 <div style={{ display: 'flex' }}><span style={{ width: 85, fontWeight: 600, color: '#64748b' }}>Owner Name:</span> <span style={{ fontWeight: 600, color: '#000' }}>{invoice.customer?.name || '—'}</span></div>
                 {isMultiVehicle ? (
                   <div style={{ display: 'flex' }}><span style={{ width: 85, fontWeight: 600, color: '#64748b' }}>Vehicles:</span> <span style={{ fontWeight: 500 }}>{vehicles.length} Vehicles</span></div>
                 ) : (
                   <>
                     <div style={{ display: 'flex' }}><span style={{ width: 85, fontWeight: 600, color: '#64748b' }}>Vehicle:</span> <span style={{ fontWeight: 500 }}>{vehicles[0]?.make_model || '—'}</span></div>
                     <div style={{ display: 'flex' }}><span style={{ width: 85, fontWeight: 600, color: '#64748b' }}>Plate No:</span> <span style={{ fontWeight: 500, background: '#FBD904', padding: '1px 6px', borderRadius: 4 }}>{vehicles[0]?.license_vin || '—'}</span></div>
                   </>
                 )}
                 <div style={{ display: 'flex' }}><span style={{ width: 85, fontWeight: 600, color: '#64748b' }}>Date:</span> <span style={{ fontWeight: 500 }}>{dateStr || '—'}</span></div>
              </div>
           </div>
        </div>

        <div style={{ padding: '24px 40px 10px 40px', display: 'flex', gap: 20 }}>
           <div style={{ flex: 1, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #FBD904 0%, #E2C300 100%)', borderRadius: '50%', width: 44, height: 44, boxShadow: '0 4px 10px rgba(251,217,4,0.3)' }}>
               <Shield size={22} color="#000" />
             </div>
             <div>
               <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Report Status</span>
               <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Service Completed</span>
             </div>
           </div>
           
           <div style={{ flex: 1, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', borderRadius: '50%', width: 44, height: 44, boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
               <Wrench size={20} color="#334155" />
             </div>
             <div>
               <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inspection QA</span>
               <span style={{ fontSize: 14, fontWeight: 800, color: '#059669' }}>100% Passed</span>
             </div>
           </div>

           <div style={{ flex: 1, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderRadius: '50%', width: 44, height: 44, boxShadow: '0 4px 10px rgba(245,158,11,0.2)' }}>
               <Star size={20} color="#d97706" />
             </div>
             <div>
               <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quality Grade</span>
               <span style={{ fontSize: 14, fontWeight: 800, color: '#d97706' }}>Premium Restored</span>
             </div>
           </div>
        </div>

        <div style={{ padding: '15px 40px 20px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>SERVICES PERFORMED</h3>
            {(allServices.length + allThirdParty.length) > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: '#047857',
                background: '#ecfdf5', border: '1px solid #a7f3d0',
                borderRadius: 20, padding: '4px 12px',
                WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
              }}>✓ {allServices.length + allThirdParty.length} Completed</span>
            )}
          </div>

          {(allServices.length > 0 || allThirdParty.length > 0) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(isMultiVehicle ? servicesByVehicle : [{
                plate: vehicles[0]?.license_vin || '',
                make_model: vehicles[0]?.make_model || '',
                services: allServices,
                thirdParty: allThirdParty
              }]).map((vehicleGroup, vIdx) => {
                const allItems = [
                  ...vehicleGroup.services.map(s => ({ name: s.service, isThird: false })),
                  ...vehicleGroup.thirdParty.map(t => ({ name: t.service_name, isThird: true })),
                ];
                return (
                  <div key={vehicleGroup.plate}>
                    {isMultiVehicle && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: '#1e293b', borderRadius: '8px 8px 0 0',
                        padding: '8px 14px',
                        WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
                      }}>
                        <span style={{ background: '#FBD904', color: '#000', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 800 }}>{vehicleGroup.plate || 'N/A'}</span>
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: 12 }}>{vehicleGroup.make_model || 'Vehicle'}</span>
                        <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 11 }}>{allItems.length} services</span>
                      </div>
                    )}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '12px',
                      padding: '16px',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: isMultiVehicle ? '0 0 8px 8px' : 8,
                      WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}>
                      {allItems.map((item, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          fontSize: 12, fontWeight: 600, color: '#1e293b',
                          padding: '10px 14px', borderRadius: 6,
                          background: item.isThird ? '#fdf4ff' : '#f0fdf4',
                          border: `1px solid ${item.isThird ? '#e9d5ff' : '#bbf7d0'}`,
                          WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: item.isThird ? '#a855f7' : '#10b981', borderRadius: '50%', width: 16, height: 16, flexShrink: 0 }}>
                             <Check size={10} color="#fff" strokeWidth={3} />
                          </div>
                          <span>{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '14px', textAlign: 'center', color: '#666', border: '1px dashed #cbd5e1', borderRadius: 8, fontSize: 11 }}>
              No services detailed for this vehicle
            </div>
          )}
        </div>

        {invoice.notes && (
          <div style={{ padding: '0 40px 10px 40px' }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>OBSERVATIONS & ADVISORY</h3>
            <div style={{ display: 'flex', gap: 12, background: '#fdfbfe', border: '1px solid #e8dbf2', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5e6fc', borderRadius: '50%', width: 28, height: 28, flexShrink: 0 }}>
                <Sparkles size={14} color="#8b5cf6" />
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: '#5b21b6', lineHeight: 1.6, fontWeight: 500 }}>
                {invoice.notes}
              </p>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div style={{ position: 'relative', width: '100%', marginTop: 'auto', overflow: 'hidden', borderTop: '1px solid #e2e8f0', backgroundColor: '#fafafa' }}>
           <div style={{ margin: '15px 40px 25px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#64748b' }}>
              <div>
                <strong>Detailing Masters Studio</strong><br/>
                Opp. KTM Bike Showroom, Chankai, Marthandam, Tamil Nadu 629155.
              </div>
              <div style={{ textAlign: 'right' }}>
                Ph: +91 9994122652 | Email: detailingmasters2024@gmail.com<br/>
                Thank you for choosing premium auto detailing quality!
              </div>
           </div>
        </div>

        </div>

      </ResponsiveDocumentWrapper>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        @media print {
          .print\\:hidden { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #invoice-print {
            max-width: 100% !important;
            min-width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
            overflow: hidden !important;
          }
        }
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

      {/* Running Cars Marquee */}
      <div className="print:hidden" style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', marginTop: '40px', padding: '20px 0', opacity: 0.8, maxWidth: 820, margin: '40px auto 0' }}>
        <div className="car-track">
           {[...Array(20)].map((_, i) => (
             <img key={i} src={goldenCar} alt="Running Car" style={{ height: '40px', objectFit: 'contain', marginRight: '100px', display: 'inline-block', filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.1))' }} />
           ))}
        </div>
      </div>

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
                <div style={{ fontWeight: 600, color: '#1e293b' }}>DETAILING MASTERS-ServiceReport-{invoice.invoiceNo}.pdf</div>
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
  btn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '0 16px', height: 36, borderRadius: 8,
    border: '1px solid #cbd5e1', background: '#fff',
    fontSize: 13, fontWeight: 500, color: '#334155',
    cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s',
  },
};

const doc = {
  wrap: {
    width: '210mm',
    minHeight: '296mm',
    boxSizing: 'border-box',
    margin: '0 auto',
    background: '#FFFFFF',
    boxShadow: '0 15px 50px rgba(0,0,0,0.1)',
    fontFamily: "'Inter', system-ui, sans-serif",
    position: 'relative',
    border: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
};
