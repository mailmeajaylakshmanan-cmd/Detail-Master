import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe, Search, Calendar, Car, Phone, Clock, Mail,
  CheckCircle2, XCircle, CheckSquare, PenSquare, Check, X as XIcon, Trash2,
  MessageSquare, Sparkles, User, FileText, ChevronDown, ChevronUp, RefreshCw, AlertTriangle,
  ExternalLink, ArrowRight, ShieldCheck, Tag
} from 'lucide-react';
import api from '../api/axios';
import { usePermissions } from '../hooks/usePermissions.js';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

// ── WhatsApp helpers ──
function toE164(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.startsWith('91') ? digits : `91${digits}`;
}

function waLink(phone, message) {
  return `https://wa.me/${toE164(phone)}?text=${encodeURIComponent(message)}`;
}

// Opens a blank tab synchronously on click so popup blockers don't kill it
function openWhatsAppLazy() {
  return window.open('', '_blank');
}

function formatDate(d) {
  if (!d) return 'TBD';
  try {
    return format(parseISO(d), 'MMM d, yyyy');
  } catch {
    return d;
  }
}

// ── Professional WhatsApp message formatters ──
function getVehicleLabel(b) {
  return [b.vehicle_brand, b.vehicle_model].filter(Boolean).join(' ') || 'Your Vehicle';
}

function buildWAConfirmation(b, time) {
  const vehicle = getVehicleLabel(b);
  const dateFormatted = formatDate(b.preferred_date);
  const services = b.service_name || 'General Detailing';

  return `✨ *DETAILING MASTERS* | *APPOINTMENT CONFIRMATION* ✨\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Dear *${b.full_name || 'Valued Customer'}*,\n\n` +
    `Thank you for choosing *Detailing Masters*. We are pleased to confirm your vehicle detailing appointment!\n\n` +
    `📋 *APPOINTMENT SUMMARY*\n` +
    `• *Vehicle:* ${vehicle}\n` +
    `• *Services:* ${services}\n` +
    `• *Date:* ${dateFormatted}\n` +
    `• *Allocated Slot:* ${time}\n` +
    `• *Status:* ✅ Confirmed\n\n` +
    `📍 *STUDIO LOCATION*\n` +
    `Detailing Masters, Opposite KTM Bike Showroom,\n` +
    `Chankai, Marthandam, Tamil Nadu 629155\n` +
    `📞 *Helpline:* +91 99941 22652\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `_We look forward to delivering the ultimate shine and protection for your machine!_`;
}

function buildWAReschedule(b, newDate) {
  const vehicle = getVehicleLabel(b);
  const dateFormatted = formatDate(newDate);
  const services = b.service_name || 'General Detailing';

  return `🗓️ *DETAILING MASTERS* | *APPOINTMENT RESCHEDULED*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Dear *${b.full_name || 'Valued Customer'}*,\n\n` +
    `Your detailing appointment for *${vehicle}* has been rescheduled:\n\n` +
    `📅 *New Date:* ${dateFormatted}\n` +
    `🛠️ *Services:* ${services}\n` +
    `⏰ *Time Slot:* ${b.allocated_time || 'Will be confirmed shortly'}\n\n` +
    `📍 *Studio Location:* Opp. KTM Showroom, Chankai, Marthandam\n` +
    `📞 *Support Helpline:* +91 99941 22652\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `_If you need any further adjustments, feel free to reply directly to this chat._`;
}

function buildWACancellation(b, reason) {
  const vehicle = getVehicleLabel(b);
  const dateFormatted = formatDate(b.preferred_date);

  return `❌ *DETAILING MASTERS* | *BOOKING CANCELLATION*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Dear *${b.full_name || 'Valued Customer'}*,\n\n` +
    `Your detailing appointment for *${vehicle}* scheduled for *${dateFormatted}* has been cancelled.\n` +
    (reason ? `• *Reason:* ${reason}\n\n` : `\n`) +
    `If you would like to reschedule or explore another slot, please visit *detailingmasters.in* or reach us at *+91 99941 22652*.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Detailing Masters · Precision Automotive Refinishing_`;
}

function buildWAInquiry(b) {
  const vehicle = getVehicleLabel(b);
  const dateFormatted = formatDate(b.preferred_date);
  const services = b.service_name || 'Detailing Service';

  return `👋 *Hello ${b.full_name || 'Valued Customer'}*,\n\n` +
    `Greetings from *Detailing Masters*!\n\n` +
    `We are following up regarding your booking inquiry for *${vehicle}* (*${services}*) scheduled for *${dateFormatted}*.\n\n` +
    `How may we assist you today?\n\n` +
    `📞 *Helpline:* +91 99941 22652`;
}

const TIME_PRESETS = ['09:30', '11:00', '14:00', '16:30'];

const CANCEL_REASONS = [
  'Customer requested cancellation',
  'Slots unavailable for requested time',
  'Duplicate booking',
  'Out of service radius / unserviceable vehicle'
];

