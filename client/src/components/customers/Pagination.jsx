import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }) {
  if (totalItems === 0) return null;
  
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white shrink-0 rounded-b-[20px]">
      <div className="text-[12px] font-medium text-gray-400">
        Showing {start} to {end} of {totalItems.toLocaleString('en-IN')} customers
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 disabled:opacity-30 hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        
        {/* Showing 3 pages for demonstration of the UI from screenshot */}
        {[1, 2, 3].filter(p => p <= totalPages).map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-7 h-7 rounded-md flex items-center justify-center text-[12px] font-bold transition-colors ${
              page === p
                ? 'bg-[#FDE047] text-[#854D0E]'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {p}
          </button>
        ))}

        {totalPages > 3 && (
          <div className="w-7 h-7 flex items-center justify-center text-gray-400 text-[12px] font-bold">...</div>
        )}

        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages || totalPages === 0}
          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 disabled:opacity-30 hover:bg-gray-50 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
