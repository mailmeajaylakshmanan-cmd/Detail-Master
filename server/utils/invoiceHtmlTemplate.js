const fs = require('fs');
const path = require('path');

function getBase64Image(filename) {
  const possiblePaths = [
    path.join(__dirname, '../assets', filename),
    path.join(__dirname, '../../client/src/assets', filename),
    path.join(process.cwd(), 'server/assets', filename),
    path.join(process.cwd(), 'client/src/assets', filename),
    path.join(process.cwd(), 'assets', filename)
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
      }
    } catch (e) {}
  }
  return '';
}

const logoBase64 = getBase64Image('brand-logo-for-invoice.png');
const goldenCarBase64 = getBase64Image('new-invoice-add.png');

function fmt(n) {
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
  const invoiceNo = inv.invoice_number || inv.invoiceNo || 'INV';
  const dateStr = fmtDate(inv.created_at || inv.date);

  const services = inv.services || [];
  const thirdPartyServices = inv.thirdPartyServices || [];
  const payments = inv.payments || [];

  let servicesRowsHtml = '';
  if (services.length === 0 && thirdPartyServices.length === 0) {
    servicesRowsHtml = `
      <tr style="background-color: #FFFFFF;">
        <td colspan="4" style="padding: 12px; text-align: center; color: #666; border: 1px solid #000;">No services added</td>
      </tr>
    `;
  } else {
    services.forEach((s, idx) => {
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#f8fafc';
      const isRedeemed = s.is_redeemed;
      servicesRowsHtml += `
        <tr style="background-color: ${bg};">
          <td style="padding: 6px 10px; border: 1px solid #000; display: flex; align-items: center; gap: 12px;">
            <div style="background-color: #F6CB59; border-radius: 4px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <span style="font-size: 10px; font-weight: 700; color: #000;">★</span>
            </div>
            <div>
              <div style="font-weight: 500; color: #000;">${s.service_name || s.name || s.service || 'Service'}</div>
              ${(s.description || s.vehicle_plate || isRedeemed) ? `
                <div style="font-size: 11px; color: #666;">
                  ${s.vehicle_plate ? `<span style="font-weight: 600; color: #444;">[${s.vehicle_plate}] </span>` : ''}
                  ${s.description || ''}
                </div>
              ` : ''}
            </div>
          </td>
          <td style="padding: 6px 10px; border: 1px solid #000; text-align: center; color: #000;">${s.quantity || 1}</td>
          <td style="padding: 6px 10px; border: 1px solid #000; text-align: center; color: #000;">
            ${isRedeemed ? '<span style="background-color: #22c55e; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">REDEEMED</span>' : `₹${fmt(s.unit_price || s.price)}`}
          </td>
          <td style="padding: 6px 10px; border: 1px solid #000; text-align: center; color: #000; font-weight: 600;">
            ${isRedeemed ? '<span style="background-color: #22c55e; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">REDEEMED</span>' : `₹${fmt(s.total || ((s.unit_price || s.price) * (s.quantity || 1)))}`}
          </td>
        </tr>
      `;
    });

    thirdPartyServices.forEach((t, idx) => {
      const globalIdx = services.length + idx;
      const bg = globalIdx % 2 === 0 ? '#FFFFFF' : '#f8fafc';
      servicesRowsHtml += `
        <tr style="background-color: ${bg};">
          <td style="padding: 6px 10px; border: 1px solid #000; display: flex; align-items: center; gap: 12px;">
            <div style="background-color: #F6CB59; border-radius: 4px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <span style="font-size: 10px; font-weight: 700; color: #000;">⚙</span>
            </div>
            <div>
              <div style="font-weight: 500; color: #000;">${t.service_name || t.service || 'Third-Party Service'}</div>
              ${(t.vendor_name || t.vehicle_plate) ? `
                <div style="font-size: 11px; color: #666;">
                  ${t.vehicle_plate ? `<span style="font-weight: 600; color: #444;">[${t.vehicle_plate}] </span>` : ''}
                  ${t.vendor_name ? `Vendor: ${t.vendor_name}` : ''}
                </div>
              ` : ''}
            </div>
          </td>
          <td style="padding: 6px 10px; border: 1px solid #000; text-align: center; color: #000;">${t.quantity || 1}</td>
          <td style="padding: 6px 10px; border: 1px solid #000; text-align: center; color: #000;">₹${fmt(t.selling_price)}</td>
          <td style="padding: 6px 10px; border: 1px solid #000; text-align: center; color: #000; font-weight: 600;">₹${fmt(t.total || ((t.selling_price || 0) * (t.quantity || 1)))}</td>
        </tr>
      `;
    });
  }

  const subTotal = Number(inv.sub_total || inv.subTotal || 0);
  const discount = Number(inv.discount || 0);
  const grandTotal = Number(inv.grand_total || inv.total || (subTotal - discount));
  const amountPaid = Number(inv.amount_paid || inv.amountPaid || 0);
  const balanceDue = Number(inv.balance_due || inv.balance || Math.max(0, grandTotal - amountPaid));

  let paymentsRowsHtml = '';
  if (payments.length > 0) {
    paymentsRowsHtml = `
      <div style="padding: 20px 40px 0 40px;">
        <h3 style="font-size: 13px; font-weight: 700; margin: 0 0 8px 0; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em;">PAYMENT RECORDS</h3>
        <div style="height: 2px; background-color: #0A0A0A; margin-bottom: 12px;"></div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; background-color: #fff;">
          <thead>
            <tr style="background-color: #f8fafc; color: #333;">
              <th style="padding: 8px 10px; text-align: left; font-weight: 600; border: 1px solid #ddd;">Date</th>
              <th style="padding: 8px 10px; text-align: left; font-weight: 600; border: 1px solid #ddd;">Method</th>
              <th style="padding: 8px 10px; text-align: left; font-weight: 600; border: 1px solid #ddd;">Reference</th>
              <th style="padding: 8px 10px; text-align: right; font-weight: 600; border: 1px solid #ddd;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${payments.map(p => `
              <tr>
                <td style="padding: 8px 10px; border: 1px solid #ddd;">${fmtDate(p.payment_date)}</td>
                <td style="padding: 8px 10px; border: 1px solid #ddd; text-transform: capitalize;">${p.payment_method || '—'}</td>
                <td style="padding: 8px 10px; border: 1px solid #ddd;">${p.reference_no || '-'}</td>
                <td style="padding: 8px 10px; border: 1px solid #ddd; text-align: right; font-weight: 600;">₹${fmt(p.amount)}</td>
              </tr>
            `).join('')}
            <tr>
              <td colspan="2" style="border: none; background-color: transparent;"></td>
              <td style="padding: 8px 10px; text-align: right; font-weight: 700; border: 1px solid #ddd; background-color: #f8fafc;">Total Paid</td>
              <td style="padding: 8px 10px; text-align: right; font-weight: 700; border: 1px solid #ddd; color: #059669;">₹${fmt(amountPaid)}</td>
            </tr>
            ${balanceDue > 0 ? `
              <tr>
                <td colspan="2" style="border: none; background-color: transparent;"></td>
                <td style="padding: 8px 10px; text-align: right; font-weight: 700; border: 1px solid #ddd; background-color: #f8fafc;">Balance Due</td>
                <td style="padding: 8px 10px; text-align: right; font-weight: 800; border: 1px solid #ddd; color: #e11d48;">₹${fmt(balanceDue)}</td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    `;
  }

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Invoice - ${invoiceNo}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Montserrat:wght@500;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; }
      @page { size: A4 portrait; margin: 0; }
      body { margin: 0; padding: 0; background: #ffffff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; }
      .invoice-container { width: 820px; margin: 0 auto; background: #ffffff; min-height: 1120px; display: flex; flex-direction: column; position: relative; }
      .header-wrap { position: relative; height: 115px; background-color: #EBEBED; width: 100%; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .layer1 { position: absolute; top: 0; left: 0; width: 100px; height: 100px; background: #FFD700; z-index: 1; }
      .layer2 { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #000000; clip-path: polygon(65% 0, 100% 0, 100% 75%, 57.5% 75%); -webkit-clip-path: polygon(65% 0, 100% 0, 100% 75%, 57.5% 75%); z-index: 2; }
      .layer3 { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #FFD700; clip-path: polygon(57.5% 75%, 100% 75%, 100% 85%, 56.5% 85%); -webkit-clip-path: polygon(57.5% 75%, 100% 75%, 100% 85%, 56.5% 85%); z-index: 3; }
      .layer4 { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #000000; clip-path: polygon(50% 0, 65% 0, 49% 100%, 35% 100%); -webkit-clip-path: polygon(50% 0, 65% 0, 49% 100%, 35% 100%); z-index: 4; }
      .layer5 { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #FFD700; clip-path: polygon(50% 0, 61% 0, 49% 100%, 35% 100%); -webkit-clip-path: polygon(50% 0, 61% 0, 49% 100%, 35% 100%); z-index: 5; }
      .layer6 { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #2B2A2A; clip-path: polygon(4% 0, 60% 0, 45% 100%, 0 100%, 0 25%); -webkit-clip-path: polygon(4% 0, 60% 0, 45% 100%, 0 100%, 0 25%); z-index: 6; }
      
      .brand-grad-text {
        font-family: 'Cinzel', 'Trajan Pro', 'Georgia', serif;
        font-size: 28px;
        margin: 0;
        letter-spacing: 3px;
        font-weight: 600;
        background: linear-gradient(to right, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    </style>
  </head>
  <body>
    <div class="invoice-container">
      <!-- HEADER (EXACT 6-LAYER UI) -->
      <div class="header-wrap">
        <div class="layer1"></div>
        <div class="layer2"></div>
        <div class="layer3"></div>
        <div class="layer4"></div>
        <div class="layer5"></div>
        <div class="layer6"></div>

        <div style="position: relative; z-index: 10; display: flex; justify-content: space-between; padding: 2px 40px 2px 45px; height: 100%;">
          <div style="display: flex; alignItems: center; gap: 24px;">
            <div style="position: relative; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5)); z-index: 20;">
              <div style="display: flex; align-items: center; justify-content: center; width: 88px; height: 108px;">
                ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="height: 100%; width: 100%; object-fit: fill; filter: drop-shadow(0 0 1px #fff) drop-shadow(0 0 2px rgba(255,255,255,0.9));" />` : ''}
              </div>
            </div>
            <div style="display: flex; flex-direction: column; line-height: 1; justify-content: center;">
              <span class="brand-grad-text">DETAILING</span>
              <span class="brand-grad-text">MASTERS</span>
            </div>
          </div>

          <div style="flex: 1; position: relative; display: flex; align-items: center; justify-content: center;">
            ${goldenCarBase64 ? `<img src="${goldenCarBase64}" alt="Car Accent" style="height: 80px; object-fit: contain; filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.4)); position: relative; left: 20%; top: 10px;" />` : ''}
          </div>

          <div style="display: flex; align-items: flex-start; padding-right: 15px; padding-top: 20px;">
            <h1 style="font-family: 'Montserrat', 'Open Sans', sans-serif; fontSize: 36px; font-weight: 500; margin: 0; letter-spacing: 0.05em; color: #FFFFFF; filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.6));">INVOICE</h1>
          </div>
        </div>
      </div>

      <!-- GLOBAL WATERMARK -->
      ${logoBase64 ? `
        <div style="position: absolute; top: 115px; bottom: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 0;">
          <img src="${logoBase64}" style="width: 450px; opacity: 0.04; filter: grayscale(100%);" />
        </div>
      ` : ''}

      <!-- INFO SECTIONS -->
      <div style="padding: 20px 40px; background-color: transparent; position: relative; z-index: 1; display: flex; gap: 40px;">
        <div style="flex: 1 1 50%;">
          <h3 style="font-size: 13px; font-weight: 700; margin: 0 0 12px 0; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em;">INVOICE INFO</h3>
          <div style="font-size: 14px; color: #111827; display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; align-items: flex-start;">
              <span style="width: 85px; color: #6B7280; font-size: 13px; padding-top: 1px;">Address:</span>
              <span style="flex: 1; font-weight: 500; line-height: 1.5;">Opposite KTM Bike Showroom, Chankai, Marthandam, Tamil Nadu 629155</span>
            </div>
            <div style="display: flex; align-items: center;">
              <span style="width: 85px; color: #6B7280; font-size: 13px;">Phone:</span>
              <span style="font-weight: 500;">+91 9994122652</span>
            </div>
            <div style="display: flex; align-items: center;">
              <span style="width: 85px; color: #6B7280; font-size: 13px;">Email:</span>
              <span style="font-weight: 500;">detailingmasters2024@gmail.com</span>
            </div>
          </div>
        </div>

        <div style="flex: 1 1 50%;">
          <h3 style="font-size: 13px; font-weight: 700; margin: 0 0 12px 0; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em;">CLIENT INFO</h3>
          <div style="font-size: 14px; color: #111827; display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; align-items: center;">
              <span style="width: 85px; color: #6B7280; font-size: 13px;">Name:</span>
              <span style="font-weight: 500;">${clientName}</span>
            </div>
            <div style="display: flex; align-items: center;">
              <span style="width: 85px; color: #6B7280; font-size: 13px;">Car Make:</span>
              <span style="font-weight: 500;">${vehicleName}</span>
            </div>
            <div style="display: flex; align-items: center;">
              <span style="width: 85px; color: #6B7280; font-size: 13px;">Vehicle No:</span>
              <span style="font-weight: 500;">${vehiclePlate}</span>
            </div>
            <div style="display: flex; align-items: center;">
              <span style="width: 85px; color: #6B7280; font-size: 13px;">Date:</span>
              <span style="font-weight: 500;">${dateStr}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- SERVICES TABLE -->
      <div style="padding: 20px 40px 0 40px; position: relative; z-index: 1;">
        <h3 style="font-size: 15px; font-weight: 700; margin: 0 0 8px 0; color: #0A0A0A; text-transform: uppercase;">SERVICES</h3>
        <div style="height: 2px; background-color: #0A0A0A; margin-bottom: 16px;"></div>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px; background-color: transparent;">
          <thead>
            <tr style="background-color: #0A0A0A; color: #fff;">
              <th style="padding: 8px 10px; text-align: left; font-weight: 600; border: 1px solid #000; width: 50%;">Service</th>
              <th style="padding: 8px 10px; text-align: center; font-weight: 600; border: 1px solid #000; width: 15%;">Quantity</th>
              <th style="padding: 8px 10px; text-align: center; font-weight: 600; border: 1px solid #000; width: 17.5%;">Unit Price (₹)</th>
              <th style="padding: 8px 10px; text-align: center; font-weight: 600; border: 1px solid #000; width: 17.5%;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${servicesRowsHtml}
            <tr>
              <td colspan="2" style="border: none; background-color: transparent;"></td>
              <td style="padding: 8px 10px; text-align: right; font-weight: 700; border: 1px solid #000;">Sub Total</td>
              <td style="padding: 8px 10px; text-align: center; font-weight: 700; border: 1px solid #000;">₹${fmt(subTotal)}</td>
            </tr>
            ${discount > 0 ? `
              <tr>
                <td colspan="2" style="border: none; background-color: transparent;"></td>
                <td style="padding: 8px 10px; text-align: right; font-weight: 700; border: 1px solid #000;">Discount</td>
                <td style="padding: 8px 10px; text-align: center; font-weight: 700; border: 1px solid #000; color: #e11d48;">-₹${fmt(discount)}</td>
              </tr>
            ` : ''}
            <tr>
              <td colspan="2" style="border: none; background-color: transparent;"></td>
              <td colspan="2" style="border: none; padding: 0; background-color: transparent;">
                <div style="background-color: #F6CB59; color: #000; padding: 12px 16px; font-weight: 800; font-size: 16px; text-align: center; width: 100%; border: 1px solid #000; border-top: none;">
                  GRAND TOTAL: ₹${fmt(grandTotal)}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- PAYMENT RECORDS -->
      ${paymentsRowsHtml}

      <!-- BOTTOM SECTION -->
      <div style="position: relative; width: 100%; margin-top: auto; overflow: hidden; display: flex; flex-direction: column;">
        <div style="padding: 5px 40px; margin-bottom: 20px;">
          <h3 style="font-size: 15px; font-weight: 700; margin: 0 0 6px 0; color: #111; text-transform: uppercase;">PAYMENT DETAILS</h3>
          <div style="font-size: 13px; color: #333; line-height: 1.6;">
            <div>+91 9994122652 | E-mail: detailingmasters2024@gmail.com</div>
          </div>
        </div>

        <div style="margin: 0 40px; border-top: 1.5px solid #111; padding-top: 15px; padding-bottom: 30px; text-align: center; font-size: 13px; color: #111; z-index: 10; position: relative;">
          <strong>Detailing Masters</strong>, Opposite KTM Bike Showroom, Chankai, Marthandam, Tamil Nadu 629155.<br/>
          Ph: +91 99941 22652 | Email: detailingmasters2024@gmail.com
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
}

function renderServiceReportHtml(inv) {
  return renderInvoiceHtml(inv);
}

function renderOfferHtml(offer) {
  return renderInvoiceHtml(offer);
}

module.exports = {
  renderInvoiceHtml,
  renderServiceReportHtml,
  renderOfferHtml,
};
