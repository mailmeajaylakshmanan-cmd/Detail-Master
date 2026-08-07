const fs = require('fs');

const path = 'client/src/components/InvoiceForm.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add lucide icon X
content = content.replace(/CheckCircle2, AlertCircle, Calendar, IndianRupee, Hash, Receipt, Settings, Truck/g, 'CheckCircle2, AlertCircle, Calendar, IndianRupee, Hash, Receipt, Settings, Truck, X');

// 2. Add Modal Component
const modalComponent = \
const ServiceVehicleModal = memo(function ServiceVehicleModal({ isOpen, onClose, onConfirm, serviceName, vehicleOptions, initialSelection }) {
  const [selected, setSelected] = React.useState([]);
  
  React.useEffect(() => {
    if (isOpen) setSelected(initialSelection || []);
  }, [isOpen, initialSelection]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-900 text-lg">Apply <span className="text-[#FBD904]">{serviceName}</span> to...</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto flex flex-col gap-2">
           {vehicleOptions.map(v => (
             <label key={v.value} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
               <input 
                 type="checkbox" 
                 checked={selected.includes(v.value)}
                 onChange={e => {
                   if (e.target.checked) setSelected(s => [...s, v.value]);
                   else setSelected(s => s.filter(id => id !== v.value));
                 }}
                 className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
               />
               <span className="text-[13px] font-bold text-gray-700">{v.label}</span>
             </label>
           ))}
           {vehicleOptions.length === 0 && <p className="text-sm font-medium text-gray-500">No vehicles available.</p>}
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-[13px] font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
          <button type="button" onClick={() => onConfirm(selected)} className="px-6 py-2.5 text-[13px] font-bold text-gray-900 bg-[#FBD904] hover:bg-[#FBD904]/90 rounded-xl transition-colors shadow-sm">Confirm ({selected.length})</button>
        </div>
      </div>
    </div>
  );
});
\;
content = content.replace(/const ServiceChip = memo\\(function ServiceChip/g, modalComponent + '\\nconst ServiceChip = memo(function ServiceChip');
content = content.replace(/import { useState, useCallback, useMemo, memo } from 'react';/, "import React, { useState, useCallback, useMemo, memo } from 'react';");

// 3. Update Rows to use Modal toggle instead of Select
content = content.replace(
  /{vehicleOptions && vehicleOptions\\.length > 1 && \\(\\s*<Select\\s*isMulti[^]*?menuPortalTarget={document\\.body}\\s*\\/>\\s*\\)}/gm,
  \{vehicleOptions && vehicleOptions.length > 1 && (
          <div className="flex items-center justify-between bg-gray-50/80 px-3 py-2 rounded-xl border border-gray-200/60 mt-1">
            <span className="text-[11px] font-bold text-gray-600 tracking-wide uppercase">{(cur?.vehicle_ids || []).length} Vehicles Applied</span>
            <button type="button" onClick={onVehiclesChange} className="text-[#e2c100] font-bold text-[12px] hover:underline">Edit</button>
          </div>
        )}\
);

content = content.replace(
  /{vehicleOptions && vehicleOptions\\.length > 1 && \\(\\s*<div className="mb-2">\\s*<Select\\s*isMulti[^]*?menuPortalTarget={document\\.body}\\s*\\/>\\s*<\\/div>\\s*\\)}/gm,
  \{vehicleOptions && vehicleOptions.length > 1 && (
          <div className="flex items-center justify-between bg-gray-50/80 px-3 py-2 rounded-xl border border-gray-200/60 mb-2">
            <span className="text-[11px] font-bold text-gray-600 tracking-wide uppercase">{(item?.vehicle_ids || []).length} Vehicles Applied</span>
            <button type="button" onClick={onVehiclesChange} className="text-[#e2c100] font-bold text-[12px] hover:underline">Edit</button>
          </div>
        )}\
);

// 4. Update InvoiceForm to manage Modal State
const stateInjection = \  const [clientType, setClientType] = useState(initial?.organizationId || initial?.organization_id ? 'organization' : 'individual');
  const [serviceModal, setServiceModal] = useState({ isOpen: false, type: null, opt: null, selectedVehicleIds: [] });\;
content = content.replace(/const \\[clientType, setClientType\\].*?;/, stateInjection);

// 5. Update Organization Select to auto-select vehicles
content = content.replace(
  /const m = sel\\.customer;\\s*const vehicles = Array\\.isArray\\(m\\.vehicles\\) \\? m\\.vehicles : \\[\\];\\s*const first = vehicles\\[0\\];\\s*setForm\\(f => \\(\\{\\s*\\.\\.\\.f,\\s*customer: \\{/,
  \const m = sel.customer;
                    const vehicles = Array.isArray(m.vehicles) ? m.vehicles : [];
                    const first = vehicles[0];
                    const initialVehicleIds = clientType === 'organization' ? vehicles.map(v => v.id) : (first ? [first.id] : []);
                    setForm(f => ({
                      ...f,
                      vehicleIds: initialVehicleIds,
                      customer: {\
);

// 6. Rewrite toggle logic to open modal
content = content.replace(/const toggleService = useCallback\\(\\(opt, checked\\) => \\{[^]*?\\}\\);/gm, \
  const toggleService = useCallback((opt, checked) => {
    if (checked) {
      if (clientType === 'organization' && form.vehicleIds?.length > 1) {
        setServiceModal({ isOpen: true, type: 'standard', opt, selectedVehicleIds: form.vehicleIds });
        return;
      }
      setForm(f => {
        const newServices = [...f.services, {
          service_id: opt.id,
          service: opt.name,
          description: opt.description || '',
          price: opt.price || 0,
          total: opt.price || 0,
          vehicle_ids: f.vehicleIds
        }];
        return {
          ...f,
          services: newServices,
          subTotal: newServices.reduce((acc, s) => acc + (Number(s.total) || 0) * (s.vehicle_ids?.length || 1), 0)
        };
      });
    } else {
      setForm(f => {
        const newServices = f.services.filter(s => s.service_id !== opt.id && s.service !== opt.name);
        return {
          ...f,
          services: newServices,
          subTotal: newServices.reduce((acc, s) => acc + (Number(s.total) || 0) * (s.vehicle_ids?.length || 1), 0)
        };
      });
    }
  }, [clientType, form.vehicleIds]);
\);

content = content.replace(/const toggleThirdPartyItem = useCallback\\(\\(opt, checked\\) => \\{[^]*?\\}\\);/gm, \
  const toggleThirdPartyItem = useCallback((opt, checked) => {
    if (checked) {
      if (clientType === 'organization' && form.vehicleIds?.length > 1) {
        setServiceModal({ isOpen: true, type: 'third_party', opt, selectedVehicleIds: form.vehicleIds });
        return;
      }
      addThirdPartyItem(opt.id, form.vehicleIds);
    } else {
      setForm(f => ({
        ...f,
        thirdPartyItems: f.thirdPartyItems.filter(t => t.third_party_service_id !== opt.id),
      }));
    }
  }, [clientType, form.vehicleIds, addThirdPartyItem]);
\);

content = content.replace(/const addThirdPartyItem = useCallback\\(\\(catalogId\\) => \\{/g, \const addThirdPartyItem = useCallback((catalogId, vehicle_ids) => {\);
content = content.replace(/third_party_service_id: opt\\?\\.id \\|\\| null,/g, \	hird_party_service_id: opt?.id || null, vehicle_ids: vehicle_ids || [],\);

// 7. Inject Modal confirmation handler & render modal
const handleConfirm = \
  const handleModalConfirm = useCallback((selectedIds) => {
    const { type, opt } = serviceModal;
    if (type === 'standard') {
      setForm(f => {
        const newServices = [...f.services, {
          service_id: opt.id,
          service: opt.name,
          description: opt.description || '',
          price: opt.price || 0,
          total: opt.price || 0,
          vehicle_ids: selectedIds
        }];
        return {
          ...f,
          services: newServices,
          subTotal: newServices.reduce((acc, s) => acc + (Number(s.total) || 0) * (s.vehicle_ids?.length || 1), 0)
        };
      });
    } else if (type === 'third_party') {
      addThirdPartyItem(opt.id, selectedIds);
    } else if (type === 'edit_standard') {
      updateServiceField(opt.service, 'vehicle_ids', selectedIds);
    } else if (type === 'edit_third_party') {
      updateThirdPartyField(opt.idx, 'vehicle_ids', selectedIds);
    }
    setServiceModal({ isOpen: false, type: null, opt: null, selectedVehicleIds: [] });
  }, [serviceModal, addThirdPartyItem, updateServiceField, updateThirdPartyField]);

  return (
\;
content = content.replace(/return \\(/, handleConfirm);

// Inject Modal Render
content = content.replace(/<form onSubmit=\\{handleSubmit\\}/, \
      <ServiceVehicleModal
        isOpen={serviceModal.isOpen}
        onClose={() => setServiceModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleModalConfirm}
        serviceName={serviceModal.opt?.name || serviceModal.opt?.service || serviceModal.opt?.service_name || 'Service'}
        vehicleOptions={vehicleOptions.filter(v => form.vehicleIds?.includes(v.value))}
        initialSelection={serviceModal.selectedVehicleIds}
      />
      <form onSubmit={handleSubmit}\);

// Row OnVehiclesChange handlers:
content = content.replace(/onVehiclesChange=\\{opts => updateServiceField\\(cur\\.service, 'vehicle_ids', opts \\? opts\\.map\\(o => o\\.value\\) : \\[\\]\\)\\}/g, \onVehiclesChange={() => setServiceModal({ isOpen: true, type: 'edit_standard', opt: cur, selectedVehicleIds: cur.vehicle_ids })}\);
content = content.replace(/onVehiclesChange=\\{opts => updateThirdPartyField\\(idx, 'vehicle_ids', opts \\? opts\\.map\\(o => o\\.value\\) : \\[\\]\\)\\}/g, \onVehiclesChange={() => setServiceModal({ isOpen: true, type: 'edit_third_party', opt: { ...item, idx }, selectedVehicleIds: item.vehicle_ids })}\);

fs.writeFileSync(path, content, 'utf8');
console.log('UI update successful!');
