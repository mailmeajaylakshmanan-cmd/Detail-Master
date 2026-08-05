import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe, Search, Calendar, Car, Phone, Mail, Clock, MoreVertical,
  CheckCircle2, XCircle, Clock4, CheckSquare, PenSquare, Check, X as XIcon
} from 'lucide-react';
import api from '../api/axios';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

export default function WebsiteBookings() {
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [reschedulingId, setReschedulingId] = useState(null);
  const [rescheduleValue, setRescheduleValue] = useState('');
  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['web_bookings'],
    queryFn: async () => {
      const res = await api.get('/web_bookings');
      return res.data;
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await api.put(`/web_bookings/${id}`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['web_bookings']);
      toast.success('Booking status updated!');
    },
    onError: (err) => {
      toast.error('Failed to update booking status.');
    }
  });

  const navigate = useNavigate();

  const convertBookingMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/web_bookings/${id}/convert`, {
        // You could open a modal here to collect amount_paid, payment_method, discount, etc.
        // For now, doing a direct conversion with no initial payment.
      });
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
      toast.success('Booking rescheduled — customer notified by email');
      setReschedulingId(null);
    },
    onError: () => toast.error('Failed to reschedule booking')
  });

  const startReschedule = (booking) => {
    setReschedulingId(booking.booking_id);
    setRescheduleValue(booking.preferred_date ? booking.preferred_date.slice(0, 10) : '');
  };

  const confirmReschedule = (id) => {
    if (!rescheduleValue) return;
    rescheduleMutation.mutate({ id, preferred_date: rescheduleValue });
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

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pending': return 'bg-[#FCDF4C]/20 text-[#D8A700] border-[#FCDF4C]/30';
      case 'Confirmed': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'Completed': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'Cancelled': return 'bg-rose-50 text-rose-600 border-rose-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Pending': return <Clock4 size={14} className="mr-1" />;
      case 'Confirmed': return <CheckSquare size={14} className="mr-1" />;
      case 'Completed': return <CheckCircle2 size={14} className="mr-1" />;
      case 'Cancelled': return <XCircle size={14} className="mr-1" />;
      default: return null;
    }
  };

  return (
    <div className="relative animate-fade-in -m-6 p-6 min-h-[calc(100vh-140px)]">
      
      {/* ── Background Blueprint Layer (Transparent to show global background) ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.8) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}></div>
        {/* Fake Blueprint Graphic */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] border border-black/50 rounded-[100px] flex items-center justify-center opacity-[0.03]">
           <Car size={300} className="text-black stroke-[0.5]" />
        </div>
      </div>

      <div className="relative z-10 space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col gap-2 mb-8">
          <div className="inline-flex items-center w-fit px-3 py-1 bg-white/80 backdrop-blur-xl border border-white rounded-full shadow-sm">
            <span className="text-blue-600 text-[12px] font-black uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
              Leads & Inquiries
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Website Bookings</h1>
              <Globe className="text-[#3b82f6]" size={28} />
            </div>
          </div>
        </div>

        {/* ── Controls row ── */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          {/* Tabs */}
          <div className="flex items-center bg-white/90 backdrop-blur-xl rounded-2xl p-1.5 border border-gray-100 shadow-xl shadow-gray-200/50">
            {[
              { id: 'pending', label: 'Pending' }, 
              { id: 'confirmed', label: 'Confirmed' }, 
              { id: 'converted', label: 'Completed' }, 
              { id: 'cancelled', label: 'Cancelled' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-2.5 rounded-xl text-[13px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-600 ring-offset-1' 
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {tab.label}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {bookings.filter(b => b.status === tab.id).length}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-auto flex items-center group">
            <Search className="absolute left-4 text-blue-500 z-10 transition-transform group-focus-within:scale-110" size={20} />
            <input 
              type="text" 
              placeholder="Search by name, car..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-80 pl-11 pr-4 py-3.5 bg-white backdrop-blur-xl border-2 border-gray-200 rounded-2xl text-[15px] font-black text-gray-900 shadow-xl shadow-gray-200/40 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400 placeholder:font-bold"
            />
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
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden pb-4">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                    <th className="px-6 py-4">Customer Info</th>
                    <th className="px-6 py-4">Vehicle</th>
                    <th className="px-6 py-4">Interested Service</th>
                    <th className="px-6 py-4">Requested Date</th>
                    <th className="px-6 py-4">Notes</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredBookings.map(booking => (
                    <tr key={booking.booking_id} className="hover:bg-gray-50/30 transition-colors group">
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
                            <button onClick={() => confirmReschedule(booking.booking_id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100">
                              <Check size={14} />
                            </button>
                            <button onClick={() => setReschedulingId(null)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200">
                              <XIcon size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[12px] font-bold text-gray-700 bg-gray-50 px-3 py-1 rounded-lg border border-gray-200 group/date">
                            <Calendar size={14} className="text-gray-400" />
                            {booking.preferred_date ? format(parseISO(booking.preferred_date), 'MMM d, yyyy') : 'No Date'}
                            <button onClick={() => startReschedule(booking)} title="Reschedule" className="ml-1 text-gray-400 hover:text-blue-600">
                              <PenSquare size={13} />
                            </button>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-[200px]">
                        <p className="text-[12px] text-gray-600 font-medium truncate" title={booking.additional_notes}>
                          {booking.additional_notes || '—'}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          {activeTab === 'pending' && (
                            <>
                              <button onClick={() => updateStatusMutation.mutate({ id: booking.booking_id, status: 'confirmed' })} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black rounded-lg transition-all shadow-sm">
                                Confirm
                              </button>
                              <button onClick={() => updateStatusMutation.mutate({ id: booking.booking_id, status: 'cancelled' })} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[11px] font-black rounded-lg transition-all shadow-sm">
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
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-lg transition-all shadow-sm flex items-center gap-1 disabled:opacity-50"
                              >
                                {convertBookingMutation.isPending && convertBookingMutation.variables === booking.booking_id ? <Globe className="animate-spin" size={12} /> : null}
                                Convert to Invoice
                              </button>
                              <button onClick={() => updateStatusMutation.mutate({ id: booking.booking_id, status: 'pending' })} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 text-[11px] font-black rounded-lg transition-all shadow-sm">
                                Revert
                              </button>
                            </>
                          )}
                          {(activeTab === 'converted' || activeTab === 'cancelled') && (
                            <button onClick={() => updateStatusMutation.mutate({ id: booking.booking_id, status: 'pending' })} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 text-[11px] font-black rounded-lg transition-all shadow-sm">
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
        )}
      </div>
    </div>
  );
}
