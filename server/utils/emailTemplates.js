// Inline-CSS HTML email templates for Detailing Masters.
// Luxury Dark & Gold aesthetic featuring the Invoice View Shield Brand Logo.

const BRAND = {
  bgOuter: '#0a0a0a',
  cardBg: '#121214',
  headerBg: '#050505',
  gold: '#F6CB59',
  goldGradient: 'linear-gradient(to right, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)',
  white: '#FFFFFF',
  textMain: '#F4F4F5',
  textMuted: '#A1A1AA',
  textDim: '#71717A',
  border: '#27272A',
  borderLight: '#3F3F46'
};

const STATUS_BADGE = {
  pending: { label: 'Pending Confirmation', bg: '#F6CB5920', color: '#F6CB59', border: '#F6CB5960' },
  created: { label: 'Request Received', bg: '#F6CB5920', color: '#F6CB59', border: '#F6CB5960' },
  confirmed: { label: 'Booking Confirmed', bg: '#3B82F620', color: '#60A5FA', border: '#3B82F660' },
  converted: { label: 'Booking Confirmed', bg: '#10B98120', color: '#34D399', border: '#10B98160' },
  completed: { label: 'Service Completed', bg: '#10B98120', color: '#34D399', border: '#10B98160' },
  cancelled: { label: 'Cancelled', bg: '#EF444420', color: '#F87171', border: '#EF444460' },
  rescheduled: { label: 'Rescheduled', bg: '#8B5CF620', color: '#A78BFA', border: '#8B5CF660' }
};

function detailsRow(label, value) {
  if (!value) return '';
  return `
    <tr>
      <td style="padding:12px 0;color:${BRAND.textMuted};font-size:12px;font-weight:700;width:35%;border-bottom:1px solid ${BRAND.border};text-transform:uppercase;letter-spacing:0.8px;">${label}</td>
      <td style="padding:12px 0;color:${BRAND.textMain};font-size:14px;font-weight:700;border-bottom:1px solid ${BRAND.border};">${value}</td>
    </tr>`;
}

