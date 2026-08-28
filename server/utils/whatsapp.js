const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+17372508034';

let client = null;
function getClient() {
  if (!client && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

/**
 * Format phone number to E.164 WhatsApp format (defaulting to India +91 if 10 digits)
 */
function formatWhatsAppNumber(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  const withCountryCode = digits.length === 10 ? `91${digits}` : digits;
  return `whatsapp:+${withCountryCode}`;
}

/**
 * Low-level sender
 */
async function sendWhatsApp(toPhone, body) {
  const twilioClient = getClient();
  if (!twilioClient) {
    console.warn('[WhatsApp] Twilio credentials not configured in environment variables. Skipping message.');
    return null;
  }

  const to = formatWhatsAppNumber(toPhone);
  if (!to) {
    console.warn(`[WhatsApp] Invalid phone number: "${toPhone}". Skipping.`);
    return null;
  }

  try {
    const message = await twilioClient.messages.create({
      from: fromNumber,
      to,
      body
    });
    console.log(`[WhatsApp] Sent message to ${to} (SID: ${message.sid})`);
    return message;
  } catch (error) {
    console.error(`[WhatsApp] Failed to send to ${to}:`, error.message);
    return null;
  }
}

/**
 * Booking Lifecycle WhatsApp Notifications
 * eventType: 'created' | 'confirmed' | 'rescheduled' | 'cancelled' | 'converted'
 */
async function sendBookingWhatsAppNotification(booking, servicesList = [], eventType = 'created') {
  if (!booking || !booking.phone) return null;

  const dateStr = booking.preferred_date
    ? new Date(booking.preferred_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'TBD';

  let serviceNames = '';
  if (Array.isArray(servicesList) && servicesList.length > 0) {
    serviceNames = servicesList.map(s => (typeof s === 'object' ? s.service_name || s.name : s)).filter(Boolean).join(', ');
  }
  if (!serviceNames) {
    serviceNames = booking.service_name || 'General Detailing Service';
  }

  const vehicleStr = `${booking.vehicle_brand || ''} ${booking.vehicle_model || ''}`.trim() || 'Vehicle';

  let message = '';

  switch (eventType) {
    case 'created':
      message = `✨ *Detailing Masters - Appointment Request Received* ✨\n\n` +
        `Hi *${booking.full_name || 'Customer'}*,\n` +
        `Thank you for booking with us! We have received your appointment request.\n\n` +
        `🚗 *Vehicle:* ${vehicleStr}\n` +
        `🛠️ *Services:* ${serviceNames}\n` +
        `📅 *Date:* ${dateStr}\n` +
        `⏰ *Requested Slot:* ${booking.preferred_time_period || 'Standard'}\n` +
        `📌 *Status:* Pending Confirmation\n\n` +
        `Our team will review your slot and send you a confirmation message shortly.`;
      break;

    case 'confirmed':
      message = `✅ *Detailing Masters - Booking Confirmed!* ✅\n\n` +
        `Hi *${booking.full_name || 'Customer'}*,\n` +
        `Your appointment is now *CONFIRMED*!\n\n` +
        `🚗 *Vehicle:* ${vehicleStr}\n` +
        `🛠️ *Services:* ${serviceNames}\n` +
        `📅 *Date:* ${dateStr}\n` +
        `⏰ *Allocated Time:* ${booking.allocated_time || booking.preferred_time_period || 'As scheduled'}\n\n` +
        `📍 *Location:* Opposite KTM Bike Showroom, Chankai, Marthandam\n` +
        `📞 *Contact:* +91 9994122652\n\n` +
        `We look forward to giving your car the master shine!`;
      break;

    case 'rescheduled':
      message = `🗓️ *Detailing Masters - Appointment Rescheduled*\n\n` +
        `Hi *${booking.full_name || 'Customer'}*,\n` +
        `Your appointment has been rescheduled to *${dateStr}*.\n\n` +
        `🚗 *Vehicle:* ${vehicleStr}\n` +
        `🛠️ *Services:* ${serviceNames}\n` +
        `⏰ *Time Slot:* ${booking.allocated_time || 'Will be updated shortly'}\n\n` +
        `Feel free to reach out to us at +91 9994122652 if you need any adjustments.`;
      break;

    case 'cancelled':
      message = `❌ *Detailing Masters - Appointment Cancelled*\n\n` +
        `Hi *${booking.full_name || 'Customer'}*,\n` +
        `Your booking for *${dateStr}* has been cancelled.\n` +
        (booking.cancel_reason ? `Reason: ${booking.cancel_reason}\n\n` : `\n`) +
        `Feel free to rebook anytime at detailingmasters.in or call +91 9994122652.`;
      break;

    case 'converted':
      message = `📋 *Detailing Masters - Job Order Created*\n\n` +
        `Hi *${booking.full_name || 'Customer'}*,\n` +
        `Your vehicle *${vehicleStr}* is checked in and work has started on:\n` +
        `🛠️ ${serviceNames}\n\n` +
        `We will notify you as soon as your vehicle is ready for pickup!`;
      break;

    default:
      return null;
  }

  return sendWhatsApp(booking.phone, message);
}

/**
 * Ready for Pickup Notification
 */
async function sendReadyForPickupWhatsApp({ toPhone, customerName, vehicleLabel, invoiceNumber }) {
  if (!toPhone) return null;

  const message = `🎉 *Detailing Masters - Your Vehicle is Ready!* 🎉\n\n` +
    `Hi *${customerName || 'there'}*,\n` +
    `Great news! All detailing services for your *${vehicleLabel || 'vehicle'}* are complete and it is looking pristine!\n\n` +
    `🧾 *Invoice #:* ${invoiceNumber || 'N/A'}\n` +
    `📍 *Pickup Location:* Opposite KTM Bike Showroom, Chankai, Marthandam\n` +
    `📞 *Helpdesk:* +91 9994122652\n\n` +
    `Thank you for trusting Detailing Masters!`;

  return sendWhatsApp(toPhone, message);
}

module.exports = {
  sendWhatsApp,
  sendBookingWhatsAppNotification,
  sendReadyForPickupWhatsApp,
  formatWhatsAppNumber
};
