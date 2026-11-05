import React from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, LightbulbIcon, ClockIcon } from '../assets/icons';
import Comments from '../components/Comments'; // Импортируем новый компонент

const QuizReviewPage = ({ quiz, result, onBack, profile, fetchComments, postComment, deleteComment }) => {

    const { userAnswers, questionOrder, time_per_question } = result;

    const getQuestionStatus = (question, userAnswer) => {
        if (question.type === 'open') {
            return {
                status: 'pending',
                userAnswerText: userAnswer || 'Cavab yoxdur',
                correctAnswerText: 'Yoxlama gözlənilir'
            };
        }

        let isCorrect = false;
        let correctAnswerText = '';
        let userAnswerText = userAnswer || 'Cavab yoxdur';

        if (question.type === 'single') {
            isCorrect = userAnswer === question.options[question.correctAnswers[0]];
            correctAnswerText = question.options[question.correctAnswers[0]];
        } else if (question.type === 'multiple') {
            const correct = question.correctAnswers.map(i => question.options[i]).sort();
            const user = userAnswer ? [...userAnswer].sort() : [];
            isCorrect = JSON.stringify(correct) === JSON.stringify(user);
            correctAnswerText = correct.join(', ');
            userAnswerText = userAnswer && userAnswer.length > 0 ? userAnswer.join(', ') : 'Cavab yoxdur';
        } else if (question.type === 'textInput') {
            isCorrect = userAnswer && question.correctAnswers[0].toLowerCase() === userAnswer.toLowerCase();
            correctAnswerText = question.correctAnswers[0];
        } else if (question.type === 'trueFalse') {
            isCorrect = userAnswer === question.correctAnswer;
            correctAnswerText = question.correctAnswer ? 'Doğru' : 'Yanlış';
            if (userAnswer === true) userAnswerText = 'Doğru';
            else if (userAnswer === false) userAnswerText = 'Yanlış';
            else userAnswerText = 'Cavab yoxdur';
        } else if (question.type === 'ordering') {
            isCorrect = JSON.stringify(userAnswer) === JSON.stringify(question.orderItems);
            correctAnswerText = question.orderItems.map((item, i) => `${i + 1}. ${item}`).join('; ');
            userAnswerText = userAnswer && userAnswer.length > 0 ? userAnswer.map((item, i) => `${i + 1}. ${item}`).join('; ') : 'Cavab yoxdur';
        }
        else if (question.type === 'fillInTheBlanks') {
            isCorrect = Array.isArray(userAnswer) && userAnswer.length === question.correctAnswers.length && userAnswer.every((answer, index) => (answer || '').trim().toLowerCase() === (question.correctAnswers[index] || '').trim().toLowerCase());
            correctAnswerText = question.correctAnswers.join(', ');
            userAnswerText = userAnswer && userAnswer.length > 0 ? userAnswer.join(', ') : 'Cavab yoxdur';
        }

        return { status: isCorrect ? 'correct' : 'incorrect', userAnswerText, correctAnswerText };
    };

    const statusStyles = {
        correct: { container: 'bg-green-50 border-l-4 border-green-400', icon: <CheckCircleIcon />, iconColor: 'text-green-500', textColor: 'text-green-700' },
        incorrect: { container: 'bg-red-50 border-l-4 border-red-400', icon: <XCircleIcon />, iconColor: 'text-red-500', textColor: 'text-red-700' },
        pending: { container: 'bg-yellow-50 border-l-4 border-yellow-400', icon: <ClockIcon />, iconColor: 'text-yellow-500', textColor: 'text-yellow-700' },
    };

    return (
        <div className="animate-fade-in">
            <Button onClick={onBack} variant="secondary" className="mb-6">
                <ArrowLeftIcon />
                <span className="hidden sm:inline">Nəticələrə qayıt</span>
                <span className="sm:hidden">Geri</span>
            </Button>
            <Card>
                <h1 className="text-xl sm:text-2xl font-bold text-center text-orange-600 mb-6 sm:mb-8">
                    Cavabların təhlili: {quiz.title}
                </h1>
                <div className="space-y-6">
                    {questionOrder.map((q, index) => {
                        const userAnswer = userAnswers[q.id];
                        const { status, userAnswerText, correctAnswerText } = getQuestionStatus(q, userAnswer);
                        const styles = statusStyles[status];

                        return (
                            <div key={q.id} className={`p-3 sm:p-4 rounded-lg ${styles.container}`}>
                                <div className="flex items-start">
                                    <span className={`mr-3 mt-1 ${styles.iconColor}`}>{styles.icon}</span>
                                    <h3 className="font-semibold text-base sm:text-lg text-gray-800 flex-1">{index + 1}. {q.text}</h3>
                                </div>

                                {time_per_question && time_per_question[q.id] !== undefined && (
                                    <div className="pl-8 mt-2 flex items-center text-xs text-gray-500">
                                        <ClockIcon className="w-4 h-4 mr-1" />
                                        <span>Sərf olunan vaxt: {Math.round(time_per_question[q.id])} saniyə</span>
                                    </div>
                                )}

                                {q.imageUrl && (
                                    <div className="pl-8 mt-3">
                                        <img src={q.imageUrl} alt="Question illustration" className="rounded-lg max-h-40 sm:max-h-60 w-auto mx-auto" onError={(e) => e.target.style.display = 'none'} />
                                    </div>
                                )}

                                {q.type === 'fillInTheBlanks' ? (
                                    <div className="mt-3 pl-8 text-lg leading-loose">
                                        {q.text.split(/(\[.*?\])/g).filter(part => part).map((part, i) => {
                                            if (part.startsWith('[') && part.endsWith(']')) {
                                                const blankIndex = q.text.substring(0, q.text.indexOf(part)).split('[').length - 1;
                                                const userAnswerForBlank = (userAnswer || [])[blankIndex] || '';
                                                const correctAnswerForBlank = q.correctAnswers[blankIndex] || '';
                                                const isCorrect = userAnswerForBlank.trim().toLowerCase() === correctAnswerForBlank.trim().toLowerCase();
                                                return (
                                                    <span key={i} className={`inline-block font-semibold px-2 py-1 rounded-md text-sm ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {userAnswerForBlank || '___'}
                                                        {!isCorrect && <span className="ml-2 text-xs text-green-700 font-bold">({correctAnswerText})</span>}
                                                    </span>
                                                );
                                            }
                                            return <span key={i}>{part}</span>;
                                        })}
                                    </div>
                                ) : (
                                    <div className="mt-3 pl-8 space-y-2 text-sm sm:text-base">
                                        <p>
                                            <strong>Sizin cavabınız:</strong>{' '}
                                            <span className={`${styles.textColor} font-medium`}>{userAnswerText}</span>
                                        </p>
                                        {status === 'incorrect' && (
                                            <p>
                                                <strong>Düzgün cavab:</strong>{' '}
                                                <span className="text-green-700 font-medium">{correctAnswerText}</span>
                                            </p>
                                        )}
                                        {status === 'pending' && (
                                            <p className="font-semibold text-yellow-800">{correctAnswerText}</p>
                                        )}
                                    </div>
                                )}

                                {q.explanation && (
                                    <div className="mt-4 pt-3 pl-8 border-t border-gray-300/70">
                                        <div className="flex items-start text-sm text-blue-800">
                                            <span className="mr-2 mt-1 flex-shrink-0"><LightbulbIcon /></span>
                                            <div>
                                                <strong className="font-semibold">İzah:</strong>
                                                <p className="mt-1 whitespace-pre-wrap">{q.explanation}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="mt-4 pt-4 pl-8 border-t border-gray-300/70">
                                    <Comments
                                        targetId={q.id.toString()}
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

export default QuizReviewPage;
