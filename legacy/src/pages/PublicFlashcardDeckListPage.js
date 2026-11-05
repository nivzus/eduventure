import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import { SearchIcon, ClockIcon, LockClosedIcon } from '../assets/icons';
import { useHasAccess } from '../hooks/useHasAccess';

const PublicFlashcardDeckListPage = ({ decks, userReviews, profile }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const decksWithReviewCount = useMemo(() => {
        const lowercasedTerm = searchTerm.toLowerCase();
        const now = new Date().toISOString();

        return decks
            .filter(deck => deck.is_published)
            .filter(deck =>
                deck.title.toLowerCase().includes(lowercasedTerm) ||
                (deck.description && deck.description.toLowerCase().includes(lowercasedTerm))
            )
            .map(deck => {
                const cardsInDeck = deck.flashcards || [];
                const cardIdsInDeck = new Set(cardsInDeck.map(c => c.id));
                
                const dueReviews = (userReviews || []).filter(review => 
                    cardIdsInDeck.has(review.card_id) && review.next_review_at <= now
                );

                const newCards = cardsInDeck.filter(card => 
                    !(userReviews || []).some(review => review.card_id === card.id)
                );

                const dueCount = dueReviews.length + newCards.length;

                return { ...deck, dueCount };
            });
    }, [decks, userReviews, searchTerm]);

    const DeckCard = ({ deck }) => {
        const hasAccess = useHasAccess(deck, profile);
        const isClickable = hasAccess;

        const cardContent = (
            <Card className={`group-hover:shadow-orange-200 hover:-translate-y-1 transition-transform duration-200 h-full flex flex-col ${!isClickable ? 'bg-gray-100' : ''}`}>
                <div className="flex-grow">
                    <div className="flex justify-between items-start">
                        <h2 className="text-xl font-bold text-gray-800 mb-2 flex-1 pr-2">{deck.title}</h2>
                        {!hasAccess && <LockClosedIcon className="w-6 h-6 text-gray-400" title="Məhdud giriş" />}
                    </div>
                    <p className="text-sm text-gray-600">{deck.description}</p>
                </div>
                <div className="text-sm text-gray-500 mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                    <span>{(deck.flashcards || []).length} kart</span>
                    {hasAccess && deck.dueCount > 0 ? (
                        <span className="flex items-center gap-1 font-bold text-orange-600">
                            <ClockIcon /> {deck.dueCount} təkrarlamaq
                        </span>
                    ) : hasAccess ? (
                        <span className="flex items-center gap-1 text-green-600">Tamamlanıb</span>
                    ) : null}
                </div>
            </Card>
        );

        if (isClickable) {
            return <Link to={`/decks/${deck.id}/study`} className="block h-full">{cardContent}</Link>;
        }

        return <div className="cursor-not-allowed h-full">{cardContent}</div>;
    }

    return (
        <div className="animate-fade-in">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Kart Kolodaları</h1>
            <div className="mb-6">
                <Card className="!p-4 bg-gray-50 border border-gray-200">
                    <div className="relative flex-grow w-full">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><SearchIcon /></span>
                        <input
                            type="text"
                            placeholder="Koloda adına və ya təsvirinə görə axtarış..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg w-full focus:ring-orange-400 focus:border-orange-400 transition"
                        />
                    </div>
                </Card>
            </div>
            {decksWithReviewCount.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {decksWithReviewCount.map(deck => <DeckCard key={deck.id} deck={deck} />)}
                </div>
            ) : (
                <Card className="text-center py-12">
                    <p className="text-gray-500">{searchTerm ? 'Axtarışınıza uyğun heç bir koloda tapılmadı.' : 'Hələ heç bir koloda dərc edilməyib.'}</p>
                </Card>
            )}
        </div>
    );
};

export default PublicFlashcardDeckListPage;
