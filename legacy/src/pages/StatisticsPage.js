import React, { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { ArrowLeftIcon, DownloadIcon, TrophyIcon, GoldMedalIcon, SilverMedalIcon, BronzeMedalIcon, ClockIcon, CheckCircleIcon as CheckIcon, EyeIcon, ClipboardCheckIcon, ChartBarIcon} from '../assets/icons.js';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar, getElementAtEvent } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// --- Helper Functions ---
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date)) return 'Invalid Date';
    return date.toLocaleString('az-AZ');
};

const formatTotalTime = (timeData) => {
    if (!timeData || typeof timeData !== 'object') return 'N/A';
    const totalSeconds = Object.values(timeData).reduce((sum, time) => sum + time, 0);
    if (totalSeconds < 60) return `${Math.round(totalSeconds)} san.`;
    return `${Math.floor(totalSeconds / 60)} dəq. ${Math.round(totalSeconds % 60)} san.`;
};

const isAnswerCorrect = (question, userAnswer) => {
    if (userAnswer === undefined || userAnswer === null) return false;
    if (!question || !question.type) return false;

    switch (question.type) {
        case 'single': return userAnswer === question.options[question.correctAnswers[0]];
        case 'multiple':
            const correctOptions = question.correctAnswers.map(i => question.options[i]).sort();
            const userOptions = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
            return JSON.stringify(correctOptions) === JSON.stringify(userOptions);
        case 'textInput': return userAnswer.trim().toLowerCase() === question.correctAnswers[0].trim().toLowerCase();
        case 'trueFalse': return userAnswer === question.correctAnswer;
        case 'ordering': return JSON.stringify(userAnswer) === JSON.stringify(question.orderItems);
        default: return false;
    }
};

// --- Sub-components ---
const StudentListModal = ({ isOpen, onClose, students, title }) => {
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="max-h-96 overflow-y-auto">
                <ul className="divide-y divide-gray-200">
                    {students.map(student => (
                        <li key={student.id} className="py-3 flex justify-between items-center">
                            <Link to={`/student/${student.user_id}`} className="text-blue-600 hover:underline">
                                {student.userName} {student.userSurname}
                            </Link>
                            <span className="text-gray-600">{student.percentage}% ({student.quizTitle})</span>
                        </li>
                    ))}
                </ul>
            </div>
        </Modal>
    );
};

