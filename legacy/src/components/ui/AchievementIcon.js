import React from 'react';
import { StarIcon, FireIcon, AcademicCapIcon } from '@heroicons/react/24/solid';

const iconMap = {
    sniper: FireIcon,
    marathoner: StarIcon,
    newbie: AcademicCapIcon,
    default: StarIcon,
};

const colorMap = {
    gold: 'text-yellow-500',
    silver: 'text-gray-400',
    bronze: 'text-orange-700',
    default: 'text-gray-400',
};

const AchievementIcon = ({ achievement }) => {
    if (!achievement) return null;

    const IconComponent = iconMap[achievement.icon_name] || iconMap.default;
    const iconColor = colorMap[achievement.badge_color] || colorMap.default;

    return (
        <div 
            className="flex flex-col items-center justify-start text-center p-3 rounded-lg bg-gray-50 border border-gray-200 w-32 h-30"
            title={`${achievement.name}: ${achievement.description}`}
        >
            <IconComponent className={`h-10 w-10 ${iconColor} mb-2 flex-shrink-0`} />
            <p className="text-xs font-bold text-gray-800 break-words">{achievement.name}</p>
            <p className="mt-1 text-gray-500" style={{ fontSize: '0.7rem', lineHeight: '0.9rem' }}>{achievement.description}</p>
        </div>
    );
};

export default AchievementIcon;