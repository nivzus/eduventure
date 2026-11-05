import { useMemo } from 'react';

/**
 * Checks if the current user has access to a given content item.
 * @param {object} item - The content item (quiz, course, etc.). Must have visibility, author_id, visible_to_users, visible_to_groups.
 * @param {object} profile - The current user's profile. Must have id, role, and groups (an array of group IDs).
 * @returns {boolean} - True if the user has access, false otherwise.
 */
export const useHasAccess = (item, profile) => {
    const hasAccess = useMemo(() => {
        // If no item, no access. If no profile, only public items are accessible.
        if (!item) {
            return false;
        }

        // Public items are accessible to everyone.
        if (item.visibility === 'public' || !item.visibility) {
            return true;
        }

        // If item is restricted, but there's no logged-in user, no access.
        if (!profile) {
            return false;
        }

        // Admins and authors of the item always have access.
        if (profile.role === 'admin' || item.author_id === profile.id) {
            return true;
        }

        // For restricted items, check user and group lists.
        if (item.visibility === 'restricted') {
            const userHasDirectAccess = item.visible_to_users?.includes(profile.id);
            if (userHasDirectAccess) return true;

            const userGroupIds = new Set(profile.groups || []);
            const itemGroupIds = new Set(item.visible_to_groups || []);
            const hasGroupAccess = userGroupIds.size > 0 && itemGroupIds.size > 0 && [...userGroupIds].some(groupId => itemGroupIds.has(groupId));
            if (hasGroupAccess) return true;
        }

        return false;
    }, [item, profile]);

    return hasAccess;
};