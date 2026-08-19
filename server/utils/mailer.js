const nodemailer = require('nodemailer');
const { renderBookingEmail, renderSimpleEmail } = require('./emailTemplates');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// event: 'created' | 'rescheduled' | 'pending' | 'confirmed' | 'converted' | 'cancelled'
const MESSAGES = {
  created: {
    subject: 'Your Detailing Masters appointment request is pending',
    headline: 'Booking Request Pending',
    body: (b, dateStr) => `Dear ${b.full_name}, thank you for choosing Detailing Masters. Your booking request for ${dateStr} has been successfully received and is currently pending confirmation. Our team will review your request and contact you shortly.`
  },
  rescheduled: {
    subject: 'Your Detailing Masters appointment has been rescheduled',
    headline: 'Your appointment was rescheduled',
    body: (b, dateStr) => `Hi ${b.full_name}, your appointment has been rescheduled to ${dateStr}.`
  },
  pending: {
    subject: 'Your Detailing Masters appointment is pending',
    headline: 'Appointment pending confirmation',
    body: (b, dateStr) => `Hi ${b.full_name}, your appointment for ${dateStr} is pending confirmation.`
  },
  confirmed: {
    subject: 'Your Detailing Masters appointment is confirmed',
    headline: 'Your appointment is confirmed',
    body: (b, dateStr) => `Hi ${b.full_name}, your appointment for ${dateStr} is confirmed. See you then!`
  },
  converted: {
    subject: 'Your Detailing Masters job order has been created',
    headline: 'Job order created',
    body: (b) => `Hi ${b.full_name}, your booking has been converted into a job order. Thank you for choosing Detailing Masters!`
  },
  cancelled: {
    subject: 'Your Detailing Masters appointment has been cancelled',
    headline: 'Appointment cancelled',
    body: (b, dateStr) => `Hi ${b.full_name}, your appointment for ${dateStr} has been cancelled. Contact us to rebook anytime.`
  }
};

async function sendScheduleEmail(booking, event = 'created') {
  if (!booking.email) return null;

  const dateStr = booking.preferred_date
    ? new Date(booking.preferred_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })
    : 'TBD';

  const template = MESSAGES[event] || MESSAGES.created;
  const message = template.body(booking, dateStr);
  const { html } = renderBookingEmail({
    booking, dateStr, message,
    subject: template.subject,
    headline: template.headline
  });

  const info = await transporter.sendMail({
    from: `"Detailing Masters" <${process.env.SMTP_USER}>`,
    replyTo: process.env.SMTP_USER,
    to: booking.email,
    subject: template.subject,
    text: message,
    html
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log(`[mailer] "${template.subject}" -> ${booking.email} | preview: ${previewUrl}`);
  else console.log(`[mailer] "${template.subject}" -> ${booking.email} | sent`);

  return info;
}

// Fired once, when every service line item on an invoice has been marked
// completed (see invoices.service_completed_at).
async function sendReadyForPickupEmail({ toEmail, customerName, vehicleLabel, invoiceNumber }) {
  if (!toEmail) return null;

  const subject = 'Your vehicle is ready for pickup — Detailing Masters';
  const message = `Hi ${customerName || 'there'}, great news — all services on your vehicle are complete and it's ready for pickup.`;
  const { html } = renderSimpleEmail({
    subject,
    headline: 'Your vehicle is ready!',
    message,
    rows: [
      ['Vehicle', vehicleLabel],
      ['Invoice', invoiceNumber],
    ],
  });

  const info = await transporter.sendMail({
    from: `"Detailing Masters" <${process.env.SMTP_USER}>`,
    replyTo: process.env.SMTP_USER,
    to: toEmail,
    subject,
    text: message,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log(`[mailer] "${subject}" -> ${toEmail} | ${previewUrl || 'sent'}`);
  return info;
}

module.exports = { sendScheduleEmail, sendReadyForPickupEmail };
