import React from 'react';

const colorThemes = [
  'bg-slate-50 text-slate-700 border-slate-200',
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-rose-50 text-rose-700 border-rose-200',
];

export default function ServiceTags({ servicesString }) {
  if (!servicesString) return null;

  // Split the string by commas, trim extra whitespace, and remove empty entries
  const servicesArray = servicesString
    .split(',')
    .map(service => service.trim())
    .filter(Boolean);

  if (servicesArray.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {servicesArray.map((service, index) => {
        const theme = colorThemes[index % colorThemes.length];
        return (
          <span
            key={index}
            className={`px-3 py-1 border rounded-full text-xs font-semibold whitespace-nowrap shadow-sm ${theme} transition-all hover:`}
          >
            {service}
          </span>
        );
      })}
    </div>
  );
}
