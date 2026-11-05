import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import { ChartBarIcon, FireIcon, AcademicCapIcon } from '../assets/icons';

const StatCard = ({ title, value, icon, subtext }) => (
    <Card className="text-center">
        <div className="mx-auto text-orange-500 mb-2">{icon}</div>
        <p className="text-3xl font-bold text-gray-800">{value}</p>
        <h3 className="font-semibold text-gray-600">{title}</h3>
        {subtext && <p className="text-sm text-gray-400 mt-1">{subtext}</p>}
    </Card>
);

const isAnswerCorrect = (question, userAnswer) => {
    if (userAnswer === undefined || userAnswer === null) return false;
    if (!question || !question.type) return false;
    if (question.type === 'open') return userAnswer?.score > 0;
    if (question.type === 'single') return userAnswer === question.options[question.correctAnswers[0]];
    if (question.type === 'multiple') { const correct = question.correctAnswers.map(i => question.options[i]).sort(); const user = userAnswer ? [...userAnswer].sort() : []; return JSON.stringify(correct) === JSON.stringify(user); }
    if (question.type === 'textInput') return userAnswer && question.correctAnswers[0].trim().toLowerCase() === userAnswer.trim().toLowerCase();
    if (question.type === 'trueFalse') return userAnswer === question.correctAnswer;
    if (question.type === 'ordering') return JSON.stringify(userAnswer) === JSON.stringify(question.orderItems);
    return false;
};

