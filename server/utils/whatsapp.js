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
      message = `✨ *DETAILING MASTERS* | *APPOINTMENT REQUEST* ✨\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Dear *${booking.full_name || 'Valued Customer'}*,\n\n` +
        `Thank you for contacting *Detailing Masters*. We have successfully received your service booking request.\n\n` +
        `📋 *BOOKING SUMMARY*\n` +
        `• *Vehicle:* ${vehicleStr}\n` +
        `• *Services:* ${serviceNames}\n` +
        `• *Requested Date:* ${dateStr}\n` +
        `• *Preferred Slot:* ${booking.preferred_time_period || 'Standard / Flexible'}\n` +
        `• *Status:* ⏳ Pending Confirmation\n\n` +
        `Our detailing manager will review bay availability and confirm your check-in time slot shortly.\n\n` +
        `📍 *Studio Location:* Opp. KTM Showroom, Chankai, Marthandam\n` +
        `📞 *Helpline:* +91 99941 22652\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `_Precision Automotive Detailing & Ceramic Coatings_`;
      break;

    case 'confirmed':
      message = `✨ *DETAILING MASTERS* | *BOOKING CONFIRMATION* ✨\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Dear *${booking.full_name || 'Valued Customer'}*,\n\n` +
        `Thank you for choosing *Detailing Masters*. We are pleased to confirm your vehicle detailing appointment!\n\n` +
        `📋 *APPOINTMENT SUMMARY*\n` +
        `• *Vehicle:* ${vehicleStr}\n` +
        `• *Services:* ${serviceNames}\n` +
        `• *Date:* ${dateStr}\n` +
        `• *Allocated Slot:* ${booking.allocated_time || booking.preferred_time_period || 'As scheduled'}\n` +
        `• *Status:* ✅ Confirmed\n\n` +
        `📍 *STUDIO LOCATION*\n` +
        `Detailing Masters, Opposite KTM Bike Showroom,\n` +
        `Chankai, Marthandam, Tamil Nadu 629155\n` +
        `📞 *Helpdesk:* +91 99941 22652\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `_We look forward to delivering the ultimate shine and protection for your machine!_`;
      break;

    case 'rescheduled':
      message = `🗓️ *DETAILING MASTERS* | *APPOINTMENT RESCHEDULED*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Dear *${booking.full_name || 'Valued Customer'}*,\n\n` +
        `Your detailing appointment for *${vehicleStr}* has been rescheduled:\n\n` +
        `📅 *New Date:* ${dateStr}\n` +
        `🛠️ *Services:* ${serviceNames}\n` +
        `⏰ *Time Slot:* ${booking.allocated_time || 'Will be confirmed shortly'}\n\n` +
        `📍 *Studio Location:* Opp. KTM Showroom, Chankai, Marthandam\n` +
        `📞 *Support Helpline:* +91 99941 22652\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `_If you need any further adjustments, feel free to reply directly to this chat._`;
      break;

    case 'cancelled':
      message = `❌ *DETAILING MASTERS* | *BOOKING CANCELLATION*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Dear *${booking.full_name || 'Valued Customer'}*,\n\n` +
        `Your detailing appointment for *${vehicleStr}* scheduled for *${dateStr}* has been cancelled.\n` +
        (booking.cancel_reason ? `• *Reason:* ${booking.cancel_reason}\n\n` : `\n`) +
        `If you would like to reschedule or explore other slots, please visit *detailingmasters.in* or contact us at *+91 99941 22652*.\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `_Detailing Masters · Precision Automotive Refinishing_`;
      break;

    case 'converted':
      message = `📋 *DETAILING MASTERS* | *JOB ORDER CREATED*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Dear *${booking.full_name || 'Valued Customer'}*,\n\n` +
        `Your vehicle *${vehicleStr}* is checked in and work has started on:\n` +
        `🛠️ *Services:* ${serviceNames}\n\n` +
        `Our certified specialists are treating your vehicle. We will notify you as soon as it is ready for pickup!\n\n` +
        `📞 *Helpdesk:* +91 99941 22652\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `_Detailing Masters · Ceramic Coatings & Paint Protection_`;
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
