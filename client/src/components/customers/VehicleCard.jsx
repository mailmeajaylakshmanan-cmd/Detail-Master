import { Car, Plus } from 'lucide-react';

export default function VehicleTable({ vehicles, selectedIdx, onSelect }) {
  if (vehicles.length === 0) {
    return (
      <div className="w-full flex flex-col gap-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[14px] font-bold text-gray-900 uppercase tracking-wide">
            Vehicles <span className="text-gray-900 ml-1">(0)</span>
          </h3>
          <button className="text-[12px] font-bold text-[#B45309] hover:text-[#92400e] uppercase tracking-wider flex items-center gap-1.5 transition-colors bg-[#FEF3C7] px-4 py-2 rounded-xl">
            <Plus size={14} strokeWidth={2.5} /> Add Vehicle
          </button>
        </div>
        <div className="bg-white rounded-[20px] p-10 text-center text-sm text-gray-800 italic shadow-sm border border-gray-100">
          No vehicles on file for this customer yet.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-[14px] font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
          Vehicles
          <span className="px-2.5 py-0.5 rounded-full bg-gray-200 text-gray-700 text-[11px] font-bold">{vehicles.length}</span>
        </h3>

      </div>

      <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-900 uppercase tracking-wider w-[25%]">Vehicle</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-900 uppercase tracking-wider">Vehicle Number</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-900 uppercase tracking-wider">Vehicle Type</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-900 uppercase tracking-wider text-center">Visits</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-900 uppercase tracking-wider text-right">Total Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vehicles.map((v, i) => {
                const isSelected = selectedIdx === i;
                return (
                  <tr
                    key={i}
                    onClick={() => onSelect(i)}
                    className={`group cursor-pointer transition-colors ${isSelected ? 'bg-orange-50/50' : 'hover:bg-gray-50/50'}`}
                  >
                    <td className="px-6 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-[#FEF3C7] text-[#B45309]' : 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:shadow-sm'}`}>
                          <Car size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                          <div className={`font-bold text-[13px] ${isSelected ? 'text-[#B45309]' : 'text-gray-900'}`}>
                            {v.make} {v.model}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-900 font-mono text-[11px] font-bold tracking-widest uppercase border border-gray-200">
                        {v.plate || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <div className="text-[12px] font-semibold text-gray-900 capitalize">{v.type || '--'}</div>
                    </td>
                    <td className="px-6 py-4 align-middle text-center">
                      <span className="inline-flex items-center justify-center min-w-[24px] h-[24px] rounded-full bg-gray-100 text-[11px] font-bold text-gray-900">
                        {v.totalVisits || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-middle text-right">
                      <div className="font-black text-[14px] text-gray-900">
                        ₹{(v.totalSpend || 0).toLocaleString('en-IN')}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
