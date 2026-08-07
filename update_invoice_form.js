const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, 'client/src/components/InvoiceForm.jsx');
let code = fs.readFileSync(p, 'utf8');

// 1. Initial state
code = code.replace(
  /vehicleId: null,/g,
  'vehicleIds: [],\n      vehicleId: null,'
);
code = code.replace(
  /vehicleId: initial\.vehicleId \|\| initial\.vehicle_id \|\| null,/,
  'vehicleIds: initial?.vehicleIds || (initial?.vehicleId ? [initial.vehicleId] : []), vehicleId: initial?.vehicleId || null,'
);

// 2. toggleService
code = code.replace(
  /price: opt\.price \|\| 0,\n\s*total: opt\.price \|\| 0,\n\s*\}\];/,
  `price: opt.price || 0,
          total: opt.price || 0,
          vehicle_ids: f.vehicleIds || [],
        }];`
);
code = code.replace(
  /subTotal: newServices\.reduce\(\(acc, s\) => acc \+ \(Number\(s\.total\) \|\| 0\), 0\)/g,
  `subTotal: newServices.reduce((acc, s) => acc + (Number(s.total) || 0) * (s.vehicle_ids?.length || 1), 0)`
);

// 3. addThirdPartyItem
code = code.replace(
  /selling_price: opt\?\.sellingPrice \?\? 0,\n\s*\}\],/,
  `selling_price: opt?.sellingPrice ?? 0,
        vehicle_ids: f.vehicleIds || [],
      }],`
);

// 4. Update Math
code = code.replace(
  /const servicesSubTotal = Number\(form\.subTotal \|\| 0\);/,
  `const servicesSubTotal = form.services.reduce((acc, s) => acc + (Number(s.total) || 0) * (s.vehicle_ids?.length || 1), 0);`
);
code = code.replace(
  /\(\) => form\.thirdPartyItems\.reduce\(\(sum, t\) => sum \+ \(Number\(t\.selling_price\) \|\| 0\), 0\),/,
  `() => form.thirdPartyItems.reduce((sum, t) => sum + (Number(t.selling_price) || 0) * (t.vehicle_ids?.length || 1), 0),`
);

