import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  IndianRupee, Calendar, Search, Activity, Users, FileText, CheckCircle2, CheckSquare, Clock, Plus, ChevronRight, MoreHorizontal, Car, Sparkles, Droplets, Shield, TrendingUp
} from 'lucide-react';
import api from '../api/axios.js';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { queryKeys } from '../api/queryKeys.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.invoices.list({ page: 1, limit: 50, dashboard: true }),
    queryFn: async () => {
      const res = await api.get('/invoices', { params: { page: 1, limit: 50 } });
      const rows = Array.isArray(res.data?.invoices) ? res.data.invoices : [];
      return {
        revenue: rows.reduce((s, i) => s + Number(i.grand_total || 0) - Number(i.balance_due || 0), 0),
        pending: rows.reduce((s, i) => s + Number(i.balance_due || 0), 0),
        totalJobs: res.data?.pagination?.total ?? rows.length,
        todaysBookings: [],
        recentActivity: [],
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Activity className="animate-spin text-blue-500 mr-2" size={24} />
        <span className="font-medium text-lg text-gray-500">Loading Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="relative animate-fade-in -m-6 p-6">
      
      {/* ── Background Blueprint Layer ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-[0.05]" style={{
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.8) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }}>
        {/* Fake Blueprint Graphic */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] border border-black rounded-[100px] flex items-center justify-center">
           <Car size={300} className="text-black stroke-[0.5]" />
        </div>
      </div>

      <div className="relative z-10 space-y-6">
        {/* ── Page Header ── */}
        <div className="flex flex-col gap-1 mb-8">
          <p className="text-gray-500 text-[13px] font-bold uppercase tracking-widest">Executive Dashboard</p>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Business Overview</h1>
            <Sparkles className="text-[#FCDF4C]" size={24} />
          </div>
          <p className="text-[13px] text-gray-500 font-bold flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            {format(new Date(), 'EEEE, MMM d, yyyy')} • All systems operational
          </p>
        </div>

        {/* ── Top Stat Grid (5 Cards) ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
          <StatCard title="Total Jobs" value={data?.totalJobs || '0'} subtext="+ 3 Today" icon={FileText} trend="up" />
          <StatCard title="In Queue" value="4" subtext="14 min avg" icon={Clock} trend="neutral" />
          <StatCard title="Completed" value={data?.totalJobs || '0'} subtext="On Track" icon={CheckCircle2} trend="up" />
          <StatCard title="Total Customers" value="248" subtext="+ 8 This Month" icon={Users} trend="up" />
          <StatCard title="Revenue Today" value={`₹${(data?.revenue || 0).toLocaleString('en-IN')}`} subtext="+ 12%" icon={IndianRupee} trend="up" highlight />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* ── Left Column: Today's Jobs ── */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl shadow-xl shadow-gray-200/40 rounded-3xl border border-white/60 p-6 lg:p-8 flex flex-col h-[520px]">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-[18px] font-black text-gray-900 tracking-tight">Today's Jobs</h2>
                <p className="text-[13px] font-bold text-gray-400 mt-1 uppercase tracking-wider">{data?.todaysBookings.length} Scheduled • 6 Completed</p>
              </div>
              <div className="flex items-center bg-gray-100/80 rounded-xl p-1.5 border border-white/60 shadow-inner">
                <button className="px-4 py-1.5 bg-white shadow-sm rounded-lg text-[12px] font-bold text-gray-900 uppercase tracking-widest">All</button>
                <button className="px-4 py-1.5 text-gray-500 hover:text-gray-900 text-[12px] font-bold uppercase tracking-widest transition-colors">Upcoming</button>
                <button className="px-4 py-1.5 text-gray-500 hover:text-gray-900 text-[12px] font-bold uppercase tracking-widest transition-colors">Done</button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {data?.todaysBookings.length > 0 ? data.todaysBookings.map((job, idx) => (
                <div key={job.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50/50 hover:bg-white rounded-2xl transition-all border border-gray-100 hover:border-[#FCDF4C]/50 hover:shadow-lg hover:shadow-[#FCDF4C]/10 cursor-pointer">
                  
                  <div className="flex items-center gap-5 w-full sm:w-[45%]">
                    <div className="text-[12px] font-bold text-gray-400 w-16">{job.time}</div>
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-800 shrink-0 border border-gray-100 group-hover:scale-105 transition-transform group-hover:text-[#D8A700] group-hover:bg-[#FCDF4C]/20">
                      <Car size={24} />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-black text-gray-900">{job.customer}</h3>
                      <p className="text-[12px] font-bold text-gray-500 mt-1 flex items-center gap-1.5">
                        <span className="text-gray-800">{job.car}</span> <span className="text-gray-300">•</span> {job.service}
                      </p>
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-[20%] flex justify-start sm:justify-center mt-3 sm:mt-0 ml-21 sm:ml-0">
                    <span className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border ${
                      idx === 0 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                        : 'bg-amber-50 text-amber-600 border-amber-200'
                    }`}>
                      {idx === 0 ? 'In Progress' : 'Waiting'}
                    </span>
                  </div>
                  
                  <div className="w-full sm:w-[25%] flex items-center gap-3 mt-3 sm:mt-0 ml-21 sm:ml-0">
                    <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white overflow-hidden shadow-sm">
                      <img src={`https://ui-avatars.com/api/?name=${job.staff}&background=random&color=fff`} alt="staff" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[13px] font-bold text-gray-700">{job.staff}</span>
                  </div>
                  
                  <div className="w-[10%] hidden sm:flex justify-end">
                    <button className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <div className="w-20 h-20 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                    <Calendar size={32} className="text-gray-300" />
                  </div>
                  <p className="text-[14px] font-bold text-gray-500">No bookings scheduled for today.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right Column ── */}
          <div className="flex flex-col gap-6 h-[520px]">
            
            {/* Service Queue */}
            <div className="bg-white/80 backdrop-blur-xl shadow-xl shadow-gray-200/40 rounded-3xl border border-white/60 p-6 lg:p-8 flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[16px] font-black text-gray-900 tracking-tight">Service Queue</h2>
                <Link to="/invoices" className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 transition-colors">
                  <ChevronRight size={14} />
                </Link>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                {[
                  { name: 'Porsche 911', service: 'Ceramic 3yr', time: 'In Room', status: 'Active', color: 'emerald' },
                  { name: 'Range Rover', service: 'Interior Deep', time: '8 min', status: 'Waiting', color: 'amber' },
                  { name: 'BMW X5', service: 'Wash & Wax', time: '22 min', status: 'Waiting', color: 'amber' },
                  { name: 'Audi e-tron', service: 'PPF Front', time: 'Just In', status: 'Check-In', color: 'cyan' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-[#FCDF4C]/50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-[#FCDF4C]/10 group-hover:text-[#D8A700] transition-colors">
                        <Car size={18} className="text-gray-600 group-hover:text-[#D8A700]" />
                      </div>
                      <div>
                        <h4 className="text-[13px] font-black text-gray-900">{item.name}</h4>
                        <p className="text-[11px] font-bold text-gray-400 mt-0.5">{item.service}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                        item.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        item.color === 'amber' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        'bg-cyan-50 text-cyan-600 border border-cyan-100'
                      }`}>
                        {item.status}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Service Breakdown Donut */}
            <div className="bg-white/80 backdrop-blur-xl shadow-xl shadow-gray-200/40 rounded-3xl border border-white/60 p-6 lg:p-8 shrink-0 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-black text-gray-900 mb-1">Service Breakdown</h2>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Total 248 Jobs</p>
                <div className="flex flex-col gap-2 text-[11px] font-bold">
                  <div className="flex items-center gap-2 text-gray-600"><div className="w-2 h-2 rounded-full bg-[#10b981]" /> Wash (57%)</div>
                  <div className="flex items-center gap-2 text-gray-600"><div className="w-2 h-2 rounded-full bg-[#FCDF4C]" /> Polish (27%)</div>
                  <div className="flex items-center gap-2 text-gray-600"><div className="w-2 h-2 rounded-full bg-[#3b82f6]" /> Coating (16%)</div>
                </div>
              </div>
              {/* CSS Donut Chart */}
              <div className="relative w-28 h-28 rounded-full" style={{
                background: `conic-gradient(
                  #10b981 0% 57%, 
                  #FCDF4C 57% 84%, 
                  #3b82f6 84% 100%
                )`
              }}>
                <div className="absolute inset-[15%] bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                  <span className="text-xl font-black text-gray-900">248</span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Jobs</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
          
          <div className="bg-white/80 backdrop-blur-xl shadow-xl shadow-gray-200/40 rounded-3xl border border-white/60 p-6 lg:p-8 flex flex-col h-[260px] overflow-hidden relative">
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                <h2 className="text-[16px] font-black text-gray-900 tracking-tight">Revenue Analytics</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-2xl font-black text-gray-900">₹38,420</span>
                  <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-black flex items-center gap-1"><TrendingUp size={12}/> +14.2%</span>
                </div>
              </div>
              <div className="flex items-center bg-gray-100/80 rounded-xl p-1 border border-white/60">
                <button className="px-3 py-1 bg-white shadow-sm rounded-lg text-[10px] font-bold text-gray-900 uppercase tracking-widest">W</button>
                <button className="px-3 py-1 text-gray-500 hover:text-gray-900 text-[10px] font-bold uppercase tracking-widest">M</button>
                <button className="px-3 py-1 text-gray-500 hover:text-gray-900 text-[10px] font-bold uppercase tracking-widest">Y</button>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-32 flex items-end opacity-90">
               {/* Vibrant Green Area Chart */}
               <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 100">
                 <path d="M0,80 C50,60 100,90 150,50 C200,10 250,70 300,40 C350,20 400,30 400,30" fill="none" stroke="#10b981" strokeWidth="4" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                 <path d="M0,80 C50,60 100,90 150,50 C200,10 250,70 300,40 C350,20 400,30 400,30 L400,100 L0,100 Z" fill="url(#gradientRev)" stroke="none" />
                 <defs>
                   <linearGradient id="gradientRev" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                     <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                   </linearGradient>
                 </defs>
               </svg>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl shadow-xl shadow-gray-200/40 rounded-3xl border border-white/60 p-6 lg:p-8 flex flex-col h-[260px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[16px] font-black text-gray-900">Pending Tasks</h2>
              <Link to="/" className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600">
                <ChevronRight size={14} />
              </Link>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-white hover:border-gray-200 transition-colors">
                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm"><CheckSquare size={18} className="text-gray-400" /></div>
                  <div>
                    <h4 className="text-[13px] font-black text-gray-900">Mustang GT</h4>
                    <p className="text-[11px] font-bold text-gray-500">Ceramic Follow-up</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-md border border-rose-100 uppercase tracking-widest">Overdue</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-white hover:border-gray-200 transition-colors">
                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm"><CheckSquare size={18} className="text-gray-400" /></div>
                  <div>
                    <h4 className="text-[13px] font-black text-gray-900">Civic Type R</h4>
                    <p className="text-[11px] font-bold text-gray-500">Annual Maintenance</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-amber-500 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 uppercase tracking-widest">Tmw</span>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl shadow-xl shadow-gray-200/40 rounded-3xl border border-white/60 p-6 lg:p-8 flex flex-col h-[260px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[16px] font-black text-gray-900">Inventory Alerts</h2>
              <Link to="/" className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600">
                <ChevronRight size={14} />
              </Link>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between p-3 bg-rose-50/30 rounded-2xl border border-rose-100">
                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0"><Droplets size={18} className="text-rose-500" /></div>
                  <div>
                    <h4 className="text-[13px] font-black text-gray-900">Meguiar's Polish</h4>
                    <p className="text-[11px] font-bold text-gray-500">2 Bottles Left</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Low</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50/30 rounded-2xl border border-amber-100">
                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0"><Shield size={18} className="text-amber-500" /></div>
                  <div>
                    <h4 className="text-[13px] font-black text-gray-900">Ceramic Kit</h4>
                    <p className="text-[11px] font-bold text-gray-500">5 Kits Left</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Warn</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, subtext, trend, highlight }) {
  return (
    <div className={`relative bg-white/90 backdrop-blur-xl shadow-xl shadow-gray-200/50 rounded-3xl p-5 lg:p-6 flex flex-col overflow-hidden border ${highlight ? 'border-[#FCDF4C] ring-4 ring-[#FCDF4C]/20' : 'border-white/60'}`}>
      
      {highlight && (
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#FCDF4C] opacity-20 blur-3xl rounded-full"></div>
      )}

      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${highlight ? 'bg-[#FCDF4C] text-gray-900' : 'bg-gray-50 border border-gray-100 text-gray-500'}`}>
          <Icon size={18} />
        </div>
        {trend === 'up' && (
          <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 uppercase tracking-widest">
            <TrendingUp size={10} /> {subtext}
          </span>
        )}
        {trend === 'neutral' && (
          <span className="flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 uppercase tracking-widest">
            {subtext}
          </span>
        )}
      </div>
      
      <div className="flex flex-col relative z-10">
        <h3 className="text-3xl font-black text-gray-900 tracking-tighter leading-none mb-2">{value}</h3>
        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">{title}</p>
      </div>
    </div>
  );
}
