import React from 'react';
import Button from './Button';
import { ArrowRightIcon, XIcon, SparklesIcon } from '../../assets/icons';

const RecommendationCard = ({ recommendation, onStart, onClose }) => {
    if (!recommendation) return null;

    const { pathTitle, courseTitle, courseId } = recommendation;

    return (
        <div className="bg-white border-l-4 border-orange-400 p-4 rounded-lg shadow-lg mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
                <SparklesIcon className="w-8 h-8 flex-shrink-0 text-orange-500" />
                <div>
                    <p className="font-bold text-gray-800">Növbəti Addım</p>
                    <p className="text-sm text-gray-600">
                        <span className="opacity-80">"{pathTitle}" tədris yolunda növbəti:</span> {courseTitle}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <Button onClick={() => onStart(courseId)} variant="primary" size="sm">
                    Kursa Keç <ArrowRightIcon />
                </Button>
                <Button onClick={onClose} variant="ghost" size="sm">
                    <XIcon />
                </Button>
            </div>
        </div>
    );
};

export default RecommendationCard;