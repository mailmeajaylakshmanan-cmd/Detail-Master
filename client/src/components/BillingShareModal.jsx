import { useState, useMemo, useEffect } from 'react';
import { X, MessageCircle, Download, Copy, Check, Share2, Phone, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BillingShareModal({
  isOpen,
  onClose,
  customerName,
  phone,
  periodLabel = 'All Time',
  summary = {},
  invoices = [],
  isOrganization = false,
  onDownloadPDF,
  pdfBlob = null,
}) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const cleanPhone = useMemo(() => {
    return String(phone || '').replace(/\D/g, '');
  }, [phone]);

  const defaultMessage = useMemo(() => {
    const isCleared = (Number(summary.totalOutstanding) || 0) <= 0;
    const recent = invoices.slice(0, 5).map((inv, i) => {
      const veh = inv.vehicles?.[0]?.makeModel || inv.vehicles?.[0]?.licenseVin || 'Vehicle';
      const svc = (inv.services || []).slice(0, 2).join(', ') || 'Detailing';
      const status = (Number(inv.balance_due) || 0) <= 0 ? 'PAID' : `DUE: ₹${fmt(inv.balance_due)}`;
      return `${i + 1}. *${inv.invoice_number}* — ${veh} (${svc}) | ₹${fmt(inv.grand_total)} [${status}]`;
    }).join('\n');

    const moreText = invoices.length > 5 ? `\n_...and ${invoices.length - 5} more invoice(s) in the attached statement._` : '';

    return `✨ *DETAILING MASTERS* | *BILLING STATEMENT* ✨\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Dear *${customerName || (isOrganization ? 'Corporate Partner' : 'Valued Customer')}*,\n\n` +
      `Here is your ${isOrganization ? 'corporate' : 'overall'} billing statement from *Detailing Masters*.\n\n` +
      `📋 *ACCOUNT SUMMARY*\n` +
      `• *Period:* ${periodLabel}\n` +
      `• *Total Invoices:* ${summary.invoiceCount || invoices.length}\n` +
      (summary.totalVehicles ? `• *Vehicles Serviced:* ${summary.totalVehicles}\n` : '') +
      `• *Total Billed:* ₹${fmt(summary.totalBilled || summary.totalRevenue)}\n` +
      `• *Total Paid:* ₹${fmt(summary.totalPaid)}\n` +
      `• *Outstanding Balance:* ₹${fmt(summary.totalOutstanding)} ${isCleared ? '✅ (Fully Cleared)' : '⚠️ (Pending)'}\n\n` +
      (recent ? `📄 *RECENT INVOICES:*\n${recent}${moreText}\n\n` : '') +
      `📍 *STUDIO LOCATION*\n` +
      `Detailing Masters, Opp. KTM Bike Showroom,\n` +
      `Chankai, Marthandam, Tamil Nadu 629155\n` +
      `📞 *Helpdesk:* +91 9111977721, 9655633529\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Thank you for choosing Detailing Masters for your precision automotive care!_`;
  }, [customerName, isOrganization, periodLabel, summary, invoices]);

  const [messageText, setMessageText] = useState(defaultMessage);

  useEffect(() => {
    setMessageText(defaultMessage);
  }, [defaultMessage]);

  if (!isOpen) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      toast.success('Message copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }

  async function handleShareWhatsApp() {
    setSharing(true);
    try {
      // 1. If PDF blob is available, attempt native Web Share API with file
      if (pdfBlob && navigator.share && navigator.canShare?.({ files: [new File([pdfBlob], 'statement.pdf', { type: 'application/pdf' })] })) {
        const file = new File(
          [pdfBlob],
          `Detailing-Masters-Statement-${customerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
          { type: 'application/pdf' }
        );
        await navigator.share({
          title: `Billing Statement - ${customerName}`,
          text: messageText,
          files: [file],
        });
        toast.success('Shared successfully!');
        onClose();
        return;
      }

      // 2. Otherwise: Download PDF to user's device and open WhatsApp with formatted message
      if (onDownloadPDF) {
        await onDownloadPDF();
      }

      const formattedNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const url = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(messageText)}`;
      window.open(url, '_blank');
      toast.success('Statement downloaded! Opening WhatsApp to send...', { duration: 4000 });
      onClose();
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share error:', err);
        toast.error('Could not share via WhatsApp');
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-black p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#B38728] flex items-center justify-center text-black font-black shadow-md">
              <Share2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                Share Billing Statement
              </h3>
              <p className="text-[11px] text-gray-300 font-medium">
                {customerName} {phone ? `• ${phone}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Summary Badges */}
          <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Billed</div>
              <div className="text-sm font-black text-gray-900 mt-0.5">₹{fmt(summary.totalBilled || summary.totalRevenue)}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Paid</div>
              <div className="text-sm font-black text-emerald-600 mt-0.5">₹{fmt(summary.totalPaid)}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Balance Due</div>
              <div className={`text-sm font-black mt-0.5 ${(Number(summary.totalOutstanding) || 0) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                ₹{fmt(summary.totalOutstanding)}
              </div>
            </div>
          </div>

          {/* WhatsApp Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                <MessageCircle size={14} className="text-emerald-600" /> WhatsApp Message Preview
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1 hover:underline"
              >
                {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy Text'}
              </button>
            </div>
            <textarea
              rows={8}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full text-[12px] font-mono leading-relaxed p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Tip: You can edit this text before sending. The PDF statement will be generated and attached.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-2">
          {onDownloadPDF && (
            <button
              type="button"
              onClick={onDownloadPDF}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <Download size={14} /> Download PDF Only
            </button>
          )}

          <button
            type="button"
            onClick={handleShareWhatsApp}
            disabled={sharing}
            className="w-full sm:flex-1 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.98] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
          >
            <MessageCircle size={16} />
            {sharing ? 'Preparing Statement...' : cleanPhone ? `Send to WhatsApp (${cleanPhone.slice(-10)})` : 'Open in WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
}