const GroupAnalysisPage = ({ studentGroups, allUsers, results, courses, quizzes, userCourseCompletions }) => {
    const [selectedGroupId, setSelectedGroupId] = useState('');

    const analysis = useMemo(() => {
        if (!selectedGroupId) return null;

        const group = studentGroups.find(g => g.id === Number(selectedGroupId));
        if (!group) return null;

        const memberIds = new Set((group.members || []).map(m => m.user_id));
        if (memberIds.size === 0) return { groupName: group.name, memberCount: 0 };

        const groupMembers = allUsers.filter(u => memberIds.has(u.id));
        const groupResults = results.filter(r => memberIds.has(r.user_id) && r.status !== 'pending_review');
        const groupCompletions = (userCourseCompletions || []).filter(c => memberIds.has(c.user_id));

        // 1. Средний балл по всем тестам
        const totalPercentage = groupResults.reduce((acc, r) => acc + r.percentage, 0);
        const averageScore = groupResults.length > 0 ? (totalPercentage / groupResults.length).toFixed(1) : 0;

        // 2. Процент завершения курсов (упрощенно: общее кол-во завершений / (кол-во студентов * кол-во курсов))
        const totalPossibleCompletions = memberIds.size * courses.filter(c => c.is_published).length;
        const courseCompletionPercentage = totalPossibleCompletions > 0 ? ((groupCompletions.length / totalPossibleCompletions) * 100).toFixed(1) : 0;

        // 3. Отстающие студенты
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const atRiskStudents = groupMembers.map(student => {
            const studentResults = groupResults.filter(r => r.user_id === student.id);
            const studentAverage = studentResults.length > 0 ? (studentResults.reduce((acc, r) => acc + r.percentage, 0) / studentResults.length) : 0;
            return { ...student, average: studentAverage };
        }).filter(student => 
            student.average < 50 || !student.last_login || new Date(student.last_login) < oneWeekAgo
        );

        // 4. Самые сложные/легкие вопросы
        const questionStats = {};
        groupResults.forEach(result => {
            const quiz = quizzes.find(q => q.id === result.quizId);
            if (!quiz) return;

            result.questionOrder.forEach(q_ordered => {
                const question = (quiz.questions || []).find(q => q.id === q_ordered.id);
                if (!question) return;

                if (!questionStats[question.id]) {
                    questionStats[question.id] = { text: question.text, correct: 0, incorrect: 0, quizTitle: quiz.title };
                }

                if (isAnswerCorrect(question, result.userAnswers[question.id])) {
                    questionStats[question.id].correct++;
                } else {
                    questionStats[question.id].incorrect++;
                }
            });
        });

        const allQuestions = Object.values(questionStats).map(q => ({
            ...q,
            total: q.correct + q.incorrect,
            correctRate: (q.correct / (q.correct + q.incorrect)) * 100
        })).filter(q => q.total > 0);

        const hardestQuestions = [...allQuestions].sort((a, b) => a.correctRate - b.correctRate).slice(0, 5);
        const easiestQuestions = [...allQuestions].sort((a, b) => b.correctRate - a.correctRate).slice(0, 5);

        return { 
            groupName: group.name,
            memberCount: memberIds.size,
            averageScore, 
            courseCompletionPercentage,
            atRiskStudents,
            hardestQuestions,
            easiestQuestions
        };

    }, [selectedGroupId, studentGroups, allUsers, results, courses, quizzes, userCourseCompletions]);

    return (
        <div className="animate-fade-in space-y-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Qrup Analizi</h1>
            <Card>
                <div className="mb-4">
                    <label htmlFor="group-select" className="block text-sm font-medium text-gray-700 mb-1">Təhlil üçün qrupu seçin</label>
                    <select 
                        id="group-select"
                        value={selectedGroupId}
                        onChange={e => setSelectedGroupId(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-orange-500 focus:border-orange-500"
                    >
                        <option value="" disabled>Qrup seçin...</option>
                        {studentGroups.map(group => (
                            <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                    </select>
                </div>
            </Card>

            {analysis ? (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold">Statistika: {analysis.groupName} ({analysis.memberCount} üzv)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard title="Testlər üzrə orta bal" value={`${analysis.averageScore}%`} icon={<ChartBarIcon />} />
                        <StatCard title="Kursları tamamlama" value={`${analysis.courseCompletionPercentage}%`} icon={<AcademicCapIcon />} subtext="(bütün kurslar üzrə)"/>
                        <StatCard title="Risk qrupunda olanlar" value={analysis.atRiskStudents.length} icon={<FireIcon />} subtext="(zəif nəticə və ya aktivlik)"/>
                    </div>

                    {analysis.atRiskStudents.length > 0 && (
                        <Card>
                            <h3 className="font-bold text-lg mb-3">Risq Qrupundakı Tələbələr</h3>
                            <ul className="divide-y divide-gray-200">
                                {analysis.atRiskStudents.map(student => (
                                    <li key={student.id} className="py-3 flex justify-between items-center">
                                        <Link to={`/student/${student.id}`} className="text-blue-600 hover:underline font-semibold">{student.first_name} {student.last_name}</Link>
                                        <div className="text-right">
                                            <p className="text-sm text-red-600">Orta bal: {student.average.toFixed(1)}%</p>
                                            <p className="text-xs text-gray-500">Son aktivlik: {student.last_login ? new Date(student.last_login).toLocaleDateString() : 'Məlum deyil'}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <h3 className="font-bold text-lg mb-3">Ən Çətin Suallar</h3>
                            <ul className="space-y-2">
                                {analysis.hardestQuestions.map(q => (
                                    <li key={q.text} className="text-sm p-2 bg-red-50 rounded-md">
                                        <p className="font-semibold truncate">{q.text}</p>
                                        <p className="text-red-700">Düzgün cavab: {q.correctRate.toFixed(1)}% ({q.quizTitle})</p>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                        <Card>
                            <h3 className="font-bold text-lg mb-3">Ən Asan Suallar</h3>
                            <ul className="space-y-2">
                                {analysis.easiestQuestions.map(q => (
                                    <li key={q.text} className="text-sm p-2 bg-green-50 rounded-md">
                                        <p className="font-semibold truncate">{q.text}</p>
                                        <p className="text-green-700">Düzgün cavab: {q.correctRate.toFixed(1)}% ({q.quizTitle})</p>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    </div>
                </div>
            ) : (
                selectedGroupId && <Card className="text-center py-12"><p className="text-gray-500">Bu qrup üçün data tapılmadı.</p></Card>
            )}
        </div>
    );
};

export default GroupAnalysisPage;
