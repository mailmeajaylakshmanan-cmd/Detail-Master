import React from 'react';
import { Star, Gift } from 'lucide-react';

export function VipBadge({ size = "sm" }) {
  const sizeClasses = size === "md" 
    ? "px-2.5 py-0.5 text-[10px]" 
    : "px-1.5 py-0.5 text-[8px]";
    
  return (
    <span className={`${sizeClasses} rounded font-bold bg-[#FBBF24] text-yellow-900 flex items-center gap-1 shadow-sm`}>
      <Star size={size === "md" ? 10 : 8} className="fill-yellow-900" /> VIP
    </span>
  );
}

export function OfferBadge({ size = "sm" }) {
  const sizeClasses = size === "md" 
    ? "px-2.5 py-0.5 text-[10px]" 
    : "px-1.5 py-0.5 text-[8px]";
    
  return (
    <span className={`${sizeClasses} rounded font-bold bg-green-100 text-green-700 flex items-center gap-1 shadow-sm`}>
      <Gift size={size === "md" ? 10 : 8} /> OFFER
    </span>
  );
}

export function PaymentStatusBadge({ status }) {
  const isPaid = status === 'paid';
  return (
    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider shadow-sm ${
      isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
    }`}>
      {isPaid ? 'Paid' : 'Pending'}
    </span>
  );
}
