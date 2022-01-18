import permission from '../permissions.json'

/**
 *      --  Permission Levels  --
 * Edit permissions in src/permissions.json
 * 
 * 0 - Everyone - Users who are registered have access to these pages/endpoints
 * 1 - Client - Users who have bought a service can access pages normal users cannot access, like services.
 * 2:level - Support - Staff members who have access to list available tickets at their level. They can only access tickets from their level below.
 * 3 - Developer - Users who have access to special pages.
 * 4 - Administrator - Users who have access to almost all pages.
 *
 */

export const permissions = {
    hasPermission: (permissionID: string | number, path: string): boolean => {
        if (!permissionID && isNaN(parseInt(permissionID as string))) return false; // Also the reason why the permission ID 0 never works.
        //if (parseInt(permissionID) == 0) return false; // This is the reason why nothing with 0 wont work, not sure why I added this.
        return permission[permissionID].accessAPI.includes("all") ? true : permission[permissionID].accessAPI.includes(path);
    },
    canViewPage: (permissionID: string, path: string): boolean => {
        if (!permissionID && typeof permissionID != 'number') return false;
        return permission[permissionID].accessPages.includes("all") ? true : permission[permissionID].accessPages.includes(path);
    }
}