export default function WebsiteBookings() {
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRowId, setExpandedRowId] = useState(null);

  const [reschedulingId, setReschedulingId] = useState(null);
  const [rescheduleValue, setRescheduleValue] = useState('');

  const [confirmingId, setConfirmingId] = useState(null);
  const [confirmTime, setConfirmTime] = useState('');
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [conflictModal, setConflictModal] = useState({ isOpen: false, conflicts: [], booking: null, time: null });
  const [busySlots, setBusySlots] = useState([]);
  const [loadingBusySlots, setLoadingBusySlots] = useState(false);

  const [cancellingId, setCancellingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { can_delete } = usePermissions('Online Booking');

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['web_bookings'],
    queryFn: async () => {
      const res = await api.get('/web_bookings');
      return res.data;
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, allocated_time, cancel_reason }) => {
      const res = await api.put(`/web_bookings/${id}`, { status, allocated_time, cancel_reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['web_bookings']);
    },
    onError: () => {
      toast.error('Failed to update booking status.');
    }
  });

  const convertBookingMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/web_bookings/${id}/convert`, {});
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['web_bookings']);
      toast.success('Booking converted to invoice!');
      if (data.invoice_id) {
        navigate(`/invoices/${data.invoice_id}`);
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to convert booking.');
    }
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, preferred_date }) => {
      const res = await api.put(`/web_bookings/${id}`, { preferred_date });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['web_bookings']);
    },
    onError: () => toast.error('Failed to reschedule booking')
  });

  // ── Reschedule ──
  const startReschedule = (booking, e) => {
    if (e) e.stopPropagation();
    setReschedulingId(booking.booking_id);
    setRescheduleValue(booking.preferred_date ? booking.preferred_date.slice(0, 10) : '');
  };

  const confirmReschedule = (booking, e) => {
    if (e) e.stopPropagation();
    if (!rescheduleValue) return;
    const waWindow = openWhatsAppLazy();
    rescheduleMutation.mutate(
      { id: booking.booking_id, preferred_date: rescheduleValue },
      {
        onSuccess: () => {
          toast.success('Booking rescheduled — customer notified');
          const msg = buildWAReschedule(booking, rescheduleValue);
          if (waWindow) waWindow.location.href = waLink(booking.phone, msg);
        },
        onError: () => { if (waWindow) waWindow.close(); }
      }
    );
    setReschedulingId(null);
  };

  // ── Confirm ──
  const startConfirm = async (booking, e) => {
    if (e) e.stopPropagation();
    setConfirmingId(booking.booking_id);
    setConfirmTime('');
    setBusySlots([]);
    if (!booking.service_id || !booking.preferred_date) return;
    setLoadingBusySlots(true);
    try {
      const res = await api.get('/web_bookings/busy-slots', {
        params: {
          service_id: booking.service_id,
          date: format(parseISO(booking.preferred_date), 'yyyy-MM-dd'),
        },
      });
      setBusySlots(res.data?.slots || []);
    } catch (err) {
      // Non-critical
    }
    setLoadingBusySlots(false);
  };

  const doConfirm = (booking, time) => {
    const waWindow = openWhatsAppLazy();
    updateStatusMutation.mutate(
      { id: booking.booking_id, status: 'confirmed', allocated_time: time },
      {
        onSuccess: () => {
          toast.success('Booking confirmed — customer notified');
          const msg = buildWAConfirmation(booking, time);
          if (waWindow) waWindow.location.href = waLink(booking.phone, msg);
        },
        onError: () => { if (waWindow) waWindow.close(); }
      }
    );
  };

  const submitConfirm = async (booking) => {
    if (!confirmTime) { toast.error('Please pick an allocated time'); return; }
    if (!booking.service_id) {
      doConfirm(booking, confirmTime);
      setConfirmingId(null);
      return;
    }
    setCheckingConflicts(true);
    let conflicts = [];
    try {
      const res = await api.post('/web_bookings/check-conflicts', {
        service_id: booking.service_id,
        preferred_date: booking.preferred_date ? format(parseISO(booking.preferred_date), 'yyyy-MM-dd') : null,
        allocated_time: confirmTime,
      });
      conflicts = res.data?.conflicts || [];
    } catch (err) {
      // Don't block confirmation if check fails
    }
    setCheckingConflicts(false);

    if (conflicts.length > 0) {
      setConflictModal({ isOpen: true, conflicts, booking, time: confirmTime });
      setConfirmingId(null);
      return;
    }
    doConfirm(booking, confirmTime);
    setConfirmingId(null);
  };

  const handleProceedDespiteConflict = () => {
    const { booking, time } = conflictModal;
    setConflictModal({ isOpen: false, conflicts: [], booking: null, time: null });
    if (booking && time) doConfirm(booking, time);
  };

  // ── Cancel ──
  const startCancel = (booking, e) => {
    if (e) e.stopPropagation();
    setCancellingId(booking.booking_id);
    setCancelReason('');
  };

  const submitCancel = (booking) => {
    const waWindow = openWhatsAppLazy();
    updateStatusMutation.mutate(
      { id: booking.booking_id, status: 'cancelled', cancel_reason: cancelReason },
      {
        onSuccess: () => {
          toast.success('Booking cancelled — customer notified');
          const msg = buildWACancellation(booking, cancelReason);
          if (waWindow) waWindow.location.href = waLink(booking.phone, msg);
        },
        onError: () => { if (waWindow) waWindow.close(); }
      }
    );
    setCancellingId(null);
  };

  const plainStatusChange = (booking, status, e) => {
    if (e) e.stopPropagation();
    updateStatusMutation.mutate(
      { id: booking.booking_id, status },
      { onSuccess: () => toast.success(`Booking status updated to ${status}!`) }
    );
  };
  
  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this booking?')) return;
    try {
      await api.delete('/web_bookings/' + id);
      toast.success('Booking deleted');
      queryClient.invalidateQueries(['web_bookings']);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting booking');
    }
  };

  const toggleRowExpansion = (id) => {
    setExpandedRowId(prev => (prev === id ? null : id));
  };

  // Filter logic
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const convertedCount = bookings.filter(b => b.status === 'converted').length;
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;

  const filteredBookings = bookings.filter(booking => {
    const matchesTab = booking.status === activeTab;
    const searchLower = searchQuery.toLowerCase().trim();
    if (!searchLower) return matchesTab;
    
    const matchesSearch =
      (booking.full_name || '').toLowerCase().includes(searchLower) ||
      (booking.phone || '').toLowerCase().includes(searchLower) ||
      (booking.vehicle_brand || '').toLowerCase().includes(searchLower) ||
      (booking.vehicle_model || '').toLowerCase().includes(searchLower) ||
      (booking.service_name || '').toLowerCase().includes(searchLower) ||
      (booking.additional_notes || '').toLowerCase().includes(searchLower);

    return matchesTab && matchesSearch;
  });

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="w-full max-w-full space-y-4 animate-fade-in">

      {/* ── Top Header & Executive Toolbar ── */}
      <div className="bg-white/80 backdrop-blur-2xl rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-white p-4 lg:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Title & Pipeline Badge */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-black to-gray-900 text-[#F6CB59] flex items-center justify-center shadow-md shrink-0 border border-gray-800">
            <Globe size={22} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg lg:text-xl font-black text-gray-900 tracking-tight leading-none truncate">
                Website Bookings
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                Live Dispatch
              </span>
            </div>
            <p className="text-[11px] font-bold text-gray-500 mt-0.5 tracking-wide uppercase">
              Online Inquiries & Appointment Dispatch
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200/80 rounded-xl text-[12px] font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-xs"
            placeholder="Search name, phone, car, service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-md"
            >
              <XIcon size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Segmented Status Tabs Ribbon ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 hide-scrollbar">
        <button
          onClick={() => { setActiveTab('pending'); setExpandedRowId(null); }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-black transition-all whitespace-nowrap shadow-xs ${
            activeTab === 'pending'
              ? 'bg-black text-[#F6CB59] shadow-md border border-gray-900 ring-2 ring-black/10'
              : 'bg-white/80 text-gray-700 hover:bg-white border border-gray-200/70 hover:text-gray-900'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span>Pending Leads</span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
            activeTab === 'pending' ? 'bg-[#F6CB59] text-black' : 'bg-gray-100 text-gray-800'
          }`}>
            {pendingCount}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('confirmed'); setExpandedRowId(null); }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-black transition-all whitespace-nowrap shadow-xs ${
            activeTab === 'confirmed'
              ? 'bg-black text-[#F6CB59] shadow-md border border-gray-900 ring-2 ring-black/10'
              : 'bg-white/80 text-gray-700 hover:bg-white border border-gray-200/70 hover:text-gray-900'
          }`}
        >
          <CheckCircle2 size={13} className={activeTab === 'confirmed' ? 'text-[#F6CB59]' : 'text-blue-500'} />
          <span>Confirmed</span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
            activeTab === 'confirmed' ? 'bg-[#F6CB59] text-black' : 'bg-gray-100 text-gray-800'
          }`}>
            {confirmedCount}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('converted'); setExpandedRowId(null); }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-black transition-all whitespace-nowrap shadow-xs ${
            activeTab === 'converted'
              ? 'bg-black text-[#F6CB59] shadow-md border border-gray-900 ring-2 ring-black/10'
              : 'bg-white/80 text-gray-700 hover:bg-white border border-gray-200/70 hover:text-gray-900'
          }`}
        >
          <Sparkles size={13} className={activeTab === 'converted' ? 'text-[#F6CB59]' : 'text-emerald-500'} />
          <span>Invoiced / Completed</span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
            activeTab === 'converted' ? 'bg-[#F6CB59] text-black' : 'bg-gray-100 text-gray-800'
          }`}>
            {convertedCount}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('cancelled'); setExpandedRowId(null); }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-black transition-all whitespace-nowrap shadow-xs ${
            activeTab === 'cancelled'
              ? 'bg-black text-[#F6CB59] shadow-md border border-gray-900 ring-2 ring-black/10'
              : 'bg-white/80 text-gray-700 hover:bg-white border border-gray-200/70 hover:text-gray-900'
          }`}
        >
          <XCircle size={13} className={activeTab === 'cancelled' ? 'text-[#F6CB59]' : 'text-rose-400'} />
          <span>Cancelled</span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
            activeTab === 'cancelled' ? 'bg-[#F6CB59] text-black' : 'bg-gray-100 text-gray-800'
          }`}>
            {cancelledCount}
          </span>
        </button>
      </div>

      {/* ── Main Data Matrix (Desktop Table with Accordion Drawer) ── */}
      {isLoading ? (
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-16 flex flex-col items-center justify-center">
          <Globe className="animate-spin text-gray-900 mb-3" size={32} />
          <p className="text-[13px] font-bold text-gray-500">Loading website bookings…</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-3 border border-gray-200">
            <Globe className="text-gray-400" size={30} />
          </div>
          <h2 className="text-base font-black text-gray-900 mb-1">
            No {activeTab === 'converted' ? 'completed' : activeTab} bookings found
          </h2>
          <p className="text-[12px] font-bold text-gray-500">
            {searchQuery ? `No matching results for "${searchQuery}"` : `There are currently no bookings in this status.`}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table: 100% width, table-fixed, zero horizontal overflow */}
          <div className="hidden lg:block bg-white/85 backdrop-blur-2xl rounded-2xl border border-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-gray-50/90 border-b border-gray-200/80 text-[11px] uppercase tracking-wider text-gray-500 font-extrabold">
                  <th className="w-[32%] px-4 py-3">Customer & Vehicle</th>
                  <th className="w-[26%] px-3 py-3">Services & Notes</th>
                  <th className="w-[20%] px-3 py-3">Schedule Slot</th>
                  <th className="w-[22%] px-4 py-3 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/90 text-[12px]">
                {filteredBookings.map(booking => {
                  const isExpanded = expandedRowId === booking.booking_id;
                  const initials = getInitials(booking.full_name);
                  const vehicleText = [booking.vehicle_brand, booking.vehicle_model].filter(Boolean).join(' ') || 'Vehicle Unspecified';
                  const servicesList = Array.isArray(booking.services) && booking.services.length > 0
                    ? booking.services
                    : (booking.service_name ? [{ service_name: booking.service_name }] : []);
                  const primaryService = servicesList[0]?.service_name || booking.service_name || 'General Detailing';
                  const extraCount = Math.max(0, servicesList.length - 1);

                  return (
                    <React.Fragment key={booking.booking_id}>
                      {/* Main Compact Row */}
                      <tr
                        onClick={() => toggleRowExpansion(booking.booking_id)}
                        className={`cursor-pointer transition-all duration-200 group ${
                          isExpanded
                            ? 'bg-amber-50/40 border-l-[3px] border-l-[#F6CB59]'
                            : 'hover:bg-gray-50/80 border-l-[3px] border-l-transparent'
                        }`}
                      >
                        {/* 1. Customer & Vehicle */}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Monogram Avatar */}
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-black to-gray-800 text-[#F6CB59] flex items-center justify-center font-black text-[12px] border border-gray-700 shadow-xs shrink-0">
                              {initials}
                            </div>
                            
                            {/* Name + Phone + Vehicle badge */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-black text-gray-900 text-[13px] truncate" title={booking.full_name}>
                                  {booking.full_name || 'Anonymous Client'}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2 mt-0.5 truncate">
                                <a
                                  href={`tel:${booking.phone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[11px] font-bold text-gray-600 hover:text-black truncate flex items-center gap-1"
                                >
                                  <Phone size={11} className="text-gray-400 shrink-0" />
                                  {booking.phone}
                                </a>
                                <span className="text-gray-300">·</span>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 text-[10px] font-extrabold border border-gray-200 truncate max-w-[130px]" title={vehicleText}>
                                  <Car size={10} className="text-gray-500 shrink-0" />
                                  <span className="truncate">{vehicleText}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Interested Services & Notes */}
                        <td className="px-3 py-3 align-middle">
                          <div className="flex flex-col gap-1 min-w-0 pr-2">
                            {/* Service Chip */}
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FFF9E6] text-[#7A5000] border border-[#F6CB59]/50 text-[11px] font-black truncate max-w-[170px]" title={booking.service_name || primaryService}>
                                <CheckSquare size={11} className="text-[#D4A017] shrink-0" />
                                <span className="truncate">{primaryService}</span>
                              </span>
                              {extraCount > 0 && (
                                <span
                                  className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200 text-[10px] font-black cursor-help shrink-0"
                                  title={servicesList.map(s => s.service_name).join(', ')}
                                >
                                  +{extraCount}
                                </span>
                              )}
                            </div>

                            {/* Notes Snippet */}
                            {booking.additional_notes ? (
                              <span className="text-[11px] font-semibold text-gray-500 italic truncate flex items-center gap-1 max-w-[210px]" title={booking.additional_notes}>
                                <FileText size={10} className="text-gray-400 shrink-0" />
                                <span className="truncate">"{booking.additional_notes}"</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-gray-400 italic">No notes</span>
                            )}
                          </div>
                        </td>

                        {/* 3. Schedule Slot */}
                        <td className="px-3 py-3 align-middle">
                          {reschedulingId === booking.booking_id ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="date"
                                value={rescheduleValue}
                                onChange={(e) => setRescheduleValue(e.target.value)}
                                className="text-[11px] font-bold text-gray-800 bg-white px-2 py-1 rounded-lg border border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-28"
                              />
                              <button
                                onClick={(e) => confirmReschedule(booking, e)}
                                className="w-6 h-6 flex items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700 shrink-0 shadow-xs"
                                title="Save Date"
                              >
                                <Check size={12} strokeWidth={3} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setReschedulingId(null); }}
                                className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 shrink-0"
                                title="Cancel"
                              >
                                <XIcon size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5 min-w-0">
                              {/* Date Badge */}
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 text-[11px] font-black text-gray-900 bg-gray-100/90 px-2 py-0.5 rounded-md border border-gray-200">
                                  <Calendar size={11} className="text-gray-500 shrink-0" />
                                  <span>{formatDate(booking.preferred_date)}</span>
                                </span>
                                <button
                                  onClick={(e) => startReschedule(booking, e)}
                                  className="text-gray-400 hover:text-blue-600 p-0.5 rounded transition-colors"
                                  title="Reschedule Date"
                                >
                                  <PenSquare size={11} />
                                </button>
                              </div>

                              {/* Time Slot Info */}
                              {booking.allocated_time ? (
                                <span className="text-[10px] font-extrabold text-blue-700 flex items-center gap-1 mt-0.5">
                                  <Clock size={10} className="text-blue-500 shrink-0" />
                                  <span>Slot: {booking.allocated_time}</span>
                                </span>
                              ) : booking.preferred_time_period ? (
                                <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1 mt-0.5 truncate" title={`Requested: ${booking.preferred_time_period}`}>
                                  <Clock size={10} className="text-amber-500 shrink-0" />
                                  <span className="truncate">{booking.preferred_time_period}</span>
                                </span>
                              ) : null}
                            </div>
                          )}
                        </td>

                        {/* 4. Action Suite */}
                        <td className="px-4 py-3 align-middle text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            
                            {/* WhatsApp Button */}
                            <a
                              href={waLink(booking.phone, buildWAInquiry(booking))}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-[11px] font-black rounded-lg transition-all shadow-xs flex items-center gap-1 shrink-0"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare size={11} className="fill-current" />
                              <span>WA</span>
                            </a>

                            {/* Primary Action Button */}
                            {activeTab === 'pending' && (
                              <>
                                <button
                                  onClick={(e) => startConfirm(booking, e)}
                                  className="px-2.5 py-1.5 bg-black hover:bg-gray-900 text-[#F6CB59] text-[11px] font-black rounded-lg transition-all shadow-xs shrink-0 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={(e) => startCancel(booking, e)}
                                  className="px-2 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-[11px] font-bold rounded-lg transition-all shrink-0"
                                >
                                  Cancel
                                </button>
                              </>
                            )}

                            {activeTab === 'confirmed' && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Convert this booking into an invoice?')) {
                                      convertBookingMutation.mutate(booking.booking_id);
                                    }
                                  }}
                                  disabled={convertBookingMutation.isPending}
                                  className="px-2.5 py-1.5 bg-black hover:bg-gray-900 text-[#F6CB59] text-[11px] font-black rounded-lg transition-all shadow-xs flex items-center gap-1 disabled:opacity-50 shrink-0 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                  {convertBookingMutation.isPending && convertBookingMutation.variables === booking.booking_id ? (
                                    <Globe className="animate-spin" size={11} />
                                  ) : (
                                    <Sparkles size={11} />
                                  )}
                                  <span>Convert</span>
                                </button>
                                <button
                                  onClick={(e) => plainStatusChange(booking, 'pending', e)}
                                  className="px-2 py-1.5 bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 text-[11px] font-bold rounded-lg transition-all shrink-0"
                                  title="Revert to Pending"
                                >
                                  Revert
                                </button>
                              </>
                            )}

                            {(activeTab === 'converted' || activeTab === 'cancelled') && (
                              <button
                                onClick={(e) => plainStatusChange(booking, 'pending', e)}
                                className="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 text-[11px] font-bold rounded-lg transition-all shrink-0"
                              >
                                Reopen
                              </button>
                            )}

                            {/* Delete Button */}
                            {can_delete && (
                              <button
                                onClick={(e) => handleDelete(booking.booking_id, e)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors shrink-0"
                                title="Delete Booking"
                              >
                                <Trash2 size={12} strokeWidth={2.5} />
                              </button>
                            )}

                            {/* Expand/Collapse Chevron Button */}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleRowExpansion(booking.booking_id); }}
                              className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all shrink-0 ml-1 ${
                                isExpanded
                                  ? 'bg-black text-[#F6CB59] border-black'
                                  : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                              }`}
                              title={isExpanded ? "Collapse details" : "Expand inspection drawer"}
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable In-Place Inspector Drawer */}
                      {isExpanded && (
                        <tr className="bg-gradient-to-r from-amber-50/20 via-white to-gray-50/40 border-b border-gray-200/80 animate-fade-in">
                          <td colSpan={4} className="p-4 lg:p-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
                              
                              {/* Left Column: Client & Vehicle Details */}
                              <div className="space-y-2 border-r border-gray-100 pr-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <User size={12} className="text-gray-500" /> Client & Machine Details
                                  </h4>
                                  <Link
                                    to={`/master-customer/${booking.phone}`}
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span>History</span>
                                    <ExternalLink size={10} />
                                  </Link>
                                </div>

                                <div className="bg-gray-50/80 p-3 rounded-lg border border-gray-100 space-y-1.5 text-[11px]">
                                  <p className="font-extrabold text-gray-900 text-[13px]">{booking.full_name}</p>
                                  <p className="text-gray-600 flex items-center gap-1.5 font-bold">
                                    <Phone size={11} className="text-gray-400" /> {booking.phone}
                                  </p>
                                  {booking.email && (
                                    <p className="text-gray-600 flex items-center gap-1.5 font-bold truncate">
                                      <Mail size={11} className="text-gray-400" /> {booking.email}
                                    </p>
                                  )}
                                  <div className="pt-1.5 border-t border-gray-200/60 flex items-center justify-between">
                                    <span className="font-black text-gray-800">Vehicle:</span>
                                    <span className="font-extrabold text-[#7A5000] bg-[#FFF9E6] px-2 py-0.5 rounded border border-[#F6CB59]/40">
                                      {booking.vehicle_brand} {booking.vehicle_model} {booking.vehicle_type ? `(${booking.vehicle_type})` : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Middle Column: Selected Services Checklist & Special Notes */}
                              <div className="space-y-2 border-r border-gray-100 pr-3">
                                <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                  <Tag size={12} className="text-gray-500" /> Services & Instructions
                                </h4>

                                <div className="space-y-2">
                                  {/* Services list */}
                                  <div className="flex flex-wrap gap-1.5">
                                    {servicesList.map((svc, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFF9E6] text-[#7A5000] border border-[#F6CB59]/50 text-[11px] font-black"
                                      >
                                        <CheckSquare size={11} className="text-[#D4A017]" />
                                        {svc.service_name}
                                      </span>
                                    ))}
                                  </div>

                                  {/* Special Notes Card */}
                                  {booking.additional_notes ? (
                                    <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/80 text-[11px]">
                                      <span className="font-black text-amber-900 block mb-0.5">Customer Instructions:</span>
                                      <p className="text-gray-700 font-medium leading-relaxed italic">"{booking.additional_notes}"</p>
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-gray-400 italic">No special instructions provided.</p>
                                  )}
                                </div>
                              </div>

                              {/* Right Column: Schedule Breakdown & Quick Dispatch */}
                              <div className="space-y-2 flex flex-col justify-between">
                                <div>
                                  <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <Calendar size={12} className="text-gray-500" /> Schedule & Actions
                                  </h4>

                                  <div className="mt-2 bg-gray-50/80 p-3 rounded-lg border border-gray-100 space-y-1 text-[11px]">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500 font-bold">Target Date:</span>
                                      <span className="font-extrabold text-gray-900">{formatDate(booking.preferred_date)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500 font-bold">Allocated Slot:</span>
                                      <span className="font-extrabold text-blue-700">
                                        {booking.allocated_time || booking.preferred_time_period || 'Unassigned'}
                                      </span>
                                    </div>
                                    {booking.cancel_reason && (
                                      <div className="pt-1 border-t border-gray-200 text-rose-600 font-bold">
                                        Cancel Reason: {booking.cancel_reason}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Drawer Fast Actions */}
                                <div className="flex items-center gap-2 pt-2">
                                  <a
                                    href={waLink(booking.phone, buildWAInquiry(booking))}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-[11px] font-black rounded-lg flex items-center justify-center gap-1 shadow-xs"
                                  >
                                    <MessageSquare size={12} className="fill-current" />
                                    <span>WhatsApp</span>
                                  </a>

                                  {activeTab === 'pending' && (
                                    <button
                                      onClick={(e) => startConfirm(booking, e)}
                                      className="flex-1 py-1.5 bg-black hover:bg-gray-900 text-[#F6CB59] text-[11px] font-black rounded-lg shadow-xs"
                                    >
                                      Allocate & Confirm
                                    </button>
                                  )}

                                  {activeTab === 'confirmed' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Convert booking into invoice?')) convertBookingMutation.mutate(booking.booking_id);
                                      }}
                                      className="flex-1 py-1.5 bg-black hover:bg-gray-900 text-[#F6CB59] text-[11px] font-black rounded-lg shadow-xs flex items-center justify-center gap-1"
                                    >
                                      <Sparkles size={11} />
                                      <span>Create Invoice</span>
                                    </button>
                                  )}
                                </div>

                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile / Tablet Compact Cards (< 1024px) */}
          <div className="block lg:hidden space-y-3">
            {filteredBookings.map(booking => {
              const isExpanded = expandedRowId === booking.booking_id;
              const initials = getInitials(booking.full_name);
              const vehicleText = [booking.vehicle_brand, booking.vehicle_model].filter(Boolean).join(' ') || 'Vehicle Unspecified';

              return (
                <div
                  key={booking.booking_id}
                  className="bg-white/90 backdrop-blur-xl border border-white rounded-2xl p-4 shadow-sm space-y-3"
                >
                  {/* Card Top: Customer & Vehicle */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-black text-[#F6CB59] flex items-center justify-center font-black text-sm shrink-0 border border-gray-800">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-gray-900 text-[14px] truncate">{booking.full_name}</h3>
                        <p className="text-[11px] font-bold text-gray-500">{booking.phone}</p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-800 text-[11px] font-extrabold border border-gray-200 shrink-0">
                      <Car size={12} className="text-gray-500" />
                      <span className="truncate max-w-[120px]">{vehicleText}</span>
                    </span>
                  </div>

                  {/* Service & Schedule Matrix */}
                  <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-[11px]">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Service</span>
                      <span className="font-black text-[#8C5D00] truncate block mt-0.5">{booking.service_name || 'General Detailing'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Schedule</span>
                      <span className="font-black text-gray-900 block mt-0.5">
                        {formatDate(booking.preferred_date)}
                        {booking.allocated_time && <span className="text-blue-600 ml-1">· {booking.allocated_time}</span>}
                      </span>
                    </div>
                    {booking.preferred_time_period && !booking.allocated_time && (
                      <div className="col-span-2 pt-1 border-t border-gray-200/60 text-amber-700 font-bold">
                        Requested: {booking.preferred_time_period}
                      </div>
                    )}
                  </div>

                  {/* Notes Excerpt */}
                  {booking.additional_notes && (
                    <p className="text-[11px] font-medium text-gray-600 bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                      <span className="font-bold text-gray-800">Notes: </span>
                      {booking.additional_notes}
                    </p>
                  )}

                  {/* Action Bar */}
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={waLink(booking.phone, buildWAInquiry(booking))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-[#25D366] text-white text-[12px] font-black rounded-xl flex items-center justify-center gap-1 shadow-xs"
                    >
                      <MessageSquare size={13} className="fill-current" />
                      <span>WhatsApp</span>
                    </a>

                    {activeTab === 'pending' && (
                      <>
                        <button
                          onClick={(e) => startConfirm(booking, e)}
                          className="flex-1 py-2 bg-black text-[#F6CB59] text-[12px] font-black rounded-xl shadow-xs"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={(e) => startCancel(booking, e)}
                          className="px-3 py-2 bg-white text-rose-600 border border-rose-200 text-[12px] font-bold rounded-xl"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {activeTab === 'confirmed' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Convert booking into invoice?')) convertBookingMutation.mutate(booking.booking_id);
                          }}
                          disabled={convertBookingMutation.isPending}
                          className="flex-1 py-2 bg-black text-[#F6CB59] text-[12px] font-black rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <Sparkles size={13} />
                          <span>Convert to Invoice</span>
                        </button>
                        <button
                          onClick={(e) => plainStatusChange(booking, 'pending', e)}
                          className="px-3 py-2 bg-white text-gray-600 border border-gray-200 text-[12px] font-bold rounded-xl"
                        >
                          Revert
                        </button>
                      </>
                    )}

                    {(activeTab === 'converted' || activeTab === 'cancelled') && (
                      <button
                        onClick={(e) => plainStatusChange(booking, 'pending', e)}
                        className="flex-1 py-2 bg-white text-gray-700 border border-gray-200 text-[12px] font-bold rounded-xl"
                      >
                        Reopen
                      </button>
                    )}

                    {can_delete && (
                      <button
                        onClick={(e) => handleDelete(booking.booking_id, e)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200 shrink-0"
                      >
                        <Trash2 size={14} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Confirm Modal with Time Presets ── */}
      {confirmingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500" size={20} />
                Confirm Booking Slot
              </h3>
              <button
                onClick={() => setConfirmingId(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <XIcon size={18} />
              </button>
            </div>

            <p className="text-[12px] font-bold text-gray-500 mb-4">
              Allocate a specific time slot to confirm with the customer.
            </p>

            {(() => {
              const b = bookings.find(bk => bk.booking_id === confirmingId);
              return b?.preferred_time_period ? (
                <div className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-4 flex items-center gap-2">
                  <Clock size={14} className="text-amber-600 shrink-0" />
                  <span>Customer preference: <strong>{b.preferred_time_period}</strong></span>
                </div>
              ) : null;
            })()}

            {/* Quick Presets */}
            <div className="mb-3">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1.5 block">
                Quick Time Presets
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {TIME_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setConfirmTime(preset)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-black border transition-all ${
                      confirmTime === preset
                        ? 'bg-black text-[#F6CB59] border-black shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Time Input */}
            <div className="mb-4">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1 block">
                Or Enter Custom Time
              </label>
              <input
                type="time"
                value={confirmTime}
                onChange={(e) => setConfirmTime(e.target.value)}
                className="w-full text-sm font-bold text-gray-800 bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
              />
            </div>

            {loadingBusySlots && (
              <p className="text-[11px] text-gray-400 mb-3 flex items-center gap-1.5">
                <RefreshCw size={12} className="animate-spin" /> Checking today&apos;s schedule…
              </p>
            )}

            {!loadingBusySlots && busySlots.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                <p className="text-[10px] font-black text-amber-800 uppercase tracking-wide">Existing Bookings Today</p>
                {busySlots.map((s, i) => (
                  <p key={i} className="text-[11px] text-gray-700 leading-tight">
                    <span className="font-bold">
                      {new Date(s.checkin_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {' '}— {s.make_model} · {s.customer_name}
                  </p>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setConfirmingId(null)}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={checkingConflicts || !confirmTime}
                onClick={() => submitConfirm(bookings.find(b => b.booking_id === confirmingId))}
                className={`flex-1 py-2.5 rounded-xl text-[12px] font-black text-black bg-[#F6CB59] hover:bg-[#ebd545] transition-all shadow-md flex items-center justify-center gap-1.5 ${
                  checkingConflicts || !confirmTime ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {checkingConflicts ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Checking…</span>
                  </>
                ) : (
                  <span>Confirm & Send Alert</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Schedule Conflict Warning Modal ── */}
      {conflictModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-amber-200">
            <div className="flex items-center gap-2.5 p-4 border-b border-amber-100 bg-amber-50">
              <AlertTriangle size={20} className="text-amber-600 shrink-0" />
              <h3 className="font-black text-gray-900 text-base">Schedule Conflict Detected</h3>
            </div>
            <div className="p-4 max-h-[50vh] overflow-y-auto flex flex-col gap-2">
              {conflictModal.conflicts.map((c, i) => (
                <div key={i} className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl text-[12px]">
                  <span className="font-bold text-gray-900">{c.service_name}</span> is already scheduled{' '}
                  <span className="font-bold">
                    {new Date(c.checkin_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>{' '}
                  for <span className="font-bold">{c.make_model}</span> ({c.customer_name}).
                </div>
              ))}
              <p className="text-[11px] text-gray-500 mt-1">
                You can proceed if a secondary bay/technician team is available.
              </p>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setConflictModal({ isOpen: false, conflicts: [], booking: null, time: null })}
                className="px-4 py-2 text-[12px] font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Change Time
              </button>
              <button
                type="button"
                onClick={handleProceedDespiteConflict}
                className="px-4 py-2 text-[12px] font-black text-black bg-[#F6CB59] hover:bg-[#ebd545] rounded-xl transition-colors shadow-sm"
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Reason Modal ── */}
      {cancellingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-rose-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-black text-rose-600 flex items-center gap-2">
                <XCircle size={20} />
                Cancel Booking
              </h3>
              <button
                onClick={() => setCancellingId(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <XIcon size={18} />
              </button>
            </div>

            <p className="text-[12px] font-bold text-gray-500 mb-3">
              Select or type the cancellation reason to notify the client.
            </p>

            {/* Quick Reason Chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {CANCEL_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setCancelReason(reason)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all text-left ${
                    cancelReason === reason
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Or enter custom reason…"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full text-sm font-bold text-gray-800 bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 mb-4"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setCancellingId(null)}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={() => submitCancel(bookings.find(b => b.booking_id === cancellingId))}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-black text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
