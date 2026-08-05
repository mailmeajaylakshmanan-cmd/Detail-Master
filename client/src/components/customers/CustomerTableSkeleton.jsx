import React from 'react';

export default function CustomerTableSkeleton() {
  return (
    <div className="card flex-1 shadow-md bg-white/70 border-white/60 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-gray-100 flex gap-4 animate-pulse">
        <div className="h-4 w-24 bg-gray-200 rounded"></div>
        <div className="h-4 w-24 bg-gray-200 rounded"></div>
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
      </div>
      <div className="flex-1 p-4 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 bg-gray-200 rounded"></div>
              <div className="h-2 w-1/4 bg-gray-200 rounded"></div>
            </div>
            <div className="h-4 w-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
