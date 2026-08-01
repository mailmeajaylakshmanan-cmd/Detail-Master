import { useState, useEffect } from 'react';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { Users, Save, Loader2, Info } from 'lucide-react';

export default function UserMenuAssignment() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [allMenus, setAllMenus] = useState([]);
  const [userMenus, setUserMenus] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      const [usersRes, menusRes] = await Promise.all([
        api.get('/permissions/users'),
        api.get('/permissions/menus'),
      ]);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setAllMenus(Array.isArray(menusRes.data) ? menusRes.data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load users/menus');
    } finally {
      setLoading(false);
    }
  }

  async function handleUserSelect(userId) {
    setSelectedUser(userId);
    try {
      const res = await api.get(`/permissions/users/${userId}/menus`);
      const menuMap = {};
      (res.data || []).forEach((um) => {
        menuMap[um.menu_id] = { can_view: !!um.can_view };
      });
      setUserMenus(menuMap);
    } catch (error) {
      toast.error('Failed to load user menus');
      setUserMenus({});
    }
  }

  function toggleView(menuId) {
    setUserMenus((prev) => {
      const current = prev[menuId] || { can_view: false };
      return {
        ...prev,
        [menuId]: { can_view: !current.can_view },
      };
    });
  }

  async function handleSave() {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const payload = Object.keys(userMenus).map((menuId) => ({
        menu_id: parseInt(menuId, 10),
        can_view: !!userMenus[menuId]?.can_view,
      }));
      await api.post(`/permissions/users/${selectedUser}/menus`, { menus: payload });
      toast.success('User menus saved. That user must re-login to refresh sidebar.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save user menus');
    } finally {
      setSaving(false);
    }
  }

  const selected = users.find((u) => u.id === selectedUser);

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
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="text-blue-600" /> User Menu Overrides
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Extra menus for a user via <code className="text-xs bg-white/70 px-1 rounded">user_menus</code>
            {' '}(<code className="text-xs">user_id</code> ← admin user, <code className="text-xs">menu_id</code> ← menus).
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !selectedUser}
          className="btn-primary flex items-center gap-2 py-2 px-6 shadow-md disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Save Changes
        </button>
      </div>

      <div className="card p-4 flex gap-3 text-sm text-slate-600">
        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <p>
          These menus are <strong>added on top of</strong> the user’s role menus (OR in login query).
          Only <strong>Can View</strong> is stored in <code>user_menus</code>. Super Admin still sees all menus.
        </p>
      </div>

      <div className="card p-6">
        <label className="block text-sm font-bold text-gray-700 mb-4">Select User</label>
        {users.length === 0 ? (
          <p className="text-sm text-gray-500">No admin users found.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleUserSelect(u.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all text-left ${
                  selectedUser === u.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : 'bg-white/70 text-gray-700 border border-white/60 hover:bg-white'
                }`}
              >
                <div>{u.full_name || u.username}</div>
                <div className={`text-[11px] font-medium ${selectedUser === u.id ? 'text-blue-100' : 'text-gray-400'}`}>
                  @{u.username} · {u.role_name || 'No role'}
                  {!u.is_active ? ' · inactive' : ''}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="card overflow-hidden">
          <div className="px-6 py-3 border-b border-white/50 bg-white/40 text-sm font-semibold text-gray-600">
            Assigning menus for <span className="text-gray-900">{selected?.full_name || selected?.username}</span>
            {' '}(user id {selectedUser})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[480px]">
              <thead>
                <tr className="bg-white/50 border-b border-white/40">
                  <th className="py-4 px-6 text-[11px] font-black uppercase tracking-wider text-gray-500">Menu Name</th>
                  <th className="py-4 px-6 text-[11px] font-black uppercase tracking-wider text-gray-500">Route</th>
                  <th className="py-4 px-6 text-[11px] font-black uppercase tracking-wider text-gray-500 text-center">Can View</th>
                </tr>
              </thead>
              <tbody>
                {allMenus.map((menu) => {
                  const perms = userMenus[menu.id] || { can_view: false };
                  return (
                    <tr key={menu.id} className="border-b border-white/30 hover:bg-white/40 transition-colors">
                      <td className="py-3.5 px-6 text-sm font-bold text-gray-800">
                        {menu.parent_id ? <span className="ml-4 text-gray-400">↳ </span> : null}
                        {menu.menu_name}
                      </td>
                      <td className="py-3.5 px-6 text-xs font-mono text-gray-500">
                        {menu.route_path || '—'}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => toggleView(menu.id)}
                          className={`w-10 h-6 rounded-full relative inline-flex items-center transition-colors ${
                            perms.can_view ? 'bg-green-500' : 'bg-gray-200'
                          }`}
                          aria-label={`Toggle view for ${menu.menu_name}`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                              perms.can_view ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
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
