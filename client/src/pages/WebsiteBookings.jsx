import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe, Search, Calendar, Car, Phone, Mail, Clock, MoreVertical,
  CheckCircle2, XCircle, Clock4, CheckSquare, PenSquare, Check, X as XIcon, AlertCircle
} from 'lucide-react';
import api from '../api/axios';
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

// Opens a blank tab synchronously (on click) so popup blockers don't kill it,
// then redirects it once the mutation succeeds and we know the final message text.
function openWhatsAppLazy() {
  return window.open('', '_blank');
}

function formatDate(d) {
  return d ? format(parseISO(d), 'MMM d, yyyy') : 'TBD';
}

export default function WebsiteBookings() {
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');

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
  const startReschedule = (booking) => {
    setReschedulingId(booking.booking_id);
    setRescheduleValue(booking.preferred_date ? booking.preferred_date.slice(0, 10) : '');
  };

  const confirmReschedule = (booking) => {
    if (!rescheduleValue) return;
    const waWindow = openWhatsAppLazy();
    rescheduleMutation.mutate(
      { id: booking.booking_id, preferred_date: rescheduleValue },
      {
        onSuccess: () => {
          toast.success('Booking rescheduled — customer notified by email');
          const msg = `Hi ${booking.full_name}, your Detailing Masters booking for ${booking.service_name || 'General Detailing'} has been rescheduled to ${formatDate(rescheduleValue)}. We'll confirm the time slot separately.`;
          if (waWindow) waWindow.location.href = waLink(booking.phone, msg);
        },
        onError: () => { if (waWindow) waWindow.close(); }
      }
    );
    setReschedulingId(null);
  };

  // ── Confirm ──
  const startConfirm = async (booking) => {
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
      // Non-critical — just skip showing busy slots if this fails
    }
    setLoadingBusySlots(false);
  };

  const doConfirm = (booking, time) => {
    const waWindow = openWhatsAppLazy();
    updateStatusMutation.mutate(
      { id: booking.booking_id, status: 'confirmed', allocated_time: time },
      {
        onSuccess: () => {
          toast.success('Booking confirmed — customer notified by email');
          const msg = `Hi ${booking.full_name}, your Detailing Masters booking for ${booking.service_name || 'General Detailing'} is confirmed for ${formatDate(booking.preferred_date)} at ${time}. See you then!`;
          if (waWindow) waWindow.location.href = waLink(booking.phone, msg);
        },
        onError: () => { if (waWindow) waWindow.close(); }
      }
    );
  };

  const submitConfirm = async (booking) => {
    if (!confirmTime) { toast.error('Pick an allocated time'); return; }
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
      // Don't block confirmation if the conflict check itself fails
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
  const startCancel = (booking) => {
    setCancellingId(booking.booking_id);
    setCancelReason('');
  };

  const submitCancel = (booking) => {
    const waWindow = openWhatsAppLazy();
    updateStatusMutation.mutate(
      { id: booking.booking_id, status: 'cancelled', cancel_reason: cancelReason },
      {
        onSuccess: () => {
          toast.success('Booking cancelled — customer notified by email');
          const msg = `Hi ${booking.full_name}, your Detailing Masters booking for ${booking.service_name || 'General Detailing'} has been cancelled.${cancelReason ? ` Reason: ${cancelReason}` : ''} Please contact us if you'd like to rebook.`;
          if (waWindow) waWindow.location.href = waLink(booking.phone, msg);
        },
        onError: () => { if (waWindow) waWindow.close(); }
      }
    );
    setCancellingId(null);
  };

  // ── Simple status changes (no WhatsApp needed: Revert / Reopen) ──
  const plainStatusChange = (booking, status) => {
    updateStatusMutation.mutate(
      { id: booking.booking_id, status },
      { onSuccess: () => toast.success('Booking status updated!') }
    );
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesTab = booking.status === activeTab;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      (booking.full_name || '').toLowerCase().includes(searchLower) ||
      (booking.vehicle_brand || '').toLowerCase().includes(searchLower) ||
      (booking.vehicle_model || '').toLowerCase().includes(searchLower);
    return matchesTab && matchesSearch;
  });

  return (
    <div className="relative animate-fade-in -m-6 p-6 min-h-[calc(100vh-140px)]">

      {/* ── Background Blueprint Layer ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.8) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] border border-black/50 rounded-[100px] flex items-center justify-center opacity-[0.03]">
          <Car size={300} className="text-black stroke-[0.5]" />
        </div>
      </div>

      <div className="relative z-10 space-y-6">
        {/* ── Toolbar ── */}
        <div className="bg-white/60 backdrop-blur-2xl rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-white/80 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5 shrink-0 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-black text-[#F6CB59] flex items-center justify-center shadow-md shrink-0">
              <Globe size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl md:text-[22px] font-black text-gray-900 tracking-tight leading-none mb-1">
                Website Bookings
              </h1>
              <p className="text-[12px] font-bold text-gray-500 tracking-wide uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Leads & Inquiries
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-gray-200/60 rounded-xl text-[12px] font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-sm"
                placeholder="Search by name, car..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative w-full sm:w-auto shrink-0">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full sm:w-auto appearance-none bg-black text-[#F6CB59] border border-gray-900 rounded-xl pl-4 pr-10 py-2.5 text-[12px] font-bold focus:outline-none focus:ring-2 focus:ring-[#F6CB59]/30 transition-all shadow-md uppercase tracking-wider cursor-pointer"
              >
                <option value="pending">Pending ({bookings.filter(b => b.status === 'pending').length})</option>
                <option value="confirmed">Confirmed ({bookings.filter(b => b.status === 'confirmed').length})</option>
                <option value="converted">Completed ({bookings.filter(b => b.status === 'converted').length})</option>
                <option value="cancelled">Cancelled ({bookings.filter(b => b.status === 'cancelled').length})</option>
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#F6CB59]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bookings List ── */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Globe className="animate-spin text-blue-500" size={32} />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-16 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100 shadow-inner">
              <Globe className="text-gray-300" size={48} />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">No {activeTab === 'converted' ? 'completed' : activeTab} Bookings</h2>
            <p className="text-gray-500 font-bold">There are currently no website bookings in this status.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block bg-white/60 backdrop-blur-2xl rounded-[24px] border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.06)] overflow-hidden pb-4">
              <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/40 backdrop-blur-md border-b border-white/50 text-[10px] uppercase tracking-widest text-gray-500 font-bold sticky top-0 z-10">
                    <th className="px-6 py-4">Customer Info</th>
                    <th className="px-6 py-4">Vehicle</th>
                    <th className="px-6 py-4">Interested Service</th>
                    <th className="px-6 py-4">Requested Date</th>
                    <th className="px-6 py-4">Notes</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/50">
                  {filteredBookings.map(booking => (
                    <tr key={booking.booking_id} className="hover:bg-white/60 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm border border-blue-100 shadow-sm shrink-0">
                            {(booking.full_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] font-black text-gray-900">{booking.full_name}</p>
                            <p className="text-[11px] font-bold text-gray-500">{booking.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-[13px] font-black text-gray-900">{booking.vehicle_brand}</p>
                        <p className="text-[11px] font-bold text-gray-500">{booking.vehicle_model}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FCDF4C]/20 text-[#D8A700] text-[11px] font-black tracking-widest border border-[#FCDF4C]/30 shadow-sm">
                          <CheckSquare size={12} /> {booking.service_name || 'General Inquiry'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {reschedulingId === booking.booking_id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="date"
                              value={rescheduleValue}
                              onChange={(e) => setRescheduleValue(e.target.value)}
                              className="text-[12px] font-bold text-gray-700 bg-white px-2 py-1 rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            <button onClick={() => confirmReschedule(booking)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100">
                              <Check size={14} />
                            </button>
                            <button onClick={() => setReschedulingId(null)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200">
                              <XIcon size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="flex items-center gap-1.5 text-[12px] font-bold text-gray-700 bg-gray-50 px-3 py-1 rounded-lg border border-gray-200 group/date">
                              <Calendar size={14} className="text-gray-400" />
                              {formatDate(booking.preferred_date) === 'TBD' ? 'No Date' : formatDate(booking.preferred_date)}
                              {booking.allocated_time && (
                                <span className="ml-1 text-blue-600">· {booking.allocated_time}</span>
                              )}
                              <button onClick={() => startReschedule(booking)} title="Reschedule" className="ml-1 text-gray-400 hover:text-blue-600">
                                <PenSquare size={13} />
                              </button>
                            </span>
                            {activeTab === 'pending' && booking.preferred_time_period && (
                              <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 px-3">
                                <Clock size={12} className="text-amber-500" />
                                Requested: {booking.preferred_time_period}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-[200px]">
                        <p className="text-[12px] text-gray-600 font-medium truncate" title={booking.additional_notes}>
                          {booking.additional_notes || '—'}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2 transition-opacity">
                          {activeTab === 'pending' && (
                            <>
                              <button onClick={() => startConfirm(booking)} className="px-4 py-2 bg-black hover:bg-gray-900 text-[#F6CB59] text-[11px] font-black rounded-xl transition-all shadow-md">
                                Confirm
                              </button>
                              <button onClick={() => startCancel(booking)} className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-[11px] font-black rounded-xl transition-all shadow-sm">
                                Cancel
                              </button>
                            </>
                          )}
                          {activeTab === 'confirmed' && (
                            <>
                              <button
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to convert this booking into an invoice?')) {
                                    convertBookingMutation.mutate(booking.booking_id);
                                  }
                                }}
                                disabled={convertBookingMutation.isPending}
                                className="px-4 py-2 bg-black hover:bg-gray-900 text-[#F6CB59] text-[11px] font-black rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                              >
                                {convertBookingMutation.isPending && convertBookingMutation.variables === booking.booking_id ? <Globe className="animate-spin" size={12} /> : null}
                                Convert to Invoice
                              </button>
                              <button onClick={() => plainStatusChange(booking, 'pending')} className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 text-[11px] font-black rounded-xl transition-all shadow-sm">
                                Revert
                              </button>
                            </>
                          )}
                          {(activeTab === 'converted' || activeTab === 'cancelled') && (
                            <button onClick={() => plainStatusChange(booking, 'pending')} className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 text-[11px] font-black rounded-xl transition-all shadow-sm">
                              Reopen
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="block lg:hidden flex flex-col gap-5 py-2">
            {filteredBookings.map(booking => (
              <div key={booking.booking_id} className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[24px] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.06)] flex flex-col gap-4 relative">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-[12px] bg-black text-[#F6CB59] flex items-center justify-center font-black text-sm shrink-0 shadow-md">
                      {(booking.full_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 pr-2">
                      <div className="font-black text-[16px] text-gray-900 truncate tracking-tight">{booking.full_name}</div>
                      <div className="text-[12px] font-bold text-gray-500 tracking-wider uppercase mt-0.5">{booking.phone}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-white/50 p-4 rounded-2xl border border-white/60 shadow-sm mt-1">
                  <div className="flex items-start gap-2 text-[13px] font-bold text-gray-800 col-span-2">
                    <Car size={14} className="text-gray-400 shrink-0 mt-0.5" />
                    <span className="truncate whitespace-normal leading-tight">
                      {booking.vehicle_brand} {booking.vehicle_model}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-[13px] font-bold text-gray-800 col-span-2 pt-3 border-t border-gray-200/50">
                    <CheckSquare size={14} className="text-[#F6CB59] shrink-0 mt-0.5" />
                    <span className="truncate whitespace-normal leading-tight text-[#854D0E]">
                      {booking.service_name || 'General Inquiry'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-[13px] font-bold text-gray-800 col-span-2 pt-3 border-t border-gray-200/50">
                    <Calendar size={14} className="text-gray-400 shrink-0 mt-0.5" />
                    <span className="truncate whitespace-normal leading-tight">
                      {formatDate(booking.preferred_date) === 'TBD' ? 'No Date' : formatDate(booking.preferred_date)}
                      {booking.allocated_time && <span className="ml-1 text-gray-500">· {booking.allocated_time}</span>}
                    </span>
                  </div>
                  {activeTab === 'pending' && booking.preferred_time_period && (
                    <div className="flex items-start gap-2 text-[13px] font-bold text-gray-800 col-span-2 pt-3 border-t border-gray-200/50">
                      <Clock size={14} className="text-gray-400 shrink-0 mt-0.5" />
                      <span className="truncate whitespace-normal leading-tight text-gray-700">
                        Requested: {booking.preferred_time_period}
                      </span>
                    </div>
                  )}
                </div>
                
                {booking.additional_notes && (
                  <div className="px-1">
                    <p className="text-[12px] text-gray-600 font-medium line-clamp-2">
                      <span className="font-bold text-gray-900 mr-1">Notes:</span> {booking.additional_notes}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-2 mt-2">
                  {reschedulingId === booking.booking_id ? (
                    <div className="flex flex-col gap-2 bg-white/50 p-3 rounded-xl border border-white/60 shadow-sm">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Pick New Date</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={rescheduleValue}
                          onChange={(e) => setRescheduleValue(e.target.value)}
                          className="flex-1 text-[13px] font-bold text-gray-900 bg-white px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F6CB59]/30"
                        />
                        <button onClick={() => confirmReschedule(booking)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-black text-[#F6CB59] shadow-md">
                          <Check size={16} strokeWidth={3} />
                        </button>
                        <button onClick={() => setReschedulingId(null)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-gray-500 border border-gray-200 shadow-sm">
                          <XIcon size={16} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {activeTab === 'pending' && (
                        <>
                          <button onClick={() => startConfirm(booking)} className="flex-1 py-2.5 bg-black hover:bg-gray-900 text-[#F6CB59] text-[12px] font-black rounded-xl transition-all shadow-md">
                            Confirm
                          </button>
                          <button onClick={() => startReschedule(booking)} className="flex-1 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-[12px] font-black rounded-xl transition-all shadow-sm">
                            Reschedule
                          </button>
                          <button onClick={() => startCancel(booking)} className="py-2.5 px-4 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-[12px] font-black rounded-xl transition-all shadow-sm">
                            <XIcon size={16} />
                          </button>
                        </>
                      )}
                      {activeTab === 'confirmed' && (
                        <>
                          <button
                            onClick={() => {
                              if (window.confirm('Convert booking into invoice?')) convertBookingMutation.mutate(booking.booking_id);
                            }}
                            disabled={convertBookingMutation.isPending}
                            className="flex-1 py-2.5 bg-black hover:bg-gray-900 text-[#F6CB59] text-[12px] font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {convertBookingMutation.isPending && convertBookingMutation.variables === booking.booking_id ? <Globe className="animate-spin" size={14} /> : null}
                            Convert to Invoice
                          </button>
                          <button onClick={() => plainStatusChange(booking, 'pending')} className="flex-1 py-2.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 text-[12px] font-black rounded-xl transition-all shadow-sm">
                            Revert
                          </button>
                        </>
                      )}
                      {(activeTab === 'converted' || activeTab === 'cancelled') && (
                        <button onClick={() => plainStatusChange(booking, 'pending')} className="flex-1 py-2.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 text-[12px] font-black rounded-xl transition-all shadow-sm">
                          Reopen
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Confirm Modal */}
      {confirmingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-black text-gray-900 mb-2">Confirm Booking</h3>
            <p className="text-[13px] text-gray-500 mb-4">Please set an allocated time for this booking to notify the customer.</p>
            {(() => {
              const b = bookings.find(bk => bk.booking_id === confirmingId);
              return b?.preferred_time_period ? (
                <p className="text-[12px] font-bold text-amber-700 bg-amber-50/50 border border-amber-100 rounded-xl px-3 py-2 mb-4">
                  Customer requested: {b.preferred_time_period}
                </p>
              ) : null;
            })()}
            <input
              type="time"
              value={confirmTime}
              onChange={(e) => setConfirmTime(e.target.value)}
              className="w-full text-sm font-bold text-gray-700 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 mb-3"
            />
            {loadingBusySlots && (
              <p className="text-[12px] text-gray-400 mb-4">Checking today&apos;s schedule…</p>
            )}
            {!loadingBusySlots && busySlots.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex flex-col gap-1.5">
                <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">Already booked today for this service</p>
                {busySlots.map((s, i) => (
                  <p key={i} className="text-[12px] text-gray-700">
                    <span className="font-bold">
                      {new Date(s.checkin_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}
                      {' – '}
                      {new Date(s.checkout_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    </span>
                    {' '}— {s.make_model}{s.license_vin ? ` (${s.license_vin})` : ''} · {s.customer_name}
                  </p>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setConfirmingId(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button
                disabled={checkingConflicts}
                onClick={() => submitConfirm(bookings.find(b => b.booking_id === confirmingId))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors ${checkingConflicts ? 'opacity-70 pointer-events-none' : ''}`}
              >
                {checkingConflicts ? 'Checking Schedule…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Conflict Modal */}
      {conflictModal.isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center gap-3 p-4 border-b border-amber-100 bg-amber-50/50">
              <AlertCircle size={20} className="text-amber-500 shrink-0" />
              <h3 className="font-bold text-gray-900 text-lg">Scheduling Conflict</h3>
            </div>
            <div className="p-4 max-h-[50vh] overflow-y-auto flex flex-col gap-2">
              {conflictModal.conflicts.map((c, i) => (
                <div key={i} className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-[13px]">
                  <span className="font-bold text-gray-900">{c.service_name}</span> is already scheduled{' '}
                  <span className="font-bold">
                    {new Date(c.checkin_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    {' – '}
                    {new Date(c.checkout_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}
                  </span>{' '}
                  for <span className="font-bold">{c.make_model}{c.license_vin ? ` (${c.license_vin})` : ''}</span> — {c.customer_name}.
                </div>
              ))}
              <p className="text-[12px] text-gray-500 mt-1">This is just a heads-up — you can still proceed if this is intentional (e.g. a second team is available).</p>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
              <button
                type="button"
                onClick={() => setConflictModal({ isOpen: false, conflicts: [], booking: null, time: null })}
                className="px-5 py-2.5 text-[13px] font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleProceedDespiteConflict}
                className="px-6 py-2.5 text-[13px] font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors shadow-sm"
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancellingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-black text-rose-600 mb-2">Cancel Booking</h3>
            <p className="text-[13px] text-gray-500 mb-4">Are you sure you want to cancel? You can optionally provide a reason.</p>
            <input
              type="text"
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full text-sm font-bold text-gray-700 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 mb-6"
            />
            <div className="flex gap-3">
              <button onClick={() => setCancellingId(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                Back
              </button>
              <button onClick={() => submitCancel(bookings.find(b => b.booking_id === cancellingId))} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors">
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
