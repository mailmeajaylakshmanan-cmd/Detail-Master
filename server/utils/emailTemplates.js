// Inline-CSS HTML email templates. All styling must stay inline — most
// clients (Gmail included) strip <style> blocks from transactional email.

const BRAND = {
  red: '#D91A3A',
  darkred: '#801426',
  gold: '#FCDF4C',
  white: '#FFFFFF',
  ink: '#2d2828'
};

const STATUS_BADGE = {
  pending: { label: 'Pending', bg: '#FCDF4C33', color: '#8a6d00' },
  confirmed: { label: 'Confirmed', bg: '#e0edff', color: '#1d4ed8' },
  converted: { label: 'Job Order Created', bg: '#d1fae5', color: '#047857' },
  cancelled: { label: 'Cancelled', bg: '#fde2e4', color: '#be123c' }
};

function detailsRow(label, value) {
  if (!value) return '';
  return `
    <tr>
      <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;width:140px;">${label}</td>
      <td style="padding:8px 0;color:${BRAND.ink};font-size:14px;font-weight:700;">${value}</td>
    </tr>`;
}

function renderBookingEmail({ booking, subject, headline, message, dateStr }) {
  const badge = STATUS_BADGE[booking.status] || STATUS_BADGE.pending;
  const vehicle = [booking.vehicle_brand, booking.vehicle_model].filter(Boolean).join(' ') || '—';

  const html = `
<div style="background:#f3f4f6;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:${BRAND.white};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <tr>
      <td style="background:linear-gradient(135deg, ${BRAND.darkred}, ${BRAND.red});padding:28px 32px;text-align:center;">
        <span style="color:${BRAND.gold};font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">Detailing Masters</span>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <h1 style="margin:0 0 8px;font-size:20px;color:${BRAND.ink};">${headline}</h1>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#4b5563;">${message}</p>

        <span style="display:inline-block;padding:6px 14px;border-radius:999px;background:${badge.bg};color:${badge.color};font-size:12px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:20px;">${badge.label}</span>

        <table role="presentation" width="100%" style="background:#f9fafb;border-radius:12px;padding:16px 20px;border-collapse:collapse;">
          ${detailsRow('Customer', booking.full_name)}
          ${detailsRow('Vehicle', vehicle)}
          ${detailsRow('Service', booking.service_name)}
          ${detailsRow('Scheduled Date', dateStr)}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">Detailing Masters &middot; This is an automated message, please don't reply directly.</p>
      </td>
    </tr>
  </table>
</div>`;

  return { subject, html };
}

module.exports = { renderBookingEmail };
