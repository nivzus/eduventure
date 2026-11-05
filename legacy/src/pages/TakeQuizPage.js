import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { SpeakerIcon, ArrowLeftIcon, ArrowRightIcon, CheckIcon, LightbulbIcon, ArrowUpIcon, ArrowDownIcon } from '../assets/icons';

// --- Helper Functions ---
const isAnswerCorrect = (question, userAnswer) => {
    if (userAnswer === undefined || userAnswer === null) return false;
    if (question.type === 'open') return false;
    switch (question.type) {
        case 'single': return userAnswer === question.options[question.correctAnswers[0]];
        case 'multiple':
            const correctOptions = question.correctAnswers.map(i => question.options[i]).sort();
            const userOptions = userAnswer ? [...userAnswer].sort() : [];
            if (!Array.isArray(userAnswer)) return false;
            return JSON.stringify(correctOptions) === JSON.stringify(userOptions);
        case 'textInput': return userAnswer.trim().toLowerCase() === question.correctAnswers[0].trim().toLowerCase();
        case 'trueFalse': return userAnswer === question.correctAnswer;
        case 'ordering': return JSON.stringify(userAnswer) === JSON.stringify(question.orderItems); 
        case 'fillInTheBlanks':
            if (!Array.isArray(userAnswer) || userAnswer.length !== question.correctAnswers.length) return false;
            return userAnswer.every((answer, index) =>
                (answer || '').trim().toLowerCase() === (question.correctAnswers[index] || '').trim().toLowerCase()
            );
        default: return false;
    }
};

const speakText = (text) => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'az-AZ';
        window.speechSynthesis.speak(utterance);
    } else { alert('Sizin brauzeriniz mətni səsləndirməyi dəstəkləmir.'); }
};

