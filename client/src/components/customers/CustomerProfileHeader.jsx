import { Edit3, Phone, MapPin, Calendar, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import CustomerAvatar from './CustomerAvatar.jsx';
import { VipBadge } from './Badge.jsx';

export default function CustomerProfileHeader({ customer, isVIP, memberSince, onEdit }) {
  return (
    <div className="w-full bg-white/60 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-white/80 rounded-[24px] p-5 lg:p-6 flex flex-col lg:flex-row items-center lg:items-start gap-5 relative">
      <div className="relative shrink-0">
        <CustomerAvatar name={customer.name} size={76} className="text-3xl shadow-sm bg-gradient-to-br from-white to-gray-50 text-gray-900 font-black border-[3px] border-white" />
        {isVIP && (
          <div className="absolute -bottom-1.5 -right-1.5 shadow-sm rounded-full border-2 border-white">
            <VipBadge size="sm" />
          </div>
        )}
      </div>
      
      <div className="flex flex-col items-center lg:items-start min-w-0 w-full text-center lg:text-left">
        <h1 className="text-[24px] lg:text-[28px] font-black text-gray-900 tracking-tight leading-none truncate w-full mb-3">
          {customer.name}
        </h1>
        
        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-5 w-full">
          {customer.phone && (
            <span className="flex items-center gap-1.5 bg-white/80 border border-white/60 px-3 py-1.5 rounded-full text-[12px] font-bold text-gray-800 shadow-sm">
              <Phone size={13} className="text-gray-500" /> {customer.phone}
            </span>
          )}
          {customer.address && (
            <span className="flex items-center gap-1.5 bg-white/80 border border-white/60 px-3 py-1.5 rounded-full text-[12px] font-bold text-gray-800 shadow-sm truncate max-w-[200px] lg:max-w-[300px]">
              <MapPin size={13} className="text-gray-500" /> {customer.address}
            </span>
          )}
          <span className="flex items-center gap-1.5 bg-white/80 border border-white/60 px-3 py-1.5 rounded-full text-[12px] font-bold text-gray-800 shadow-sm">
            <Calendar size={13} className="text-gray-500" /> Since {memberSince}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto lg:mt-auto">
          <button
            onClick={onEdit}
            className="w-full sm:w-auto btn-secondary flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold shadow-sm border border-gray-200 text-gray-900 bg-white hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            <Edit3 size={15} strokeWidth={2.5} /> Edit Profile
          </button>
          <Link 
            to={`/offers/new?phone=${customer.phone}`}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-black text-[#F6CB59] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md font-bold text-[13px] tracking-wide"
          >
            <Gift size={15} strokeWidth={2.5} /> Assign Package
          </Link>
        </div>
      </div>
    </div>
  );
}
