import { useMemo } from 'react';

export function usePermissions(menuName) {
  return useMemo(() => {
    const fullPermissions = {
      can_view: true, can_add: true, can_edit: true, can_delete: true,
      canView: true, canAdd: true, canEdit: true, canDelete: true
    };
    const defaultPermissions = {
      can_view: false, can_add: false, can_edit: false, can_delete: false,
      canView: false, canAdd: false, canEdit: false, canDelete: false
    };
    
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return defaultPermissions;
      
      const user = JSON.parse(userStr);
      if (!user) return defaultPermissions;

      // Super Admin or Administrator has universal full access
      const roleName = String(user.role_name || user.role || '').toLowerCase();
      if (roleName === 'super admin' || roleName === 'administrator' || roleName === 'admin') {
        return fullPermissions;
      }

      if (!user.menus || !Array.isArray(user.menus)) return defaultPermissions;

      // Function to recursively search for the menu by name
      const findMenu = (menus, targetName) => {
        for (const menu of menus) {
          if (menu.menu_name === targetName || menu.name === targetName) {
            return menu;
          }
          if (menu.subItems && menu.subItems.length > 0) {
            const found = findMenu(menu.subItems, targetName);
            if (found) return found;
          }
        }
        return null;
      };

      const menu = findMenu(user.menus, menuName);
      if (menu) {
        const canView = !!menu.can_view;
        const canAdd = !!menu.can_add;
        const canEdit = !!menu.can_edit;
        const canDelete = !!menu.can_delete;

        return {
          can_view: canView,
          can_add: canAdd,
          can_edit: canEdit,
          can_delete: canDelete,
          canView,
          canAdd,
          canEdit,
          canDelete,
        };
      }
      
      return defaultPermissions;
    } catch (err) {
      console.error('Error parsing user permissions:', err);
      return defaultPermissions;
    }
  }, [menuName]);
}

export default usePermissions;
