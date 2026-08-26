import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  IndianRupee, Calendar, Search, Activity, Users, FileText, CheckCircle2, CheckSquare, Clock, Plus, ChevronRight, MoreHorizontal, Car, Sparkles, Droplets, Shield, TrendingUp, Download
} from 'lucide-react';
import api from '../api/axios.js';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { queryKeys } from '../api/queryKeys.js';
import toast from 'react-hot-toast';
import { usePermissions } from '../hooks/usePermissions.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  const { can_view } = usePermissions('Dashboard');

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data;
    },
    enabled: can_view,
  });

  useEffect(() => {
    if (!can_view) {
      navigate('/invoices', { replace: true });
    }
  }, [can_view, navigate]);

  if (!can_view) return null;

  const handleExport = async (timeframe) => {
    try {
      setIsExporting(true);
      const toastId = toast.loading(`Generating ${timeframe} report...`);
      const response = await api.get(`/reports/services-pdf?timeframe=${timeframe}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `services-report-${timeframe}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report downloaded successfully', { id: toastId });
    } catch (error) {
      console.error('Export failed', error);
      toast.error('Failed to generate report');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Activity className="animate-spin text-blue-500 mr-2" size={24} />
        <span className="font-medium text-lg text-gray-500">Loading Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="relative animate-fade-in -m-6 p-6 min-h-screen">
      
      <div className="relative z-10 space-y-6">
        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[32px] font-medium text-gray-900 tracking-tight flex items-center gap-2">
              Hello Detailing Masters
            </h1>
            <p className="text-[14px] text-gray-800 font-medium mt-1">
              Here is your daily business overview for {format(new Date(), 'EEEE, MMM d, yyyy')}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
             <button 
               onClick={() => handleExport('day')} 
               disabled={isExporting}
               className="flex items-center gap-2 px-4 py-2 bg-[#2c2c2c] hover:bg-black text-white rounded-full text-[13px] font-semibold transition-colors disabled:opacity-50"
             >
               <Download size={14} /> Daily PDF
             </button>
             <button 
               onClick={() => handleExport('week')} 
               disabled={isExporting}
               className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-sm rounded-full text-[13px] font-semibold transition-colors disabled:opacity-50"
             >
               <Download size={14} /> Weekly PDF
             </button>
             <button 
               onClick={() => handleExport('month')} 
               disabled={isExporting}
               className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-sm rounded-full text-[13px] font-semibold transition-colors disabled:opacity-50"
             >
               <Download size={14} /> Monthly PDF
             </button>
          </div>
        </div>

        {/* ── Top Stat Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
           {/* BIG PROFIT CARD (Takes up 2 columns) */}
           <div className="md:col-span-2 bg-black/90 backdrop-blur-3xl border border-white/10 rounded-[32px] p-6 lg:p-8 flex flex-col justify-between text-white shadow-xl shadow-black/20 relative overflow-hidden h-[160px]">
             <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>
             <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-[#fcdf4c]/10 rounded-full blur-2xl"></div>
             
             <div className="flex justify-between items-start relative z-10">
               <h2 className="text-[14px] font-bold text-white/90 tracking-wide uppercase">Live Profit / Revenue</h2>
               <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors">
                 <TrendingUp size={14} className="text-[#fcdf4c]" />
               </div>
             </div>
             
             <div className="relative z-10 flex items-baseline justify-between w-full mt-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-[44px] font-black tracking-tight leading-none">₹{(data?.revenue || 0).toLocaleString('en-IN')}</span>
                  <span className="text-[13px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-400/10 px-2 py-1 rounded-lg">
                    <TrendingUp size={12}/> 12%
                  </span>
                </div>
                
                {/* Mini bar chart */}
                <div className="hidden sm:flex items-end gap-1.5 opacity-90 h-[40px]">
                  {[4, 6, 3, 7, 5, 8, 4, 9, 6, 8, 5, 7, 4].map((h, i) => (
                    <div key={i} className="w-2.5 rounded-t-sm bg-[#fcdf4c]" style={{ height: `${h * 10}%` }}></div>
                  ))}
                </div>
             </div>
           </div>

           {/* NORMAL STAT CARDS */}
           <StatCard title="Today's Visits" value={data?.todayInvoices || '0'} subtext="vehicles today" type="yellow" />
           <StatCard title="Pending Balance" value={`₹${(data?.pending || 0).toLocaleString('en-IN')}`} subtext={`${data?.openInvoices || 0} unpaid invoices`} type="light" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* ── Left Column: Today's Schedule ── */}
          <div className="lg:col-span-1 bg-white/40 backdrop-blur-3xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] rounded-[32px] p-6 lg:p-8 flex flex-col h-auto lg:h-[520px] max-h-[520px]">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-[18px] font-medium text-gray-900 tracking-tight">Schedule</h2>
              <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center cursor-pointer">
                <ChevronRight size={14} className="text-gray-400" />
              </div>
            </div>
            
            <div className="flex gap-4 mb-6 text-[12px] font-bold text-gray-800 border-b border-gray-400/30 pb-2">
              <div className="flex flex-col items-center">
                <span>Sun</span>
                <span>22</span>
              </div>
              <div className="flex flex-col items-center">
                <span>Mon</span>
                <span>23</span>
              </div>
              <div className="flex flex-col items-center">
                <span>Tue</span>
                <span>24</span>
              </div>
              <div className="flex flex-col items-center text-gray-900">
                <span>Wed</span>
                <span className="text-[16px] font-bold">25</span>
              </div>
              <div className="flex flex-col items-center">
                <span>Thu</span>
                <span>26</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar relative pl-6 border-l-2 border-dashed border-gray-100 ml-2">
               {data?.schedule && data.schedule.length > 0 ? (
                 data.schedule.map((item, i) => {
                   const isFirst = i === 0;
                   return (
                     <div key={item.booking_id || i} className="relative">
                       <div className={`absolute -left-[30px] top-1 w-4 h-4 rounded-full ${isFirst ? 'bg-[#2c2c2c]' : 'bg-gray-200'} ring-4 ring-white`}></div>
                       <div className={`${isFirst ? 'bg-[#2c2c2c] text-white' : 'bg-white border border-gray-100 shadow-sm text-gray-900'} p-4 rounded-2xl`}>
                          <h3 className={`text-[14px] font-medium mb-1 ${isFirst ? '' : 'text-gray-900'}`}>{item.vehicle_brand} {item.vehicle_model}</h3>
                          <p className={`text-[11px] font-medium ${isFirst ? 'text-gray-300' : 'text-gray-800'}`}>
                             {item.allocated_time || 'TBD'} • {item.service_name || 'No service specified'}
                          </p>
                       </div>
                     </div>
                   );
                 })
               ) : (
                 <div className="text-gray-500 text-sm font-medium">No upcoming appointments</div>
               )}
            </div>
          </div>

          {/* ── Right Column: Services & Stats ── */}
          <div className="lg:col-span-2 flex flex-col gap-6 h-auto lg:h-[520px]">
            
            {/* Services Table */}
            <div className="bg-white/40 backdrop-blur-3xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] rounded-[32px] p-6 lg:p-8 flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[18px] font-medium text-gray-900 tracking-tight">Active Services</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" size={14} />
                  <input type="text" placeholder="Search" className="pl-8 pr-4 py-1.5 bg-gray-50 rounded-full text-[12px] border-none focus:ring-0" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {/* Desktop Table */}
                <div className="hidden lg:block">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[11px] font-bold text-gray-800 uppercase tracking-wider border-b border-gray-400/30">
                        <th className="pb-3 font-medium">Customer</th>
                        <th className="pb-3 font-medium">Vehicle</th>
                        <th className="pb-3 font-medium">Service</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.activeServices && data.activeServices.length > 0 ? (
                        data.activeServices.map((item, i) => {
                          let statusColor = 'bg-gray-100 text-gray-500';
                          if (item.status === 'in_progress') statusColor = 'bg-emerald-50 text-emerald-600';
                          if (item.status === 'draft') statusColor = 'bg-[#fcdf4c]/20 text-[#D8A700]';
                          if (item.status === 'pending') statusColor = 'bg-orange-50 text-orange-600';
                          return (
                            <tr key={item.id || i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                              <td className="py-3">
                                <div className="flex items-center gap-3">
                                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.customer_name || 'Unknown')}&background=random&color=fff`} alt="" className="w-8 h-8 rounded-full" />
                                  <span className="text-[13px] font-medium text-gray-900">{item.customer_name}</span>
                                </div>
                              </td>
                              <td className="py-3 text-[13px] text-gray-900 font-medium">{item.vehicle_name || 'N/A'}</td>
                              <td className="py-3 text-[13px] text-gray-900 font-medium">{item.service_name || 'N/A'}</td>
                              <td className="py-3">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-semibold ${statusColor} capitalize`}>
                                  • {item.status.replace('_', ' ')}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="4" className="py-4 text-center text-sm font-medium text-gray-500">No active services</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Carousel */}
                <div className="flex lg:hidden overflow-x-auto snap-x gap-4 pb-2 hide-scrollbar">
                  {data?.activeServices && data.activeServices.length > 0 ? (
                    data.activeServices.map((item, i) => {
                      let statusColor = 'bg-gray-100 text-gray-500';
                      if (item.status === 'in_progress') statusColor = 'bg-emerald-50 text-emerald-600';
                      if (item.status === 'draft') statusColor = 'bg-[#fcdf4c]/20 text-[#D8A700]';
                      if (item.status === 'pending') statusColor = 'bg-orange-50 text-orange-600';
                      
                      return (
                        <div key={item.id || i} className="snap-center shrink-0 w-[240px] bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.customer_name || 'Unknown')}&background=random&color=fff`} alt="" className="w-7 h-7 rounded-full" />
                              <span className="text-[13px] font-bold text-gray-900 truncate max-w-[110px]">{item.customer_name}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${statusColor}`}>
                              {item.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-xl">
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-700 font-medium">
                              <Car size={12} className="text-gray-400 shrink-0" /> <span className="truncate">{item.vehicle_name || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-700 font-medium">
                              <Sparkles size={12} className="text-gray-400 shrink-0" /> <span className="truncate">{item.service_name || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="w-full text-center text-sm font-medium text-gray-500 py-4">No active services</div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Section: Report & Composition */}
            <div className="flex gap-6 shrink-0 w-full">
               {/* Service Composition Donut */}
               <div className="w-full bg-white/40 backdrop-blur-3xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] rounded-[32px] p-6 flex flex-col items-center justify-center relative min-h-[180px]">
                  <h2 className="text-[14px] font-bold text-gray-900 absolute top-6 left-6 uppercase tracking-wide">Service Mix Overview</h2>
                  <div className="flex flex-col sm:flex-row items-center gap-12 mt-8 sm:mt-0">
                   {(() => {
                      const totalMix = data?.serviceMix?.reduce((acc, curr) => acc + curr.count, 0) || 0;
                      const mixColors = ['bg-[#fcdf4c]', 'bg-[#2c2c2c]', 'bg-gray-400'];
                      return (
                        <>
                          <div className="relative w-28 h-28">
                            <div className="absolute inset-0 rounded-full border-8 border-gray-100"></div>
                            {data?.serviceMix?.length > 0 && (
                               <div className="absolute inset-0 rounded-full border-8 border-[#2c2c2c] border-l-transparent border-t-transparent border-r-transparent -rotate-45"></div>
                            )}
                            {data?.serviceMix?.length > 1 && (
                               <div className="absolute inset-0 rounded-full border-8 border-[#fcdf4c] border-b-transparent border-t-transparent border-r-transparent rotate-12"></div>
                            )}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-[24px] font-black text-gray-900">{totalMix}</span>
                              <span className="text-[10px] text-gray-800 font-bold uppercase">Total</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-4 text-[13px] font-bold text-gray-800">
                            {data?.serviceMix?.slice(0, 3).map((mix, idx) => {
                              const percentage = totalMix > 0 ? Math.round((mix.count / totalMix) * 100) : 0;
                              return (
                                <div key={idx} className="flex items-center gap-3">
                                  <span className={`w-3.5 h-3.5 rounded-full ${mixColors[idx] || 'bg-gray-200'}`}></span>
                                  <span className="w-32 truncate">{mix.service_name}</span>
                                  <span className="text-gray-900 text-[16px] font-black">{percentage}%</span>
                                </div>
                              );
                            })}
                            {!data?.serviceMix?.length && <span className="text-gray-500 font-medium text-[13px]">No data available</span>}
                          </div>
                        </>
                      );
                   })()}
                  </div>
               </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtext, type }) {
  let bgClass = "bg-white/40 backdrop-blur-3xl border border-white/50 text-gray-900 shadow-[0_8px_32px_rgba(0,0,0,0.04)]";
  let titleClass = "text-gray-800 font-bold";
  let subtextClass = "text-gray-800 font-medium";
  let barColor = "bg-gray-400/30";
  let barFill = "bg-gray-900";

  if (type === 'dark') {
    bgClass = "bg-black/40 backdrop-blur-3xl border border-white/10 text-white shadow-xl shadow-black/10";
    titleClass = "text-white font-bold";
    subtextClass = "text-gray-200 font-medium";
    barColor = "bg-white/20";
    barFill = "bg-[#fcdf4c]";
  } else if (type === 'yellow') {
    bgClass = "bg-[#fcdf4c]/60 backdrop-blur-3xl border border-white/40 text-gray-900 shadow-xl shadow-[#fcdf4c]/10";
    titleClass = "text-gray-900 font-bold";
    subtextClass = "text-gray-900 font-medium";
    barColor = "bg-black/20";
    barFill = "bg-gray-900";
  }

  return (
    <div className={`rounded-[32px] p-6 lg:p-7 flex flex-col justify-between h-[160px] ${bgClass}`}>
      <div className="flex justify-between items-center">
        <span className={`text-[12px] font-medium ${titleClass}`}>{title}</span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${type === 'dark' ? 'bg-white/10' : type === 'yellow' ? 'bg-black/10' : 'bg-gray-50 border border-gray-100'}`}>
          <span className="text-[10px] font-bold">...</span>
        </div>
      </div>
      
      <div>
        <div className="flex items-end gap-2 mb-2">
          <h3 className="text-[40px] font-light leading-none tracking-tight">{value}</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex-1 h-1 rounded-full overflow-hidden ${barColor}`}>
             <div className={`h-full w-2/3 rounded-full ${barFill}`}></div>
          </div>
          <span className={`text-[10px] font-medium ${subtextClass}`}>{subtext}</span>
        </div>
      </div>
    </div>
  );
}
