import { useState, useEffect } from 'react';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { Shield, Save, Loader2 } from 'lucide-react';

export default function MenuAssignment() {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [allMenus, setAllMenus] = useState([]);
  const [roleMenus, setRoleMenus] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      const [rolesRes, menusRes] = await Promise.all([
        api.get('/permissions/roles'),
        api.get('/permissions/menus')
      ]);
      setRoles(rolesRes.data);
      setAllMenus(menusRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleSelect(roleId) {
    setSelectedRole(roleId);
    try {
      const res = await api.get(`/permissions/roles/${roleId}/menus`);
      const menuMap = {};
      res.data.forEach(rm => {
        menuMap[rm.menu_id] = {
          can_view: rm.can_view,
          can_add: rm.can_add,
          can_edit: rm.can_edit,
          can_delete: rm.can_delete
        };
      });
      setRoleMenus(menuMap);
    } catch (error) {
      toast.error('Failed to load role permissions');
    }
  }

  function togglePermission(menuId, field) {
    setRoleMenus(prev => {
      const current = prev[menuId] || { can_view: false, can_add: false, can_edit: false, can_delete: false };
      return {
        ...prev,
        [menuId]: { ...current, [field]: !current[field] }
      };
    });
  }

  async function handleSave() {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const payload = Object.keys(roleMenus).map(menuId => ({
        menu_id: parseInt(menuId),
        ...roleMenus[menuId]
      }));
      await api.post(`/permissions/roles/${selectedRole}/menus`, { menus: payload });
      toast.success('Permissions saved successfully!');
    } catch (error) {
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-black text-[#F6CB59] flex items-center justify-center shadow-md shrink-0">
              <Shield size={24} strokeWidth={2.5} />
            </div>
            Menu Assignments
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage role-based access control and permissions.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !selectedRole}
          className="hidden sm:flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-black text-[#F6CB59] hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-[13px] shadow-md whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Update
        </button>
      </div>

      <div className="bg-white/60 backdrop-blur-2xl rounded-[24px] border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.06)] p-6">
        <label className="block text-sm font-black uppercase tracking-widest text-gray-500 mb-4">Select Role</label>
        <div className="flex flex-wrap gap-3">
          {roles.map(r => (
            <button
              key={r.id}
              onClick={() => handleRoleSelect(r.id)}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${
                selectedRole === r.id
                  ? 'bg-black text-[#F6CB59]'
                  : 'bg-white text-gray-600 border border-white/60 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {r.role_name}
            </button>
          ))}
        </div>
      </div>

      {selectedRole && (
        <>
        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white/60 backdrop-blur-2xl rounded-[24px] border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-white/40 backdrop-blur-md border-b border-white/50 sticky top-0 z-10">
                  <th className="py-4 px-6 text-[11px] font-black uppercase tracking-wider text-gray-500">Menu Name</th>
                  <th className="py-4 px-6 text-[11px] font-black uppercase tracking-wider text-gray-500 text-center">Can View</th>
                  <th className="py-4 px-6 text-[11px] font-black uppercase tracking-wider text-gray-500 text-center">Can Add</th>
                  <th className="py-4 px-6 text-[11px] font-black uppercase tracking-wider text-gray-500 text-center">Can Edit</th>
                  <th className="py-4 px-6 text-[11px] font-black uppercase tracking-wider text-gray-500 text-center">Can Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/50">
                {allMenus.map(menu => {
                  const currentRoleObj = roles.find(r => r.id === selectedRole);
                  const isFullAdmin = currentRoleObj?.role_name === 'Administrator' || currentRoleObj?.role_name === 'Super Admin';
                  const perms = isFullAdmin 
                    ? { can_view: true, can_add: true, can_edit: true, can_delete: true }
                    : (roleMenus[menu.id] || { can_view: false, can_add: false, can_edit: false, can_delete: false });
                  
                  return (
                    <tr key={menu.id} className="hover:bg-white/60 transition-colors group">
                      <td className="py-4 px-6 text-sm font-bold text-gray-800 flex items-center gap-2">
                        {menu.parent_id ? <span className="ml-4 text-gray-400">↳ </span> : ''}
                        {menu.menu_name}
                      </td>
                      {['can_view', 'can_add', 'can_edit', 'can_delete'].map(field => (
                        <td key={field} className="py-4 px-6 text-center">
                          <button
                            disabled={isFullAdmin}
                            onClick={() => !isFullAdmin && togglePermission(menu.id, field)}
                            className={`w-11 h-6 rounded-full relative inline-flex items-center transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${perms[field] ? 'bg-black' : 'bg-gray-200'}`}
                          >
                            <span className={`w-5 h-5 rounded-full shadow-sm transform transition-transform duration-200 ${perms[field] ? 'translate-x-5 bg-[#F6CB59]' : 'translate-x-0.5 bg-white'}`} />
                          </button>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="block lg:hidden flex flex-col gap-4">
          {allMenus.map(menu => {
            const currentRoleObj = roles.find(r => r.id === selectedRole);
            const isFullAdmin = currentRoleObj?.role_name === 'Administrator' || currentRoleObj?.role_name === 'Super Admin';
            const perms = isFullAdmin 
              ? { can_view: true, can_add: true, can_edit: true, can_delete: true }
              : (roleMenus[menu.id] || { can_view: false, can_add: false, can_edit: false, can_delete: false });

            return (
              <div 
                key={menu.id} 
                className={`bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[24px] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.06)] flex flex-col gap-4 relative ${menu.parent_id ? 'ml-6' : ''}`}
              >
                {menu.parent_id && (
                  <div className="absolute left-[-16px] top-[24px] w-4 h-[2px] bg-gray-300"></div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-black text-[#F6CB59] flex items-center justify-center shadow-md">
                    <Shield size={14} />
                  </div>
                  <h3 className="font-black text-gray-900 text-base">{menu.menu_name}</h3>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-white/50 p-4 rounded-2xl border border-white/60 shadow-sm">
                  {['can_view', 'can_add', 'can_edit', 'can_delete'].map(field => (
                    <div key={field} className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-gray-600 capitalize">
                        {field.replace('can_', '')}
                      </span>
                      <button
                        disabled={isFullAdmin}
                        onClick={() => !isFullAdmin && togglePermission(menu.id, field)}
                        className={`w-11 h-6 rounded-full relative inline-flex items-center transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${perms[field] ? 'bg-black' : 'bg-gray-200'}`}
                      >
                        <span className={`w-5 h-5 rounded-full shadow-sm transform transition-transform duration-200 ${perms[field] ? 'translate-x-5 bg-[#F6CB59]' : 'translate-x-0.5 bg-white'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Update Button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving || !selectedRole}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-black text-[#F6CB59] hover:scale-[1.02] active:scale-[0.98] transition-all font-black text-[14px] shadow-lg whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Update Permissions
          </button>
        </div>
        </>
      )}
    </div>
  );
}
