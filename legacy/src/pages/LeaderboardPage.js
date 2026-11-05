import React, { useState, useMemo } from 'react';
import Card from '../components/ui/Card';
import { GoldMedalIcon, SilverMedalIcon, BronzeMedalIcon, TrophyIcon, FireIcon } from '../assets/icons';

const LeaderboardList = ({ users, title, currentUserId, valueKey, valueLabel }) => (
    <Card>
        <h2 className="text-xl font-bold text-center mb-4 text-orange-600">{title}</h2>
        {users.length > 0 ? (
            <ol className="space-y-3">
                {users.map((user, index) => (
                    <li key={user.user_id} className={`flex items-center justify-between p-3 rounded-lg transition ${user.user_id === currentUserId ? 'bg-orange-100 border-2 border-orange-300' : 'bg-gray-50 hover:bg-gray-100'}`}>
                        <div className="flex items-center gap-4">
                            <span className="text-lg font-bold text-gray-400 w-6 text-center">{index + 1}</span>
                            <span className="flex items-center gap-2">
                                {index === 0 ? <GoldMedalIcon /> : index === 1 ? <SilverMedalIcon /> : index === 2 ? <BronzeMedalIcon /> : <TrophyIcon className="w-5 h-5 text-gray-400" />}
                                <span className={`font-semibold ${user.user_id === currentUserId ? 'text-orange-700 font-bold' : 'text-gray-800'}`}>
                                    {user.userName} {user.userSurname} {user.user_id === currentUserId && '(Siz)'}
                                </span>
                            </span>
                        </div>
                        <span className="font-bold text-lg text-orange-500">{user[valueKey]} {valueLabel}</span>
                    </li>
                ))}
            </ol>
        ) : (
            <p className="text-center text-gray-500 py-8">Bu reytinq üçün kifayət qədər data yoxdur.</p>
        )}
    </Card>
);

const LeaderboardPage = ({ results, profile, allUsers }) => {
    const [activeTab, setActiveTab] = useState('weekly');
    const currentUserId = profile?.id;

    const leaderboardData = useMemo(() => {
        const processResults = (filteredResults) => {
            const userScores = filteredResults.reduce((acc, result) => {
                if (!result.user_id) return acc;
                
                const key = result.user_id;
                if (!acc[key]) {
                    acc[key] = { 
                        user_id: result.user_id,
                        totalScore: 0, 
                        userName: result.userName, 
                        userSurname: result.userSurname 
                    };
                }
                acc[key].totalScore += result.score;
                return acc;
            }, {});

            return Object.values(userScores)
                .sort((a, b) => b.totalScore - a.totalScore)
                .slice(0, 10);
        };

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const weeklyResults = results.filter(r => new Date(r.created_at) > sevenDaysAgo);

        return {
            weekly: processResults(weeklyResults),
            overall: processResults(results),
        };
    }, [results]);

    const streakLeaderboard = useMemo(() => {
        if (!allUsers) return [];
        return allUsers
            .filter(u => u.daily_streak > 0)
            .sort((a, b) => b.daily_streak - a.daily_streak)
            .slice(0, 10)
            .map(u => ({
                user_id: u.id,
                userName: u.first_name,
                userSurname: u.last_name,
                streak: u.daily_streak,
            }));
    }, [allUsers]);

    return (
        <div className="animate-fade-in space-y-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Reytinqlər</h1>
            
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('weekly')} className={`${activeTab === 'weekly' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Həftəlik Reytinq</button>
                    <button onClick={() => setActiveTab('overall')} className={`${activeTab === 'overall' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Ümumi Reytinq</button>
                    <button onClick={() => setActiveTab('streak')} className={`${activeTab === 'streak' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}><FireIcon /> Günlük Seriya</button>
                </nav>
            </div>

            {activeTab === 'weekly' && <LeaderboardList users={leaderboardData.weekly} title="Həftənin Liderləri" currentUserId={currentUserId} valueKey="totalScore" valueLabel="bal" />}
            {activeTab === 'overall' && <LeaderboardList users={leaderboardData.overall} title="Bütün Zamanların Liderləri" currentUserId={currentUserId} valueKey="totalScore" valueLabel="bal" />}
            {activeTab === 'streak' && <LeaderboardList users={streakLeaderboard} title="Ən Uzun Günlük Seriya" currentUserId={currentUserId} valueKey="streak" valueLabel="gün" />}
        </div>
    );
};

export default LeaderboardPage;
