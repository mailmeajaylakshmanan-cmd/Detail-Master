import { X, Plus, Trash2 } from 'lucide-react';
import { useVehicleTypes } from '../../hooks/useQueries.js';

export default function OrganizationFormModal({
  isOpen, editId,
  orgName, setOrgName,
  contactPerson, setContactPerson,
  phone, setPhone,
  email, setEmail,
  address, setAddress,
  formVehicles, setFormVehicles, onRemoveVehicle,
  onSubmit, onCancel, isSaving
}) {
  const { data: vehicleTypes = [] } = useVehicleTypes();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="w-full max-w-2xl overflow-hidden bg-white/95 backdrop-blur-2xl shadow-2xl border border-white/60 rounded-[24px] flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100/50 bg-white/50 shrink-0">
          <h3 className="text-xl font-black text-gray-800 tracking-tight">
            {editId ? 'Edit Organization' : 'Add New Organization'}
          </h3>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100/80 hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col overflow-hidden">
          <div className="px-6 py-5 space-y-5 overflow-y-auto [&::-webkit-scrollbar]:hidden flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Organization Name *</label>
                <input required type="text" className="input bg-white/70 border-gray-200/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Acme Corp" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Contact Person</label>
                <input type="text" className="input bg-white/70 border-gray-200/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="e.g. Jane Doe" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Phone Number</label>
                <input type="tel" className="input bg-white/70 border-gray-200/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email</label>
                <input type="email" className="input bg-white/70 border-gray-200/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@acme.com" />
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Address (Optional)</label>
              <textarea className="input bg-white/70 border-gray-200/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 min-h-[70px] resize-none" value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address..." />
            </div>

            <div className="pt-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Vehicles</label>
              <div className="space-y-3">
                {formVehicles.map((v, idx) => {
                  const matchedVt = vehicleTypes.find(vt =>
                    vt.id === v.vehicle_type_id ||
                    vt.name.trim().toLowerCase() === (v.type || '').trim().toLowerCase()
                  );
                  const selectedVal = v.vehicle_type_id || (matchedVt ? matchedVt.id : '');

                  return (
                    <div key={v.id || `new-${idx}`} className="flex flex-col gap-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/80 shadow-sm relative group">
                      <button
                        type="button"
                        onClick={() => onRemoveVehicle(idx)}
                        className="absolute top-3 right-3 p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                      <div className="grid grid-cols-4 gap-3 pr-8">
                        <input type="text" className="input bg-white text-xs py-2 px-3 border-gray-200/50 shadow-sm" placeholder="Make (e.g. BMW)" value={v.make || ''} onChange={e => { const nv = [...formVehicles]; nv[idx] = { ...nv[idx], make: e.target.value }; setFormVehicles(nv); }} />
                        <input type="text" className="input bg-white text-xs py-2 px-3 border-gray-200/50 shadow-sm" placeholder="Model" value={v.model || ''} onChange={e => { const nv = [...formVehicles]; nv[idx] = { ...nv[idx], model: e.target.value }; setFormVehicles(nv); }} />
                        <input type="text" className="input bg-white text-xs py-2 px-3 border-gray-200/50 shadow-sm uppercase placeholder-normal" placeholder="Plate No." value={v.plate || ''} onChange={e => { const nv = [...formVehicles]; nv[idx] = { ...nv[idx], plate: e.target.value }; setFormVehicles(nv); }} />
                        <select
                          className="input bg-white text-xs py-2 px-3 border-gray-200/50 shadow-sm"
                          value={selectedVal}
                          onChange={e => {
                            const rawVal = e.target.value;
                            const selectedId = rawVal ? Number(rawVal) : null;
                            const matched = vehicleTypes.find(vt => vt.id === selectedId);
                            const nv = [...formVehicles];
                            nv[idx] = {
                              ...nv[idx],
                              vehicle_type_id: selectedId,
                              type: matched ? matched.name : (v.type || ''),
                            };
                            setFormVehicles(nv);
                          }}
                        >
                          <option value="">-- Select Vehicle --</option>
                          {vehicleTypes.filter(vt => vt.isActive).map(vt => (
                            <option key={vt.id} value={vt.id}>{vt.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
                <button type="button" onClick={() => setFormVehicles([...formVehicles, { id: null, make: '', model: '', plate: '', vehicle_type_id: null, type: '' }])} className="text-[11px] font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors mt-2 inline-flex">
                  <Plus size={14} /> Add Vehicle
                </button>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 border-t border-gray-100/60 flex justify-end gap-3 bg-gray-50/50 backdrop-blur-xl shrink-0">
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
                'Save Organization'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
