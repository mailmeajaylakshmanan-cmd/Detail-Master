const express = require('express');
const router = express.Router();
const db = require('../db');
const { getBrowser } = require('../utils/pdf');
const fs = require('fs');
const path = require('path');

router.get('/services-pdf', async (req, res) => {
  try {
    const { timeframe = 'day' } = req.query;
    
    // Determine the date range
    let dateCondition = "DATE(i.created_at) = CURRENT_DATE";
    if (timeframe === 'week') {
      dateCondition = "i.created_at >= date_trunc('week', CURRENT_DATE)";
    } else if (timeframe === 'month') {
      dateCondition = "i.created_at >= date_trunc('month', CURRENT_DATE)";
    }

    // LEFT JOINs throughout so an invoice still shows up when it has no client
    // (organizations use organization_id instead), no header-level vehicle_id
    // (multi-vehicle invoices track vehicle per line), or is billed entirely
    // through third-party items rather than invoice_services.
    const query = `
      SELECT * FROM (
        SELECT
          i.invoice_number, i.status, i.grand_total, i.balance_due, i.amount_paid, i.created_at,
          (i.organization_id IS NOT NULL) AS is_organization,
          COALESCE(c.full_name, o.org_name) AS customer_name,
          COALESCE(lv.make_model, hv.make_model) AS vehicle_name,
          COALESCE(lv.license_vin, hv.license_vin) AS license_vin,
          s.service_name,
          isv.unit_price AS price
        FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.id
        LEFT JOIN organizations o ON i.organization_id = o.id
        LEFT JOIN vehicles hv ON i.vehicle_id = hv.id
        JOIN invoice_services isv ON i.id = isv.invoice_order_id
        JOIN services s ON isv.service_id = s.id
        LEFT JOIN vehicles lv ON isv.vehicle_id = lv.id
        WHERE ${dateCondition}

        UNION ALL

        SELECT
          i.invoice_number, i.status, i.grand_total, i.balance_due, i.amount_paid, i.created_at,
          (i.organization_id IS NOT NULL) AS is_organization,
          COALESCE(c.full_name, o.org_name) AS customer_name,
          COALESCE(lv.make_model, hv.make_model) AS vehicle_name,
          COALESCE(lv.license_vin, hv.license_vin) AS license_vin,
          itp.service_name,
          itp.selling_price AS price
        FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.id
        LEFT JOIN organizations o ON i.organization_id = o.id
        LEFT JOIN vehicles hv ON i.vehicle_id = hv.id
        JOIN invoice_third_party_services itp ON i.id = itp.invoice_order_id
        LEFT JOIN vehicles lv ON itp.vehicle_id = lv.id
        WHERE ${dateCondition}
      ) combined
      ORDER BY created_at DESC;
    `;

    const { rows } = await db.query(query);

    // Group lines by invoice — Date/Customer/Payment are invoice-wide and get
    // a single merged cell (rowspan); Vehicle/Service/Price stay per-line since
    // one invoice can cover multiple vehicles and services.
    const invoiceOrder = [];
    const invoiceGroups = new Map();
    for (const r of rows) {
      if (!invoiceGroups.has(r.invoice_number)) {
        invoiceGroups.set(r.invoice_number, { ...r, lines: [] });
        invoiceOrder.push(r.invoice_number);
      }
      invoiceGroups.get(r.invoice_number).lines.push(r);
    }

    const money = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let totalGrand = 0, totalPaid = 0, totalDue = 0;

    let tableRows = invoiceOrder.map((invNo, groupIdx) => {
      const g = invoiceGroups.get(invNo);
      const isPaid = Number(g.balance_due) <= 0;
      totalGrand += Number(g.grand_total);
      totalPaid += Number(g.amount_paid);
      totalDue += Number(g.balance_due);

      const statusBadge = isPaid
        ? `<span style="color: #047857; background: #ecfdf5; padding: 3px 8px; border-radius: 20px; font-weight: 700; font-size: 10px; white-space: nowrap;">PAID</span>`
        : `<span style="color: #b45309; background: #fffbeb; padding: 3px 8px; border-radius: 20px; font-weight: 700; font-size: 10px; white-space: nowrap;">PENDING</span>`;
      const typeBadge = g.is_organization
        ? `<span style="color: #4338ca; background: #eef2ff; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; white-space: nowrap;">Org</span>`
        : `<span style="color: #0369a1; background: #f0f9ff; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; white-space: nowrap;">Individual</span>`;
      const rowspan = g.lines.length;
      const groupBg = groupIdx % 2 === 0 ? '#ffffff' : '#fafafa';
      const groupBorder = '2px solid #e5e7eb';

      return g.lines.map((line, idx) => {
        const isLast = idx === rowspan - 1;
        const lineBorder = isLast ? groupBorder : '1px solid #f0f0f0';
        return `
        <tr style="background-color: ${groupBg};">
          ${idx === 0 ? `<td rowspan="${rowspan}" style="padding: 14px 12px; border-bottom: ${groupBorder}; border-right: 1px solid #f0f0f0; color: #374151; font-size: 13px; vertical-align: middle;">${new Date(g.created_at).toLocaleDateString('en-GB')}<div style="color:#9ca3af; font-size: 11px; margin-top: 3px;">${g.invoice_number}</div></td>` : ''}
          ${idx === 0 ? `<td rowspan="${rowspan}" style="padding: 14px 12px; border-bottom: ${groupBorder}; border-right: 1px solid #f0f0f0; color: #111827; font-weight: 600; font-size: 13px; vertical-align: middle;"><div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;"><span>${g.customer_name || 'N/A'}</span>${typeBadge}</div></td>` : ''}
          <td style="padding: 10px 12px; border-bottom: ${lineBorder}; color: #4b5563; font-size: 13px;">${line.vehicle_name || 'N/A'} <span style="color: #9ca3af; font-size: 11px;">(${line.license_vin || '—'})</span></td>
          <td style="padding: 10px 12px; border-bottom: ${lineBorder}; color: #374151; font-size: 13px;">${line.service_name}</td>
          <td style="padding: 10px 12px; border-bottom: ${lineBorder}; font-size: 13px; text-align: right;">₹${money(line.price)}</td>
          ${idx === 0 ? `<td rowspan="${rowspan}" style="padding: 14px 12px; border-bottom: ${groupBorder}; border-right: 1px solid #f0f0f0; font-size: 13px; text-align: right; vertical-align: middle;">₹${money(g.amount_paid)}</td>` : ''}
          ${idx === 0 ? `<td rowspan="${rowspan}" style="padding: 14px 12px; border-bottom: ${groupBorder}; border-right: 1px solid #f0f0f0; font-size: 13px; text-align: right; vertical-align: middle; color: ${isPaid ? '#374151' : '#b45309'}; font-weight: ${isPaid ? '400' : '700'};">₹${money(g.balance_due)}</td>` : ''}
          ${idx === 0 ? `<td rowspan="${rowspan}" style="padding: 14px 8px; border-bottom: ${groupBorder}; font-size: 13px; text-align: center; vertical-align: middle;">${statusBadge}</td>` : ''}
        </tr>
      `;
      }).join('');
    }).join('');

    if (rows.length === 0) {
      tableRows = `<tr><td colspan="8" style="padding: 32px; text-align: center; color: #9ca3af; font-size: 14px;">No services found for this timeframe.</td></tr>`;
    }

    const summaryCards = rows.length === 0 ? '' : `
      <div style="display: flex; gap: 16px; margin: 24px 0;">
        <div style="flex: 1; background: #fdfaf0; border: 1px solid #f2e6b3; border-top: 3px solid #EDCB19; border-radius: 10px; padding: 16px 18px;">
          <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #a68b1f; font-weight: 700;">Invoices</div>
          <div style="font-size: 22px; font-weight: 800; margin-top: 4px; color: #111827;">${invoiceOrder.length}</div>
        </div>
        <div style="flex: 1; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 18px;">
          <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; font-weight: 700;">Total Billed</div>
          <div style="font-size: 22px; font-weight: 800; margin-top: 4px; color: #111827;">₹${money(totalGrand)}</div>
        </div>
        <div style="flex: 1; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 18px;">
          <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; font-weight: 700;">Total Paid</div>
          <div style="font-size: 22px; font-weight: 800; margin-top: 4px; color: #047857;">₹${money(totalPaid)}</div>
        </div>
        <div style="flex: 1; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 18px;">
          <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; font-weight: 700;">Total Pending</div>
          <div style="font-size: 22px; font-weight: 800; margin-top: 4px; color: #b45309;">₹${money(totalDue)}</div>
        </div>
      </div>
    `;

    let logoBase64 = '';
    try {
      const logoPath = path.join(__dirname, '../../client/src/assets/brand_logo.png');
      const logoFile = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${logoFile.toString('base64')}`;
    } catch (e) {
      console.error('Failed to load logo', e);
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Services Report</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 36px; margin: 0; color: #111827; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #EDCB19; padding-bottom: 16px; margin-bottom: 8px; }
          .header h1 { margin: 0; font-size: 21px; color: #0A0A0A; letter-spacing: -0.01em; }
          .header p { margin: 4px 0 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
          .header .badge { background: #0A0A0A; color: #EDCB19; padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; table-layout: fixed; }
          th { text-align: left; padding: 12px; background-color: #f8fafc; color: #475569; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.03em; border-bottom: 2px solid #EDCB19; }
          th.num { text-align: right; }
          th.center { text-align: center; }
          .footer { margin-top: 28px; text-align: center; color: #9ca3af; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Services Report</h1>
            <p>${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} · Generated ${new Date().toLocaleDateString('en-GB')}</p>
          </div>
          <div style="display: flex; align-items: center; gap: 16px;">
            <div class="badge">Detailing Masters</div>
            ${logoBase64 ? `<img src="${logoBase64}" alt="Detailing Masters" style="height: 44px; width: auto; object-fit: contain;" />` : ''}
          </div>
        </div>

        ${summaryCards}

        <table>
          <colgroup>
            <col style="width: 13%"><col style="width: 14%"><col style="width: 13%">
            <col style="width: 13%"><col style="width: 12%"><col style="width: 11%">
            <col style="width: 12%"><col style="width: 12%">
          </colgroup>
          <thead>
            <tr>
              <th>Date / Invoice</th>
              <th>Customer</th>
              <th>Vehicle</th>
              <th>Service</th>
              <th class="num">Price</th>
              <th class="num">Paid</th>
              <th class="num">Due</th>
              <th class="center">Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="footer">
          &copy; ${new Date().getFullYear()} Detailing Masters
        </div>
      </body>
      </html>
    `;

    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '20px', bottom: '20px' }
    });
    
    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="services-report-${timeframe}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    
    // In newer Puppeteer versions, page.pdf() returns a Uint8Array. 
    // We must convert it to a Buffer so Express sends it as binary data instead of JSON.
    res.send(Buffer.from(pdfBuffer));

  } catch (err) {
    console.error('PDF Generation Error:', err);
    res.status(500).json({ message: 'Error generating PDF report' });
  }
});

module.exports = router;
