import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ArrowLeftIcon, CheckIcon } from '../assets/icons';

const ManualReviewPage = ({ results, quizzes, onUpdateResult }) => {
    const { resultId } = useParams();
    const navigate = useNavigate();

    const [result, setResult] = useState(null);
    const [quiz, setQuiz] = useState(null);
    const [gradedAnswers, setGradedAnswers] = useState({});
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const currentResult = results.find(r => r.id === Number(resultId));
        if (currentResult) {
            setResult(currentResult);
            const currentQuiz = quizzes.find(q => q.id === currentResult.quizId);
            setQuiz(currentQuiz);

            const initialGrades = {};
            currentResult.questionOrder.forEach(q => {
                if (q.type === 'open') {
                    const userAnswer = currentResult.userAnswers[q.id];
                    initialGrades[q.id] = userAnswer?.score || 0;
                }
            });
            setGradedAnswers(initialGrades);
        }
    }, [resultId, results, quizzes]);

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
    };

    const handlePasswordSubmit = () => {
        if (password === 'sn200924') {
            setIsAuthenticated(true);
        } else {
            alert('Yanlış parol');
        }
    };

    const handleGradeChange = (questionId, score) => {
        const question = quiz.questions.find(q => q.id === questionId);
        const maxPoints = question.points || 1;
        const newScore = Math.max(0, Math.min(maxPoints, Number(score)));
        setGradedAnswers(prev => ({ ...prev, [questionId]: newScore }));
    };

    const handleSaveGrades = () => {
        let finalScore = result.score;
        const newAnswers = { ...result.userAnswers };

        Object.entries(gradedAnswers).forEach(([questionId, score]) => {
            const question = quiz.questions.find(q => q.id === Number(questionId));
            if (!question || question.type !== 'open') return;

            const originalAnswerObject = result.userAnswers[questionId];
            const oldScore = originalAnswerObject?.score || 0;
            // Correctly get the answer text, whether it's a string or already an object.
            const answerText = typeof originalAnswerObject === 'object' ? originalAnswerObject.answer : originalAnswerObject;
            
            finalScore = finalScore - oldScore + score;

            // Always save as an object to preserve both answer and score.
            newAnswers[questionId] = {
                answer: answerText,
                score: score
            };
        });

        const finalPercentage = result.totalPoints > 0 ? Math.round((finalScore / result.totalPoints) * 100) : 0;

        const updatedResult = {
            ...result,
            score: finalScore,
            percentage: finalPercentage,
            userAnswers: newAnswers,
            status: 'completed'
        };

        onUpdateResult(updatedResult);
    };

    if (!isAuthenticated) {
        return (
            <Card className="text-center">
                <h2 className="text-xl font-bold mb-4">Yoxlama üçün parol tələb olunur</h2>
                <input
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
                <Button onClick={handlePasswordSubmit} className="mt-4">Daxil ol</Button>
            </Card>
        );
    }

    if (!result || !quiz) {
        return <Card className="text-center"><p>Nəticə və ya test tapılmadı.</p></Card>;
    }

    const openQuestions = result.questionOrder.filter(q => q.type === 'open');

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Manual Yoxlama</h1>
                    <p className="text-lg text-gray-600">{quiz.title} - {result.userName} {result.userSurname}</p>
                </div>
                <Button onClick={() => navigate('/stats')} variant="secondary"><ArrowLeftIcon /> Statistikaya qayıt</Button>
            </div>

            {openQuestions.length === 0 ? (
                <Card><p>Bu testdə yoxlanılacaq açıq sual yoxdur.</p></Card>
            ) : (
                openQuestions.map(question => {
                    const userAnswer = result.userAnswers[question.id];
                    // Correctly display the answer text, whether it's a string or an object.
                    const answerText = userAnswer?.answer || userAnswer;
                    return (
                        <Card key={question.id}>
                            <h3 className="font-semibold text-lg text-gray-800 mb-2">{question.text}</h3>
                            <p className="text-sm text-gray-500 mb-4">Maksimum bal: {question.points || 1}</p>
                            <div className="p-4 bg-gray-100 rounded-md">
                                <p className="font-semibold">Tələbənin cavabı:</p>
                                <p className="whitespace-pre-wrap">{answerText}</p>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700">Qiymət (bal)</label>
                                <input
                                    type="number"
                                    value={gradedAnswers[question.id] || ''}
                                    onChange={(e) => handleGradeChange(question.id, e.target.value)}
                                    max={question.points || 1}
                                    min="0"
                                    className="mt-1 w-24 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                                />
                            </div>
                        </Card>
                    )
                })
            )}

            <div className="flex justify-end">
                <Button onClick={handleSaveGrades}><CheckIcon /> Yoxlamanı bitir və nəticəni yenilə</Button>
            </div>
        </div>
    );
};

export default ManualReviewPage;