import { useState, useEffect } from 'react';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { Users, Save, Loader2, Plus, Shield, X, Key, Eye, EyeOff } from 'lucide-react';

export default function UserMenuAssignment() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [allMenus, setAllMenus] = useState([]);
  
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Create User Form State
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    role_id: ''
  });
  const [creating, setCreating] = useState(false);

  // Permission Modal State
  const [userMenus, setUserMenus] = useState({});
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Password Modal State
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      const [usersRes, rolesRes, menusRes] = await Promise.all([
        api.get('/permissions/users'),
        api.get('/permissions/roles'),
        api.get('/permissions/menus')
      ]);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
      setAllMenus(Array.isArray(menusRes.data) ? menusRes.data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  }

  // Handle creating a new user
  async function handleCreateUser(e) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post('/permissions/users', {
        ...newUser,
        role_id: Number(newUser.role_id)
      });
      toast.success('User created successfully!');
      
      // Update local state with the newly created user (joining role_name manually for quick UI update)
      const role = roles.find(r => r.id === res.data.role_id);
      setUsers([...users, { ...res.data, role_name: role ? role.role_name : 'Unknown', is_active: true }]);
      
      setIsCreateModalOpen(false);
      setNewUser({ username: '', password: '', full_name: '', email: '', role_id: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  // Handle opening the permission modal
  async function openPermissionModal(user) {
    setSelectedUser(user);
    setIsPermissionModalOpen(true);
    try {
      const res = await api.get(`/permissions/users/${user.id}/menus`);
      const menuMap = {};
      (res.data || []).forEach((um) => {
        menuMap[um.menu_id] = { 
          can_view: !!um.can_view,
          can_add: !!um.can_add,
          can_edit: !!um.can_edit,
          can_delete: !!um.can_delete
        };
      });
      setUserMenus(menuMap);
    } catch (error) {
      toast.error('Failed to load user menus');
      setUserMenus({});
    }
  }

  function togglePermission(menuId, field) {
    setUserMenus((prev) => {
      const current = prev[menuId] || { can_view: false, can_add: false, can_edit: false, can_delete: false };
      return {
        ...prev,
        [menuId]: { ...current, [field]: !current[field] },
      };
    });
  }

  async function handleSavePermissions() {
    if (!selectedUser) return;
    setSavingPermissions(true);
    try {
      const payload = Object.keys(userMenus).map((menuId) => ({
        menu_id: parseInt(menuId, 10),
        can_view: !!userMenus[menuId]?.can_view,
        can_add: !!userMenus[menuId]?.can_add,
        can_edit: !!userMenus[menuId]?.can_edit,
        can_delete: !!userMenus[menuId]?.can_delete,
      }));
      await api.post(`/permissions/users/${selectedUser.id}/menus`, { menus: payload });
      toast.success('User menus saved. They must re-login to see changes.');
      setIsPermissionModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save permissions');
    } finally {
      setSavingPermissions(false);
    }
  }

  function openPasswordModal(user) {
    setSelectedUser(user);
    setNewPassword('');
    setIsPasswordModalOpen(true);
  }

  async function handleSavePassword(e) {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    setSavingPassword(true);
    try {
      await api.put(`/permissions/users/${selectedUser.id}/password`, { newPassword });
      toast.success('Password updated successfully');
      setIsPasswordModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-black text-[#F6CB59] flex items-center justify-center shadow-md shrink-0">
            <Users className="w-4 h-4 sm:w-6 sm:h-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base sm:text-2xl md:text-[28px] font-black text-gray-900 tracking-tight leading-none mb-1">
              Access Control
            </h1>
            <p className="text-[10px] sm:text-sm font-medium text-gray-500 mt-0.5 sm:mt-1">
              Manage admin users, roles, and menu permissions.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-black text-[#F6CB59] hover:scale-[1.02] active:scale-[0.98] transition-all font-black text-xs sm:text-[13px] shadow-md whitespace-nowrap"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>Add New User</span>
        </button>
      </div>

      {/* ── Executive Staff Analytics Strip ── */}
      <div className="flex lg:grid lg:grid-cols-3 gap-2.5 sm:gap-4 overflow-x-auto pb-1 hide-scrollbar">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black/90 text-[#F6CB59] flex items-center justify-center shadow-xs shrink-0">
            <Users size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Studio Staff
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight">
              {users.length} <span className="text-xs font-bold text-gray-400">Accounts</span>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[155px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shadow-xs shrink-0">
            <Shield size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Active Logins
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
              {users.filter(u => u.is_active).length} Active Staff
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-white/80 shadow-xs flex items-center gap-3 min-w-[165px] sm:min-w-0 flex-1 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center shadow-xs shrink-0">
            <Key size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Roles Spectrum
            </div>
            <div className="text-sm sm:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
              {roles.length} Defined Roles
            </div>
          </div>
        </div>
      </div>

      {/* Users Table (Desktop) */}
      <div className="hidden lg:block bg-white/80 backdrop-blur-2xl rounded-3xl border border-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-200/80 sticky top-0 z-10 text-gray-700">
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider">Full Name</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider">Username</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/80">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-amber-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 text-sm">{user.full_name || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-mono font-bold text-gray-600">{user.username}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-medium text-gray-600">{user.email || '—'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider bg-black text-[#F6CB59] shadow-xs">
                      {user.role_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs ${
                      user.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openPasswordModal(user)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl shadow-xs transition-colors"
                      >
                        <Key size={13} />
                        <span>Password</span>
                      </button>
                      <button
                        onClick={() => openPermissionModal(user)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-[#F6CB59] bg-black hover:scale-102 rounded-xl shadow-sm transition-all"
                      >
                        <Shield size={13} />
                        <span>Permissions</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400 font-bold">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Storytelling Cards View */}
      <div className="block lg:hidden flex flex-col gap-3.5">
        {users.map(user => (
          <div
            key={user.id}
            className="bg-white/85 backdrop-blur-2xl border border-white/90 rounded-3xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.09)] flex flex-col gap-3 relative overflow-hidden group"
          >
            {/* Top Amber Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F6CB59] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Top Row: Avatar & Name */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-black text-[#F6CB59] flex items-center justify-center font-black text-sm shrink-0 shadow-md border border-gray-800">
                  {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 pr-2">
                  <h3 className="font-black text-[15px] sm:text-[16px] text-gray-900 truncate tracking-tight">
                    {user.full_name || '-'}
                  </h3>
                  <div className="text-[11px] font-mono font-bold text-gray-500 uppercase mt-0.5">
                    @{user.username}
                  </div>
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-black text-[#F6CB59] shadow-xs">
                  {user.role_name}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs ${
                  user.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                }`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Email Strip */}
            {user.email && (
              <div className="bg-gray-50/90 p-2.5 rounded-xl border border-gray-200/60 flex items-center gap-2 text-xs font-bold text-gray-700">
                <span className="text-gray-400 shrink-0">Email:</span>
                <span className="truncate">{user.email}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1 border-t border-gray-100">
              <button
                onClick={() => openPasswordModal(user)}
                className="flex-1 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                <Key size={13} /> Password
              </button>
              <button
                onClick={() => openPermissionModal(user)}
                className="flex-1 py-2 bg-black text-[#F6CB59] hover:scale-102 text-xs font-black rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <Shield size={13} /> Permissions
              </button>
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="py-12 text-center text-gray-400 font-bold bg-white/60 backdrop-blur-md rounded-3xl border border-gray-200 shadow-sm">
            No users found.
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Users className="text-[#F6CB59]" size={20} /> Create New User
              </h2>
              <button
                type="button"
                onClick={() => { setIsCreateModalOpen(false); setShowPassword(false); }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                  className="input"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    className="input"
                    placeholder="johndoe123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      className="input pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="input"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Assign Role</label>
                <select
                  required
                  value={newUser.role_id}
                  onChange={(e) => setNewUser({...newUser, role_id: e.target.value})}
                  className="input cursor-pointer"
                >
                  <option value="" disabled>Select a role...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.role_name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-black text-[#F6CB59] hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-[13px] shadow-md whitespace-nowrap min-w-[120px]"
                >
                  {creating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  <span>Save User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PERMISSION OVERRIDES MODAL */}
      {isPermissionModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <div>
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Shield className="text-[#F6CB59]" size={20} /> Permissions: {selectedUser.full_name}
                </h2>
                <p className="text-xs text-gray-500 mt-1">Grant extra sidebar menus outside of their normal role.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPermissionModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="card overflow-hidden">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-[11px] font-black uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-4">Menu Item</th>
                      <th className="px-4 py-4 text-center">Can View</th>
                      <th className="px-4 py-4 text-center">Can Add</th>
                      <th className="px-4 py-4 text-center">Can Edit</th>
                      <th className="px-4 py-4 text-center">Can Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allMenus.map((menu) => {
                      const perms = userMenus[menu.id] || { can_view: false, can_add: false, can_edit: false, can_delete: false };
                      return (
                        <tr key={menu.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-4 text-sm font-bold text-gray-800 flex items-center gap-2">
                            {menu.parent_id && <span className="ml-4 text-gray-400">↳ </span>}
                            {menu.menu_name}
                          </td>
                          {['can_view', 'can_add', 'can_edit', 'can_delete'].map(field => (
                            <td key={field} className="px-4 py-4 text-center">
                              <button
                                onClick={() => togglePermission(menu.id, field)}
                                className={`w-11 h-6 rounded-full relative inline-flex items-center transition-colors cursor-pointer ${perms[field] ? 'bg-emerald-500' : 'bg-gray-200'}`}
                              >
                                <span className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${perms[field] ? 'translate-x-5' : 'translate-x-0.5'}`} />
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

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 shrink-0">
              <button
                type="button"
                onClick={() => setIsPermissionModalOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={savingPermissions}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-black text-[#F6CB59] hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-[13px] shadow-md whitespace-nowrap min-w-[120px]"
              >
                {savingPermissions ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span>Save Overrides</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {isPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Key className="text-[#F6CB59]" size={20} /> Change Password
              </h2>
              <button
                type="button"
                onClick={() => { setIsPasswordModalOpen(false); setShowPassword(false); }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSavePassword} className="p-6 flex flex-col gap-4">
              <p className="text-sm font-medium text-gray-600">
                Updating password for <strong>{selectedUser.username}</strong>
              </p>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input pr-10"
                    placeholder="••••••••"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword || !newPassword}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-black text-[#F6CB59] hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-[13px] shadow-md whitespace-nowrap min-w-[120px]"
                >
                  {savingPassword ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  <span>Update</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
