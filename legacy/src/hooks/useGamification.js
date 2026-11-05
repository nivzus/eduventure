import { useMemo } from 'react';

export const useGamification = (experience) => {
    const gamificationData = useMemo(() => {
        const xp = experience || 0;
        const currentLevel = Math.floor(xp / 100) + 1;
        const nextLevelXp = currentLevel * 100;
        const currentLevelXp = (currentLevel - 1) * 100;
        const xpIntoLevel = xp - currentLevelXp;
        const xpForNextLevel = nextLevelXp - currentLevelXp;
        const progressPercentage = xpForNextLevel > 0 ? (xpIntoLevel / xpForNextLevel) * 100 : 0;

        return {
            level: currentLevel,
            experience: xp,
            xpForNextLevel: nextLevelXp,
            progressPercentage,
        };
    }, [experience]);

    return gamificationData;
};