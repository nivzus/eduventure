import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ArrowLeftIcon, CheckCircleIcon } from '../assets/icons';
import { useHasAccess } from '../hooks/useHasAccess';

// --- Animation Styles ---
const AnimationStyles = () => (
    <style>{`
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideOut {
            from { opacity: 1; transform: translateX(0); }
            to { opacity: 0; transform: translateX(-100%); }
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(100%); }
            to { opacity: 1; transform: translateX(0); }
        }
        .flashcard-enter { animation: slideIn 0.3s ease-out forwards; }
        .flashcard-exit { animation: slideOut 0.3s ease-in forwards; }
        .flashcard-reveal { animation: fadeIn 0.3s ease-in-out forwards; }
    `}</style>
);

// --- SM-2 Algorithm ---
const calculateSpacedRepetition = (review, quality) => {
    let { repetitions, ease_factor, interval } = review;
    if (quality < 3) {
        repetitions = 0;
        interval = 1;
    } else {
        if (repetitions === 0) interval = 1;
        else if (repetitions === 1) interval = 6;
        else interval = Math.round(interval * ease_factor);
        repetitions += 1;
    }
    ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (ease_factor < 1.3) ease_factor = 1.3;
    const next_review_at = new Date();
    next_review_at.setDate(next_review_at.getDate() + interval);
    return { ...review, repetitions, ease_factor: parseFloat(ease_factor.toFixed(2)), interval, next_review_at: next_review_at.toISOString() };
};

// --- Main Component ---
const FlashcardStudyPage = ({ decks, userReviews, onUpdateReview, profile, showToast }) => {
    const { deckId } = useParams();
    const navigate = useNavigate();
    const [studySession, setStudySession] = useState({ cards: [], currentCardIndex: 0 });
    const [cardToRender, setCardToRender] = useState(null);
    const [isFlipped, setIsFlipped] = useState(false);
    const [animationClass, setAnimationClass] = useState('flashcard-enter');
    const [isSessionLoading, setIsSessionLoading] = useState(true);

    const deck = useMemo(() => decks.find(d => d.id === Number(deckId)), [decks, deckId]);
    const hasAccess = useHasAccess(deck, profile);

    useEffect(() => {
        if (!deck) return;

        if (!hasAccess) {
            showToast('Bu kolodaya giriş üçün icazəniz yoxdur.');
            navigate('/decks');
            return;
        }

        const now = new Date().toISOString();
        const allCards = deck.flashcards || [];
        const dueReviews = (userReviews || []).filter(review => allCards.some(c => c.id === review.card_id) && review.next_review_at <= now);
        const newCards = allCards.filter(card => !(userReviews || []).some(review => review.card_id === card.id));
        const dueCardIds = new Set(dueReviews.map(r => r.card_id));
        const dueCardsFromReviews = allCards.filter(c => dueCardIds.has(c.id));
        const cardsToStudy = [...newCards, ...dueCardsFromReviews].sort(() => Math.random() - 0.5);

        setStudySession({ cards: cardsToStudy, currentCardIndex: 0 });
        if (cardsToStudy.length > 0) {
            setCardToRender(cardsToStudy[0]);
        }
        setIsSessionLoading(false);
    }, [deck, userReviews, hasAccess, navigate, showToast]);

    const handleFlip = () => {
        setIsFlipped(true);
    };

    const goToNextCard = () => {
        setAnimationClass('flashcard-exit');
        setTimeout(() => {
            setStudySession(prev => {
                const nextIndex = prev.currentCardIndex + 1;
                if (prev.cards[nextIndex]) {
                    setCardToRender(prev.cards[nextIndex]);
                }
                return { ...prev, currentCardIndex: nextIndex };
            });
            setIsFlipped(false);
            setAnimationClass('flashcard-enter');
        }, 300); // Match animation duration
    };

    const handleGrade = (quality) => {
        const currentCardForGrading = studySession.cards[studySession.currentCardIndex];
        const review = (userReviews || []).find(r => r.card_id === currentCardForGrading.id) || { card_id: currentCardForGrading.id, repetitions: 0, ease_factor: 2.5, interval: 0 };
        const updatedReview = calculateSpacedRepetition(review, quality);
        onUpdateReview(updatedReview);
        goToNextCard();
    };

    if (isSessionLoading) return <Card className="text-center py-12">Təkrar sessiyası hazırlanır...</Card>;
    if (!deck) return <Card className="text-center py-12">Koloda tapılmadı.</Card>;
    if (!hasAccess) {
        return <div className="text-center py-12">Giriş yoxlanılır...</div>;
    }

    const isSessionDone = studySession.currentCardIndex >= studySession.cards.length;

    if (isSessionDone) {
        return (
            <Card className="text-center py-12 animate-fade-in">
                <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800">Sessiya Tamamlandı!</h2>
                <p className="text-gray-600 mt-2">Bu gün üçün bütün təkrarları bitirdiniz. Afərin!</p>
                <Link to="/decks"><Button className="mt-6"><ArrowLeftIcon /> Bütün kolodalara qayıt</Button></Link>
            </Card>
        );
    }

    const progressPercentage = (studySession.currentCardIndex / studySession.cards.length) * 100;

    if (!cardToRender) {
        return <Card className="text-center py-12">Yüklənir...</Card>;
    }

    return (
        <>
            <AnimationStyles />
            <div className="animate-fade-in max-w-2xl mx-auto">
                <div className="mb-4">
                    <Link to="/decks"><Button variant="secondary"><ArrowLeftIcon /> Kolodalara qayıt</Button></Link>
                </div>
                <Card>
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-semibold text-gray-600">{deck.title}</span>
                            <span className="text-sm font-semibold text-gray-600">{studySession.currentCardIndex + 1} / {studySession.cards.length}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-orange-500 h-2 rounded-full" style={{ width: `${progressPercentage}%` }}></div></div>
                    </div>

                    <div className={`w-full h-64 rounded-lg flex items-center justify-center p-6 text-center ${animationClass}`}>
                        {!isFlipped ? (
                            <p className="text-xl font-semibold text-gray-800">{cardToRender.front}</p>
                        ) : (
                            <p className="text-xl font-semibold text-gray-800">{cardToRender.back}</p>
                        )}
                    </div>

                    <div className="mt-6">
                        {!isFlipped ? (
                            <Button onClick={handleFlip} className="w-full">Cavabı Göstər</Button>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <Button onClick={() => handleGrade(0)} variant="danger">Yenidən</Button>
                                <Button onClick={() => handleGrade(2)} className="bg-yellow-500 hover:bg-yellow-600 text-white">Çətin</Button>
                                <Button onClick={() => handleGrade(4)} className="bg-green-500 hover:bg-green-600 text-white">Yaxşı</Button>
                                <Button onClick={() => handleGrade(5)} className="bg-blue-500 hover:bg-blue-600 text-white">Asan</Button>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </>
    );
};

export default FlashcardStudyPage;
