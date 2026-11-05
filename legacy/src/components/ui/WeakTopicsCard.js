import React from 'react';
import { Link } from 'react-router-dom';
import Card from './Card';
import { ChartBarIcon } from '../../assets/icons';

const WeakTopicsCard = ({ topics }) => {
    if (!topics || topics.length === 0) {
        return null;
    }

    return (
        <Card>
            <h2 className="text-xl font-bold mb-4">Təkmilləşdiriləcək Mövzular</h2>
            <div className="space-y-4">
                {topics.map(topic => (
                    <Link
                        to={`/quizzes?category=${encodeURIComponent(topic.name)}`}
                        key={topic.name}
                        className="block p-4 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors"
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <ChartBarIcon className="w-6 h-6 text-orange-500" />
                                <span className="font-semibold text-gray-800">{topic.name}</span>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-lg text-orange-600">{topic.accuracy}%</p>
                                <p className="text-xs text-gray-500">{topic.totalQuestions} sualdan</p>
                            </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full" style={{ width: `${topic.accuracy}%` }}></div>
                        </div>
                    </Link>
                ))}
            </div>
        </Card>
    );
};

export default WeakTopicsCard;