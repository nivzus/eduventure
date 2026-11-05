import React from 'react';
import { Link } from 'react-router-dom';
import Card from './ui/Card';
import LevelProgressBar from './ui/LevelProgressBar';
import { StarIcon, FireIcon } from '../assets/icons';

const GamificationStats = ({ profile }) => {
    if (!profile) return null;

    const experience = profile.experience_points || 0;
    const dailyStreak = profile.daily_streak || 0;

    return (
        <Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-2">
                    <h2 className="text-xl font-bold mb-4">Sizin Proqresiniz</h2>
                    <LevelProgressBar experience={experience} />
                </div>
                <div className="flex justify-around md:justify-end gap-6 text-center border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-6">
                    <Link to="/profile" className="flex flex-col items-center hover:opacity-75 transition-opacity">
                        <div className="flex items-center gap-2 text-2xl font-bold text-yellow-500">
                            <StarIcon />
                            <span>{experience}</span>
                        </div>
                        <span className="text-sm text-gray-500">Təcrübə Xalı</span>
                    </Link>
                    <Link to="/profile" className="flex flex-col items-center hover:opacity-75 transition-opacity">
                        <div className="flex items-center gap-2 text-2xl font-bold text-red-500">
                            <FireIcon />
                            <span>{dailyStreak}</span>
                        </div>
                        <span className="text-sm text-gray-500">Günlük Seriya</span>
                    </Link>
                </div>
            </div>
        </Card>
    );
};

export default GamificationStats;