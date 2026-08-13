import { Calendar, IndianRupee, Car, History, Clock3, Award } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div 
      className="bg-white rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-center min-h-[90px]" 
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <div className="flex justify-between items-start w-full">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-900 mb-1">{label}</span>
        <Icon size={14} style={{ color: accent }} className="opacity-80" />
      </div>
      <div className="text-2xl font-black text-gray-900 tracking-tight leading-none mt-1">{value}</div>
      {sub && <div className="text-[9px] text-gray-800 font-bold mt-2 uppercase tracking-wide">{sub}</div>}
    </div>
  );
}

export default function StatsGrid({ totalVisits, totalSpend, activeVehicles, lastVisit, nextService, loyaltyPoints }) {
  const stats = [
    {
      icon: History,
      label: 'Total Visits',
      value: totalVisits,
      sub: lastVisit ? `Last: ${lastVisit}` : 'No visits yet',
      accent: '#EAB308', // Yellow
    },
    {
      icon: IndianRupee,
      label: 'Total Spend',
      value: `₹${totalSpend.toLocaleString('en-IN')}`,
      sub: 'Top 20% Spender', // Placeholder sub text to match screenshot
      accent: '#10B981', // Green
    },
    {
      icon: Car,
      label: 'Active Vehicles',
      value: activeVehicles,
      sub: 'Fleet Management',
      accent: '#B45309', // Brown
    },
    {
      icon: Calendar,
      label: 'Last Visit',
      value: lastVisit || 'N/A',
      accent: '#F97316', // Orange
    },
    {
      icon: Clock3,
      label: 'Next Service',
      value: nextService,
      sub: 'Schedule Now',
      accent: '#EF4444', // Red
    },
    {
      icon: Award,
      label: 'Loyalty Points',
      value: loyaltyPoints.toLocaleString('en-IN'),
      sub: 'Earned on spend',
      accent: '#8B5CF6', // Purple
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 shrink-0">
      {stats.map(s => <StatCard key={s.label} {...s} />)}
    </div>
  );
}
