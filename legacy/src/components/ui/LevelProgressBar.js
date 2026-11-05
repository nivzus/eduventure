import React from 'react';
import { useGamification } from '../../hooks/useGamification';

const LevelProgressBar = ({ experience }) => {
    const { level, xpForNextLevel, progressPercentage } = useGamification(experience);

    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-orange-600">Səviyyə {level}</span>
                <span className="text-sm text-gray-500">{experience} / {xpForNextLevel} XP</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                    className="bg-gradient-to-r from-orange-400 to-red-500 h-2.5 rounded-full" 
                    style={{ width: `${progressPercentage}%` }}
                ></div>
            </div>
        </div>
    );
};

export default LevelProgressBar;