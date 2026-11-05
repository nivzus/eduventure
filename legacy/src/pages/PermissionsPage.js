import React, { useState, useMemo } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { LockClosedIcon, BookOpenIcon, DocumentTextIcon, CollectionIcon, PaperAirplaneIcon, DuplicateIcon, SearchIcon } from '../assets/icons';

const ItemList = ({ items, itemType, onSetVisibilityRequest, title, icon }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredItems = useMemo(() => {
        if (!searchTerm) return items;
        return items.filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [items, searchTerm]);

    return (
        <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">{icon} {title}</h3>
            <div className="relative mb-4">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><SearchIcon /></span>
                <input
                    type="text"
                    placeholder={`${title} axtar...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 pl-10 border border-gray-300 rounded-md"
                />
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                {filteredItems.map(item => (
                    <div key={item.id} className="p-3 rounded-lg flex items-center justify-between bg-gray-50 border">
                        <div>
                            <p className="font-medium">{item.title}</p>
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.visibility === 'public' || !item.visibility ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                {item.visibility === 'public' || !item.visibility ? 'Hər kəsə açıq' : 'Məhdud'}
                            </span>
                        </div>
                        <Button size="sm" variant="secondary" onClick={() => onSetVisibilityRequest(item.id, item.title, itemType, item.visibility)}>
                            <LockClosedIcon /> Girişi tənzimlə
                        </Button>
                    </div>
                ))}
                 {filteredItems.length === 0 && <p className="text-center text-gray-500 py-4">Material tapılmadı.</p>}
            </div>
        </div>
    );
};


const PermissionsPage = ({ quizzes, articles, courses, learningPaths, flashcardDecks, onSetVisibilityRequest }) => {
    const [activeTab, setActiveTab] = useState('quizzes');

    const tabs = {
        quizzes: { title: 'Testlər', items: quizzes, itemType: 'quiz', icon: <BookOpenIcon /> },
        articles: { title: 'Məqalələr', items: articles, itemType: 'article', icon: <DocumentTextIcon /> },
        courses: { title: 'Kurslar', items: courses, itemType: 'course', icon: <CollectionIcon /> },
        paths: { title: 'Tədris Yolları', items: learningPaths, itemType: 'learning_path', icon: <PaperAirplaneIcon /> },
        decks: { title: 'Kart Kolodaları', items: flashcardDecks, itemType: 'flashcard_deck', icon: <DuplicateIcon /> },
    };

    const TabButton = ({ tabKey, children }) => (
        <button
            onClick={() => setActiveTab(tabKey)}
            className={`${activeTab === tabKey ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm`}
        >
            {children}
        </button>
    );

    return (
        <Card>
            <h2 className="text-2xl font-bold mb-4">Materialların Giriş İdarəetməsi</h2>
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                    {Object.entries(tabs).map(([key, { title }]) => (
                        <TabButton key={key} tabKey={key}>{title}</TabButton>
                    ))}
                </nav>
            </div>
            <div>
                {Object.entries(tabs).map(([key, data]) => (
                    <div key={key} className={activeTab === key ? 'block' : 'hidden'}>
                        <ItemList {...data} onSetVisibilityRequest={onSetVisibilityRequest} />
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default PermissionsPage;