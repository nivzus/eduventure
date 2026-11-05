import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ClipboardCheckIcon, DuplicateIcon, BookOpenIcon, CollectionIcon, PaperAirplaneIcon, DocumentTextIcon } from '../assets/icons';
import { useWeakTopics } from '../hooks/useWeakTopics';
import WeakTopicsCard from '../components/ui/WeakTopicsCard';
import GamificationStats from '../components/GamificationStats';


const DashboardPage = ({ profile, activeAssignmentsCount, dueFlashcardsCount, quizResults, quizzes }) => {
    const navigate = useNavigate();
    
    const weakTopics = useWeakTopics(quizResults, quizzes, profile);
    
    if (!profile) {
        return <div className="text-center py-12">Yüklənir...</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-800">Xoş gəlmisiniz, {profile.first_name || profile.username}!</h1>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link to="/my-assignments" className="block">
                    <Card className="hover:shadow-orange-200 hover:-translate-y-1 transition-transform duration-200 text-center h-full">
                        <ClipboardCheckIcon className="w-12 h-12 mx-auto text-orange-500" />
                        <p className="text-4xl font-bold mt-2">{activeAssignmentsCount}</p>
                        <p className="text-gray-600 mt-1">Aktiv Tapşırıq</p>
                    </Card>
                </Link>
                <Link to="/decks" className="block">
                    <Card className="hover:shadow-blue-200 hover:-translate-y-1 transition-transform duration-200 text-center h-full">
                        <DuplicateIcon className="w-12 h-12 mx-auto text-blue-500" />
                        <p className="text-4xl font-bold mt-2">{dueFlashcardsCount}</p>
                        <p className="text-gray-600 mt-1">Təkrar üçün Kart</p>
                    </Card>
                </Link>
            </div>

            {/* Gamification Stats */}
            <GamificationStats profile={profile} />

            {/* New Weak Topics Card */}
            <WeakTopicsCard topics={weakTopics} />

            {/* Быстрые действия */}
            <Card>
                <h2 className="text-xl font-bold mb-4">Haradan başlayaq?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Button onClick={() => navigate('/quizzes')} variant="secondary" className="h-24 text-lg"><BookOpenIcon /> Testlər</Button>
                    <Button onClick={() => navigate('/articles')} variant="secondary" className="h-24 text-lg"><DocumentTextIcon /> Məqalələr</Button>
                    <Button onClick={() => navigate('/courses')} variant="secondary" className="h-24 text-lg"><CollectionIcon /> Kurslar</Button>
                    <Button onClick={() => navigate('/paths')} variant="secondary" className="h-24 text-lg"><PaperAirplaneIcon /> Tədris Yolları</Button>
                </div>
            </Card>
        </div>
    );
};

export default DashboardPage;
