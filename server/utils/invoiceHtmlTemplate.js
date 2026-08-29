const fs = require('fs');
const path = require('path');

function getLogoBase64() {
  try {
    const p = path.join(__dirname, '../../client/src/assets/brand-logo-for-invoice.png');
    if (fs.existsSync(p)) {
      return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
    }
  } catch (e) {}
  return '';
}

function fmtMoney(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function renderInvoiceHtml(inv) {
  const clientName = inv.client_name || inv.full_name || inv.org_name || 'Valued Customer';
  const clientPhone = inv.client_phone || inv.phone || '—';
  const vehicleName = inv.vehicle_name || `${inv.vehicle_make || ''} ${inv.vehicle_model || ''}`.trim() || '—';
  const vehiclePlate = inv.vehicle_number || inv.license_vin || '—';
  
  const services = inv.services || [];
  const thirdPartyServices = inv.thirdPartyServices || [];

  let rowsHtml = '';
  services.forEach((s, idx) => {
    rowsHtml += `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #1f2937;">${idx + 1}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; font-weight: 600; color: #111827;">${s.service_name || s.name || 'Service'}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; text-align: center; color: #4b5563;">${s.quantity || 1}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; text-align: right; color: #111827;">₹${fmtMoney(s.unit_price || s.price)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; text-align: right; font-weight: 700; color: #111827;">₹${fmtMoney(s.total || ((s.unit_price || s.price) * (s.quantity || 1)))}</td>
      </tr>
    `;
  });

  thirdPartyServices.forEach((t, idx) => {
    rowsHtml += `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #1f2937;">${services.length + idx + 1}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; font-weight: 600; color: #111827;">${t.service_name || t.service || 'Third-Party Service'}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; text-align: center; color: #4b5563;">${t.quantity || 1}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; text-align: right; color: #111827;">₹${fmtMoney(t.selling_price)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; text-align: right; font-weight: 700; color: #111827;">₹${fmtMoney((t.selling_price || 0) * (t.quantity || 1))}</td>
      </tr>
    `;
  });

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Invoice - ${inv.invoice_number}</title>
    <style>
      * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
      body { margin: 0; padding: 24px; background: #fff; color: #111827; }
      .header-banner { background: #000; color: #fff; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #F6CB59; border-radius: 6px 6px 0 0; }
      .brand-title { font-size: 20px; font-weight: 800; letter-spacing: 0.05em; color: #F6CB59; }
      .invoice-badge { font-size: 24px; font-weight: 900; letter-spacing: 0.1em; color: #fff; }
      .info-grid { display: flex; justify-content: space-between; margin-top: 20px; background: #f9fafb; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb; }
      .info-col { flex: 1; }
      .info-col h4 { margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
      .info-col p { margin: 0 0 4px 0; font-size: 13px; font-weight: 600; color: #111827; }
      table { width: 100%; border-collapse: collapse; margin-top: 24px; }
      th { background: #111827; color: #F6CB59; font-size: 11px; text-transform: uppercase; padding: 10px 12px; text-align: left; letter-spacing: 0.05em; }
      .totals-wrap { display: flex; justify-content: flex-end; margin-top: 20px; }
      .totals-box { width: 280px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px; }
      .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #4b5563; }
      .totals-row.grand { border-top: 2px solid #F6CB59; margin-top: 6px; padding-top: 8px; font-size: 16px; font-weight: 800; color: #111827; }
      .totals-row.balance { color: #b45309; font-weight: 700; }
    </style>
  </head>
  <body>
    <div class="header-banner">
      <div>
        <div class="brand-title">DETAILING MASTERS</div>
        <div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">Opposite KTM Bike Showroom, Chankai, Marthandam, TN 629155</div>
        <div style="font-size: 11px; color: #9ca3af;">+91 99941 22652 · detailingmasters2024@gmail.com</div>
      </div>
      <div style="text-align: right;">
        <div class="invoice-badge">INVOICE</div>
        <div style="font-size: 13px; font-weight: 700; color: #F6CB59; margin-top: 4px;">${inv.invoice_number}</div>
        <div style="font-size: 11px; color: #9ca3af;">Date: ${fmtDate(inv.created_at)}</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-col">
        <h4>Billed To</h4>
        <p>${clientName}</p>
        <p style="font-weight: 400; color: #4b5563;">Phone: ${clientPhone}</p>
      </div>
      <div class="info-col">
        <h4>Vehicle Information</h4>
        <p>${vehicleName}</p>
        <p style="font-weight: 700; color: #111827; letter-spacing: 0.05em;">Reg No: ${vehiclePlate}</p>
      </div>
      <div class="info-col" style="text-align: right;">
        <h4>Payment Status</h4>
        <p style="text-transform: uppercase; color: ${inv.status === 'paid' ? '#047857' : '#b45309'}; font-weight: 800;">${inv.status || 'OPEN'}</p>
        <p style="font-weight: 400; color: #4b5563;">Balance: ₹${fmtMoney(inv.balance_due)}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Service / Description</th>
          <th style="text-align: center; width: 60px;">Qty</th>
          <th style="text-align: right; width: 100px;">Price</th>
          <th style="text-align: right; width: 120px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="totals-wrap">
      <div class="totals-box">
        <div class="totals-row">
          <span>Sub Total:</span>
          <span>₹${fmtMoney(inv.sub_total)}</span>
        </div>
        ${Number(inv.discount) > 0 ? `
          <div class="totals-row" style="color: #047857;">
            <span>Discount:</span>
            <span>- ₹${fmtMoney(inv.discount)}</span>
          </div>
        ` : ''}
        <div class="totals-row grand">
          <span>Grand Total:</span>
          <span>₹${fmtMoney(inv.grand_total)}</span>
        </div>
        <div class="totals-row" style="color: #047857; margin-top: 4px;">
          <span>Amount Paid:</span>
          <span>₹${fmtMoney(inv.amount_paid)}</span>
        </div>
        <div class="totals-row balance">
          <span>Balance Due:</span>
          <span>₹${fmtMoney(inv.balance_due)}</span>
        </div>
      </div>
    </div>

    ${inv.special_notes ? `
      <div style="margin-top: 24px; padding: 12px 16px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px;">
        <div style="font-size: 11px; font-weight: 700; color: #92400e; text-transform: uppercase;">Special Notes</div>
        <div style="font-size: 12px; color: #78350f; margin-top: 4px;">${inv.special_notes}</div>
      </div>
    ` : ''}

    <div style="margin-top: 36px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px;">
      Thank you for choosing DETAILING MASTERS! Drive with Pride.
    </div>
  </body>
  </html>
  `;
}

function renderServiceReportHtml(inv) {
  const clientName = inv.client_name || inv.full_name || inv.org_name || 'Valued Customer';
  const clientPhone = inv.client_phone || inv.phone || '—';
  const vehicleName = inv.vehicle_name || `${inv.vehicle_make || ''} ${inv.vehicle_model || ''}`.trim() || '—';
  const vehiclePlate = inv.vehicle_number || inv.license_vin || '—';
  const services = inv.services || [];

  let servicesHtml = '';
  services.forEach((s, idx) => {
    servicesHtml += `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
          <span style="font-size: 13px; font-weight: 700; color: #111827;">${s.service_name || s.name}</span>
        </div>
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; background: #ecfdf5; color: #047857; padding: 4px 8px; border-radius: 4px;">COMPLETED</span>
      </div>
    `;
  });

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Vehicle Service Report - ${inv.invoice_number}</title>
    <style>
      * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
      body { margin: 0; padding: 24px; background: #fff; color: #111827; }
      .header-banner { background: #000; color: #fff; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #F6CB59; border-radius: 6px 6px 0 0; }
      .brand-title { font-size: 20px; font-weight: 800; letter-spacing: 0.05em; color: #F6CB59; }
      .report-badge { font-size: 20px; font-weight: 900; letter-spacing: 0.05em; color: #fff; }
      .info-grid { display: flex; justify-content: space-between; margin-top: 20px; background: #f9fafb; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb; }
      .info-col { flex: 1; }
      .info-col h4 { margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
      .info-col p { margin: 0 0 4px 0; font-size: 13px; font-weight: 600; color: #111827; }
    </style>
  </head>
  <body>
    <div class="header-banner">
      <div>
        <div class="brand-title">DETAILING MASTERS</div>
        <div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">Opposite KTM Bike Showroom, Chankai, Marthandam, TN 629155</div>
        <div style="font-size: 11px; color: #9ca3af;">+91 99941 22652 · detailingmasters2024@gmail.com</div>
      </div>
      <div style="text-align: right;">
        <div class="report-badge">SERVICE REPORT</div>
        <div style="font-size: 13px; font-weight: 700; color: #F6CB59; margin-top: 4px;">${inv.invoice_number}</div>
        <div style="font-size: 11px; color: #9ca3af;">Date: ${fmtDate(inv.created_at)}</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-col">
        <h4>Customer Details</h4>
        <p>${clientName}</p>
        <p style="font-weight: 400; color: #4b5563;">Phone: ${clientPhone}</p>
      </div>
      <div class="info-col">
        <h4>Vehicle Information</h4>
        <p>${vehicleName}</p>
        <p style="font-weight: 700; color: #111827; letter-spacing: 0.05em;">Reg No: ${vehiclePlate}</p>
      </div>
      <div class="info-col" style="text-align: right;">
        <h4>Inspection Status</h4>
        <p style="text-transform: uppercase; color: #047857; font-weight: 800;">VERIFIED & CERTIFIED</p>
      </div>
    </div>

    <div style="margin-top: 24px;">
      <h3 style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #111827; margin-bottom: 12px;">Performed Services</h3>
      ${servicesHtml}
    </div>

    <div style="margin-top: 36px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px;">
      Thank you for choosing DETAILING MASTERS! Drive with Pride.
    </div>
  </body>
  </html>
  `;
}

function renderOfferHtml(offer) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Customer Offer - ${offer.offer_code || offer.offer_name}</title>
    <style>
      * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
      body { margin: 0; padding: 24px; background: #fff; color: #111827; }
      .header-banner { background: #000; color: #fff; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #F6CB59; border-radius: 6px 6px 0 0; }
      .brand-title { font-size: 20px; font-weight: 800; letter-spacing: 0.05em; color: #F6CB59; }
      .offer-badge { font-size: 20px; font-weight: 900; letter-spacing: 0.05em; color: #fff; }
    </style>
  </head>
  <body>
    <div class="header-banner">
      <div>
        <div class="brand-title">DETAILING MASTERS</div>
        <div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">Opposite KTM Bike Showroom, Chankai, Marthandam, TN 629155</div>
        <div style="font-size: 11px; color: #9ca3af;">+91 99941 22652 · detailingmasters2024@gmail.com</div>
      </div>
      <div style="text-align: right;">
        <div class="offer-badge">OFFER PACKAGE</div>
        <div style="font-size: 13px; font-weight: 700; color: #F6CB59; margin-top: 4px;">${offer.offer_code || 'SPECIAL'}</div>
      </div>
    </div>
    <div style="margin-top: 24px; padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;">
      <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #111827;">${offer.offer_name || 'Detailing Package'}</h2>
      <p style="margin: 0; color: #4b5563; font-size: 13px;">${offer.description || 'Exclusive customer detailing offer'}</p>
    </div>
  </body>
  </html>
  `;
}

module.exports = { renderInvoiceHtml, renderServiceReportHtml, renderOfferHtml };
