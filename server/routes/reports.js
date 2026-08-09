const express = require('express');
const router = express.Router();
const db = require('../db');
const puppeteer = require('puppeteer');

// Simple helper to launch puppeteer
async function getBrowser() {
  return puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
  });
}

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

    const query = `
      SELECT 
        i.invoice_number, i.status, i.grand_total, i.balance_due, i.created_at,
        c.full_name AS client_name,
        v.make_model AS vehicle_name, v.license_vin,
        s.service_name,
        isv.unit_price
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      JOIN vehicles v ON i.vehicle_id = v.id
      JOIN invoice_services isv ON i.id = isv.invoice_order_id
      JOIN services s ON isv.service_id = s.id
      WHERE ${dateCondition}
      ORDER BY i.created_at DESC;
    `;

    const { rows } = await db.query(query);

    let tableRows = rows.map(r => {
      const isPaid = Number(r.balance_due) <= 0;
      const statusBadge = isPaid 
        ? `<span style="color: #10b981; background: #ecfdf5; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">Paid</span>`
        : `<span style="color: #f59e0b; background: #fffbeb; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">Pending</span>`;
        
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px;">${new Date(r.created_at).toLocaleDateString()}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 600; font-size: 14px;">${r.client_name || 'N/A'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-size: 14px;">${r.vehicle_name || 'N/A'} <span style="color: #9ca3af; font-size: 12px;">(${r.license_vin})</span></td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px;">${r.service_name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">Rs.${r.unit_price}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${statusBadge}</td>
        </tr>
      `;
    }).join('');

    if (rows.length === 0) {
      tableRows = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: #6b7280;">No services found for this timeframe.</td></tr>`;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Completed Services Report</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; margin: 0; color: #111827; }
          .header { text-align: center; margin-bottom: 40px; }
          .header h1 { margin: 0; font-size: 24px; color: #111827; }
          .header p { margin: 8px 0 0; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { text-align: left; padding: 12px; background-color: #f9fafb; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
          .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Completed Services Report</h1>
          <p>Timeframe: ${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} | Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Vehicle</th>
              <th>Service</th>
              <th>Price</th>
              <th>Payment</th>
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