const QuestionAnalysisModal = ({ isOpen, onClose, question, results, quizzes }) => {
    const analysis = useMemo(() => {
        if (!question) return null;
        const quiz = quizzes.find(q => q.title === question.quizTitle);
        if (!quiz) return null;
        const fullQuestion = quiz.questions.find(q => q.text === question.text);
        if (!fullQuestion) return null;

        // --- Logic for Chart-based questions (single, multiple) ---
        if (['single', 'multiple'].includes(fullQuestion.type)) {
            const answerCounts = fullQuestion.options.reduce((acc, option) => ({ ...acc, [option]: 0 }), {});
            let noAnswerCount = 0;

            results.forEach(result => {
                if (result.quizId !== quiz.id) return;
                const userAnswer = result.userAnswers[fullQuestion.id];
                if (!userAnswer || userAnswer.length === 0) {
                    noAnswerCount++;
                } else if (fullQuestion.type === 'multiple') {
                    userAnswer.forEach(answer => { if (answerCounts[answer] !== undefined) answerCounts[answer]++; });
                } else {
                    if (answerCounts[userAnswer] !== undefined) answerCounts[userAnswer]++;
                }
            });

            const chartData = {
                labels: Object.keys(answerCounts),
                datasets: [{
                    label: 'Cavabların sayı',
                    data: Object.values(answerCounts),
                    backgroundColor: Object.keys(answerCounts).map(option => {
                        const correctOptions = fullQuestion.correctAnswers.map(i => fullQuestion.options[i]);
                        return correctOptions.includes(option) ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)';
                    }),
                    borderColor: Object.keys(answerCounts).map(option => {
                         const correctOptions = fullQuestion.correctAnswers.map(i => fullQuestion.options[i]);
                        return correctOptions.includes(option) ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)';
                    }),
                    borderWidth: 1,
                },],
            };
            return {
                type: 'chart',
                chartData,
                noAnswerCount,
                totalAnswers: results.filter(r => r.quizId === quiz.id).length
            };
        }

        // --- Logic for Text-based questions (textInput, open) ---
        if (['textInput', 'open'].includes(fullQuestion.type)) {
            const answerCounts = new Map();
            let noAnswerCount = 0;

            results.forEach(result => {
                if (result.quizId !== quiz.id) return;
                const userAnswer = result.userAnswers[fullQuestion.id];

                if (!userAnswer || typeof userAnswer !== 'string' || userAnswer.trim() === '') {
                    noAnswerCount++;
                } else {
                    const normalizedAnswer = userAnswer.trim().toLowerCase();
                    answerCounts.set(normalizedAnswer, (answerCounts.get(normalizedAnswer) || 0) + 1);
                }
            });

            const groupedAnswers = Array.from(answerCounts.entries())
                .map(([answer, count]) => ({ answer, count }))
                .sort((a, b) => b.count - a.count);

            return {
                type: 'list',
                groupedAnswers,
                noAnswerCount,
                totalAnswers: results.filter(r => r.quizId === quiz.id).length
            };
        }

        return null; // For other question types if any

    }, [question, results, quizzes]);

    if (!isOpen || !analysis) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Sual Təhlili: ${question.text}`} size="lg">
            {analysis.type === 'chart' && (
                <>
                    <div className="w-full h-80"><Bar data={analysis.chartData} options={{ maintainAspectRatio: false, indexAxis: 'y' }} /></div>
                    <p className="text-center text-sm text-gray-600 mt-4">Bu suala {analysis.totalAnswers} nəfərdən {analysis.noAnswerCount} nəfər cavab verməyib.</p>
                </>
            )}
            {analysis.type === 'list' && (
                 <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800">Tələbə Cavablarının Qruplaşdırılması:</h4>
                    <div className="max-h-80 overflow-y-auto pr-2 border rounded-lg p-3 bg-gray-50">
                        {analysis.groupedAnswers.length > 0 ? (
                            <ul className="divide-y divide-gray-200">
                                {analysis.groupedAnswers.map(({ answer, count }) => (
                                    <li key={answer} className="py-2 flex justify-between items-center">
                                        <span className="text-gray-700 break-all mr-4">{answer}</span>
                                        <span className="font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full text-sm flex-shrink-0">{count} cavab</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 text-center py-4">Bu suala heç bir mətn cavabı verilməyib.</p>
                        )}
                    </div>
                    <p className="text-center text-sm text-gray-600 mt-2">Bu suala {analysis.totalAnswers} nəfərdən {analysis.noAnswerCount} nəfər cavab verməyib.</p>
                </div>
            )}
        </Modal>
    );
};

const PaginatedLeaderboard = ({ leaderboardData }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 3;
    const totalPages = Math.ceil(leaderboardData.length / itemsPerPage);

    const currentLeaderboards = leaderboardData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (leaderboardData.length === 0) {
        return <p className="text-gray-500">Liderlər lövhəsi üçün kifayət qədər data yoxdur.</p>;
    }

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {currentLeaderboards.map(({ quizTitle, topStudents }) => (
                    <div key={quizTitle} className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-semibold text-center mb-3 text-gray-700 truncate">
                            <Link to={`/stats/quiz/${topStudents[0].quizId}`} className="hover:underline">{quizTitle}</Link>
                        </h4>
                        <ol className="space-y-2">
                            {topStudents.map((student, index) => (
                                <li key={student.id} className="flex items-center justify-between text-sm p-1 rounded-md hover:bg-gray-100">
                                    <span className="flex items-center gap-2">
                                        {index === 0 ? <GoldMedalIcon /> : index === 1 ? <SilverMedalIcon /> : index === 2 ? <BronzeMedalIcon /> : <TrophyIcon className="text-gray-300" />}
                                        <Link to={`/student/${student.user_id}`} className="hover:underline">{student.userName} {student.userSurname}</Link>
                                    </span>
                                    <span className="font-bold text-gray-800">{student.score} bal</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                ))}
            </div>
            {totalPages > 1 && (
                <div className="mt-4 flex justify-center items-center gap-4">
                    <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Əvvəlki</Button>
                    <span className="text-sm text-gray-600">Səhifə {currentPage} / {totalPages}</span>
                    <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Növbəti</Button>
                </div>
            )}
        </div>
    );
};

const AnalyticsOverview = ({ analytics, pieChartData, onPieChartClick, onAnalyzeQuestion, leaderboardData }) => {
    const chartRef = useRef();
    const handleChartClick = (event) => {
        const element = getElementAtEvent(chartRef.current, event);
        if (element.length > 0) {
            onPieChartClick(element[0].index);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1"><h3 className="font-bold text-lg mb-4">Ümumi Göstəricilər</h3><div className="space-y-3"><p><strong>Testi Tamamlayanlar:</strong> {analytics.totalCompletions}</p><p><strong>Unikal Tələbələr:</strong> {analytics.uniqueStudents}</p><p><strong>Orta Nəticə:</strong> {analytics.averageScore.toFixed(1)}%</p></div></Card>
                <Card className="lg:col-span-2">
                    <h3 className="font-bold text-lg mb-4">Nəticələrin Paylanması</h3>
                    <div className="h-64 flex items-center justify-center">
                        {pieChartData && <Pie data={pieChartData} options={{ responsive: true, maintainAspectRatio: false }} onClick={handleChartClick} ref={chartRef} />}
                    </div>
                </Card>
            </div>
            <Card>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><TrophyIcon /> Liderlər Lövhəsi</h3>
                <PaginatedLeaderboard leaderboardData={leaderboardData} />
            </Card>
            <Card><h3 className="font-bold text-lg mb-4">Ən Çətin Suallar</h3><ul className="list-inside space-y-2">{analytics.topDifficultQuestions.length > 0 ? (analytics.topDifficultQuestions.map(([text, data]) => <li key={text}><button onClick={() => onAnalyzeQuestion({ text, quizTitle: data.quizTitle })} className="text-left text-blue-600 hover:underline flex items-center gap-2"><ChartBarIcon /><strong>{text}</strong></button> ({data.quizTitle}) - <span className="text-red-600">{data.count} səhv</span></li>)) : (<p className="text-gray-500">Səhv cavab tapılmadı.</p>)}</ul></Card>
        </div>
    );
};

const ResultsTable = ({ results, onReviewResult, onSort, sortBy, sortDirection }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const resultsPerPage = 10;

    const paginatedResults = useMemo(() => {
        const startIndex = (currentPage - 1) * resultsPerPage;
        return results.slice(startIndex, startIndex + resultsPerPage);
    }, [results, currentPage]);

    const totalPages = Math.ceil(results.length / resultsPerPage);

    const getSortIndicator = (column) => (sortBy === column ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : '');

    return (
        <Card>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr><th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => onSort('date')}>Tarix {getSortIndicator('date')}</th><th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => onSort('name')}>Ad Soyad {getSortIndicator('name')}</th><th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => onSort('quizTitle')}>Test {getSortIndicator('quizTitle')}</th><th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => onSort('score')}>Nəticə {getSortIndicator('score')}</th><th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ümumi Vaxt</th><th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th><th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Əməliyyat</th></tr></thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedResults.map((result) => (
                            <tr key={result.id} className="hover:bg-gray-50">
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(result.created_at)}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900"><Link to={`/student/${result.user_id}`} className="text-blue-600 hover:underline">{result.userName} {result.userSurname}</Link></td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900"><Link to={`/stats/quiz/${result.quizId}`} className="text-blue-600 hover:underline">{result.quizTitle}</Link></td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500"><div className="flex flex-col"><span className="font-bold">{result.score} / {result.totalPoints} bal</span><span className="text-xs text-gray-400">{result.percentage}%</span></div></td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{formatTotalTime(result.time_per_question)}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${result.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{result.status === 'pending_review' ? <ClockIcon className="w-4 h-4 mr-1.5" /> : <CheckIcon className="w-4 h-4 mr-1.5" />} {result.status === 'pending_review' ? 'Yoxlanılır' : 'Tamamlanıb'}</span></td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium"><Button onClick={() => onReviewResult(result)} variant={result.status === 'pending_review' ? 'primary' : 'secondary'} size="sm">{result.status === 'pending_review' ? <ClipboardCheckIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}<span className="ml-1">{result.status === 'pending_review' ? 'Yoxla' : 'Bax'}</span></Button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div className="py-4 flex items-center justify-between">
                    <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Əvvəlki</Button>
                    <span className="text-sm text-gray-600">Səhifə {currentPage} / {totalPages}</span>
                    <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Növbəti</Button>
                </div>
            )}
        </Card>
    );
};

// --- Main Component ---
const StatisticsPage = ({ results, onBack, quizzes, onReviewResult, studentGroups = [] }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedQuizFilter, setSelectedQuizFilter] = useState('all');
    const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [sortBy, setSortBy] = useState('date');
    const [sortDirection, setSortDirection] = useState('desc');
    const [analyzingQuestion, setAnalyzingQuestion] = useState(null);
    const [studentListModal, setStudentListModal] = useState({ isOpen: false, students: [], title: '' });

    const filteredResults = useMemo(() => {
        let filtered = results;

        if (selectedGroupFilter !== 'all') {
            const selectedGroup = studentGroups.find(g => g.id === Number(selectedGroupFilter));
            if (selectedGroup) {
                const memberIds = new Set((selectedGroup.members || []).map(m => m.user_id));
                filtered = filtered.filter(r => memberIds.has(r.user_id));
            }
        }

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(r => `${r.userName} ${r.userSurname}`.toLowerCase().includes(lowerCaseSearchTerm) || r.quizTitle.toLowerCase().includes(lowerCaseSearchTerm));
        }
        if (selectedQuizFilter !== 'all') {
            filtered = filtered.filter(r => r.quizTitle === selectedQuizFilter);
        }
        if (dateRange.start) {
            filtered = filtered.filter(r => new Date(r.created_at) >= new Date(dateRange.start));
        }
        if (dateRange.end) {
            filtered = filtered.filter(r => new Date(r.created_at) <= new Date(dateRange.end).setHours(23, 59, 59, 999));
        }
        return filtered;
    }, [results, searchTerm, selectedQuizFilter, dateRange, selectedGroupFilter, studentGroups]);

    const pendingResults = useMemo(() => filteredResults.filter(r => r.status === 'pending_review'), [filteredResults]);
    const completedResults = useMemo(() => filteredResults.filter(r => r.status !== 'pending_review'), [filteredResults]);

    const sortedPendingResults = useMemo(() => {
        return [...pendingResults].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [pendingResults]);

    const sortedCompletedResults = useMemo(() => {
        return [...completedResults].sort((a, b) => {
            let compareValue = 0;
            if (sortBy === 'date') compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            else if (sortBy === 'name') compareValue = `${a.userName} ${a.userSurname}`.localeCompare(`${b.userName} ${b.userSurname}`);
            else if (sortBy === 'quizTitle') compareValue = a.quizTitle.localeCompare(b.quizTitle);
            else if (sortBy === 'score') compareValue = a.score - b.score;
            return sortDirection === 'asc' ? compareValue : -compareValue;
        });
    }, [completedResults, sortBy, sortDirection]);

    const analytics = useMemo(() => {
        const data = completedResults;
        if (data.length === 0) return null;
        const totalCompletions = data.length;
        const uniqueStudents = new Set(data.map(r => `${r.userName} ${r.userSurname}`)).size;
        const averageScore = data.reduce((acc, r) => acc + r.percentage, 0) / totalCompletions;
        const scoreDistribution = {
            perfect: data.filter(r => r.percentage >= 90).length,
            good: data.filter(r => r.percentage >= 70 && r.percentage < 90).length,
            medium: data.filter(r => r.percentage >= 50 && r.percentage < 70).length,
            bad: data.filter(r => r.percentage < 50).length,
        };
        const difficultQuestions = {};
        data.forEach(result => {
            const quiz = quizzes.find(q => q.id === result.quizId);
            if (!quiz) return;
            result.questionOrder.forEach(q => {
                const originalQuestion = quiz.questions.find(oq => oq.id === q.id);
                if (originalQuestion && !isAnswerCorrect(originalQuestion, result.userAnswers[originalQuestion.id])) {
                    if (!difficultQuestions[originalQuestion.text]) difficultQuestions[originalQuestion.text] = { count: 0, quizTitle: quiz.title };
                    difficultQuestions[originalQuestion.text].count++;
                }
            });
        });
        const topDifficultQuestions = Object.entries(difficultQuestions).sort(([, a], [, b]) => b.count - a.count).slice(0, 5);
        return { totalCompletions, uniqueStudents, averageScore, scoreDistribution, topDifficultQuestions };
    }, [completedResults, quizzes]);

    const leaderboardData = useMemo(() => {
        const scope = selectedQuizFilter === 'all' ? results.filter(r => r.status !== 'pending_review') : completedResults;
        const resultsByQuiz = scope.reduce((acc, result) => {
            acc[result.quizTitle] = acc[result.quizTitle] || [];
            acc[result.quizTitle].push(result);
            return acc;
        }, {});
        return Object.entries(resultsByQuiz).map(([quizTitle, quizResults]) => {
            const bestScores = {};
            quizResults.forEach(result => {
                const studentIdentifier = `${result.userName} ${result.userSurname}`;
                if (!bestScores[studentIdentifier] || result.score > bestScores[studentIdentifier].score) {
                    bestScores[studentIdentifier] = result;
                }
            });
            const topStudents = Object.values(bestScores).sort((a, b) => b.score - a.score || new Date(a.created_at) - new Date(b.created_at)).slice(0, 3);
            return { quizTitle, topStudents };
        }).filter(item => item.topStudents.length > 0);
    }, [completedResults, results, selectedQuizFilter]);

    const pieChartData = useMemo(() => {
        if (!analytics) return null;
        return {
            labels: [`Əla (90-100%)`, `Yaxşı (70-89%)`, `Kafi (50-69%)`, `Qeyri-kafi (<50%)`],
            datasets: [{
                data: [analytics.scoreDistribution.perfect, analytics.scoreDistribution.good, analytics.scoreDistribution.medium, analytics.scoreDistribution.bad],
                backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
                borderColor: ['#ffffff'],
                borderWidth: 2,
            }]
        };
    }, [analytics]);

    const handlePieChartClick = (index) => {
        const data = completedResults;
        let students = [];
        let title = '';
        switch (index) {
            case 0: title = 'Əla Nəticə Göstərən Tələbələr'; students = data.filter(r => r.percentage >= 90); break;
            case 1: title = 'Yaxşı Nəticə Göstərən Tələbələr'; students = data.filter(r => r.percentage >= 70 && r.percentage < 90); break;
            case 2: title = 'Kafi Nəticə Göstərən Tələbələr'; students = data.filter(r => r.percentage >= 50 && r.percentage < 70); break;
            case 3: title = 'Qeyri-kafi Nəticə Göstərən Tələbələr'; students = data.filter(r => r.percentage < 50); break;
            default: return;
        }
        setStudentListModal({ isOpen: true, students, title });
    };

    const uniqueQuizTitles = useMemo(() => ['all', ...Array.from(new Set(results.map(r => r.quizTitle))).sort()], [results]);

    const handleSort = (column) => {
        if (sortBy === column) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        else { setSortBy(column); setSortDirection('desc'); }
    };

    const handleExportCSV = () => {
        const dataToExport = activeTab === 'pending' ? sortedPendingResults : sortedCompletedResults;
        const headers = ["Ad", "Soyad", "Test Adı", "Toplanan Bal", "Maksimum Bal", "Faiz", "Status", "Tarix"];
        const csvRows = [headers.join(',')];
        dataToExport.forEach(result => {
            const row = [`"${result.userName}"`, `"${result.userSurname}"`, `"${result.quizTitle}"`, result.score, result.totalPoints, result.percentage, result.status, formatDate(result.created_at)];
            csvRows.push(row.join(','));
        });
        const csvString = csvRows.join('\n');
        const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `statistika_${activeTab}_${new Date().toLocaleDateString('az-AZ')}.csv`;
        link.click();
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return analytics ? <AnalyticsOverview analytics={analytics} pieChartData={pieChartData} leaderboardData={leaderboardData} onAnalyzeQuestion={setAnalyzingQuestion} onPieChartClick={handlePieChartClick} /> : <Card><p className="text-center text-gray-500">Analitika üçün kifayət qədər data yoxdur.</p></Card>;
            case 'pending':
                return <ResultsTable results={sortedPendingResults} onReviewResult={onReviewResult} onSort={handleSort} sortBy={sortBy} sortDirection={sortDirection} />;
            case 'completed':
                return <ResultsTable results={sortedCompletedResults} onReviewResult={onReviewResult} onSort={handleSort} sortBy={sortBy} sortDirection={sortDirection} />;
            default:
                return null;
        }
    }

    return (
        <div className="animate-fade-in">
            <div className="grid lg:grid-cols-4 gap-8 items-start">

                {/* --- Left Column: Filters Panel --- */}
                <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Statistika</h1>
                        <Button onClick={onBack} variant="secondary" className="w-full justify-center"><ArrowLeftIcon /> Geri</Button>
                    </div>
                    <Card>
                        <h3 className="font-bold text-gray-800 mb-3">Filtrlər</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ada görə axtarış</label>
                                <input type="text" placeholder="Tələbə axtar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Qrupa görə filtr</label>
                                <select value={selectedGroupFilter} onChange={e => setSelectedGroupFilter(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-orange-500 focus:border-orange-500">
                                    <option value="all">Bütün Tələbələr</option>
                                    {studentGroups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Testə görə filtr</label>
                                <select value={selectedQuizFilter} onChange={e => setSelectedQuizFilter(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-orange-500 focus:border-orange-500">
                                    {uniqueQuizTitles.map(title => <option key={title} value={title}>{title === 'all' ? 'Bütün Testlər' : title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tarix aralığı</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} className="p-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500" />
                                    <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} className="p-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500" />
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 border-t pt-4">
                            <Button onClick={handleExportCSV} variant="secondary" className="w-full justify-center" disabled={filteredResults.length === 0}><DownloadIcon /> CSV ixrac et</Button>
                        </div>
                    </Card>
                </div>

                {/* --- Right Column: Main Content --- */}
                <div className="lg:col-span-3 space-y-6">
                    <StudentListModal isOpen={studentListModal.isOpen} onClose={() => setStudentListModal({ isOpen: false, students: [], title: '' })} students={studentListModal.students} title={studentListModal.title} />
                    <QuestionAnalysisModal isOpen={!!analyzingQuestion} onClose={() => setAnalyzingQuestion(null)} question={analyzingQuestion} results={results} quizzes={quizzes} />

                    <div>
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                <button onClick={() => setActiveTab('overview')} className={`${activeTab === 'overview' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Ümumi Baxış</button>
                                <button onClick={() => setActiveTab('pending')} className={`${activeTab === 'pending' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Gözləyən Yoxlamalar ({pendingResults.length})</button>
                                <button onClick={() => setActiveTab('completed')} className={`${activeTab === 'completed' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Tamamlanmış Nəticələr ({completedResults.length})</button>
                            </nav>
                        </div>
                        <div className="pt-6">
                            {renderContent()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatisticsPage;
