import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  IndianRupee, Calendar, Search, Activity, Users, FileText, CheckCircle2, CheckSquare, Clock, Plus, ChevronRight, MoreHorizontal, Car, Sparkles, Droplets, Shield, TrendingUp, Download
} from 'lucide-react';
import api from '../api/axios.js';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { queryKeys } from '../api/queryKeys.js';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data;
    },
  });

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <StatCard title="Total Jobs" value={data?.totalInvoices || '0'} subtext={`${data?.openInvoices || 0} open`} type="dark" />
          <StatCard title="Today's Visits" value={data?.todayInvoices || '0'} subtext="today" type="yellow" />
          <StatCard title="Completed" value={data?.completedJobs || '0'} subtext="all time" type="light" />
          <StatCard title="Total Customers" value={data?.totalCustomers || '0'} subtext={`${data?.totalOrganizations || 0} orgs`} type="light" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* ── Left Column: Today's Schedule ── */}
          <div className="lg:col-span-1 bg-white/40 backdrop-blur-3xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] rounded-[32px] p-6 lg:p-8 flex flex-col h-[520px]">
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
               {/* Timeline Item 1 */}
               <div className="relative">
                 <div className="absolute -left-[30px] top-1 w-4 h-4 rounded-full bg-[#2c2c2c] ring-4 ring-white"></div>
                 <div className="bg-[#2c2c2c] text-white p-4 rounded-2xl">
                    <h3 className="text-[14px] font-medium mb-1">Porsche 911</h3>
                    <p className="text-[11px] text-gray-300 font-medium">09:30am - 10:30am • Ceramic Coating</p>
                 </div>
               </div>
               {/* Timeline Item 2 */}
               <div className="relative">
                 <div className="absolute -left-[30px] top-1 w-4 h-4 rounded-full bg-gray-200 ring-4 ring-white"></div>
                 <div className="bg-white border border-gray-100 shadow-sm p-4 rounded-2xl">
                    <h3 className="text-[14px] font-medium text-gray-900 mb-1">Range Rover</h3>
                    <p className="text-[11px] text-gray-800 font-medium">11:30am - 01:00pm • Interior Deep Clean</p>
                 </div>
               </div>
               {/* Timeline Item 3 */}
               <div className="relative">
                 <div className="absolute -left-[30px] top-1 w-4 h-4 rounded-full bg-[#fcdf4c] ring-4 ring-white"></div>
                 <div className="bg-white border border-gray-100 shadow-sm p-4 rounded-2xl">
                    <h3 className="text-[14px] font-medium text-gray-900 mb-1">BMW X5</h3>
                    <p className="text-[11px] text-gray-800 font-medium">02:00pm - 05:00pm • Wash & Wax</p>
                 </div>
               </div>
            </div>
          </div>

          {/* ── Right Column: Services & Stats ── */}
          <div className="lg:col-span-2 flex flex-col gap-6 h-[520px]">
            
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
                    {[
                      { name: 'Yulia Polishchuk', vehicle: 'Porsche 911', service: 'Ceramic 3yr', status: 'In Progress', statusColor: 'bg-emerald-50 text-emerald-600' },
                      { name: 'Bogdan Nikitin', vehicle: 'Range Rover', service: 'Interior Deep', status: 'Waiting', statusColor: 'bg-gray-100 text-gray-500' },
                      { name: 'Daria Yurchenko', vehicle: 'BMW X5', service: 'Wash & Wax', status: 'Pending', statusColor: 'bg-[#fcdf4c]/20 text-[#D8A700]' },
                    ].map((item, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <img src={`https://ui-avatars.com/api/?name=${item.name}&background=random&color=fff`} alt="" className="w-8 h-8 rounded-full" />
                            <span className="text-[13px] font-medium text-gray-900">{item.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-[13px] text-gray-900 font-medium">{item.vehicle}</td>
                        <td className="py-3 text-[13px] text-gray-900 font-medium">{item.service}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-semibold ${item.statusColor}`}>
                            • {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Section: Report & Composition */}
            <div className="flex flex-col sm:flex-row gap-6 h-[180px] shrink-0">
               {/* Revenue / Report Card (Dark Theme) */}
               <div className="flex-1 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[32px] p-6 lg:p-8 flex flex-col justify-between text-white shadow-xl shadow-black/10 relative overflow-hidden">
                 <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                 <div className="flex justify-between items-start relative z-10">
                   <h2 className="text-[16px] font-medium text-white/90">Revenue Report</h2>
                   <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors">
                     <ChevronRight size={14} className="text-white" />
                   </div>
                 </div>
                 <div className="relative z-10 flex items-baseline gap-3">
                    <span className="text-4xl font-light">₹{(data?.revenue || 38420).toLocaleString('en-IN')}</span>
                    <span className="text-[12px] text-emerald-400 flex items-center gap-1"><TrendingUp size={12}/> 12%</span>
                 </div>
                 <div className="flex items-end gap-1 mt-2 opacity-80 h-10">
                    {[4, 6, 3, 7, 5, 8, 4, 9, 6, 8, 5, 7, 4].map((h, i) => (
                      <div key={i} className="w-2 rounded-t-sm bg-[#fcdf4c]" style={{ height: `${h * 10}%` }}></div>
                    ))}
                 </div>
               </div>

               {/* Service Composition Donut */}
               <div className="w-full sm:w-[240px] bg-white/40 backdrop-blur-3xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] rounded-[32px] p-6 flex flex-col items-center justify-center relative">
                  <h2 className="text-[14px] font-medium text-gray-900 absolute top-6 left-6">Service Mix</h2>
                  <div className="relative w-24 h-24 mt-6">
                    {/* Fake Donut */}
                    <div className="absolute inset-0 rounded-full border-8 border-gray-100"></div>
                    <div className="absolute inset-0 rounded-full border-8 border-[#2c2c2c] border-l-transparent border-t-transparent border-r-transparent -rotate-45"></div>
                    <div className="absolute inset-0 rounded-full border-8 border-[#fcdf4c] border-b-transparent border-t-transparent border-r-transparent rotate-12"></div>
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[20px] font-medium text-gray-900">248</span>
                      <span className="text-[9px] text-gray-800 font-medium">Total</span>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-4 text-[11px] font-bold text-gray-800">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#fcdf4c]"></span> 70%</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#2c2c2c]"></span> 30%</span>
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
