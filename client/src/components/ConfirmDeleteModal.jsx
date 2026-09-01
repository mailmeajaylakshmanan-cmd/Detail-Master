import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Deletion',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  confirmText = 'Delete',
  confirmVariant = 'danger', // 'danger' | 'warning'
  loading = false,
  itemName = ''
}) {
  if (!isOpen) return null;

  const isDanger = confirmVariant === 'danger';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all scale-100 animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Icon */}
        <div className="p-6 pb-4 flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            isDanger ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
          }`}>
            {isDanger ? <Trash2 size={24} /> : <AlertTriangle size={24} />}
          </div>

          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-snug">
              {title}
            </h3>
            {itemName && (
              <p className="text-xs font-bold text-gray-500 mt-0.5 truncate">
                Target: <span className="text-gray-800 font-semibold">{itemName}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Message */}
        <div className="px-6 py-2">
          <p className="text-sm font-medium text-gray-600 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions Footer */}
        <div className="p-6 pt-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 transition-colors shadow-2xs"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm flex items-center gap-2 ${
              isDanger 
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' 
                : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
            } ${loading ? 'opacity-80 pointer-events-none' : ''}`}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