// --- Question Renderer Component ---
const QuestionRenderer = ({ q, index, answers, handleAnswerChange, isPracticeMode, isAnswerChecked, shuffledOptions, isSubmitting }) => {
    // Initialize shuffled items for ordering questions only once
    useEffect(() => {
        if (q.type === 'ordering' && !answers[q.id]) {
            const shuffled = [...q.orderItems].sort(() => Math.random() - 0.5);
            handleAnswerChange(q.id, shuffled);
        }
    }, [q.type, q.id, q.orderItems, answers, handleAnswerChange]);

    const handleMoveItem = (questionId, index, direction) => {
        const currentItems = answers[questionId];
        if (!currentItems) return;

        const newItems = [...currentItems];
        const targetIndex = index + direction;

        if (targetIndex < 0 || targetIndex >= newItems.length) {
            return; // Out of bounds
        }

        // Swap items
        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];

        handleAnswerChange(questionId, newItems);
    };


    const optionsForCurrentQuestion = q.shuffleOptions && shuffledOptions[q.id] ? shuffledOptions[q.id] : q.options;

    const getOptionClassName = (option, optIndex) => {
        if (!isPracticeMode || !isAnswerChecked) return 'border-transparent';
        let isCorrect = false;
        if (q.type === 'single') isCorrect = optIndex === q.correctAnswers[0];
        if (q.type === 'multiple') isCorrect = q.correctAnswers.includes(optIndex);
        if (isCorrect) return 'border-green-500 bg-green-100';
        let isSelected = false;
        if (q.type === 'single') isSelected = answers[q.id] === option;
        if (q.type === 'multiple') isSelected = answers[q.id]?.includes(option);
        if (isSelected) return 'border-red-500 bg-red-100';
        return 'border-transparent';
    };

    if (q.type === 'fillInTheBlanks') {
        const parts = q.text.split(/(\[.*?\])/g).filter(part => part);
        let blankIndex = -1;
        return (
            <div key={q.id} className="bg-orange-50 p-4 sm:p-6 rounded-lg mb-6">
                <h3 className="font-semibold text-lg sm:text-xl text-gray-800 mb-4">{index + 1}. Cümləni tamamlayın:</h3>
                {q.imageUrl && <img src={q.imageUrl} alt="Question illustration" className="my-4 rounded-lg max-h-60 w-full object-contain mx-auto" onError={(e) => e.target.style.display = 'none'} />}
                <div className="text-lg leading-loose">
                    {parts.map((part, i) => {
                        if (part.startsWith('[') && part.endsWith(']')) {
                            blankIndex++;
                            const currentBlankIndex = blankIndex;
                            const userAnswer = (answers[q.id] || [])[currentBlankIndex] || '';
                            const correctAnswer = q.correctAnswers[currentBlankIndex] || '';
                            let blankStyle = 'border-gray-400 focus:border-orange-500';
                            if (isPracticeMode && isAnswerChecked) {
                                const isBlankCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
                                blankStyle = isBlankCorrect ? 'border-green-500 bg-green-100' : 'border-red-500 bg-red-100';
                            }

                            return (
                                <span key={i} className="inline-block">
                                    <input
                                        type="text"
                                        value={userAnswer}
                                        onChange={(e) => { const newAnswers = [...(answers[q.id] || [])]; newAnswers[currentBlankIndex] = e.target.value; handleAnswerChange(q.id, newAnswers); }}
                                        className={`inline-block w-32 sm:w-40 mx-1 p-1 border-b-2 bg-transparent outline-none text-center ${blankStyle}`}
                                        disabled={isSubmitting || (isPracticeMode && isAnswerChecked)}
                                    />
                                    {isPracticeMode && isAnswerChecked && userAnswer.trim().toLowerCase() !== correctAnswer.trim().toLowerCase() && (
                                        <span className="text-xs text-green-600 font-semibold">({correctAnswer})</span>
                                    )}
                                </span>
                            );
                        }
                        return <span key={i}>{part}</span>;
                    })}
                </div>
            </div>
        );
    }

    return (
        <div key={q.id} className="bg-orange-50 p-4 sm:p-6 rounded-lg mb-6">
            <div className="flex justify-between items-start">
                <h3 className="font-semibold text-lg sm:text-xl text-gray-800 mb-4 flex-1">{index + 1}. {q.text}</h3>
                <button onClick={() => speakText(q.text)} className="text-gray-500 hover:text-orange-500 ml-2 sm:ml-4 p-2"><SpeakerIcon /></button>
            </div>
            {q.audioUrl && (
                <div className="my-4">
                    <audio controls src={q.audioUrl} className="w-full">Your browser does not support the audio element.</audio>
                </div>
            )}
            {q.imageUrl && <img src={q.imageUrl} alt="Question illustration" className="my-4 rounded-lg max-h-60 w-full object-contain mx-auto" onError={(e) => e.target.style.display = 'none'} />}
            
            {q.type === 'single' && optionsForCurrentQuestion.map((option, optIndex) => (
                <div key={optIndex} className="mb-2"><label className={`block p-3 rounded-lg hover:bg-orange-100 cursor-pointer border-2 ${getOptionClassName(option, optIndex)}`}><input type="radio" name={q.id} value={option} checked={answers[q.id] === option} onChange={(e) => handleAnswerChange(q.id, e.target.value)} className="mr-3 h-4 w-4 text-orange-600 focus:ring-orange-500" disabled={(isPracticeMode && isAnswerChecked) || isSubmitting} />{option}</label></div>
            ))}
            {q.type === 'multiple' && optionsForCurrentQuestion.map((option, optIndex) => (
                <div key={optIndex} className="mb-2"><label className={`block p-3 rounded-lg hover:bg-orange-100 cursor-pointer border-2 ${getOptionClassName(option, optIndex)}`}><input type="checkbox" name={q.id} value={option} checked={answers[q.id]?.includes(option)} onChange={(e) => { const curr = answers[q.id] || []; const next = e.target.checked ? [...curr, e.target.value] : curr.filter(a => a !== e.target.value); handleAnswerChange(q.id, next); }} className="mr-3 h-4 w-4 text-orange-600 rounded focus:ring-orange-500" disabled={(isPracticeMode && isAnswerChecked) || isSubmitting} />{option}</label></div>
            ))}
            {q.type === 'textInput' && <input type="text" value={answers[q.id] || ''} onChange={(e) => handleAnswerChange(q.id, e.target.value)} className={`mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-3 ${isPracticeMode && isAnswerChecked ? (isAnswerCorrect(q, answers[q.id]) ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500') : ''}`} placeholder="Cavabınızı daxil edin..." disabled={(isPracticeMode && isAnswerChecked) || isSubmitting} />}
            {q.type === 'trueFalse' && (
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                    <label className={`block p-3 rounded-lg hover:bg-orange-100 cursor-pointer flex-1 text-center border-2 ${isPracticeMode && isAnswerChecked && q.correctAnswer === true ? 'border-green-500 bg-green-100' : (isPracticeMode && isAnswerChecked && answers[q.id] === true ? 'border-red-500 bg-red-100' : 'border-transparent')}`}><input type="radio" name={q.id} checked={answers[q.id] === true} onChange={() => handleAnswerChange(q.id, true)} className="mr-3 h-4 w-4 text-orange-600 focus:ring-orange-500" disabled={(isPracticeMode && isAnswerChecked) || isSubmitting} /> Doğru</label>
                    <label className={`block p-3 rounded-lg hover:bg-orange-100 cursor-pointer flex-1 text-center border-2 ${isPracticeMode && isAnswerChecked && q.correctAnswer === false ? 'border-green-500 bg-green-100' : (isPracticeMode && isAnswerChecked && answers[q.id] === false ? 'border-red-500 bg-red-100' : 'border-transparent')}`}><input type="radio" name={q.id} checked={answers[q.id] === false} onChange={() => handleAnswerChange(q.id, false)} className="mr-3 h-4 w-4 text-orange-600 focus:ring-orange-500" disabled={(isPracticeMode && isAnswerChecked) || isSubmitting} /> Yanlış</label>
                </div>
            )}
            {q.type === 'ordering' && (
                <div className="space-y-2 mt-4">
                    {(answers[q.id] || []).map((item, itemIndex) => (
                        <div key={itemIndex} className={`flex items-center p-3 rounded-lg border-2 ${isPracticeMode && isAnswerChecked ? (item === q.orderItems[itemIndex] ? 'border-green-500 bg-green-100' : 'border-red-500 bg-red-100') : 'bg-white border-gray-200'}`}>
                            <span className="flex-grow text-gray-800">{item}</span>
                            <div className="flex gap-1">
                                <Button variant="secondary" size="sm" className="!p-2" onClick={() => handleMoveItem(q.id, itemIndex, -1)} disabled={itemIndex === 0 || isSubmitting || (isPracticeMode && isAnswerChecked)}>
                                    <ArrowUpIcon />
                                </Button>
                                <Button variant="secondary" size="sm" className="!p-2" onClick={() => handleMoveItem(q.id, itemIndex, 1)} disabled={itemIndex === (answers[q.id] || []).length - 1 || isSubmitting || (isPracticeMode && isAnswerChecked)}>
                                    <ArrowDownIcon />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {isPracticeMode && isAnswerChecked && JSON.stringify(answers[q.id]) !== JSON.stringify(q.orderItems) && (
                        <p className="text-sm text-gray-600 mt-2">Düzgün sıralama: {q.orderItems.join(', ')}</p>
                    )}
                </div>
            )}
            {q.type === 'open' && (
                <textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-3"
                    placeholder="Cavabınızı bura daxil edin..."
                    rows="5"
                    disabled={(isPracticeMode && isAnswerChecked) || isSubmitting}
                />
            )}
            {isPracticeMode && isAnswerChecked && q.explanation && (
                <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400">
                    <div className="flex items-start text-sm text-blue-800">
                        <span className="mr-2 mt-1 flex-shrink-0"><LightbulbIcon /></span>
                        <div>
                            <strong className="font-semibold">İzah:</strong>
                            <p className="mt-1 whitespace-pre-wrap">{q.explanation}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Main Component ---
const TakeQuizPage = ({ quiz, user, onSubmit, mode = 'exam' }) => {
    const navigate = useNavigate();
    
    const [answers, setAnswers] = useState(() => {
        const initialState = {};
        (quiz.questions || []).forEach(q => {
            if (q.type === 'textInput' || q.type === 'open') {
                initialState[q.id] = '';
            }
        });
        return initialState;
    });

    const [deadline] = useState(() => Date.now() + (quiz.timeLimit || 10) * 60 * 1000);
    const [timeLeft, setTimeLeft] = useState((quiz.timeLimit || 10) * 60);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAnswerChecked, setIsAnswerChecked] = useState(false);

    // --- NEW: Time tracking ---
    const questionStartTimeRef = useRef(null);
    const timePerQuestionRef = useRef({});

    const isPracticeMode = mode === 'practice';
    const displayAll = quiz.display_all_questions && !isPracticeMode;

    const quizQuestions = useMemo(() => {
        return quiz.shuffleQuestions ? [...quiz.questions].sort(() => Math.random() - 0.5) : quiz.questions;
    }, [quiz]);

    const shuffledOptions = useMemo(() => {
        if (!quiz.shuffleOptions) return {};
        const shuffled = {};
        quizQuestions.forEach(q => {
            if (['single', 'multiple'].includes(q.type)) {
                shuffled[q.id] = [...q.options].sort(() => Math.random() - 0.5);
            }
        });
        return shuffled;
    }, [quizQuestions, quiz.shuffleOptions]);

    const recordTimeSpent = useCallback(() => {
        if (questionStartTimeRef.current && quizQuestions[currentQuestionIndex]) {
            const questionId = quizQuestions[currentQuestionIndex].id;
            const timeSpent = (Date.now() - questionStartTimeRef.current) / 1000; // in seconds
            timePerQuestionRef.current[questionId] = (timePerQuestionRef.current[questionId] || 0) + timeSpent;
        }
        questionStartTimeRef.current = Date.now();
    }, [currentQuestionIndex, quizQuestions]);

    useEffect(() => {
        // Start timer for the current question
        questionStartTimeRef.current = Date.now();
    }, [currentQuestionIndex]);

    useEffect(() => {
        // This effect handles recording time if the user navigates away
        const questionsRef = quizQuestions;
        const indexRef = currentQuestionIndex;
        const submittingRef = isSubmitting;

        return () => {
            if (!submittingRef && questionsRef[indexRef]) {
                recordTimeSpent();
            }
        };
    }, [isSubmitting, quizQuestions, currentQuestionIndex, recordTimeSpent]);

    const handleSubmitQuiz = useCallback(() => {
        if (isSubmitting) return;
        recordTimeSpent(); // Record time for the last question
        setIsSubmitting(true);
        if (onSubmit) {
            onSubmit(answers, quizQuestions, timePerQuestionRef.current);
        }
    }, [isSubmitting, onSubmit, answers, quizQuestions, recordTimeSpent]);

    useEffect(() => {
        if (isPracticeMode || isSubmitting) {
            return;
        }

        let animationFrameId;

        const updateTimer = () => {
            const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));

            setTimeLeft(prevTime => {
                // Обновляем состояние, только если значение секунды изменилось, чтобы избежать лишних ререндеров
                return prevTime !== remaining ? remaining : prevTime;
            });

            if (remaining > 0) {
                animationFrameId = requestAnimationFrame(updateTimer);
            } else {
                handleSubmitQuiz();
            }
        };

        animationFrameId = requestAnimationFrame(updateTimer);

        return () => cancelAnimationFrame(animationFrameId);
    }, [isPracticeMode, isSubmitting, deadline, handleSubmitQuiz]);

    const handleAnswerChange = (questionId, answer) => {
        if (isPracticeMode && isAnswerChecked) return;
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    const handleCheckAnswer = () => setIsAnswerChecked(true);

    const handleNextQuestion = () => {
        recordTimeSpent();
        setIsAnswerChecked(false);
        setCurrentQuestionIndex(prev => prev + 1);
    };

    const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${('0' + seconds % 60).slice(-2)}`;

    if (!quizQuestions || quizQuestions.length === 0) return <Card><p>Bu testdə hələlik sual yoxdur.</p></Card>;

    const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;

    return (
        <div className="animate-fade-in">
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-2 gap-4">
                    <h1 className="text-xl sm:text-2xl font-bold text-orange-600 text-center sm:text-left">{quiz.title}</h1>
                    {!isPracticeMode && <div className="text-2xl font-bold text-orange-500 bg-orange-100 px-4 py-2 rounded-lg w-full sm:w-auto text-center">{formatTime(timeLeft)}</div>}
                    {isPracticeMode && <div className="text-lg font-bold text-blue-500 bg-blue-100 px-4 py-2 rounded-lg w-full sm:w-auto text-center">Məşq Rejimi</div>}
                </div>
                {!isPracticeMode && user && <p className="text-center sm:text-left text-gray-600 mb-4">Uğurlar, {user.first_name}!</p>}
                {!displayAll && !isPracticeMode && <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6"><div className="bg-gradient-to-r from-orange-400 to-red-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div></div>}
                
                {displayAll ? (
                    quizQuestions.map((q, index) => (
                        <QuestionRenderer key={q.id} q={q} index={index} answers={answers} handleAnswerChange={handleAnswerChange} isPracticeMode={false} isAnswerChecked={false} shuffledOptions={shuffledOptions} isSubmitting={isSubmitting} />
                    ))
                ) : (
                    <QuestionRenderer q={quizQuestions[currentQuestionIndex]} index={currentQuestionIndex} answers={answers} handleAnswerChange={handleAnswerChange} isPracticeMode={isPracticeMode} isAnswerChecked={isAnswerChecked} shuffledOptions={shuffledOptions} isSubmitting={isSubmitting} />
                )}

                <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                    {displayAll ? (
                        <Button onClick={handleSubmitQuiz} disabled={isSubmitting} className="w-full sm:w-auto">
                            {isSubmitting ? 'Göndərilir...' : <><CheckIcon /> Testi Bitir</>}
                        </Button>
                    ) : isPracticeMode ? (
                        isAnswerChecked ? (
                            currentQuestionIndex < quizQuestions.length - 1 ? (
                                <Button onClick={handleNextQuestion} className="w-full sm:w-auto">Növbəti <ArrowRightIcon /></Button>
                            ) : (
                                <Button onClick={() => navigate('/')} className="w-full sm:w-auto"><CheckIcon /> Məşqi bitir</Button>
                            )
                        ) : (
                            <Button onClick={handleCheckAnswer} disabled={answers[quizQuestions[currentQuestionIndex].id] === undefined} className="w-full sm:w-auto">Yoxla</Button>
                        )
                    ) : (
                        <div className="w-full flex justify-between items-center">
                            {quiz.allow_back_navigation === true ? (
                                <Button onClick={() => { recordTimeSpent(); setCurrentQuestionIndex(i => i - 1); }} disabled={currentQuestionIndex === 0 || isSubmitting} variant="secondary"><ArrowLeftIcon /> Geri</Button>
                            ) : (
                                <div /> // Empty div for spacing
                            )}
                            <span>{currentQuestionIndex + 1} / {quizQuestions.length}</span>
                            {currentQuestionIndex < quizQuestions.length - 1 ? (
                                <Button onClick={() => { recordTimeSpent(); setCurrentQuestionIndex(i => i + 1); }} disabled={isSubmitting}>İrəli <ArrowRightIcon /></Button>
                            ) : (
                                <Button onClick={handleSubmitQuiz} disabled={isSubmitting}>
                                    {isSubmitting ? 'Göndərilir...' : <><CheckIcon /> Bitir</>}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default TakeQuizPage;
