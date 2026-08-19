// Inline-CSS HTML email templates. All styling must stay inline.

const BRAND = {
  primary: '#2563eb',
  primaryLight: '#eff6ff',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  textMain: '#1f2937',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  bgMain: '#f9fafb',
  bgCard: '#ffffff'
};

const STATUS_BADGE = {
  pending: { label: 'Pending', bg: BRAND.warning + '22', color: BRAND.warning },
  confirmed: { label: 'Confirmed', bg: BRAND.primary + '22', color: BRAND.primary },
  converted: { label: 'Job Order Created', bg: BRAND.success + '22', color: BRAND.success },
  cancelled: { label: 'Cancelled', bg: BRAND.danger + '22', color: BRAND.danger }
};

function detailsRow(label, value) {
  if (!value) return '';
  return `
    <tr>
      <td style="padding:12px 0;color:${BRAND.textMuted};font-size:14px;font-weight:600;width:35%;border-bottom:1px solid ${BRAND.border};">${label}</td>
      <td style="padding:12px 0;color:${BRAND.textMain};font-size:14px;font-weight:700;border-bottom:1px solid ${BRAND.border};">${value}</td>
    </tr>`;
}

function renderBookingEmail({ booking, subject, headline, message, dateStr }) {
  const badge = STATUS_BADGE[booking.status] || STATUS_BADGE.pending;
  const vehicle = [booking.vehicle_brand, booking.vehicle_model].filter(Boolean).join(' ') || '—';
  const serviceName = booking.service_name || 'General Detailing';

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bgMain};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="background-color:${BRAND.bgMain};padding:40px 20px;">
    <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background-color:${BRAND.bgCard};border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};border-collapse:collapse;box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <tr>
        <td style="background-color:#000000;padding:30px;text-align:center;">
          <img src="https://raw.githubusercontent.com/kishore2003K/Detail-master/main/public/logo.png" alt="Detailing Masters" style="display:inline-block;width:200px;height:auto;margin:0;border:0;" />
        </td>
      </tr>
      <tr>
        <td style="padding:40px;">
          <h1 style="margin:0 0 16px;font-size:24px;color:${BRAND.textMain};font-weight:700;">${headline}</h1>
          <p style="margin:0 0 30px;font-size:16px;line-height:1.6;color:${BRAND.textMuted};">${message}</p>

          <div style="margin-bottom:30px;">
            <span style="display:inline-block;padding:6px 16px;border-radius:20px;background-color:${badge.bg};color:${badge.color};font-size:13px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">${badge.label}</span>
          </div>

          <table role="presentation" width="100%" style="border-collapse:collapse;margin-bottom:20px;">
            ${detailsRow('Customer', booking.full_name)}
            ${detailsRow('Vehicle', vehicle)}
            ${detailsRow('Service', serviceName)}
            ${detailsRow('Scheduled Date', dateStr)}
          </table>
          
          <p style="margin:40px 0 0;font-size:15px;line-height:1.6;color:${BRAND.textMuted};">If you have any questions or need to make changes, please contact us.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 40px;background-color:${BRAND.bgMain};text-align:center;border-top:1px solid ${BRAND.border};">
          <p style="margin:0 0 8px;font-size:13px;color:${BRAND.textMuted};font-weight:600;">Detailing Masters</p>
          <p style="margin:0;font-size:12px;color:${BRAND.textMuted};opacity:0.8;">This is an automated message. Please do not reply directly to this email.</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;

  return { subject, html };
}

// Generic version of the same shell, for emails not tied to a web_booking
// record (e.g. invoice-driven notifications like "ready for pickup").
function renderSimpleEmail({ subject, headline, message, rows = [] }) {
  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bgMain};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="background-color:${BRAND.bgMain};padding:40px 20px;">
    <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background-color:${BRAND.bgCard};border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};border-collapse:collapse;box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <tr>
        <td style="background-color:#000000;padding:30px;text-align:center;">
          <img src="https://raw.githubusercontent.com/kishore2003K/Detail-master/main/public/logo.png" alt="Detailing Masters" style="display:inline-block;width:200px;height:auto;margin:0;border:0;" />
        </td>
      </tr>
      <tr>
        <td style="padding:40px;">
          <h1 style="margin:0 0 16px;font-size:24px;color:${BRAND.textMain};font-weight:700;">${headline}</h1>
          <p style="margin:0 0 30px;font-size:16px;line-height:1.6;color:${BRAND.textMuted};">${message}</p>

          <table role="presentation" width="100%" style="border-collapse:collapse;margin-bottom:20px;">
            ${rows.map(([label, value]) => detailsRow(label, value)).join('')}
          </table>

          <p style="margin:40px 0 0;font-size:15px;line-height:1.6;color:${BRAND.textMuted};">If you have any questions, please contact us.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 40px;background-color:${BRAND.bgMain};text-align:center;border-top:1px solid ${BRAND.border};">
          <p style="margin:0 0 8px;font-size:13px;color:${BRAND.textMuted};font-weight:600;">Detailing Masters</p>
          <p style="margin:0;font-size:12px;color:${BRAND.textMuted};opacity:0.8;">This is an automated message. Please do not reply directly to this email.</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;

  return { subject, html };
}

module.exports = { renderBookingEmail, renderSimpleEmail };
