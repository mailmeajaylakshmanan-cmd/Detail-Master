import { Calendar, IndianRupee, Car, History, Clock3, Award } from 'lucide-react';



export default function StatsGrid({ totalVisits, totalSpend, activeVehicles, lastVisit, nextService, loyaltyPoints }) {
  return (
    <div className="flex flex-col gap-3 shrink-0">
      <div className="grid grid-cols-2 gap-3">
        {/* Total Spend */}
        <div className="bg-black p-4 lg:p-5 rounded-[20px] text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[110px] hover:shadow-lg transition-shadow">
          <IndianRupee className="absolute -right-4 -bottom-4 opacity-[0.07] text-white" size={100} />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Spend</span>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
              <IndianRupee size={14} className="text-[#F6CB59]" />
            </div>
          </div>
          <div className="mt-2 relative z-10">
            <div className="text-[24px] lg:text-[28px] font-black tracking-tight leading-none">₹{totalSpend.toLocaleString('en-IN')}</div>
            <div className="text-[9px] lg:text-[10px] font-bold text-gray-400 mt-1.5 uppercase tracking-wider">Top 20% Spender</div>
          </div>
        </div>

        {/* Total Visits */}
        <div className="bg-[#F6CB59] p-4 lg:p-5 rounded-[20px] text-black shadow-md relative overflow-hidden flex flex-col justify-between min-h-[110px] hover:shadow-lg transition-shadow">
          <History className="absolute -right-4 -bottom-4 opacity-[0.07] text-black" size={100} />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/60">Total Visits</span>
            <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center backdrop-blur-md border border-black/10">
              <History size={14} className="text-black" />
            </div>
          </div>
          <div className="mt-2 relative z-10">
            <div className="text-[24px] lg:text-[28px] font-black tracking-tight leading-none">{totalVisits}</div>
            <div className="text-[9px] lg:text-[10px] font-bold text-black/60 mt-1.5 uppercase tracking-wider">{lastVisit ? `Last visit: ${lastVisit}` : 'No visits yet'}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Vehicles', value: activeVehicles, icon: Car },
          { label: 'Last Visit', value: lastVisit || 'N/A', icon: Calendar },
          { label: 'Next Service', value: nextService, icon: Clock3 },
        ].map((s) => (
          <div key={s.label} className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[16px] p-4 flex flex-col justify-center items-center text-center shadow-sm hover:scale-[1.02] transition-transform">
            <div className={`w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center mb-2 shadow-inner border border-gray-200/50`}>
              <s.icon size={16} className="text-gray-800" />
            </div>
            <div className="text-[16px] lg:text-[18px] font-black text-gray-900 leading-none mb-1">{s.value}</div>
            <div className="text-[9px] lg:text-[10px] font-bold uppercase tracking-widest text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
