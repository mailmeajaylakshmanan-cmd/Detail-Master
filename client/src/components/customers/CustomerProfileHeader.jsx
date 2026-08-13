import { Edit3, Phone, MapPin, Calendar, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import CustomerAvatar from './CustomerAvatar.jsx';
import { VipBadge } from './Badge.jsx';

export default function CustomerProfileHeader({ customer, isVIP, memberSince, onEdit }) {
  return (
    <div className="w-full bg-white/95 backdrop-blur-xl shadow-sm border border-white/60 rounded-[20px] px-6 py-5 flex items-center gap-5 relative">
      <CustomerAvatar name={customer.name} size={64} className="text-2xl shadow-sm bg-blue-50 text-blue-700 font-black border border-blue-100/50" />
      
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2.5 mb-1.5">
          <h1 className="text-[22px] font-black text-gray-900 tracking-tight leading-none truncate">
            {customer.name}
          </h1>
          <button
            onClick={onEdit}
            className="w-5 h-5 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-all shrink-0 ml-1"
            title="Edit Customer"
          >
            <Edit3 size={11} strokeWidth={2.5} />
          </button>
          {isVIP && <VipBadge size="sm" />}
        </div>
        
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] font-bold text-gray-400">
          <span className="flex items-center gap-1">
            <Phone size={12} className="text-gray-400" /> {customer.phone}
          </span>
          {customer.address && (
            <span className="flex items-center gap-1 truncate max-w-[260px]">
              <MapPin size={12} className="text-gray-400" /> {customer.address}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar size={12} className="text-gray-400" /> Member since {memberSince}
          </span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <Link 
          to={`/offers/new?phone=${customer.phone}`}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F6CB59] text-[#886D52] hover:bg-[#e6c700] transition-colors shadow-sm font-bold text-[13px] tracking-wide"
        >
          <Gift size={16} strokeWidth={2.5} />
          <span>Assign Package</span>
        </Link>
      </div>
    </div>
  );
}
