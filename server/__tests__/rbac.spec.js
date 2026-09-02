describe('RBAC & Permission Matrix Evaluation', () => {
  function checkPermission(user, role, menuPermissions, targetMenu, httpMethod) {
    // 1. Super Admin and Administrator bypass all checks
    if (role.role_name === 'Super Admin' || role.role_name === 'Administrator') {
      return { allowed: true };
    }

    const actionMap = {
      GET: 'can_view',
      POST: 'can_add',
      PUT: 'can_edit',
      PATCH: 'can_edit',
      DELETE: 'can_delete'
    };
    const requiredAction = actionMap[httpMethod] || 'can_view';

    // 2. Check role/user menu permission
    const perm = menuPermissions.find(p => p.menu_name === targetMenu && p.user_id === user.id);
    if (perm && perm[requiredAction]) {
      return { allowed: true };
    }

    return { allowed: false, status: 403, message: 'Forbidden: insufficient permissions' };
  }

  test('Super Admin has unconditional access to all menus and methods', () => {
    const superAdminUser = { id: 1 };
    const superAdminRole = { role_name: 'Super Admin' };
    const emptyPermissions = [];

    expect(checkPermission(superAdminUser, superAdminRole, emptyPermissions, 'Invoicing & Records', 'DELETE').allowed).toBe(true);
    expect(checkPermission(superAdminUser, superAdminRole, emptyPermissions, 'Services', 'POST').allowed).toBe(true);
  });

  test('Standard Staff role with only can_view cannot add, edit, or delete', () => {
    const staffUser = { id: 10 };
    const staffRole = { role_name: 'Staff' };
    const permissions = [
      { user_id: 10, menu_name: 'Invoicing & Records', can_view: true, can_add: false, can_edit: false, can_delete: false }
    ];

    expect(checkPermission(staffUser, staffRole, permissions, 'Invoicing & Records', 'GET').allowed).toBe(true);
    expect(checkPermission(staffUser, staffRole, permissions, 'Invoicing & Records', 'POST').allowed).toBe(false);
    expect(checkPermission(staffUser, staffRole, permissions, 'Invoicing & Records', 'DELETE').allowed).toBe(false);
  });

  test('Denies access when user has no permissions configured for the target menu', () => {
    const staffUser = { id: 10 };
    const staffRole = { role_name: 'Staff' };
    const permissions = [];

    const result = checkPermission(staffUser, staffRole, permissions, 'Online Booking', 'GET');
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(403);
  });
});
