const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// event: 'created' | 'rescheduled' | 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
const MESSAGES = {
  created: {
    subject: 'Your Detailing Masters appointment request was received',
    body: (b, dateStr) => `Hi ${b.customer_name}, we received your booking request for ${dateStr}. We'll confirm shortly.`
  },
  rescheduled: {
    subject: 'Your Detailing Masters appointment has been rescheduled',
    body: (b, dateStr) => `Hi ${b.customer_name}, your appointment has been rescheduled to ${dateStr}.`
  },
  Pending: {
    subject: 'Your Detailing Masters appointment is pending',
    body: (b, dateStr) => `Hi ${b.customer_name}, your appointment for ${dateStr} is pending confirmation.`
  },
  Confirmed: {
    subject: 'Your Detailing Masters appointment is confirmed',
    body: (b, dateStr) => `Hi ${b.customer_name}, your appointment for ${dateStr} is confirmed. See you then!`
  },
  Completed: {
    subject: 'Thank you for choosing Detailing Masters',
    body: (b) => `Hi ${b.customer_name}, your service is complete. Thank you for choosing Detailing Masters!`
  },
  Cancelled: {
    subject: 'Your Detailing Masters appointment has been cancelled',
    body: (b, dateStr) => `Hi ${b.customer_name}, your appointment for ${dateStr} has been cancelled. Contact us to rebook anytime.`
  }
};

async function sendScheduleEmail(booking, event = 'created') {
  if (!booking.customer_email) return null;

  const dateStr = booking.preferred_date
    ? new Date(booking.preferred_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'TBD';

  const template = MESSAGES[event] || MESSAGES.created;

  const info = await transporter.sendMail({
    from: '"Detailing Masters" <no-reply@detailingmasters.in>',
    to: booking.customer_email,
    subject: template.subject,
    text: template.body(booking, dateStr)
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log(`[mailer] "${template.subject}" -> ${booking.customer_email} | preview: ${previewUrl}`);
  else console.log(`[mailer] "${template.subject}" -> ${booking.customer_email} | sent`);

  return info;
}

module.exports = { sendScheduleEmail };
