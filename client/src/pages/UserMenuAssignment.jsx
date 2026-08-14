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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="text-blue-600" /> User Management
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Manage admin users, roles, and menu permissions.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          <span>Add New User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{user.full_name || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-600">{user.username}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-600">{user.email || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700">
                      {user.role_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                      user.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openPasswordModal(user)}
                        className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                      >
                        <Key size={14} />
                        <span className="hidden sm:inline">Password</span>
                      </button>
                      <button
                        onClick={() => openPermissionModal(user)}
                        className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                      >
                        <Shield size={14} />
                        <span className="hidden sm:inline">Permissions</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500 font-medium">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="text-blue-600" size={20} /> Create New User
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
                  className="btn-primary flex items-center justify-center gap-2 min-w-[120px]"
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
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="text-blue-600" size={20} /> Permissions: {selectedUser.full_name}
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
                className="btn-primary flex items-center justify-center gap-2 min-w-[120px]"
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
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Key className="text-blue-600" size={20} /> Change Password
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
                  className="btn-primary flex items-center justify-center gap-2 min-w-[120px]"
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
