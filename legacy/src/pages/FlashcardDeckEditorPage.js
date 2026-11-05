import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ArrowLeftIcon, CheckIcon, PlusIcon, TrashIcon, DocumentTextIcon } from '../assets/icons';

const FlashcardEditor = ({ card, onUpdate, onDelete }) => {
    const handleCardChange = (e) => {
        const { name, value } = e.target;
        onUpdate({ ...card, [name]: value });
    };

    return (
        <div className="p-3 border rounded-lg bg-white flex flex-col md:flex-row gap-4">
            <textarea
                name="front"
                value={card.front || ''}
                onChange={handleCardChange}
                placeholder="Kartın ön tərəfi..."
                rows="3"
                className="w-full p-2 border border-gray-300 rounded-md flex-1"
            />
            <textarea
                name="back"
                value={card.back || ''}
                onChange={handleCardChange}
                placeholder="Kartın arxa tərəfi..."
                rows="3"
                className="w-full p-2 border border-gray-300 rounded-md flex-1"
            />
            <Button onClick={onDelete} variant="danger" className="self-start md:self-center">
                <TrashIcon />
            </Button>
        </div>
    );
};

const FlashcardDeckEditorPage = ({ deck, onDraftChange, onSave, showToast }) => {
    const navigate = useNavigate();

    const handleDeckInfoChange = (e) => {
        const { name, value, type, checked } = e.target;
        onDraftChange(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleCardsChange = (newCards) => {
        onDraftChange(prev => ({ ...prev, flashcards: newCards }));
    };

    const addCard = () => {
        const newCard = {
            id: `new-${Date.now()}`,
            front: '',
            back: ''
        };
        handleCardsChange([...(deck.flashcards || []), newCard]);
    };

    const updateCard = (updatedCard) => {
        handleCardsChange((deck.flashcards || []).map(c => c.id === updatedCard.id ? updatedCard : c));
    };

    const deleteCard = (cardId) => {
        handleCardsChange((deck.flashcards || []).filter(c => c.id !== cardId));
    };

    const handleSave = () => {
        if (!deck.title.trim()) {
            showToast('Kolodanın başlığı boş ola bilməz.');
            return;
        }
        onSave(deck);
    };

    if (!deck) return <div>Yüklənir...</div>;

    return (
        <div className="animate-fade-in grid lg:grid-cols-3 gap-8 items-start">
            {/* Left Panel */}
            <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Koloda Redaktoru</h1>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button variant="secondary" onClick={() => navigate('/admin/decks')} className="w-full justify-center"><ArrowLeftIcon /> Siyahıya qayıt</Button>
                        <Button onClick={handleSave} className="w-full justify-center"><CheckIcon /> Yadda saxla</Button>
                    </div>
                </div>
                <Card>
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><DocumentTextIcon /> Əsas Məlumatlar</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kolodanın Başlığı</label>
                            <input type="text" name="title" value={deck.title || ''} onChange={handleDeckInfoChange} className="w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Təsvir</label>
                            <textarea name="description" value={deck.description || ''} onChange={handleDeckInfoChange} rows="4" className="w-full p-2 border border-gray-300 rounded-md"></textarea>
                        </div>
                        <div>
                            <label className="flex items-center cursor-pointer">
                                <input type="checkbox" name="is_published" checked={!!deck.is_published} onChange={handleDeckInfoChange} className="h-4 w-4 text-orange-600 rounded border-gray-300" />
                                <span className="ml-2 text-sm text-gray-700">Dərc edilsin</span>
                            </label>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Right Panel */}
            <div className="lg:col-span-2">
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold">Kolodadakı Kartlar ({(deck.flashcards || []).length})</h3>
                        <Button onClick={addCard}><PlusIcon /> Yeni Kart</Button>
                    </div>
                    <div className="space-y-3">
                        {(deck.flashcards || []).map((card, index) => (
                            <FlashcardEditor
                                key={card.id}
                                card={card}
                                onUpdate={updateCard}
                                onDelete={() => deleteCard(card.id)}
                            />
                        ))}
                        {(deck.flashcards || []).length === 0 && <p className="text-center text-gray-500 py-8">Bu kolodada hələ heç bir kart yoxdur.</p>}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default FlashcardDeckEditorPage;