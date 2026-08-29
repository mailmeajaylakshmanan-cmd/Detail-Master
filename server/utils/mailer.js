const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const { renderBookingEmail, renderSimpleEmail } = require('./emailTemplates');

const smtpPort = Number(process.env.SMTP_PORT) || 465;
const isSecure = smtpPort === 465;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: smtpPort,
  secure: isSecure,
  pool: true, // Reuse persistent SMTP socket connections for ultra-fast dispatch
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 10,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 10000
});

// Warm up the SMTP connection pool on startup
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter.verify((err) => {
    if (err) {
      console.error('[mailer] SMTP verify error on initialization:', err.message);
    } else {
      console.log('[mailer] SMTP connection pool is ready and verified on port ' + smtpPort);
    }
  });
}

// Helper to get invoice shield logo CID attachment (ultra-lightweight web asset)
function getLogoAttachments() {
  const possiblePaths = [
    path.join(__dirname, '../assets/email-logo.png'),
    path.join(__dirname, '../../client/src/assets/brand_logo.png'),
    path.join(__dirname, '../assets/brand_logo.png'),
    path.join(process.cwd(), 'server/assets/email-logo.png'),
    path.join(process.cwd(), 'client/src/assets/brand_logo.png')
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        return [
          {
            filename: 'brand-logo.png',
            path: p,
            cid: 'invoiceBrandLogo'
          }
        ];
      }
    } catch (e) {}
  }
  return [];
}

// event: 'created' | 'rescheduled' | 'pending' | 'confirmed' | 'converted' | 'cancelled'
const MESSAGES = {
  created: {
    subject: 'Your Detailing Masters appointment request is received (Pending Confirmation)',
    headline: 'Booking Request Received',
    body: (b, dateStr) => `Dear ${b.full_name}, thank you for choosing Detailing Masters. Your booking request for ${dateStr} has been successfully received and is currently pending confirmation. Our detailing team will review your request and confirm your time slot shortly.`
  },
  rescheduled: {
    subject: 'Your Detailing Masters appointment has been rescheduled',
    headline: 'Your appointment was rescheduled',
    body: (b, dateStr) => `Hi ${b.full_name}, your Detailing Masters appointment has been rescheduled to ${dateStr}.${b.allocated_time ? ` Allocated Slot: ${b.allocated_time}.` : ''}`
  },
  pending: {
    subject: 'Your Detailing Masters appointment is pending confirmation',
    headline: 'Appointment pending confirmation',
    body: (b, dateStr) => `Hi ${b.full_name}, your appointment for ${dateStr} is pending confirmation. We will notify you once confirmed.`
  },
  confirmed: {
    subject: 'Your Detailing Masters appointment is confirmed!',
    headline: 'Your appointment is confirmed',
    body: (b, dateStr) => `Hi ${b.full_name}, your appointment for ${dateStr}${b.allocated_time ? ` at ${b.allocated_time}` : ''} is confirmed. We look forward to detailing your vehicle!`
  },
  converted: {
    subject: 'Your Detailing Masters appointment is confirmed — In Service',
    headline: 'Booking Confirmed',
    body: (b) => `Dear ${b.full_name}, thank you for choosing Detailing Masters. Your booking is confirmed and your vehicle is checked in for detailing. Our certified specialists are now treating your car!`
  },
  completed: {
    subject: 'Your Detailing Masters detailing service is complete!',
    headline: 'Service Completed',
    body: (b) => `Dear ${b.full_name}, great news! All scheduled detailing services on your vehicle are complete. Thank you for choosing Detailing Masters!`
  },
  cancelled: {
    subject: 'Your Detailing Masters appointment has been cancelled',
    headline: 'Appointment Cancelled',
    body: (b, dateStr) => `Hi ${b.full_name}, your appointment for ${dateStr} has been cancelled.${b.cancel_reason ? ` Reason: ${b.cancel_reason}.` : ''} Please contact us anytime if you would like to rebook.`
  }
};

async function sendScheduleEmail(booking, event = 'created') {
  const email = (booking?.email || '').trim();
  if (!email) {
    console.log(`[mailer] Skipping email: No recipient email provided for booking #${booking?.booking_id || ''}`);
    return null;
  }

  const startTime = Date.now();
  try {
    const dateStr = booking.preferred_date
      ? new Date(booking.preferred_date).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      : 'TBD';

    const template = MESSAGES[event] || MESSAGES.created;
    const message = template.body(booking, dateStr);
    const { html } = renderBookingEmail({
      booking,
      dateStr,
      message,
      subject: template.subject,
      headline: template.headline
    });

    const info = await transporter.sendMail({
      from: `"Detailing Masters" <${process.env.SMTP_USER}>`,
      replyTo: process.env.SMTP_USER,
      to: email,
      subject: template.subject,
      text: message,
      html,
      attachments: getLogoAttachments()
    });

    const elapsed = Date.now() - startTime;
    console.log(`[mailer] Successfully sent "${template.subject}" -> ${email} in ${elapsed}ms | MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[mailer] FAILED sending "${event}" email to ${email} after ${elapsed}ms:`, error.message);
    return null;
  }
}

// Fired when all services on an invoice are marked completed
async function sendReadyForPickupEmail({ toEmail, customerName, vehicleLabel, invoiceNumber }) {
  const email = (toEmail || '').trim();
  if (!email) return null;

  const startTime = Date.now();
  try {
    const subject = 'Your vehicle is ready for pickup — Detailing Masters';
    const message = `Hi ${customerName || 'there'}, great news! All detailing services on your vehicle (${vehicleLabel}) are complete and it is ready for pickup.`;
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
      to: email,
      subject,
      text: message,
      html,
      attachments: getLogoAttachments()
    });

    const elapsed = Date.now() - startTime;
    console.log(`[mailer] Successfully sent ready-for-pickup email -> ${email} in ${elapsed}ms | MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[mailer] FAILED sending ready-for-pickup email to ${email} after ${elapsed}ms:`, error.message);
    return null;
  }
}

module.exports = { transporter, sendScheduleEmail, sendReadyForPickupEmail };
