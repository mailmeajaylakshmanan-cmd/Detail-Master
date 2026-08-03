// Inline-CSS HTML email templates. All styling must stay inline — most
// clients (Gmail included) strip <style> blocks from transactional email.

const BRAND = {
  black: '#0a0a0a',
  card: '#111111',
  gold: '#FCDF4C',
  white: '#FFFFFF',
  textMain: '#f4f4f5',
  textMuted: '#a1a1aa',
  border: '#27272a'
};

const STATUS_BADGE = {
  pending: { label: 'Pending', bg: '#FCDF4C22', color: '#FCDF4C' },
  confirmed: { label: 'Confirmed', bg: '#1d4ed822', color: '#60a5fa' },
  converted: { label: 'Job Order Created', bg: '#04785722', color: '#34d399' },
  cancelled: { label: 'Cancelled', bg: '#be123c22', color: '#fb7185' }
};

function detailsRow(label, value) {
  if (!value) return '';
  return `
    <tr>
      <td style="padding:10px 0;color:${BRAND.textMuted};font-size:13px;font-weight:600;width:140px;border-bottom:1px solid ${BRAND.border};">${label}</td>
      <td style="padding:10px 0;color:${BRAND.textMain};font-size:14px;font-weight:700;border-bottom:1px solid ${BRAND.border};">${value}</td>
    </tr>`;
}

function renderBookingEmail({ booking, subject, headline, message, dateStr }) {
  const badge = STATUS_BADGE[booking.status] || STATUS_BADGE.pending;
  const vehicle = [booking.vehicle_brand, booking.vehicle_model].filter(Boolean).join(' ') || '—';

  const html = `
<div style="background:${BRAND.black};padding:40px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:${BRAND.card};border-radius:16px;overflow:hidden;border:1px solid ${BRAND.border};box-shadow:0 8px 32px rgba(0,0,0,0.5);">
    <tr>
      <td style="background:${BRAND.black};padding:32px;text-align:center;border-bottom:1px solid ${BRAND.border};">
        <img src="https://raw.githubusercontent.com/kishore2003K/Detail-master/main/public/logo.png" alt="Detailing Masters" width="180" style="display:inline-block;width:180px;height:auto;margin:0;border:0;" />
      </td>
    </tr>
    <tr>
      <td style="padding:40px 32px;">
        <h1 style="margin:0 0 12px;font-size:22px;color:${BRAND.gold};font-weight:700;">${headline}</h1>
        <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:${BRAND.textMuted};">${message}</p>

        <span style="display:inline-block;padding:6px 14px;border-radius:999px;background:${badge.bg};color:${badge.color};font-size:12px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:24px;border:1px solid ${badge.color}33;">${badge.label}</span>

        <table role="presentation" width="100%" style="border-collapse:collapse;">
          ${detailsRow('Customer', booking.full_name)}
          ${detailsRow('Vehicle', vehicle)}
          ${detailsRow('Service', booking.service_name)}
          ${detailsRow('Scheduled Date', dateStr)}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px;background:${BRAND.black};text-align:center;border-top:1px solid ${BRAND.border};">
        <p style="margin:0;font-size:12px;color:${BRAND.textMuted};opacity:0.7;">Detailing Masters &middot; This is an automated message.</p>
      </td>
    </tr>
  </table>
</div>`;

  return { subject, html };
}

module.exports = { renderBookingEmail };
