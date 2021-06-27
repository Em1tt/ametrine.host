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
    hasPermission: (permissionID: string, path: string): boolean => {
        if (!permissionID) return false;
        if (parseInt(permissionID) == 0) return false;
        return permission[permissionID].accessAPI.includes(path)
    }
}
