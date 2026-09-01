import { useState, useEffect } from 'react';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { Shield, Save, Loader2, KeyRound, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';

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
        api.get('/permissions/menus'),
      ]);
      setRoles(rolesRes.data);
      setAllMenus(menusRes.data);
      if (rolesRes.data && rolesRes.data.length > 0) {
        handleRoleSelect(rolesRes.data[0].id);
      }
    } catch (error) {
      toast.error('Failed to load access control data');
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleSelect(roleId) {
    setSelectedRole(roleId);
    try {
      const res = await api.get(`/permissions/roles/${roleId}/menus`);
      const menuMap = {};
      res.data.forEach((rm) => {
        menuMap[rm.menu_id] = {
          can_view: rm.can_view,
          can_add: rm.can_add,
          can_edit: rm.can_edit,
          can_delete: rm.can_delete,
        };
      });
      setRoleMenus(menuMap);
    } catch (error) {
      toast.error('Failed to load role permissions');
    }
  }

  function togglePermission(menuId, field) {
    setRoleMenus((prev) => {
      const current = prev[menuId] || {
        can_view: false,
        can_add: false,
        can_edit: false,
        can_delete: false,
      };
      return {
        ...prev,
        [menuId]: { ...current, [field]: !current[field] },
      };
    });
  }

  async function handleSave() {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const payload = Object.keys(roleMenus).map((menuId) => ({
        menu_id: parseInt(menuId),
        ...roleMenus[menuId],
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
        <Loader2 className="animate-spin text-[#F6CB59]" size={36} />
      </div>
    );
  }

  const selectedRoleObj = roles.find((r) => r.id === selectedRole);
  const isFullAdmin =
    selectedRoleObj?.role_name === 'Administrator' || selectedRoleObj?.role_name === 'Super Admin';

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 pb-20">
      {/* ── Top Header Toolbar ── */}
      <div className="bg-white/70 backdrop-blur-2xl rounded-2xl sm:rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-white/80 p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-black text-[#F6CB59] flex items-center justify-center shadow-md shrink-0">
            <Shield className="w-4 h-4 sm:w-6 sm:h-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base sm:text-xl md:text-[22px] font-black text-gray-900 tracking-tight leading-none mb-1">
              Role Access Control
            </h1>
            <p className="text-[10px] sm:text-[12px] font-bold text-gray-500 tracking-wide uppercase">
              Manage enterprise RBAC permissions matrix across application modules
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !selectedRole || isFullAdmin}
          className="flex items-center justify-center gap-1.5 px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl bg-black text-[#F6CB59] hover:scale-[1.02] active:scale-[0.98] transition-all font-black text-xs sm:text-[13px] shadow-md whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          <span>Update Permissions</span>
        </button>
      </div>

      {/* ── Executive Security Analytics Strip ── */}
      <div className="flex lg:grid lg:grid-cols-3 gap-2.5 sm:gap-4 overflow-x-auto pb-1 hide-scrollbar">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black/90 text-[#F6CB59] flex items-center justify-center shadow-xs shrink-0">
            <KeyRound size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Configured Roles
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight">
              {roles.length} <span className="text-xs font-bold text-gray-400">Security Roles</span>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center shadow-xs shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Protected Modules
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
              {allMenus.length} Navigation Menus
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[165px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shadow-xs shrink-0">
            <Lock size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Active Focus
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap truncate">
              {selectedRoleObj?.role_name || 'Select Role'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Role Selector Ribbon ── */}
      <div className="bg-white/80 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.05)] p-4 sm:p-5">
        <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-3">
          Select Role to Configure
        </label>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {roles.map((r) => {
            const isSelected = selectedRole === r.id;
            return (
              <button
                key={r.id}
                onClick={() => handleRoleSelect(r.id)}
                className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all shadow-xs ${
                  isSelected
                    ? 'bg-black text-[#F6CB59] shadow-md scale-102'
                    : 'bg-white text-gray-700 border border-gray-200/80 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {r.role_name}
              </button>
            );
          })}
        </div>
      </div>

      {selectedRole && (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white/80 backdrop-blur-2xl rounded-3xl border border-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-200/80 sticky top-0 z-10 text-gray-700">
                    <th className="py-4 px-6 text-[11px] font-black uppercase tracking-wider">Module Name</th>
                    <th className="py-4 px-6 text-[11px] font-black uppercase tracking-wider text-center">Can View</th>
                    <th className="py-4 px-6 text-[11px] font-black uppercase tracking-wider text-center">Can Add</th>
                    <th className="py-4 px-6 text-[11px] font-black uppercase tracking-wider text-center">Can Edit</th>
                    <th className="py-4 px-6 text-[11px] font-black uppercase tracking-wider text-center">Can Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/80">
                  {allMenus.map((menu) => {
                    const perms = isFullAdmin
                      ? { can_view: true, can_add: true, can_edit: true, can_delete: true }
                      : roleMenus[menu.id] || {
                          can_view: false,
                          can_add: false,
                          can_edit: false,
                          can_delete: false,
                        };

                    return (
                      <tr key={menu.id} className="hover:bg-amber-50/30 transition-colors group">
                        <td className="py-4 px-6 text-sm font-bold text-gray-900 flex items-center gap-2">
                          {menu.parent_id ? <span className="ml-4 text-amber-600 font-bold">↳ </span> : ''}
                          <span>{menu.menu_name}</span>
                        </td>
                        {['can_view', 'can_add', 'can_edit', 'can_delete'].map((field) => (
                          <td key={field} className="py-4 px-6 text-center">
                            <button
                              disabled={isFullAdmin}
                              onClick={() => !isFullAdmin && togglePermission(menu.id, field)}
                              className={`w-11 h-6 rounded-full relative inline-flex items-center transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-75 ${
                                perms[field] ? 'bg-black' : 'bg-gray-200'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-full shadow-sm transform transition-transform duration-200 ${
                                  perms[field] ? 'translate-x-5 bg-[#F6CB59]' : 'translate-x-0.5 bg-white'
                                }`}
                              />
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

          {/* Mobile Storytelling Cards View */}
          <div className="block lg:hidden flex flex-col gap-3.5">
            {allMenus.map((menu) => {
              const perms = isFullAdmin
                ? { can_view: true, can_add: true, can_edit: true, can_delete: true }
                : roleMenus[menu.id] || {
                    can_view: false,
                    can_add: false,
                    can_edit: false,
                    can_delete: false,
                  };

              return (
                <div
                  key={menu.id}
                  className={`bg-white/85 backdrop-blur-2xl border border-white/90 rounded-3xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.05)] flex flex-col gap-3 relative overflow-hidden group ${
                    menu.parent_id ? 'ml-4' : ''
                  }`}
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F6CB59] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-black text-[#F6CB59] flex items-center justify-center shadow-xs shrink-0">
                      <Shield size={14} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-gray-900 text-sm sm:text-base leading-tight">
                        {menu.menu_name}
                      </h3>
                      {menu.parent_id && (
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                          Sub-module
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-gray-50/90 p-3 rounded-2xl border border-gray-200/60">
                    {['can_view', 'can_add', 'can_edit', 'can_delete'].map((field) => (
                      <div
                        key={field}
                        className="flex items-center justify-between p-1.5 bg-white rounded-xl border border-gray-200/80 shadow-xs"
                      >
                        <span className="text-[11px] font-bold text-gray-700 capitalize">
                          {field.replace('can_', '')}
                        </span>
                        <button
                          disabled={isFullAdmin}
                          onClick={() => !isFullAdmin && togglePermission(menu.id, field)}
                          className={`w-9 h-5 rounded-full relative inline-flex items-center transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-75 shrink-0 ${
                            perms[field] ? 'bg-black' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${
                              perms[field] ? 'translate-x-4 bg-[#F6CB59]' : 'translate-x-0.5 bg-white'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Update Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !selectedRole || isFullAdmin}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-black text-[#F6CB59] hover:scale-[1.02] active:scale-[0.98] transition-all font-black text-[14px] shadow-lg whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              <span>Save & Apply Matrix</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
