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
          <h1 className="text-[24px] font-black text-gray-900 tracking-tight leading-none truncate">
            {customer.name}
          </h1>
          <button
            onClick={onEdit}
            className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ml-2 shadow-sm border border-gray-200 text-gray-900 bg-white hover:bg-gray-50 transition-all"
            title="Edit Customer"
          >
            <Edit3 size={14} strokeWidth={2.5} /> Edit Profile
          </button>
          {isVIP && <VipBadge size="sm" />}
        </div>
        
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] font-bold text-gray-900">
          <span className="flex items-center gap-1.5">
            <Phone size={14} className="text-gray-900" /> {customer.phone}
          </span>
          {customer.address && (
            <span className="flex items-center gap-1.5 truncate max-w-[260px]">
              <MapPin size={14} className="text-gray-900" /> {customer.address}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar size={14} className="text-gray-900" /> Member since {memberSince}
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
