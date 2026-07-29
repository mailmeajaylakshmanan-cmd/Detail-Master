import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Globe, Search, Calendar, Car, Phone, Mail, Clock, MoreVertical, 
  CheckCircle2, XCircle, Clock4, CheckSquare 
} from 'lucide-react';
import api from '../api/axios';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

export default function WebsiteBookings() {
  const [activeTab, setActiveTab] = useState('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  // No website_bookings Postgres table/route yet — empty until connected
  const [bookings, setBookings] = useState([]);

  const isLoading = false;

  const updateStatusMutation = {
    mutate: ({ id, status }) => {
      setBookings(prev => prev.map(b => (b.id === id || b._id === id) ? { ...b, status } : b));
      toast.success('Booking status updated!');
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesTab = booking.status === activeTab;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (booking.customerName || '').toLowerCase().includes(searchLower) ||
      (booking.carMake || '').toLowerCase().includes(searchLower) ||
      (booking.carModel || '').toLowerCase().includes(searchLower);
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
            {['Pending', 'Confirmed', 'Completed', 'Cancelled'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-xl text-[13px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-600 ring-offset-1' 
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {tab}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === tab ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {bookings.filter(b => b.status === tab).length}
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
            <h2 className="text-xl font-black text-gray-900 mb-2">No {activeTab} Bookings</h2>
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
                    <tr key={booking.id} className="hover:bg-gray-50/30 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm border border-blue-100 shadow-sm shrink-0">
                            {booking.customerName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[13px] font-black text-gray-900">{booking.customerName}</p>
                            <p className="text-[11px] font-bold text-gray-500">{booking.customerPhone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-[13px] font-black text-gray-900">{booking.carMake}</p>
                        <p className="text-[11px] font-bold text-gray-500">{booking.carModel}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FCDF4C]/20 text-[#D8A700] text-[11px] font-black tracking-widest border border-[#FCDF4C]/30 shadow-sm">
                          <CheckSquare size={12} /> {booking.serviceInterested || 'General Inquiry'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5 text-[12px] font-bold text-gray-700 bg-gray-50 px-3 py-1 rounded-lg border border-gray-200">
                          <Calendar size={14} className="text-gray-400" />
                          {booking.preferredDate ? format(parseISO(booking.preferredDate), 'MMM d, yyyy') : 'No Date'}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-[200px]">
                        <p className="text-[12px] text-gray-600 font-medium truncate" title={booking.notes}>
                          {booking.notes || '—'}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          {activeTab === 'Pending' && (
                            <>
                              <button onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'Confirmed' })} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black rounded-lg transition-all shadow-sm">
                                Confirm
                              </button>
                              <button onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'Cancelled' })} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[11px] font-black rounded-lg transition-all shadow-sm">
                                Cancel
                              </button>
                            </>
                          )}
                          {activeTab === 'Confirmed' && (
                            <>
                              <button onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'Completed' })} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-lg transition-all shadow-sm">
                                Complete
                              </button>
                              <button onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'Pending' })} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 text-[11px] font-black rounded-lg transition-all shadow-sm">
                                Revert
                              </button>
                            </>
                          )}
                          {(activeTab === 'Completed' || activeTab === 'Cancelled') && (
                            <button onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'Pending' })} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 text-[11px] font-black rounded-lg transition-all shadow-sm">
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
