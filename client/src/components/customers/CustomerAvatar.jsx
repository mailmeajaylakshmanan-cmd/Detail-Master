import React from 'react';

export default function CustomerAvatar({ name, size = 40, className = "" }) {
  const initials = (name || 'User')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div 
      className={`rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}