function renderHeader() {
  return `
    <tr>
      <td style="background-color:${BRAND.headerBg};padding:28px 24px;text-align:center;border-bottom:1px solid ${BRAND.border};">
        <table role="presentation" style="margin:0 auto;border-collapse:collapse;">
          <tr>
            <td style="vertical-align:middle;padding-right:16px;">
              <img src="cid:invoiceBrandLogo" alt="Detailing Masters Shield Logo" width="70" height="85" style="display:block;width:70px;height:auto;object-fit:contain;margin:0;border:0;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.8));" />
            </td>
            <td style="vertical-align:middle;text-align:left;border-left:1px solid ${BRAND.border};padding-left:16px;">
              <div style="font-family:'Cinzel','Georgia',serif;font-size:22px;font-weight:800;letter-spacing:3px;line-height:1.1;color:${BRAND.gold};text-transform:uppercase;">
                DETAILING
              </div>
              <div style="font-family:'Cinzel','Georgia',serif;font-size:22px;font-weight:800;letter-spacing:3px;line-height:1.1;color:${BRAND.white};text-transform:uppercase;">
                MASTERS
              </div>
              <div style="font-size:9px;font-weight:700;letter-spacing:1.5px;color:${BRAND.textDim};text-transform:uppercase;margin-top:4px;">
                AUTOMOTIVE REFINISHING
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function renderBookingEmail({ booking, subject, headline, message, dateStr }) {
  const badge = STATUS_BADGE[booking.status] || STATUS_BADGE.pending;
  const vehicle = [booking.vehicle_brand, booking.vehicle_model].filter(Boolean).join(' ') || '—';
  const serviceName = booking.service_name || 'General Detailing';
  const timeSlot = booking.allocated_time || booking.preferred_time_period || null;

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bgOuter};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="background-color:${BRAND.bgOuter};padding:40px 16px;min-height:100%;">
    <table role="presentation" width="100%" style="max-width:540px;margin:0 auto;background-color:${BRAND.cardBg};border-radius:18px;overflow:hidden;border:1px solid ${BRAND.border};box-shadow:0 12px 40px rgba(0,0,0,0.8);border-collapse:collapse;">
      
      <!-- Brand Header with Invoice Logo -->
      ${renderHeader()}

      <!-- Main Body -->
      <tr>
        <td style="padding:36px 32px;">
          
          <!-- Status Badge -->
          <div style="margin-bottom:20px;">
            <span style="display:inline-block;padding:6px 14px;border-radius:999px;background-color:${badge.bg};color:${badge.color};font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;border:1px solid ${badge.border};">
              ● ${badge.label}
            </span>
          </div>

          <!-- Headline & Message -->
          <h1 style="margin:0 0 12px;font-size:22px;color:${BRAND.gold};font-weight:800;letter-spacing:-0.3px;line-height:1.3;">${headline}</h1>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:${BRAND.textMuted};">${message}</p>

          <!-- Details Card -->
          <div style="background-color:${BRAND.bgOuter};border-radius:14px;padding:18px 22px;border:1px solid ${BRAND.border};margin-bottom:28px;">
            <table role="presentation" width="100%" style="border-collapse:collapse;">
              ${detailsRow('Client Name', booking.full_name)}
              ${detailsRow('Phone', booking.phone)}
              ${detailsRow('Vehicle', vehicle)}
              ${detailsRow('Service', `<span style="color:${BRAND.gold};">${serviceName}</span>`)}
              ${detailsRow('Date', dateStr)}
              ${timeSlot ? detailsRow('Time Slot', timeSlot) : ''}
            </table>
          </div>

          <!-- Help Info -->
          <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.textDim};">
            Need to reschedule or have a question? Contact our detailing studio anytime.
          </p>

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:22px 32px;background-color:${BRAND.headerBg};text-align:center;border-top:1px solid ${BRAND.border};">
          <p style="margin:0 0 4px;font-size:12px;color:${BRAND.gold};font-weight:700;letter-spacing:1px;text-transform:uppercase;">Detailing Masters</p>
          <p style="margin:0;font-size:11px;color:${BRAND.textDim};">Premium Automotive Detailing & Ceramic Coatings &middot; Automated Notification</p>
        </td>
      </tr>

    </table>
  </div>
</body>
</html>`;

  return { subject, html };
}

function renderSimpleEmail({ subject, headline, message, rows = [] }) {
  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bgOuter};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="background-color:${BRAND.bgOuter};padding:40px 16px;min-height:100%;">
    <table role="presentation" width="100%" style="max-width:540px;margin:0 auto;background-color:${BRAND.cardBg};border-radius:18px;overflow:hidden;border:1px solid ${BRAND.border};box-shadow:0 12px 40px rgba(0,0,0,0.8);border-collapse:collapse;">
      
      <!-- Brand Header with Invoice Logo -->
      ${renderHeader()}

      <!-- Main Body -->
      <tr>
        <td style="padding:36px 32px;">
          
          <h1 style="margin:0 0 12px;font-size:22px;color:${BRAND.gold};font-weight:800;letter-spacing:-0.3px;line-height:1.3;">${headline}</h1>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:${BRAND.textMuted};">${message}</p>

          ${rows && rows.length > 0 ? `
          <div style="background-color:${BRAND.bgOuter};border-radius:14px;padding:18px 22px;border:1px solid ${BRAND.border};margin-bottom:28px;">
            <table role="presentation" width="100%" style="border-collapse:collapse;">
              ${rows.map(([label, value]) => detailsRow(label, value)).join('')}
            </table>
          </div>
          ` : ''}

          <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.textDim};">
            If you have any questions, please contact our team.
          </p>

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:22px 32px;background-color:${BRAND.headerBg};text-align:center;border-top:1px solid ${BRAND.border};">
          <p style="margin:0 0 4px;font-size:12px;color:${BRAND.gold};font-weight:700;letter-spacing:1px;text-transform:uppercase;">Detailing Masters</p>
          <p style="margin:0;font-size:11px;color:${BRAND.textDim};">Premium Automotive Detailing &middot; Automated Notification</p>
        </td>
      </tr>

    </table>
  </div>
</body>
</html>`;

  return { subject, html };
}

module.exports = { renderBookingEmail, renderSimpleEmail };
