import React from 'react';
import brandLogo from '../assets/brand-logo-for-invoice.png';
import goldenCar from '../assets/new-invoice-add.png';
import ResponsiveDocumentWrapper from './ResponsiveDocumentWrapper.jsx';

/**
 * StandardDocumentLayout
 * 
 * Reusable A4 Document Shell for Detailing Masters print & PDF documents.
 * Guarantees 1:1 screen-to-PDF fidelity across Invoices, Offer Certificates,
 * and Vehicle Service Reports with zero layout collapse.
 */
export default function StandardDocumentLayout({
  documentId = 'invoice-print',
  documentTitle = 'INVOICE',
  titleFontSize = 36,
  titlePaddingRight = '15px',
  titleContainerStyle = {},
  children,
  customFooter,
  showFooter = true,
  documentWidth = 820,
  carLeft = '65%',
  carTop = '29px',
}) {
  return (
    <ResponsiveDocumentWrapper documentWidth={documentWidth}>
      <div id={documentId} style={docStyles.wrap}>
        {/* HEADER GEOMETRIC BANNER */}
        <div style={docStyles.header}>
          {/* Layer 1: Top Left Yellow Square */}
          <div style={docStyles.layer1} />

          {/* Layer 2: Right Black Polygon */}
          <div style={docStyles.layer2} />
          
          {/* Layer 3: Right Yellow Bar */}
          <div style={docStyles.layer3} />

          {/* Layer 4: Black Splinter */}
          <div style={docStyles.layer4} />

          {/* Layer 5: Yellow Stripe */}
          <div style={docStyles.layer5} />

          {/* Layer 6: Main Left Black Polygon */}
          <div style={docStyles.layer6} />

          <div className="invoice-header-grid" style={docStyles.headerContent}>
            {/* Logo & Brand Wordmark */}
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
                <span style={docStyles.brandText}>DETAILING</span>
                <span style={docStyles.brandText}>MASTERS</span>
              </div>
            </div>

            {/* Center Accent Golden Car */}
            <div style={{ position: 'absolute', left: carLeft, top: carTop, transform: 'translateX(-50%)', zIndex: 15, pointerEvents: 'none' }}>
               <img src={goldenCar} alt="Car Accent" style={{ height: '80px', objectFit: 'contain', filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.4))' }} />
            </div>

            {/* Dynamic Document Title */}
            <div className="invoice-header-title" style={{ display: 'flex', alignItems: 'flex-start', paddingRight: titlePaddingRight, paddingTop: '20px', ...titleContainerStyle }}>
              <h1 style={{ 
                  fontFamily: "'Montserrat', 'Open Sans', sans-serif",
                  fontSize: titleFontSize, 
                  fontWeight: 500, 
                  margin: 0, 
                  letterSpacing: '0.05em',
                  color: '#FFFFFF',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                  filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.6))',
                  textAlign: 'right'
              }}>
                {documentTitle}
              </h1>
            </div>
          </div>
        </div>

        {/* Global Centered Watermark */}
        <div style={docStyles.watermark}>
           <img src={brandLogo} alt="Watermark" style={{ width: '450px', opacity: 0.04, filter: 'grayscale(100%)' }} />
        </div>

        {/* Inner Document Content Slot */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
          {children}
        </div>

        {/* Standard Footer Address Bar */}
        {showFooter && (
          customFooter ? (
            customFooter
          ) : (
            <div style={docStyles.footer}>
              <strong>Detailing Masters</strong>, Opposite KTM Bike Showroom, Chankai, Marthandam, Tamil Nadu 629155.<br/>
              Ph: +91 9994122652 | E-mail: detailingmasters2024@gmail.com
            </div>
          )
        )}
      </div>
    </ResponsiveDocumentWrapper>
  );
}

const docStyles = {
  wrap: {
    width: '210mm',
    height: '296mm', // 1mm less than A4 to prevent any risk of rounding spillover to a second page
    boxSizing: 'border-box',
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
  header: {
    position: 'relative',
    height: '115px',
    backgroundColor: '#EBEBED',
    width: '100%',
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
    flexShrink: 0,
  },
  layer1: { position: 'absolute', top: 0, left: 0, width: '100px', height: '100px', background: '#FFD700', zIndex: 1 },
  layer2: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#000000', clipPath: 'polygon(65% 0, 100% 0, 100% 75%, 57.5% 75%)', zIndex: 2 },
  layer3: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#FFD700', clipPath: 'polygon(57.5% 75%, 100% 75%, 100% 85%, 56.5% 85%)', zIndex: 3 },
  layer4: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#000000', clipPath: 'polygon(50% 0, 65% 0, 49% 100%, 35% 100%)', zIndex: 4 },
  layer5: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#FFD700', clipPath: 'polygon(50% 0, 61% 0, 49% 100%, 35% 100%)', zIndex: 5 },
  layer6: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#2B2A2A', clipPath: 'polygon(4% 0, 60% 0, 45% 100%, 0 100%, 0 25%)', zIndex: 6 },
  headerContent: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    justifyContent: 'space-between',
    padding: '2px 40px 2px 45px',
    height: '100%',
  },
  brandText: {
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
  },
  watermark: {
    position: 'absolute',
    top: '115px',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 0,
  },
  footer: {
    margin: 'auto 40px 0 40px',
    borderTop: '1.5px solid #111',
    paddingTop: '12px',
    paddingBottom: '24px',
    textAlign: 'center',
    fontSize: 13,
    color: '#111',
    zIndex: 10,
    position: 'relative',
    flexShrink: 0,
  }
};
