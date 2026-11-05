import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, ClockIcon, LightbulbIcon } from '../assets/icons';
import Comments from '../components/Comments';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date)) return 'Invalid Date';
    return date.toLocaleString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const PastQuizReviewPage = ({ result, quiz, profile, fetchComments, postComment, deleteComment }) => {

    if (!result || !quiz) {
        return (
            <Card className="text-center">
                <p className="text-red-500">Nəticə və ya test məlumatı tapılmadı.</p>
                <Link to="/stats">
                    <Button variant="secondary" className="mt-4">Statistikaya qayıt</Button>
                </Link>
            </Card>
        );
    }

    const studentName = `${result.userName} ${result.userSurname}`;

    const getQuestionStatusInfo = (question, userAnswer) => {
        // For 'open' questions, the logic depends on whether it's graded
        if (question.type === 'open') {
            // Graded: userAnswer is an object { answer: '...', score: X }
            if (typeof userAnswer === 'object' && userAnswer !== null && userAnswer.hasOwnProperty('score')) {
                return {
                    status: userAnswer.score > 0 ? 'correct' : 'incorrect',
                    userAnswerText: userAnswer.answer || 'Cavab yoxdur',
                    correctAnswerText: '', // No correct answer to show, just the score
                    manualScore: userAnswer.score
                };
            }
            // Pending review: userAnswer is a string
            return {
                status: 'pending',
                userAnswerText: userAnswer || 'Cavab yoxdur',
                correctAnswerText: 'Yoxlanılır...',
                manualScore: null
            };
        }

        // Logic for other auto-graded question types
        let isCorrect = false;
        let correctAnswerText = '';
        let userAnswerText = '';

        if (question.type === 'single') {
            isCorrect = userAnswer === question.options[question.correctAnswers[0]];
            correctAnswerText = question.options[question.correctAnswers[0]];
            userAnswerText = userAnswer || 'Cavab yoxdur';
        } else if (question.type === 'multiple') {
            const correct = question.correctAnswers.map(i => question.options[i]).sort();
            const user = userAnswer ? [...userAnswer].sort() : [];
            isCorrect = JSON.stringify(correct) === JSON.stringify(user);
            correctAnswerText = correct.join(', ');
            userAnswerText = userAnswer && userAnswer.length > 0 ? userAnswer.join(', ') : 'Cavab yoxdur';
        } else if (question.type === 'textInput') {
            isCorrect = userAnswer && question.correctAnswers[0].trim().toLowerCase() === userAnswer.trim().toLowerCase();
            correctAnswerText = question.correctAnswers[0];
            userAnswerText = userAnswer || 'Cavab yoxdur';
        } else if (question.type === 'trueFalse') {
            isCorrect = userAnswer === question.correctAnswer;
            correctAnswerText = question.correctAnswer ? 'Doğru' : 'Yanlış';
            userAnswerText = userAnswer === true ? 'Doğru' : (userAnswer === false ? 'Yanlış' : 'Cavab yoxdur');
        } else if (question.type === 'ordering') {
            isCorrect = JSON.stringify(userAnswer) === JSON.stringify(question.orderItems);
            correctAnswerText = question.orderItems.map((item, i) => `${i + 1}. ${item}`).join('; ');
            userAnswerText = userAnswer && userAnswer.length > 0 ? userAnswer.map((item, i) => `${i + 1}. ${item}`).join('; ') : 'Cavab yoxdur';
        } else if (question.type === 'fillInTheBlanks') {
            isCorrect = Array.isArray(userAnswer) && userAnswer.length === question.correctAnswers.length && userAnswer.every((answer, index) => (answer || '').trim().toLowerCase() === (question.correctAnswers[index] || '').trim().toLowerCase());
            correctAnswerText = question.correctAnswers.join(', ');
            userAnswerText = userAnswer && userAnswer.length > 0 ? userAnswer.join(', ') : 'Cavab yoxdur';
        }

        return {
            status: isCorrect ? 'correct' : 'incorrect',
            userAnswerText,
            correctAnswerText,
            manualScore: null
        };
    };

    const statusStyles = {
        correct: { container: 'bg-green-50 border-l-4 border-green-400', icon: <CheckCircleIcon />, iconColor: 'text-green-500', textColor: 'text-green-700' },
        incorrect: { container: 'bg-red-50 border-l-4 border-red-400', icon: <XCircleIcon />, iconColor: 'text-red-500', textColor: 'text-red-700' },
        pending: { container: 'bg-yellow-50 border-l-4 border-yellow-400', icon: <ClockIcon />, iconColor: 'text-yellow-500', textColor: 'text-yellow-700' },
    };

    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                 <h1 className="text-xl sm:text-2xl font-bold text-orange-600">
                    Cavabların təhlili: {quiz.title}
                </h1>
                <Link to={`/student/${result.user_id}`}>
                    <Button variant="secondary"><ArrowLeftIcon /> Tələbənin hesabatına qayıt</Button>
                </Link>
            </div>
            <Card>
                <div className="flex justify-between items-center mb-4 pb-4 border-b">
                    <div>
                        <p><strong>Tələbə:</strong> {studentName}</p>
                        <p><strong>Tarix:</strong> {formatDate(result.created_at)}</p>
                    </div>
                    <div className="text-right">
                        <p><strong>Nəticə:</strong> {result.percentage}%</p>
                        <p><strong>Bal:</strong> {result.score} / {result.totalPoints}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {result.questionOrder.map((q, index) => {
                        const originalQuestion = (quiz.questions || []).find(origQ => origQ.id === q.id);
                        if (!originalQuestion) return (
                            <div key={q.id} className="p-3 sm:p-4 rounded-lg bg-gray-100 border-l-4 border-gray-400">
                                <p className="text-gray-600">Bu sual testdən silinib.</p>
                            </div>
                        );

                        const userAnswer = result.userAnswers[q.id];
                        const { status, userAnswerText, correctAnswerText, manualScore } = getQuestionStatusInfo(originalQuestion, userAnswer);
                        const styles = statusStyles[status];

                        return (
                            <div key={q.id} className={`p-3 sm:p-4 rounded-lg ${styles.container}`}>
                                <div className="flex items-start">
                                    <span className={`mr-3 mt-1 ${styles.iconColor}`}>{styles.icon}</span>
                                    <h3 className="font-semibold text-base sm:text-lg text-gray-800 flex-1">{index + 1}. {originalQuestion.text}</h3>
                                </div>
                                
                                {result.time_per_question && result.time_per_question[q.id] !== undefined && (
                                    <div className="pl-8 mt-2 flex items-center text-xs text-gray-500">
                                        <ClockIcon className="w-4 h-4 mr-1" />
                                        <span>Sərf olunan vaxt: {Math.round(result.time_per_question[q.id])} saniyə</span>
                                    </div>
                                )}
                                {originalQuestion.imageUrl && (
                                    <div className="pl-8 mt-3"><img src={originalQuestion.imageUrl} alt="Question illustration" className="rounded-lg max-h-40 sm:max-h-60 w-auto mx-auto" onError={(e) => e.target.style.display = 'none'} /></div>
                                )}

                                {originalQuestion.type === 'fillInTheBlanks' ? (
                                    <div className="mt-3 pl-8 text-lg leading-loose">
                                        {originalQuestion.text.split(/(\[.*?\])/g).filter(part => part).map((part, i) => {
                                            if (part.startsWith('[') && part.endsWith(']')) {
                                                const blankIndex = originalQuestion.text.substring(0, originalQuestion.text.indexOf(part)).split('[').length - 1;
                                                const userAnswerForBlank = (userAnswer || [])[blankIndex] || '';
                                                const correctAnswerForBlank = originalQuestion.correctAnswers[blankIndex] || '';
                                                const isCorrect = userAnswerForBlank.trim().toLowerCase() === correctAnswerForBlank.trim().toLowerCase();
                                                return (
                                                    <span key={i} className={`inline-block font-semibold px-2 py-1 rounded-md text-sm ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {userAnswerForBlank || '___'}
                                                        {!isCorrect && <span className="ml-2 text-xs text-green-700 font-bold">({correctAnswerForBlank})</span>}
                                                    </span>
                                                );
                                            }
                                            return <span key={i}>{part}</span>;
                                        })}
                                    </div>
                                ) : (
                                    <div className="mt-3 pl-8 space-y-2 text-sm sm:text-base">
                                        <p>
                                            <strong>Tələbənin cavabı:</strong>{' '}
                                            <span className={`${styles.textColor} font-medium`}>{userAnswerText}</span>
                                        </p>
                                        {status === 'incorrect' && (
                                            <p>
                                                <strong>Düzgün cavab:</strong>{' '}
                                                <span className="text-green-700 font-medium">{correctAnswerText}</span>
                                            </p>
                                        )}
                                        {status === 'pending' && (
                                            <p className="font-semibold text-yellow-800">({correctAnswerText})</p>
                                        )}
                                        {manualScore !== null && (
                                            <p>
                                                <strong>Yoxlayan tərəfindən verilən bal:</strong>{' '}
                                                <span className="font-bold text-blue-600">{manualScore} / {originalQuestion.points}</span>
                                            </p>
                                        )}
                                    </div>
                                )}

                                {originalQuestion.explanation && (
                                    <div className="mt-4 pt-3 pl-8 border-t border-gray-300/70">
                                        <div className="flex items-start text-sm text-blue-800">
                                            <span className="mr-2 mt-1 flex-shrink-0"><LightbulbIcon /></span>
                                            <div><strong className="font-semibold">İzah:</strong><p className="mt-1 whitespace-pre-wrap">{originalQuestion.explanation}</p></div>
                                        </div>
                                    </div>
                                )}
                                <div className="mt-4 pt-4 pl-8 border-t border-gray-300/70">
                                    <Comments 
                                        targetId={originalQuestion.id.toString()} 
                                        targetType="question"
                                        profile={profile} 
                                        fetchComments={fetchComments} 
                                        postComment={postComment} 
                                        deleteComment={deleteComment} 
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
};

export default PastQuizReviewPage;
