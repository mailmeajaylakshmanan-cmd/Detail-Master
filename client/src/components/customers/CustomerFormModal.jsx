import { X, Plus, UserSearch, Trash2 } from 'lucide-react';
import { useVehicleTypes } from '../../hooks/useQueries.js';

export default function CustomerFormModal({
  isOpen, editId, customers,
  name, setName, phone, setPhone, address, setAddress,
  formVehicles, setFormVehicles,
  onSubmit, onCancel, onQuickSelect, isSaving
}) {
  const { data: vehicleTypes = [] } = useVehicleTypes();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white/95 backdrop-blur-2xl shadow-2xl border border-white/60 rounded-t-[28px] sm:rounded-[24px] flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden animate-scale-up">
        {/* Sticky Header */}
        <div className="flex justify-between items-center px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100/60 bg-white/60 shrink-0">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
              {editId ? 'Edit Customer' : 'Add New Customer'}
            </h3>
            <p className="text-[11px] font-bold text-gray-400">
              Personal info & registered vehicles
            </p>
          </div>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-5 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar flex-1">
            {!editId && (
              <div className="mb-2 pb-4 border-b border-gray-100/60">
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1.5">
                  <UserSearch size={12} /> Quick Select Existing Customer
                </label>
                <select
                  className="input bg-blue-50/30 border-blue-100/60 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 text-xs sm:text-sm font-bold text-gray-700"
                  onChange={onQuickSelect}
                  defaultValue=""
                >
                  <option value="" disabled>-- Select to add a vehicle to them --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Customer Name *</label>
                <input required type="text" className="input bg-white/70 border-gray-200/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Phone Number *</label>
                <input required type="tel" className="input bg-white/70 border-gray-200/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" />
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Address (Optional)</label>
              <textarea className="input bg-white/70 border-gray-200/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 min-h-[70px] resize-none" value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address..." />
            </div>

            <div className="pt-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Vehicles</label>
              <div className="space-y-3">
                {formVehicles.map((v, idx) => {
                  const matchedVt = vehicleTypes.find(vt =>
                    vt.id === v.vehicle_type_id ||
                    vt.name.trim().toLowerCase() === (v.type || '').trim().toLowerCase()
                  );
                  const selectedVal = v.vehicle_type_id || (matchedVt ? matchedVt.id : '');

                  return (
                    <div key={idx} className="flex flex-col gap-2.5 bg-slate-50/70 p-3.5 sm:p-4 rounded-2xl border border-slate-200/60 relative">
                      <button type="button" onClick={() => {
                          const newV = formVehicles.filter((_, i) => i !== idx);
                          setFormVehicles(newV.length ? newV : [{ make: '', model: '', plate: '' }]);
                        }} className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Remove Vehicle">
                        <Trash2 size={15} />
                      </button>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pr-7 sm:pr-8">
                        <input type="text" className="input bg-white text-xs py-2 px-3 border-gray-200/50 shadow-xs" placeholder="Make (e.g. BMW)" value={v.make} onChange={e => { const newV = [...formVehicles]; newV[idx].make = e.target.value; setFormVehicles(newV); }} />
                        <input type="text" className="input bg-white text-xs py-2 px-3 border-gray-200/50 shadow-xs" placeholder="Model" value={v.model} onChange={e => { const newV = [...formVehicles]; newV[idx].model = e.target.value; setFormVehicles(newV); }} />
                        <input type="text" className="input bg-white text-xs py-2 px-3 border-gray-200/50 shadow-xs uppercase placeholder-normal" placeholder="Plate No." value={v.plate} onChange={e => { const newV = [...formVehicles]; newV[idx].plate = e.target.value; setFormVehicles(newV); }} />
                        <select
                          className="input bg-white text-xs py-2 px-3 border-gray-200/50 shadow-xs"
                          value={selectedVal}
                          onChange={e => {
                            const rawVal = e.target.value;
                            const selectedId = rawVal ? Number(rawVal) : null;
                            const matched = vehicleTypes.find(vt => vt.id === selectedId);
                            const newV = [...formVehicles];
                            newV[idx].vehicle_type_id = selectedId;
                            newV[idx].type = matched ? matched.name : '';
                            setFormVehicles(newV);
                          }}
                        >
                          <option value="">-- Select Vehicle Type --</option>
                          {vehicleTypes.filter(vt => vt.isActive).map(vt => (
                            <option key={vt.id} value={vt.id}>{vt.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
                <button type="button" onClick={() => setFormVehicles([...formVehicles, { make: '', model: '', plate: '' }])} className="text-[12px] font-bold text-blue-600 flex items-center gap-1.5 hover:text-blue-700 hover:bg-blue-50 px-3.5 py-2 rounded-xl transition-colors mt-2 inline-flex bg-blue-50/40 border border-blue-200/50">
                  <Plus size={14} /> Add Another Vehicle
                </button>
              </div>
            </div>
          </div>
          
          {/* Sticky Footer Actions */}
          <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-gray-100/60 flex justify-end gap-3 bg-gray-50/70 backdrop-blur-xl shrink-0">
            <button type="button" onClick={onCancel} className="btn-secondary px-5" disabled={isSaving}>Cancel</button>
            <button type="submit" className="btn-primary px-6 shadow-blue-500/20 flex items-center gap-2" disabled={isSaving}>
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Customer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
