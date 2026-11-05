import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ArrowLeftIcon, EyeIcon, TrophyIcon, ClockIcon, RefreshIcon } from '../assets/icons';
import { supabase } from '../supabaseClient';

const QuizResultPage = ({ lastResult, onBack, onReview, onReviewPractice }) => {
    const {
        score,
        totalPoints,
        correctAnswersCount,
        totalQuestions,
        userName,
        userSurname,
        id: resultId,
        quizId,
        status
    } = lastResult;

    const [leaderboard, setLeaderboard] = useState({ rank: 0, totalParticipants: 0, isLoading: true });

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

    useEffect(() => {
        if (status === 'pending_review' || !quizId) {
            setLeaderboard({ rank: 0, totalParticipants: 0, isLoading: false });
            return;
        }

        const fetchLeaderboard = async () => {
            const { data: results, error } = await supabase
                .from('quiz_results')
                .select('id, score, created_at')
                .eq('quizId', quizId)
                .eq('status', 'completed');

            if (error) {
                console.error("Error fetching quiz leaderboard:", error);
                setLeaderboard({ rank: 0, totalParticipants: 0, isLoading: false });
                return;
            }

            const sortedResults = results.sort((a, b) => b.score - a.score || new Date(a.created_at) - new Date(b.created_at));
            
            const rank = sortedResults.findIndex(r => r.id === resultId) + 1;
            
            setLeaderboard({ rank, totalParticipants: sortedResults.length, isLoading: false });
        };

        fetchLeaderboard();
    }, [quizId, resultId, status]);

    let message = '';
    let messageColor = 'text-gray-800';

    if (status === 'pending_review') {
        message = 'Testdə açıq suallar olduğu üçün nəticəniz müəllim tərəfindən yoxlanıldıqdan sonra göstəriləcək.';
        messageColor = 'text-blue-600';
    } else if (percentage === 100) {
        message = 'Əla! Bütün suallara düzgün cavab verdiniz!';
        messageColor = 'text-green-600';
    } else if (percentage >= 75) {
        message = 'Yaxşı işdir! Siz əla bacardınız.';
        messageColor = 'text-blue-600';
    } else if (percentage >= 50) {
        message = 'Pis deyil, amma daha yaxşı ola bilər.';
        messageColor = 'text-yellow-600';
    } else {
        message = 'Yenidən cəhd etməyə dəyər.';
        messageColor = 'text-red-600';
    }

    const circumference = 2 * Math.PI * 70;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="animate-fade-in text-center">
            <Card className="p-4 sm:p-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Testin Nəticələri</h1>
                {userName && <p className="text-lg text-gray-600 mt-2">Nəticələr: {userName} {userSurname}</p>}
                
                {status !== 'pending_review' ? (
                    <>
                        <div className="my-6 sm:my-8 relative inline-flex items-center justify-center">
                            <svg className="w-48 h-48" viewBox="0 0 180 180">
                                <circle className="text-gray-200" strokeWidth="14" stroke="currentColor" fill="transparent" r="70" cx="90" cy="90" />
                                <circle
                                    className="text-orange-500"
                                    strokeWidth="14"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="70" cx="90" cy="90"
                                    strokeLinecap="round"
                                    style={{ strokeDasharray: circumference, strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease-out' }}
                                    transform="rotate(-90 90 90)"
                                />
                            </svg>
                            <div className="absolute flex flex-col items-center justify-center w-full">
                                <span className="text-4xl sm:text-5xl font-bold text-orange-500">{percentage}%</span>
                                <span className="text-lg text-gray-600 mt-1">{score} / {totalPoints} bal</span>
                                <span className="text-sm text-gray-500 mt-1">({correctAnswersCount} / {totalQuestions} düzgün)</span>
                            </div>
                        </div>
                        {leaderboard.isLoading ? (
                            <div className="h-10 flex items-center justify-center mb-8">
                                <p className="text-gray-500">Reytinq hesablanır...</p>
                            </div>
                        ) : leaderboard.rank > 0 && leaderboard.totalParticipants > 0 && (
                            <div className="mb-8">
                                <div className="inline-flex items-center bg-yellow-100 text-yellow-800 font-semibold px-4 py-2 rounded-full">
                                    <TrophyIcon className="w-6 h-6 mr-2" />
                                    <span>Sizin bu test üzrə reytinqiniz: {leaderboard.totalParticipants} iştirakçı arasında <strong>{leaderboard.rank}-ci yer</strong></span>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="my-12">
                        <div className="inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-full w-24 h-24">
                            <ClockIcon className="w-12 h-12" />
                        </div>
                    </div>
                )}

                <p className={`text-lg sm:text-xl font-semibold ${messageColor} mb-8`}>{message}</p>
                
                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
                    <Button onClick={onBack} variant="secondary" className="w-full sm:w-auto">
                        <ArrowLeftIcon />
                        Siyahıya qayıt
                    </Button>
                    <Button onClick={onReview} className="w-full sm:w-auto">
                        <EyeIcon />
                        Cavablara bax
                    </Button>
                    {status !== 'pending_review' && percentage < 100 && (
                        <Button onClick={() => onReviewPractice(lastResult)} variant="primary" className="w-full sm:w-auto">
                            <RefreshIcon />
                            Səhvlər üzərində işlə
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default QuizResultPage;
