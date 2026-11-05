import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button'; 
import Modal from '../components/ui/Modal';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, TrophyIcon, GoldMedalIcon, SilverMedalIcon, BronzeMedalIcon, ClockIcon, ChartBarIcon } from '../assets/icons';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// --- Helper Functions ---
const isAnswerCorrect = (question, userAnswer) => {
    if (userAnswer === undefined || userAnswer === null) return false;
    if (!question || !question.type) return false;

    if (question.type === 'open') {
        return userAnswer?.score > 0;
    }
    if (question.type === 'single') return userAnswer === question.options[question.correctAnswers[0]];
    if (question.type === 'multiple') { const correct = question.correctAnswers.map(i => question.options[i]).sort(); const user = userAnswer ? [...userAnswer].sort() : []; return JSON.stringify(correct) === JSON.stringify(user); }
    if (question.type === 'textInput') return userAnswer && question.correctAnswers[0].trim().toLowerCase() === userAnswer.trim().toLowerCase();
    if (question.type === 'trueFalse') return userAnswer === question.correctAnswer;
    if (question.type === 'ordering') return JSON.stringify(userAnswer) === JSON.stringify(question.orderItems);
    return false;
};

const formatUserAnswer = (answer) => {
    if (answer === null || answer === undefined) return 'Cavab yoxdur';
    if (Array.isArray(answer)) return answer.join(', ');
    if (typeof answer === 'object') return answer.answer || 'N/A'; // For graded 'open' questions
    return String(answer);
};

