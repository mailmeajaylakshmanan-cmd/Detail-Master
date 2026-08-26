import { useMemo } from 'react';

export function usePermissions(menuName) {
  return useMemo(() => {
    const defaultPermissions = { can_view: false, can_add: false, can_edit: false, can_delete: false };
    
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return defaultPermissions;
      
      const user = JSON.parse(userStr);
      if (!user || !user.menus) return defaultPermissions;

      // Function to recursively search for the menu by name
      const findMenu = (menus, targetName) => {
        for (const menu of menus) {
          if (menu.menu_name === targetName) {
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
        return {
          can_view: !!menu.can_view,
          can_add: !!menu.can_add,
          can_edit: !!menu.can_edit,
          can_delete: !!menu.can_delete,
        };
      }
      
      return defaultPermissions;
    } catch (err) {
      console.error('Error parsing user permissions:', err);
      return defaultPermissions;
    }
  }, [menuName]);
}
