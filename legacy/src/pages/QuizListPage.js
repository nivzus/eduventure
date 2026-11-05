import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useHasAccess } from '../hooks/useHasAccess';
import { SearchIcon, PlusIcon, PlayIcon, EditIcon, TrashIcon, DuplicateIcon, ArchiveIcon, EyeIcon, EyeOffIcon, DotsVerticalIcon, LightbulbIcon, ClockIcon, RefreshIcon, LockClosedIcon, ClipboardCheckIcon, BookmarkIcon } from '../assets/icons';

const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getQuizStatus = (quiz) => {
    const now = new Date();
    const startTime = quiz.start_time ? new Date(quiz.start_time) : null;
    const endTime = quiz.end_time ? new Date(quiz.end_time) : null;

    if (startTime && now < startTime) {
        return { text: ` başlayır ${formatDate(startTime)}`, color: 'blue', active: false };
    }
    if (endTime && now > endTime) {
        return { text: 'Bitib', color: 'red', active: false };
    }
    if (startTime && endTime) {
        return { text: ` bitir ${formatDate(endTime)}`, color: 'green', active: true };
    }
    if (startTime) {
        return { text: 'Aktiv', color: 'green', active: true };
    }
    return { text: 'Aktiv', color: 'green', active: true };
};

const QuizCard = ({ quiz, onStartQuiz, onCloneQuiz, onEditQuiz, onArchiveRequest, onDeleteRequest, profile, onToggleStatus, onAssignRequest, toggleBookmark, isBookmarked, onSetVisibilityRequest }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const hasAccess = useHasAccess(quiz, profile);
    const isAdmin = profile?.role === 'admin';

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuRef]);

    const questions = quiz.questions || [];
    const status = getQuizStatus(quiz);
    const isSaved = isBookmarked(quiz.id, 'quiz');
    const isEffectivelyPublished = quiz.is_published && hasAccess;

    return (
        <div className="relative group transition-transform duration-200 hover:-translate-y-1">
            <Card className={`flex flex-col group-hover:shadow-orange-200 transition-shadow duration-200 ${quiz.isArchived || !isEffectivelyPublished ? 'bg-gray-100' : ''}`}>
                <div className="flex-grow flex flex-col min-h-[200px]">
                    <div className="flex justify-between items-start mb-2">
                        <h2 className="text-xl font-bold text-gray-800 flex-1 pr-2">{quiz.title}</h2>
                        <button onClick={(e) => { e.stopPropagation(); toggleBookmark(quiz.id, 'quiz'); }} className="p-1 rounded-full hover:bg-orange-100 text-orange-500 flex-shrink-0" title={isSaved ? "Əlfəcini sil" : "Əlfəcinlərə əlavə et"}>
                            <BookmarkIcon filled={isSaved} />
                        </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                        {quiz.isArchived ? (
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 bg-gray-200 px-2 py-1 rounded-full whitespace-nowrap">ARXİVDƏ</span>
                        ) : (
                            <>
                                {!isEffectivelyPublished && (
                                    <span className="text-xs font-semibold uppercase tracking-wider text-yellow-800 bg-yellow-200 px-2 py-1 rounded-full whitespace-nowrap">
                                        {quiz.visibility === 'restricted' ? 'Məhdud' : 'Qaralama'}
                                    </span>
                                )}
                                <span className="text-xs font-semibold uppercase tracking-wider text-orange-600 bg-orange-100 px-2 py-1 rounded-full whitespace-nowrap">{quiz.category || 'Kateqoriyasız'}</span>
                            </>
                        )}
                        {isAdmin && (
                            <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap ${quiz.visibility === 'public' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                {quiz.visibility === 'public' ? 'Açıq' : 'Məhdud'}
                            </span>
                        )}
                    </div>
                    <p className="text-gray-600 mb-4 h-12 overflow-hidden text-sm">{quiz.description}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500 mt-auto mb-4">
                        <span>{questions.length} sual</span>
                        <div className="flex items-center gap-3 flex-wrap justify-end">
                            {quiz.passcode && (
                                <span className="flex items-center gap-1 font-medium text-gray-600" title="Giriş kodu tələb olunur">
                                    <LockClosedIcon className="h-4 w-4" />
                                </span>
                            )}
                            {quiz.attempt_limit > 0 && (
                                <span className="flex items-center gap-1 font-medium text-purple-600" title={`Maksimum ${quiz.attempt_limit} cəhd`}>
                                    <RefreshIcon className="h-4 w-4" />
                                    {quiz.attempt_limit} cəhd
                                </span>
                            )}
                            <span className={`flex items-center gap-1 font-medium text-${status.color}-600`}>
                                <ClockIcon className="h-4 w-4" />
                                {status.text}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-stretch gap-2">
                    <Button onClick={() => onStartQuiz(quiz.id)} className="flex-1" disabled={questions.length === 0 || quiz.isArchived || !status.active || !isEffectivelyPublished}><PlayIcon /> <span className="hidden sm:inline ml-1">Başla</span></Button>
                    {isAdmin && (
                        <div className="relative" ref={menuRef}>
                            <Button onClick={() => setMenuOpen(!menuOpen)} variant="secondary" className="h-full"><DotsVerticalIcon /></Button>
                            {menuOpen && (
                                <div className="absolute right-0 bottom-full mb-2 w-52 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                                    <button onClick={() => { onSetVisibilityRequest(quiz.id, quiz.title, 'quiz', quiz.visibility); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"><LockClosedIcon /> <span className="ml-2">Girişi tənzimlə</span></button>
                                    <button onClick={() => { onAssignRequest(quiz.id, quiz.title, 'quiz'); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"><ClipboardCheckIcon /> <span className="ml-2">Təyin et</span></button>
                                    <button onClick={() => { onToggleStatus(quiz.id, !quiz.is_published); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                                        {quiz.is_published ? <EyeOffIcon /> : <EyeIcon />}
                                        <span className="ml-2">{quiz.is_published ? 'Qaralamaya sal' : 'Dərc et'}</span>
                                    </button>
                                    <div className="border-t border-gray-100 my-1"></div>
                                    <button onClick={() => { onCloneQuiz(quiz.id); setMenuOpen(false); }} disabled={quiz.isArchived} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center disabled:opacity-50"><DuplicateIcon /> <span className="ml-2">Kopyala</span></button>
                                    <button onClick={() => { onEditQuiz(quiz.id); setMenuOpen(false); }} disabled={quiz.isArchived} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center disabled:opacity-50"><EditIcon /> <span className="ml-2">Redaktə et</span></button>
                                    <button onClick={() => { onArchiveRequest(quiz.id, !quiz.isArchived); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"><ArchiveIcon /> <span className="ml-2">{quiz.isArchived ? 'Arxivdən çıxar' : 'Arxivə sal'}</span></button>
                                    <div className="border-t border-gray-100 my-1"></div>
                                    <button onClick={() => { onDeleteRequest(quiz.id); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"><TrashIcon /> <span className="ml-2">Sil</span></button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

const QuizListPage = ({ quizzes, onStartQuiz, onAddNewQuiz, onEditQuiz, onDeleteRequest, onCloneQuiz, onArchiveRequest, onStartSmartPractice, profile, onToggleStatus, onAssignRequest, toggleBookmark, isBookmarked, onSetVisibilityRequest }) => {
    const isAdmin = profile?.role === 'admin';
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date_desc'); 
    const [viewMode, setViewMode] = useState('published'); // published, drafts, archived
    const [searchParams] = useSearchParams();
    const categoryFromUrl = searchParams.get('category');
    const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl || 'all');

    const categories = useMemo(() => {
        const activeQuizzes = quizzes.filter(q => !q.isArchived);
        return ['all', ...new Set(activeQuizzes.map(q => q.category || 'Kateqoriyasız'))];
    }, [quizzes]);

    useEffect(() => {
        setSelectedCategory(categoryFromUrl || 'all');
    }, [categoryFromUrl]);

    const sortedAndFilteredQuizzes = useMemo(() => {
        const term = searchTerm.toLowerCase();

        return quizzes
            .filter(quiz => {
                // Admin view filtering
                if (isAdmin) {
                    if (viewMode === 'published' && (quiz.isArchived || !quiz.is_published)) return false;
                    if (viewMode === 'drafts' && (quiz.isArchived || quiz.is_published)) return false;
                    if (viewMode === 'archived' && !quiz.isArchived) return false;
                } else {
                    // Regular user view: only published and not archived
                    if (!quiz.is_published || quiz.isArchived) return false;
                }

                // Common filters
                if (selectedCategory !== 'all' && (quiz.category || 'Kateqoriyasız') !== selectedCategory) return false;
                if (term && !quiz.title.toLowerCase().includes(term) && !(quiz.description && quiz.description.toLowerCase().includes(term))) return false;

                return true;
            })
            .sort((a, b) => {
                switch (sortBy) {
                    case 'title_asc': return a.title.localeCompare(b.title);
                    case 'title_desc': return b.title.localeCompare(a.title);
                    case 'questions_asc': return (a.questions || []).length - (b.questions || []).length;
                    case 'questions_desc': return (b.questions || []).length - (a.questions || []).length;
                    case 'date_asc': return a.id - b.id;
                    case 'date_desc':
                    default: return b.id - a.id;
                }
            });
    }, [quizzes, searchTerm, sortBy, selectedCategory, viewMode, isAdmin]);

    const AdminTabs = () => (
        <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                <button onClick={() => setViewMode('published')} className={`${viewMode === 'published' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>Dərc Edilmiş</button>
                <button onClick={() => setViewMode('drafts')} className={`${viewMode === 'drafts' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>Qaralamalar</button>
                <button onClick={() => setViewMode('archived')} className={`${viewMode === 'archived' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>Arxiv</button>
            </nav>
        </div>
    );

    return (
        <div className="animate-fade-in">
            <Card className="mb-6 !p-4 bg-gray-50 border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative flex-grow w-full">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3"><SearchIcon /></span>
                        <input
                            type="text"
                            placeholder="Adına və ya təsvirinə görə axtarış..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg w-full focus:ring-orange-400 focus:border-orange-400 transition"
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        {viewMode !== 'archived' && (
                            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="py-2 px-4 border-2 border-gray-200 rounded-lg bg-white w-full sm:w-auto">
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat === 'all' ? 'Bütün kateqoriyalar' : cat}</option>
                                ))}
                            </select>
                        )}
                        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="py-2 px-4 border-2 border-gray-200 rounded-lg bg-white w-full sm:w-auto">
                            <option value="date_desc">Ən yenilər</option>
                            <option value="date_asc">Ən köhnələr</option>
                            <option value="title_asc">Ad (A-Z)</option>
                            <option value="title_desc">Ad (Z-A)</option>
                            <option value="questions_desc">Çox sual</option>
                            <option value="questions_asc">Az sual</option>
                        </select>
                        <Button onClick={onStartSmartPractice} variant="primary" className="w-full sm:w-auto"><LightbulbIcon /><span className="hidden sm:inline ml-2">Ağıllı Məşq</span></Button>
                        {isAdmin && <Button onClick={onAddNewQuiz} className="w-full sm:w-auto"><PlusIcon /><span className="sm:hidden md:inline">Test yarat</span></Button>}
                    </div>
                </div>
            </Card>

            {isAdmin && <AdminTabs />}

            {sortedAndFilteredQuizzes.length === 0 ? (
                <Card className="text-center py-12">
                    <p className="text-gray-500">
                        {viewMode === 'archived' && 'Arxivdə test tapılmadı.'}
                        {viewMode === 'drafts' && 'Qaralama test tapılmadı.'}
                        {viewMode === 'published' && 'Dərc edilmiş test tapılmadı. Filtləri dəyişməyə və ya yeni test yaratmağa cəhd edin!'}
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedAndFilteredQuizzes.map(quiz => (
                        <QuizCard
                            key={quiz.id}
                            quiz={quiz}
                            onStartQuiz={onStartQuiz}
                            onCloneQuiz={onCloneQuiz}
                            onEditQuiz={onEditQuiz}
                            onArchiveRequest={onArchiveRequest}
                            onDeleteRequest={onDeleteRequest}
                            profile={profile}
                            onToggleStatus={onToggleStatus}
                            onAssignRequest={onAssignRequest}
                            toggleBookmark={toggleBookmark}
                            onSetVisibilityRequest={onSetVisibilityRequest}
                            isBookmarked={isBookmarked}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuizListPage;