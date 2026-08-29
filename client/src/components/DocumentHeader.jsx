import React from 'react';
import brandLogo from '../assets/brand-logo-for-invoice.png';
import goldenCar from '../assets/new-invoice-add.png';

/**
 * Universal Pixel-Perfect Document Header
 * Uses pure SVG geometry and clean vector graphics so it renders
 * identically on screen, in print, in Puppeteer PDF, and in WhatsApp PDF without collapsing.
 */
export default function DocumentHeader({ title = 'INVOICE' }) {
  return (
    <div style={{ position: 'relative', height: '115px', width: '100%', overflow: 'hidden', backgroundColor: '#EBEBED' }}>
      {/* SVG Background Polygons & Stripes */}
      <svg
        width="100%"
        height="115"
        viewBox="0 0 820 115"
        preserveAspectRatio="none"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '115px', zIndex: 1 }}
      >
        <defs>
          <linearGradient id="goldTextGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#BF953F" />
            <stop offset="25%" stopColor="#FCF6BA" />
            <stop offset="50%" stopColor="#B38728" />
            <stop offset="75%" stopColor="#FBF5B7" />
            <stop offset="100%" stopColor="#AA771C" />
          </linearGradient>
        </defs>

        {/* Top-left gold square */}
        <rect x="0" y="0" width="100" height="100" fill="#FFD700" />

        {/* Main Left Dark Charcoal Polygon */}
        <polygon points="32,0 492,0 369,115 0,115 0,28" fill="#2B2A2A" />

        {/* Yellow Stripe Accents */}
        <polygon points="410,0 500,0 401,115 287,115" fill="#FFD700" />

        {/* Center Black Splinter */}
        <polygon points="410,0 533,0 401,115 287,115" fill="#000000" />

        {/* Yellow Accent Under Right Black Box */}
        <polygon points="471,86 820,86 820,97 463,97" fill="#FFD700" />

        {/* Right Solid Black Polygon */}
        <polygon points="533,0 820,0 820,86 471,86" fill="#000000" />
      </svg>

      {/* Foreground Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 40px',
          height: '100%',
        }}
      >
        {/* Left: Shield Logo & DETAILING MASTERS Text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Shield Logo with Drop Shadow */}
          <div
            style={{
              position: 'relative',
              width: 84,
              height: 104,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))',
            }}
          >
            <img
              src={brandLogo}
              alt="Detailing Masters Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* DETAILING MASTERS Typography */}
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span
              style={{
                fontFamily: "'Cinzel', 'Georgia', serif",
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: '2.5px',
                color: '#F4C430',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8), 0 0 8px rgba(191,149,63,0.3)',
              }}
            >
              DETAILING
            </span>
            <span
              style={{
                fontFamily: "'Cinzel', 'Georgia', serif",
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: '2.5px',
                color: '#F4C430',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8), 0 0 8px rgba(191,149,63,0.3)',
              }}
            >
              MASTERS
            </span>
          </div>
        </div>

        {/* Center: Golden Sports Car Silhouette */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '30px' }}>
          <img
            src={goldenCar}
            alt="Car Accent"
            style={{
              height: '75px',
              objectFit: 'contain',
              filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))',
            }}
          />
        </div>

        {/* Right: Document Title (INVOICE, VEHICLE REPORT, etc.) */}
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: '10px' }}>
          <h1
            style={{
              fontFamily: "'Montserrat', 'Inter', sans-serif",
              fontSize: title.length > 10 ? 22 : 32,
              fontWeight: 700,
              margin: 0,
              letterSpacing: '0.08em',
              color: '#FFFFFF',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              textAlign: 'right',
            }}
          >
            {title}
          </h1>
        </div>
      </div>
    </div>
  );
}