// 5. SelectedServiceRow
code = code.replace(
  /const SelectedServiceRow = memo\(function SelectedServiceRow\(\{ cur, onDesc \}\) \{/,
  `const SelectedServiceRow = memo(function SelectedServiceRow({ cur, onDesc, vehicleOptions, onVehiclesChange }) {`
);
code = code.replace(
  /<div className="sm:w-36">\s*\{\/\* Price locked — snapshot comes from services.base_price on save \*\/\}\s*<MoneyInput value=\{cur\.price \|\| ''\} onChange=\{\(\) => \{\}\} disabled \/>\s*<\/div>/,
  `<div className="sm:w-36 flex flex-col gap-2">
        <MoneyInput value={cur.price || ''} onChange={() => {}} disabled />
        {vehicleOptions && vehicleOptions.length > 1 && (
          <Select
            isMulti
            options={vehicleOptions}
            value={vehicleOptions.filter(v => (cur.vehicle_ids || []).includes(v.value))}
            onChange={onVehiclesChange}
            placeholder="Apply to..."
            styles={selectStyles()}
            menuPortalTarget={document.body}
          />
        )}
      </div>`
);

// 6. ThirdPartyServiceRow
code = code.replace(
  /const ThirdPartyServiceRow = memo\(function ThirdPartyServiceRow\(\{ item, onField, onRemove \}\) \{/,
  `const ThirdPartyServiceRow = memo(function ThirdPartyServiceRow({ item, onField, onRemove, vehicleOptions, onVehiclesChange }) {`
);
code = code.replace(
  /<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">/,
  `{vehicleOptions && vehicleOptions.length > 1 && (
        <div className="mb-2">
          <Select
            isMulti
            options={vehicleOptions}
            value={vehicleOptions.filter(v => (item.vehicle_ids || []).includes(v.value))}
            onChange={onVehiclesChange}
            placeholder="Apply to cars..."
            styles={selectStyles()}
            menuPortalTarget={document.body}
          />
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">`
);

// 7. Update row rendering in InvoiceForm
code = code.replace(
  /onDesc=\{e => updateServiceField\(cur\.service, 'description', e\.target\.value\)\}/,
  `onDesc={e => updateServiceField(cur.service, 'description', e.target.value)}
                        vehicleOptions={clientType === 'organization' && form.vehicleIds?.length > 1 ? vehicleOptions.filter(v => form.vehicleIds.includes(v.value)) : null}
                        onVehiclesChange={opts => updateServiceField(cur.service, 'vehicle_ids', opts ? opts.map(o => o.value) : [])}`
);
code = code.replace(
  /onField=\{\(field, val\) => updateThirdPartyField\(idx, field, val\)\}/,
  `onField={(field, val) => updateThirdPartyField(idx, field, val)}
                        vehicleOptions={clientType === 'organization' && form.vehicleIds?.length > 1 ? vehicleOptions.filter(v => form.vehicleIds.includes(v.value)) : null}
                        onVehiclesChange={opts => updateThirdPartyField(idx, 'vehicle_ids', opts ? opts.map(o => o.value) : [])}`
);

// 8. Vehicle Select Field
code = code.replace(
  /value=\{selectedVehicle\}\n\s*isDisabled=\{!form\.customer\?\.id \|\| !!initial\}\n\s*onChange=\{sel => \{/,
  `value={clientType === 'organization' ? vehicleOptions.filter(v => form.vehicleIds?.includes(v.value)) : selectedVehicle}
                    isDisabled={!form.customer?.id || !!initial}
                    isMulti={clientType === 'organization'}
                    onChange={sel => {`
);
code = code.replace(
  /if \(!sel\) \{\n\s*setForm\(f => \(\{ \.\.\.f, vehicleId: null, carMake: '', licensePlate: '' \}\)\);\n\s*return;\n\s*\}/,
  `if (!sel || (Array.isArray(sel) && sel.length === 0)) {
                        setForm(f => ({ ...f, vehicleId: null, vehicleIds: [], carMake: '', licensePlate: '' }));
                        return;
                      }`
);
code = code.replace(
  /const v = sel\.vehicle;\n\s*setForm\(f => \(\{\n\s*\.\.\.f,\n\s*vehicleId: v\.id,\n\s*carMake: `\$\{v\.make \|\| ''\} \$\{v\.model \|\| ''\}`\.trim\(\),\n\s*licensePlate: v\.plate \|\| '',\n\s*\}\)\);/,
  `if (Array.isArray(sel)) {
                        setForm(f => ({
                          ...f,
                          vehicleIds: sel.map(s => s.value),
                          vehicleId: sel[0]?.value || null,
                        }));
                      } else {
                        const v = sel.vehicle;
                        setForm(f => ({
                          ...f,
                          vehicleId: v.id,
                          vehicleIds: [v.id],
                          carMake: \`\${v.make || ''} \${v.model || ''}\`.trim(),
                          licensePlate: v.plate || '',
                        }));
                      }`
);

// 9. handleSubmit
code = code.replace(
  /const service_ids = form\.services\n\s*\.map\(s => Number\(s\.service_id \|\| s\.serviceId\)\)\n\s*\.filter\(id => Number\.isFinite\(id\) && id > 0\);/,
  `const service_items = form.services
      .filter(s => Number(s.service_id || s.serviceId) > 0)
      .map(s => ({
        service_id: Number(s.service_id || s.serviceId),
        vehicle_ids: s.vehicle_ids || []
      }));
    const service_ids = service_items.map(s => s.service_id);`
);

code = code.replace(
  /third_party_service_id: t\.third_party_service_id \|\| null,/,
  `third_party_service_id: t.third_party_service_id || null,
      vehicle_ids: t.vehicle_ids || [],`
);

code = code.replace(
  /service_ids,\n\s*third_party_items,/,
  `service_ids,
      service_items,
      third_party_items,`
);

fs.writeFileSync(p, code);
console.log('Update complete.');
