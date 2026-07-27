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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Shield className="text-blue-600" /> Menu Assignments
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage role-based access control and permissions.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !selectedRole}
          className="btn-primary flex items-center gap-2 py-2 px-6 shadow-md disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Save Changes
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <label className="block text-sm font-bold text-gray-700 mb-4">Select Role</label>
        <div className="flex flex-wrap gap-4">
          {roles.map(r => (
            <button
              key={r.id}
              onClick={() => handleRoleSelect(r.id)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                selectedRole === r.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {r.role_name}
            </button>
          ))}
        </div>
      </div>

      {selectedRole && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="py-4 px-6 text-[11px] font-black uppercase tracking-wider text-gray-500">Menu Name</th>
                  <th className="py-4 px-6 text-[11px] font-black uppercase tracking-wider text-gray-500 text-center">Can View</th>
                  <th className="py-4 px-6 text-[11px] font-black uppercase tracking-wider text-gray-500 text-center">Can Add</th>
                  <th className="py-4 px-6 text-[11px] font-black uppercase tracking-wider text-gray-500 text-center">Can Edit</th>
                  <th className="py-4 px-6 text-[11px] font-black uppercase tracking-wider text-gray-500 text-center">Can Delete</th>
                </tr>
              </thead>
              <tbody>
                {allMenus.map(menu => {
                  const perms = roleMenus[menu.id] || { can_view: false, can_add: false, can_edit: false, can_delete: false };
                  return (
                    <tr key={menu.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 text-sm font-bold text-gray-800 flex items-center gap-2">
                        {menu.parent_id ? <span className="ml-4 text-gray-400">↳ </span> : ''}
                        {menu.menu_name}
                      </td>
                      {['can_view', 'can_add', 'can_edit', 'can_delete'].map(field => (
                        <td key={field} className="py-4 px-6 text-center">
                          <button
                            onClick={() => togglePermission(menu.id, field)}
                            className={`w-10 h-6 rounded-full relative inline-flex items-center transition-colors ${perms[field] ? 'bg-green-500' : 'bg-gray-200'}`}
                          >
                            <span className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${perms[field] ? 'translate-x-5' : 'translate-x-1'}`} />
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
      )}
    </div>
  );
}