// --- Modal Component for showing responders ---
const QuestionRespondersModal = ({ isOpen, onClose, question, results }) => {
    const responders = useMemo(() => {
        if (!question || !results) return { correct: [], incorrect: [] };

        const correct = [];
        const incorrect = [];

        results.forEach(result => {
            const student = { id: result.user_id, name: `${result.userName} ${result.userSurname}` };
            const userAnswer = result.userAnswers[question.id];
            
            if (isAnswerCorrect(question, userAnswer)) {
                correct.push(student);
            } else {
                incorrect.push({ ...student, answer: formatUserAnswer(userAnswer) });
            }
        });

        return { correct, incorrect };
    }, [question, results]);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Suala cavab verənlər: "${question.text}"`} size="lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-bold text-green-600 mb-2 flex items-center gap-2"><CheckCircleIcon /> Düzgün cavab verənlər ({responders.correct.length})</h4>
                    <div className="max-h-64 overflow-y-auto bg-green-50 p-3 rounded-lg">
                        {responders.correct.length > 0 ? (
                            <ul className="space-y-2">
                                {responders.correct.map(s => <li key={s.id}><Link to={`/student/${s.id}`} className="text-blue-600 hover:underline">{s.name}</Link></li>)}
                            </ul>
                        ) : <p className="text-gray-500">Yoxdur</p>}
                    </div>
                </div>
                <div>
                    <h4 className="font-bold text-red-600 mb-2 flex items-center gap-2"><XCircleIcon /> Səhv cavab verənlər ({responders.incorrect.length})</h4>
                    <div className="max-h-64 overflow-y-auto bg-red-50 p-3 rounded-lg">
                        {responders.incorrect.length > 0 ? (
                            <ul className="space-y-2">
                                {responders.incorrect.map(s => (
                                    <li key={s.id}>
                                        <Link to={`/student/${s.id}`} className="text-blue-600 hover:underline">{s.name}</Link>
                                        <p className="text-xs text-gray-600 pl-2 border-l-2 border-red-200 ml-2 mt-1">Cavab: <span className="font-medium text-red-700">{s.answer}</span></p>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-gray-500">Yoxdur</p>}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const QuizAnalysisPage = ({ quizzes, results, allUsers, studentGroups }) => {
    const { quizId } = useParams();
    const [analyzingQuestion, setAnalyzingQuestion] = useState(null);
    const [selectedGroupId, setSelectedGroupId] = useState('all');
    const [selectedStudentId, setSelectedStudentId] = useState('all');

    const quiz = useMemo(() => quizzes.find(q => q.id === Number(quizId)), [quizzes, quizId]);

    const quizResults = useMemo(() => {
        let filtered = results.filter(r => r.quizId === Number(quizId) && r.status !== 'pending_review');

        if (selectedGroupId !== 'all') {
            const group = studentGroups.find(g => g.id === Number(selectedGroupId));
            if (group) {
                const memberIds = new Set((group.members || []).map(m => m.user_id));
                filtered = filtered.filter(r => memberIds.has(r.user_id));
            }
        }

        return filtered;
    }, [results, quizId, selectedGroupId, studentGroups]);

    const analysis = useMemo(() => {
        if (!quiz || quizResults.length === 0) return null;

        const totalAttempts = quizResults.length;
        const averageScore = quizResults.reduce((acc, r) => acc + r.percentage, 0) / totalAttempts;
        const highestScore = Math.max(...quizResults.map(r => r.percentage));
        const lowestScore = Math.min(...quizResults.map(r => r.percentage));

        const scoreDistribution = Array(10).fill(0);
        quizResults.forEach(r => {
            const bracket = Math.floor(r.percentage / 10);
            if (bracket === 10) scoreDistribution[9]++;
            else scoreDistribution[bracket]++;
        });

        const questionAnalysis = (quiz.questions || []).map(q => {
            let correctCount = 0;
            quizResults.forEach(r => {
                if (isAnswerCorrect(q, r.userAnswers[q.id])) {
                    correctCount++;
                }
            });

            // Time analysis
            let totalTime = 0, timeCount = 0;
            let totalTimeCorrect = 0, correctTimeCount = 0;
            let totalTimeIncorrect = 0, incorrectTimeCount = 0;

            quizResults.forEach(r => {
                const timeSpent = r.time_per_question?.[q.id];
                if (timeSpent !== undefined) {
                    totalTime += timeSpent;
                    timeCount++;
                    if (isAnswerCorrect(q, r.userAnswers[q.id])) {
                        totalTimeCorrect += timeSpent;
                        correctTimeCount++;
                    } else {
                        totalTimeIncorrect += timeSpent;
                        incorrectTimeCount++;
                    }
                }
            });

            return {
                ...q,
                correctPercentage: (correctCount / totalAttempts) * 100,
                averageTime: timeCount > 0 ? (totalTime / timeCount) : 0,
                averageTimeCorrect: correctTimeCount > 0 ? (totalTimeCorrect / correctTimeCount) : 0,
                averageTimeIncorrect: incorrectTimeCount > 0 ? (totalTimeIncorrect / incorrectTimeCount) : 0,
            };
        });

        return { totalAttempts, averageScore, highestScore, lowestScore, scoreDistribution, questionAnalysis };

    }, [quiz, quizResults]);

    const quizLeaderboard = useMemo(() => {
        if (!quizResults || !allUsers) return [];

        const userBestScores = {};
        quizResults.forEach(result => {
            if (!userBestScores[result.user_id] || result.score > userBestScores[result.user_id].score) {
                userBestScores[result.user_id] = {
                    score: result.score,
                    percentage: result.percentage,
                    user_id: result.user_id
                };
            }
        });

        return Object.values(userBestScores)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map(entry => {
                const userProfile = allUsers.find(u => u.id === entry.user_id);
                return {
                    ...entry,
                    name: userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : 'Naməlum istifadəçi'
                };
            });
    }, [quizResults, allUsers]);

    const mostTimeConsumingQuestions = useMemo(() => {
        if (!analysis || !analysis.questionAnalysis) return [];
        return [...analysis.questionAnalysis]
            .filter(q => q.averageTime > 0)
            .sort((a, b) => b.averageTime - a.averageTime)
            .slice(0, 5);
    }, [analysis]);

    const studentsWhoTookQuiz = useMemo(() => {
        if (!quizResults) return [];
        const studentMap = new Map();
        quizResults.forEach(result => {
            if (!studentMap.has(result.user_id)) {
                studentMap.set(result.user_id, {
                    id: result.user_id,
                    name: `${result.userName} ${result.userSurname}`
                });
            }
        });
        return Array.from(studentMap.values());
    }, [quizResults]);

    const studentTimeAnalysis = useMemo(() => {
        if (selectedStudentId === 'all' || !quizResults) return null;

        const studentResult = quizResults
            .filter(r => r.user_id === selectedStudentId)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

        if (!studentResult || !studentResult.time_per_question) return [];

        return Object.entries(studentResult.time_per_question)
            .map(([qId, time]) => {
                const question = quiz.questions.find(q => q.id === Number(qId));
                return { id: qId, text: question?.text || 'Naməlum sual', timeSpent: time };
            })
            .filter(q => q.text !== 'Naməlum sual')
            .sort((a, b) => b.timeSpent - a.timeSpent)
            .slice(0, 5);

    }, [selectedStudentId, quizResults, quiz]);

    if (!quiz) {
        return <Card><p className="text-center">Test tapılmadı.</p></Card>;
    }

    if (!analysis) {
        return (
            <Card className="text-center py-12">
                <p className="text-gray-500 mb-6 text-lg">
                    {selectedGroupId !== 'all' ? 'Seçilmiş qrup üçün bu testdə heç bir nəticə tapılmadı.' : 'Bu test üçün heç bir nəticə tapılmadı.'}
                </p>
                {selectedGroupId !== 'all' ? (
                    <Button variant="secondary" onClick={() => { setSelectedGroupId('all'); setSelectedStudentId('all'); }}>
                        <ArrowLeftIcon /> Filtri sıfırla
                    </Button>
                ) : (
                    <Link to="/stats"><Button variant="secondary"><ArrowLeftIcon /> Statistikaya qayıt</Button></Link>
                )}
            </Card>
        );
    }

    const distributionChartData = {
        labels: ['0-9%', '10-19%', '20-29%', '30-39%', '40-49%', '50-59%', '60-69%', '70-79%', '80-89%', '90-100%'],
        datasets: [{
            label: 'Tələbə sayı',
            data: analysis.scoreDistribution,
            backgroundColor: 'rgba(249, 115, 22, 0.6)',
            borderColor: 'rgba(249, 115, 22, 1)',
            borderWidth: 1,
        }]
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Test Analizi</h1>
                    <p className="text-lg text-gray-600">{quiz.title}</p>
                </div>
                <Link to="/stats"><Button variant="secondary"><ArrowLeftIcon /> Statistikaya qayıt</Button></Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="text-center"><h3 className="font-semibold">Cəhdlər</h3><p className="text-3xl font-bold text-orange-600">{analysis.totalAttempts}</p></Card>
                <Card className="text-center"><h3 className="font-semibold">Orta Nəticə</h3><p className="text-3xl font-bold text-blue-600">{analysis.averageScore.toFixed(1)}%</p></Card>
                <Card className="text-center"><h3 className="font-semibold">Ən Yüksək</h3><p className="text-3xl font-bold text-green-600">{analysis.highestScore}%</p></Card>
                <Card className="text-center"><h3 className="font-semibold">Ən Aşağı</h3><p className="text-3xl font-bold text-red-600">{analysis.lowestScore}%</p></Card>
            </div>

            <Card>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><TrophyIcon /> Bu Test üzrə Liderlər</h3>
                {quizLeaderboard.length > 0 ? (
                    <ol className="space-y-2">
                        {quizLeaderboard.map((user, index) => (
                            <li key={user.user_id} className="flex items-center justify-between p-2 rounded-md bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-gray-400 w-6 text-center">{index + 1}</span>
                                    <span className="flex items-center gap-2">
                                        {index === 0 ? <GoldMedalIcon /> : index === 1 ? <SilverMedalIcon /> : index === 2 ? <BronzeMedalIcon /> : <TrophyIcon className="w-5 h-5 text-gray-400" />}
                                        <Link to={`/student/${user.user_id}`} className="font-semibold text-blue-600 hover:underline">{user.name}</Link>
                                    </span>
                                </div>
                                <span className="font-bold text-orange-500">{user.score} bal ({user.percentage}%)</span>
                            </li>
                        ))}
                    </ol>
                ) : (
                    <p className="text-gray-500">Bu test üçün reytinq məlumatı yoxdur.</p>
                )}
            </Card>

            <Card>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Nəticələrin Paylanması</h3>
                <div className="h-80"><Bar data={distributionChartData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} /></div>
            </Card>

            <Card>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Filtrlər</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="group-select" className="block text-sm font-medium text-gray-700 mb-1">Qrup seçin</label>
                        <select
                            id="group-select"
                            value={selectedGroupId}
                            onChange={e => { setSelectedGroupId(e.target.value); setSelectedStudentId('all'); }}
                            className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-orange-500 focus:border-orange-500"
                        >
                            <option value="all">Bütün Qruplar</option>
                            {(studentGroups || []).map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="student-select" className="block text-sm font-medium text-gray-700 mb-1">Tələbə seçin</label>
                        <select
                            id="student-select"
                            value={selectedStudentId}
                            onChange={e => setSelectedStudentId(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-orange-500 focus:border-orange-500"
                        >
                            <option value="all">Bütün tələbələr (ümumi)</option>
                            {studentsWhoTookQuiz.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}
                        </select>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Ən Çətin Suallar (ən az düzgün cavab)</h3>
                    <ul className="list-inside space-y-2">{analysis.questionAnalysis.filter(q => q.correctPercentage < 100).sort((a, b) => a.correctPercentage - b.correctPercentage).slice(0, 5).map((q) => <li key={q.id}><button onClick={() => setAnalyzingQuestion(q)} className="text-left text-blue-600 hover:underline flex items-center gap-2"><ChartBarIcon /><strong>{q.text}</strong></button> - <span className="text-red-600">{q.correctPercentage.toFixed(1)}% düzgün</span></li>)}</ul>
                </Card>
                <Card>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Ən Çox Vaxt Aparan Suallar</h3>
                    {mostTimeConsumingQuestions.length > 0 ? (
                        <ul className="list-inside space-y-2">
                            {mostTimeConsumingQuestions.map(q => (
                                <li key={q.id}><button onClick={() => setAnalyzingQuestion(q)} className="text-left text-blue-600 hover:underline flex items-center gap-2"><ClockIcon /><strong>{q.text}</strong></button> - <span className="text-purple-600">{q.averageTime.toFixed(1)} san. (orta)</span></li>
                            ))}
                        </ul>
                    ) : <p className="text-gray-500">Vaxt məlumatı tapılmadı.</p>}
                </Card>
            </div>
            
            {studentTimeAnalysis && studentTimeAnalysis.length > 0 && (
                <Card>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Seçilmiş Tələbə üçün Ən Çox Vaxt Aparan Suallar</h3>
                    <ul className="list-inside space-y-2">
                        {studentTimeAnalysis.map(q => (
                            <li key={q.id}>
                                <button onClick={() => setAnalyzingQuestion(analysis.questionAnalysis.find(aq => aq.id === Number(q.id)))} className="text-left text-blue-600 hover:underline flex items-center gap-2">
                                    <ClockIcon /><strong>{q.text}</strong>
                                </button> - <span className="text-purple-600">{q.timeSpent.toFixed(1)} san.</span>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            <Card>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Sualların Analizi</h3>
                <div className="space-y-2">
                    {analysis.questionAnalysis.map((q, index) => (
                        <button key={q.id} onClick={() => setAnalyzingQuestion(q)} className="w-full text-left p-4 rounded-lg bg-gray-50 hover:bg-orange-50 transition">
                            <p className="font-semibold">{index + 1}. {q.text}</p>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="w-full bg-gray-200 rounded-full h-4">
                                    <div 
                                        className="h-4 rounded-full transition-all duration-500"
                                        style={{ width: `${q.correctPercentage}%`, backgroundColor: q.correctPercentage > 60 ? '#22C55E' : q.correctPercentage > 30 ? '#F59E0B' : '#EF4444' }}
                                    ></div>
                                </div>
                                <span className="font-bold text-sm w-16 text-right" style={{ color: q.correctPercentage > 60 ? '#16A34A' : q.correctPercentage > 30 ? '#D97706' : '#DC2626' }}>{q.correctPercentage.toFixed(1)}%</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">düzgün cavab verdi</p>
                            
                            {q.averageTime > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600 space-y-1">
                                    <p><strong>Orta sərf olunan vaxt:</strong> {q.averageTime.toFixed(1)} san.</p>
                                    {q.averageTimeCorrect > 0 && (
                                        <p className="text-green-600"><strong>Düzgün cavab üçün orta vaxt:</strong> {q.averageTimeCorrect.toFixed(1)} san.</p>
                                    )}
                                    {q.averageTimeIncorrect > 0 && (
                                        <p className="text-red-600"><strong>Səhv cavab üçün orta vaxt:</strong> {q.averageTimeIncorrect.toFixed(1)} san.</p>
                                    )}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </Card>
            <QuestionRespondersModal isOpen={!!analyzingQuestion} onClose={() => setAnalyzingQuestion(null)} question={analyzingQuestion} results={quizResults} />
        </div>
    );
};

export default QuizAnalysisPage;
