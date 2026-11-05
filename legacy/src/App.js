import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense, useRef } from 'react';
import { Routes, Route, useNavigate, useParams, Link, useLocation, createSearchParams, useSearchParams } from 'react-router-dom';
import Papa from 'papaparse';
import { useOnClickOutside } from 'usehooks-ts';
import { supabase } from './supabaseClient';

// --- Hooks ---
import { useBookmarks } from './hooks/useBookmarks';
import { useHasAccess } from './hooks/useHasAccess';

// --- UI Компоненты ---
import Modal from './components/ui/Modal';
import Toast from './components/ui/Toast';
import WavingCat from './components/WavingCat';
import Button from './components/ui/Button';
import RecommendationCard from './components/ui/RecommendationCard';
import AssignmentModal from './components/ui/AssignmentModal';
import VisibilityModal from './components/ui/VisibilityModal'; // Import the new modal
import GlobalSearch from './components/ui/GlobalSearch';
import { ChartBarIcon, BookOpenIcon, PencilAltIcon, UploadIcon, LibraryIcon, PlusIcon, LogoutIcon, TrophyIcon as LeaderboardIcon, UserCircleIcon, ShieldCheckIcon, DocumentTextIcon, CollectionIcon, BellIcon, MenuIcon, XIcon, PaperAirplaneIcon, DuplicateIcon, ClipboardCheckIcon, BookmarkIcon } from './assets/icons';

// --- Lazy Loaded Pages ---
const AuthPage = lazy(() => import('./pages/AuthPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const QuizListPage = lazy(() => import('./pages/QuizListPage'));
const QuizEditorPage = lazy(() => import('./pages/QuizEditorPage'));
const TakeQuizPage = lazy(() => import('./pages/TakeQuizPage'));
const QuizResultPage = lazy(() => import('./pages/QuizResultPage'));
const QuizReviewPage = lazy(() => import('./pages/QuizReviewPage'));
const StatisticsPage = lazy(() => import('./pages/StatisticsPage'));
const StudentReportPage = lazy(() => import('./pages/StudentReportPage'));
const QuestionBankPage = lazy(() => import('./pages/QuestionBankPage'));
const PastQuizReviewPage = lazy(() => import('./pages/PastQuizReviewPage'));
const ManualReviewPage = lazy(() => import('./pages/ManualReviewPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const QuizAnalysisPage = lazy(() => import('./pages/QuizAnalysisPage'));
const ArticleListPage = lazy(() => import('./pages/ArticleListPage'));
const ArticleEditorPage = lazy(() => import('./pages/ArticleEditorPage'));
const PublicArticleListPage = lazy(() => import('./pages/PublicArticleListPage'));
const ArticleViewPage = lazy(() => import('./pages/ArticleViewPage'));
const CourseListPage = lazy(() => import('./pages/CourseListPage'));
const CourseEditorPage = lazy(() => import('./pages/CourseEditorPage'));
const PublicCourseListPage = lazy(() => import('./pages/PublicCourseListPage'));
const CourseViewPage = lazy(() => import('./pages/CourseViewPage'));
const LearningPathListPage = lazy(() => import('./pages/LearningPathListPage'));
const LearningPathEditorPage = lazy(() => import('./pages/LearningPathEditorPage'));
const PublicLearningPathListPage = lazy(() => import('./pages/PublicLearningPathListPage'));
const LearningPathViewPage = lazy(() => import('./pages/LearningPathViewPage'));
const GlobalSearchPage = lazy(() => import('./pages/GlobalSearchPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const FlashcardDeckListPage = lazy(() => import('./pages/FlashcardDeckListPage'));
const FlashcardDeckEditorPage = lazy(() => import('./pages/FlashcardDeckEditorPage'));
const PublicFlashcardDeckListPage = lazy(() => import('./pages/PublicFlashcardDeckListPage'));
const FlashcardStudyPage = lazy(() => import('./pages/FlashcardStudyPage'));
const StudentGroupListPage = lazy(() => import('./pages/StudentGroupListPage'));
const StudentGroupEditorPage = lazy(() => import('./pages/StudentGroupEditorPage'));
const MyAssignmentsPage = lazy(() => import('./pages/MyAssignmentsPage'));
const QuestManagementPage = lazy(() => import('./pages/QuestManagementPage'));
const GroupAnalysisPage = lazy(() => import('./pages/GroupAnalysisPage'));
const StudentGroupViewPage = lazy(() => import('./pages/StudentGroupViewPage'));
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'));
const PermissionsPage = lazy(() => import('./pages/PermissionsPage'));

const SuspenseFallback = () => (
    <div className="w-full h-screen flex items-center justify-center bg-orange-50">
        <p className="text-lg text-orange-600">Yüklənir...</p>
    </div>
);

// --- Компонент-обертка для защиты роутов ---
const AdminRoute = ({ profile, showToast, children }) => {
    const navigate = useNavigate();

    useEffect(() => {
        if (profile === null) return;
        if (profile.role !== 'admin') {
            showToast('Bu səhifəyə baxmaq üçün admin hüququ tələb olunur.');
            navigate('/');
        }
    }, [profile, navigate, showToast]);

    if (!profile || profile.role !== 'admin') {
        return <div className="text-center py-12">Giriş yoxlanılır...</div>;
    }

    return children;
};

// --- Новый компонент уведомлений ---
const NotificationBell = ({ notifications, onMarkAsRead, onMarkAllAsRead, onClearAllNotifications }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);
    const unreadCount = notifications.filter(n => !n.is_read).length;

    useOnClickOutside(ref, () => setIsOpen(false));

    const handleNotificationClick = (notification) => {
        onMarkAsRead(notification.id);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={ref}>
            <Button variant="secondary" onClick={() => setIsOpen(!isOpen)}>
                <BellIcon />
                {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">{unreadCount}</span>
                )}
            </Button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">
                        <div className="flex justify-between items-center px-4 py-2 border-b">
                            <h3 className="font-bold">Bildirişlər</h3>
                            {unreadCount > 0 && <button onClick={onMarkAllAsRead} className="text-sm text-orange-600 hover:underline">Hamısını oxu</button>}
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length > 0 ? (
                                notifications.map(n => (
                                    <Link to={n.target_url || '#'} key={n.id} onClick={() => handleNotificationClick(n)} className={`block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 ${!n.is_read ? 'bg-orange-50' : ''}`}>
                                        <p className="font-semibold">{n.content.title}</p>
                                        <p>{n.content.body}</p>
                                        <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-center py-4 text-gray-500">Hələlik bildiriş yoxdur.</p>
                            )}
                        </div>
                        {notifications.length > 0 && (
                            <div className="px-4 py-2 border-t text-center">
                                <button onClick={onClearAllNotifications} className="text-sm text-red-600 hover:underline">Hamısını sil</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


// --- Вспомогательные функции ---
const isAnswerCorrect = (question, userAnswer) => {
    if (userAnswer === undefined || userAnswer === null) return false;
    if (!question || !question.type) return false;

    switch (question.type) {
        case 'single': return userAnswer === question.options[question.correctAnswers[0]];
        case 'multiple':
            const correctOptions = question.correctAnswers.map(i => question.options[i]).sort();
            const userOptions = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
            if (!Array.isArray(userAnswer)) return false;
            return JSON.stringify(correctOptions) === JSON.stringify(userOptions);
        case 'textInput': return userAnswer.trim().toLowerCase() === question.correctAnswers[0].trim().toLowerCase();
        case 'trueFalse': return userAnswer === question.correctAnswer;
        case 'ordering': return JSON.stringify(userAnswer) === JSON.stringify(question.orderItems);
        case 'fillInTheBlanks':
            if (!Array.isArray(userAnswer) || userAnswer.length !== question.correctAnswers.length) return false;
            return userAnswer.every((answer, index) => 
                answer.trim().toLowerCase() === question.correctAnswers[index].trim().toLowerCase()
            );
        default: return false;
    }
};

// --- Модальные окна ---
const PasscodeModal = ({ isOpen, onClose, onConfirm, showToast }) => {
    const [passcode, setPasscode] = useState('');
    useEffect(() => {
        if (!isOpen) {
            setPasscode('');
        }
    }, [isOpen]);
    const handleConfirm = () => {
        onConfirm(passcode);
    };
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Giriş Kodu Tələb Olunur">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Giriş Kodu</label>
                    <input type="text" value={passcode} onChange={(e) => setPasscode(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Kodu daxil edin" autoFocus />
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                <Button onClick={handleConfirm}>Təsdiqlə</Button>
            </div>
        </Modal>
    );
};

const ModeSelectionModal = ({ isOpen, onClose, onSelect }) => {
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Rejimi seçin">
            <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => onSelect('exam')} className="w-full flex-1"><PencilAltIcon /> İmtahan Rejimi</Button>
                <Button onClick={() => onSelect('practice')} variant="secondary" className="w-full flex-1"><BookOpenIcon /> Məşq Rejimi</Button>
            </div>
        </Modal>
    );
};

const ImportModal = ({ isOpen, onClose, onImport, showToast }) => {
    const [file, setFile] = useState(null);
    const handleFileChange = (e) => { if (e.target.files) { setFile(e.target.files[0]); } };
    const handleImport = () => {
        if (!file) {
            showToast('Zəhmət olmasa, fayl seçin.');
            return;
        }
        onImport(file);
        onClose();
    };
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Sualları CSV-dən idxal et">
            <div className="space-y-4">
                <p className="text-sm text-gray-600">Düzgün format üçün şablonu yükləyin. Sütun başlıqları dəyişdirilməməlidir: <strong>text, type, options, correctAnswers, explanation, points</strong></p>
                <a href="/questions_template.csv" download className="text-orange-600 hover:underline">Şablonu yüklə</a>
                <input type="file" accept=".csv" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"/>
            </div>
            <div className="mt-6 flex justify-end"><Button onClick={handleImport}><UploadIcon /> İdxal et</Button></div>
        </Modal>
    );
};

const AddFromBankModal = ({ isOpen, onClose, onAdd, showToast, questionBank }) => {
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTag, setSelectedTag] = useState('');

    // Сбрасываем состояние при закрытии модального окна для чистоты
    useEffect(() => {
        if (!isOpen) {
            setSelectedIds(new Set());
            setSearchTerm('');
            setSelectedTag('');
        }
    }, [isOpen]);

    const uniqueTags = useMemo(() => {
        const allTags = new Set(questionBank.flatMap(q => q.tags || []));
        return Array.from(allTags).sort();
    }, [questionBank]);

    const filteredBank = useMemo(() =>
        questionBank.filter(q => {
            const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesTag = !selectedTag || (q.tags && q.tags.includes(selectedTag));
            return matchesSearch && matchesTag;
        }), [questionBank, searchTerm, selectedTag]);

    const handleToggleSelection = (id) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedIds(newSelection);
    };

    const handleAdd = () => {
        if (selectedIds.size === 0) {
            showToast('Əlavə etmək üçün ən azı bir sual seçin.');
            return;
        }
        onAdd(Array.from(selectedIds));
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Bankdan sual əlavə et">
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                    <input type="text" placeholder="Sual axtar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-grow p-2 border border-gray-300 rounded-md" />
                    {uniqueTags.length > 0 && (
                        <select
                            value={selectedTag}
                            onChange={e => setSelectedTag(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md bg-white"
                        >
                            <option value="">Bütün teqlər</option>
                            {uniqueTags.map(tag => (
                                <option key={tag} value={tag}>{tag}</option>
                            ))}
                        </select>
                    )}
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                    {filteredBank.map(q => (
                        <div key={q.id} className="flex items-center p-2 rounded-md hover:bg-gray-100">
                            <input type="checkbox" checked={selectedIds.has(q.id)} onChange={() => handleToggleSelection(q.id)} className="h-4 w-4 text-orange-600 rounded mr-3" />
                            <label className="flex-1 cursor-pointer" onClick={() => handleToggleSelection(q.id)}>{q.text}</label>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-6 flex justify-end"><Button onClick={handleAdd}><PlusIcon /> Seçilmişləri əlavə et</Button></div>
        </Modal>
    );
};

// --- Компоненты-обертки для страниц (вынесены из App для стабильности) ---

const QuizListPageWrapper = ({ quizzes, onStartQuiz, onAddNewQuiz, onEditQuiz, onDeleteRequest, onCloneQuiz, onArchiveRequest, onStartSmartPractice, profile, onToggleStatus, onAssignRequest, toggleBookmark, isBookmarked, onSetVisibilityRequest }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const showArchived = queryParams.get('showArchived') === 'true';

    const handleSetShowArchived = (value) => {
        navigate({ search: createSearchParams({ showArchived: value }).toString() });
    };

    return <QuizListPage
        quizzes={quizzes}
        onStartQuiz={onStartQuiz}
        onAddNewQuiz={onAddNewQuiz}
        onEditQuiz={onEditQuiz}
        onDeleteRequest={onDeleteRequest}
        onCloneQuiz={onCloneQuiz}
        onArchiveRequest={onArchiveRequest}
        onStartSmartPractice={onStartSmartPractice}
        showArchived={showArchived}
        setShowArchived={handleSetShowArchived}
        profile={profile}
        onToggleStatus={onToggleStatus}
        onAssignRequest={onAssignRequest}
        toggleBookmark={toggleBookmark}
        onSetVisibilityRequest={onSetVisibilityRequest}
        isBookmarked={isBookmarked}
    />;
};

const StatisticsPageWrapper = ({ results, quizzes, onReviewResult, studentGroups }) => {
    const navigate = useNavigate();
    return <StatisticsPage results={results} onBack={() => navigate('/')} quizzes={quizzes} onReviewResult={onReviewResult} studentGroups={studentGroups} />;
};

const StudentReportPageWrapper = ({ results, onReviewResult, profile, showToast }) => {
    const { userId } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (!profile) return; // Ждем загрузки профиля

        const canView = profile.role === 'admin' || profile.id === userId;

        if (!canView) {
            showToast('Bu səhifəyə baxmaq üçün icazəniz yoxdur.');
            navigate('/');
        }
    }, [profile, userId, navigate, showToast]);

    // Пока идет проверка, ничего не рендерим или показываем загрузчик
    if (!profile || (profile.role !== 'admin' && profile.id !== userId)) {
        return null;
    }

    return <StudentReportPage results={results} onBack={() => navigate('/stats')} onReviewResult={onReviewResult} />;
};

const QuestionBankPageWrapper = ({ questionBank, onSave, onDelete, showToast, onCreateSmartQuiz }) => ( <QuestionBankPage questionBank={questionBank} onSave={onSave} onDelete={onDelete} showToast={showToast} onCreateSmartQuiz={onCreateSmartQuiz} /> );

const LeaderboardPageWrapper = ({ results, profile, allUsers }) => (
    <LeaderboardPage results={results} profile={profile} allUsers={allUsers} />
);

const PastQuizReviewPageWrapper = ({ quizResults, quizzes, profile, fetchComments, postComment, deleteComment }) => {
    const { resultId } = useParams();
    const result = quizResults.find(r => r.id === Number(resultId));
    if (!result) return <div className="text-center text-red-500">Nəticə tapılmadı!</div>;
    const quiz = quizzes.find(q => q.id === result.quizId);
    if (!quiz) return <div className="text-center text-red-500">Test tapılmadı!</div>;
    return <PastQuizReviewPage result={result} quiz={quiz} profile={profile} fetchComments={fetchComments} postComment={postComment} deleteComment={deleteComment} />;
};

const ManualReviewPageWrapper = ({ results, quizzes, onUpdateResult }) => ( <ManualReviewPage results={results} quizzes={quizzes} onUpdateResult={onUpdateResult} /> );

const QuizAnalysisPageWrapper = ({ quizzes, results, allUsers, studentGroups }) => (
    <QuizAnalysisPage quizzes={quizzes} results={results} allUsers={allUsers} studentGroups={studentGroups} />
);

const ArticleEditorPageWrapper = ({ onSave, showToast, ...props }) => {
    const { articleId } = useParams();
    const article = articleId ? props.articles.find(a => a.id === Number(articleId)) : props.editingArticleDraft;

    if (!article) return <div>Yüklənir...</div>;

    return <ArticleEditorPage {...props} article={article} onSave={onSave} showToast={showToast} />;
};

const ArticleViewPageWrapper = ({ articles, quizzes, onStartQuiz, onMarkAsRead, articleProgress, profile, fetchComments, postComment, deleteComment, setPasscodeContent, setIsContentPasscodeModalOpen, showToast, userAnnotations, onSaveAnnotation, onDeleteAnnotation }) => {
    const { articleId } = useParams();
    const navigate = useNavigate();
    const [isAccessGranted, setIsAccessGranted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const article = useMemo(() => articles.find(a => a.id === Number(articleId)), [articles, articleId]);
    const hasAccess = useHasAccess(article, profile);

    useEffect(() => {
        if (article) {
            if (article.passcode) {
                const unlockedItems = JSON.parse(sessionStorage.getItem('unlockedContent') || '{}');
                if (unlockedItems[`article-${article.id}`] === article.passcode) {
                    setIsAccessGranted(true);
                } else {
                    setPasscodeContent({ item: article, type: 'article' });
                    setIsContentPasscodeModalOpen(true);
                    navigate('/articles');
                }
            } else {
                setIsAccessGranted(true);
            }

            if (!hasAccess) {
                showToast('Bu materiala giriş üçün icazəniz yoxdur.');
                navigate('/articles');
            }
        }
        setIsLoading(false);
    }, [article, navigate, setPasscodeContent, setIsContentPasscodeModalOpen, hasAccess, showToast]);

    if (isLoading) {
        return <div className="text-center py-12">Yüklənir...</div>;
    }
    if (!article) {
        return <div className="text-center py-12">Məqalə tapılmadı.</div>;
    }
    if (!isAccessGranted || !hasAccess) {
        return <div className="text-center py-12">Giriş yoxlanılır...</div>;
    }
    return <ArticleViewPage articles={articles} quizzes={quizzes} onStartQuiz={onStartQuiz} onMarkAsRead={onMarkAsRead} articleProgress={articleProgress} profile={profile} fetchComments={fetchComments} postComment={postComment} deleteComment={deleteComment} userAnnotations={userAnnotations} onSaveAnnotation={onSaveAnnotation} onDeleteAnnotation={onDeleteAnnotation} />;
};

const CourseEditorPageWrapper = ({ editingCourseDraft, setEditingCourseDraft, articles, quizzes, onSave, showToast, onAssignRequest }) => {
    if (!editingCourseDraft) return <div className="text-center py-12">Yüklənir...</div>;
    return <CourseEditorPage
        course={editingCourseDraft}
        onDraftChange={setEditingCourseDraft}
        articles={articles}
        quizzes={quizzes}
        onSave={onSave}
        showToast={showToast}
        onAssignRequest={onAssignRequest}
    />;
};

const LearningPathEditorPageWrapper = ({ editingLearningPathDraft, setEditingLearningPathDraft, courses, onSave, showToast }) => {
    if (!editingLearningPathDraft) return <div className="text-center py-12">Yüklənir...</div>;
    return <LearningPathEditorPage
        path={editingLearningPathDraft}
        onDraftChange={setEditingLearningPathDraft}
        courses={courses}
        onSave={onSave}
        showToast={showToast}
    />;
};

const CourseViewPageWrapper = ({ courses, onStartQuiz, articleProgress, quizResults, session, profile, setPasscodeContent, setIsContentPasscodeModalOpen, showToast }) => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [isAccessGranted, setIsAccessGranted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const course = useMemo(() => courses.find(c => c.id === Number(courseId)), [courses, courseId]);
    const hasAccess = useHasAccess(course, profile);

    useEffect(() => {
        if (course) {
            // --- NEW: Check if the course is published ---
            if (!course.is_published && profile?.role !== 'admin') {
                navigate('/courses');
                return;
            }

            if (course.passcode) {
                const unlockedItems = JSON.parse(sessionStorage.getItem('unlockedContent') || '{}');
                if (unlockedItems[`course-${course.id}`] === course.passcode) {
                    setIsAccessGranted(true);
                } else {
                    setPasscodeContent({ item: course, type: 'course' });
                    setIsContentPasscodeModalOpen(true);
                    navigate('/courses');
                }
            } else {
                setIsAccessGranted(true);
            }

            if (!hasAccess) {
                showToast('Bu kursa giriş üçün icazəniz yoxdur.');
                navigate('/courses');
            }
        }
        setIsLoading(false);
    }, [course, navigate, setPasscodeContent, setIsContentPasscodeModalOpen, profile, hasAccess, showToast]);

    if (isLoading) {
        return <div className="text-center py-12">Yüklənir...</div>;
    }
    if (!course) {
        return <div className="text-center py-12">Kurs tapılmadı.</div>;
    }
    if (!isAccessGranted || !hasAccess) {
        return <div className="text-center py-12">Giriş yoxlanılır...</div>;
    }
    return <CourseViewPage courses={courses} onStartQuiz={onStartQuiz} articleProgress={articleProgress} quizResults={quizResults} session={session} profile={profile} />;
};

const LearningPathViewPageWrapper = ({ learningPaths, courses, onStartQuiz, articleProgress, quizResults, session, profile, showToast }) => {
    const { pathId } = useParams();
    const navigate = useNavigate();
    const path = useMemo(() => learningPaths.find(p => p.id === Number(pathId)), [learningPaths, pathId]);
    const hasAccess = useHasAccess(path, profile);

    useEffect(() => {
        if (learningPaths.length > 0 && path && !hasAccess) {
            showToast('Bu tədris yoluna giriş üçün icazəniz yoxdur.');
            navigate('/paths');
        }
    }, [path, hasAccess, navigate, showToast, learningPaths]);

    if (learningPaths.length > 0 && path && !hasAccess) {
        return <div className="text-center py-12">Giriş yoxlanılır...</div>;
    }
    return <LearningPathViewPage learningPaths={learningPaths} courses={courses} onStartQuiz={onStartQuiz} articleProgress={articleProgress} quizResults={quizResults} session={session} profile={profile} />;
};
const BookmarksPageWrapper = ({ bookmarks, quizzes, articles, courses, onNavigate, onStartQuiz, toggleBookmark, isBookmarked }) => (
    <BookmarksPage bookmarks={bookmarks} quizzes={quizzes} articles={articles} courses={courses} onNavigate={onNavigate} onStartQuiz={onStartQuiz} toggleBookmark={toggleBookmark} isBookmarked={isBookmarked} />
);

const PermissionsPageWrapper = ({ quizzes, articles, courses, learningPaths, flashcardDecks, onSetVisibilityRequest }) => (
    <PermissionsPage
        quizzes={quizzes}
        articles={articles}
        courses={courses}
        learningPaths={learningPaths}
        flashcardDecks={flashcardDecks}
        onSetVisibilityRequest={onSetVisibilityRequest}
    />
);

const StudentGroupViewPageWrapper = ({ studentGroups, profile, fetchComments, postComment, deleteComment, showToast }) => {
    const { groupId } = useParams();
    const navigate = useNavigate();

    const group = useMemo(() => studentGroups.find(g => g.id === Number(groupId)), [studentGroups, groupId]);
    const isMember = useMemo(() => {
        if (!group || !profile) return false;
        return group.members.some(m => m.user_id === profile.id) || profile.role === 'admin';
    }, [group, profile]);

    useEffect(() => {
        if (studentGroups.length > 0 && (!group || !isMember)) {
            showToast('Bu qrupa baxmaq üçün üzv olmalısınız.');
            navigate('/my-assignments');
        }
    }, [group, isMember, studentGroups, navigate, showToast]);

    if (!group || !isMember) {
        return <div className="text-center py-12">Yüklənir və ya giriş yoxlanılır...</div>;
    }

    return <StudentGroupViewPage group={group} profile={profile} fetchComments={fetchComments} postComment={postComment} deleteComment={deleteComment} />;
};

const GlobalSearchPageWrapper = ({ quizzes, courses, articles, learningPaths, onStartQuiz, profile }) => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';

    const searchResults = useMemo(() => {
        if (!query.trim()) {
            return { quizzes: [], courses: [], articles: [], paths: [] };
        }

        const term = query.toLowerCase();

        const filterItem = (item) =>
            (item.title && item.title.toLowerCase().includes(term)) ||
            (item.description && item.description.toLowerCase().includes(term));

        const searchedQuizzes = quizzes.filter(q => q.is_published && !q.isArchived && filterItem(q));
        const searchedCourses = courses.filter(c => c.is_published && filterItem(c));
        const searchedArticles = articles.filter(a => a.is_published && filterItem(a));
        const searchedPaths = learningPaths.filter(p => p.is_published && filterItem(p));

        return {
            quizzes: searchedQuizzes, courses: searchedCourses, articles: searchedArticles, paths: searchedPaths,
        };
    }, [query, quizzes, courses, articles, learningPaths]);

    return <GlobalSearchPage searchResults={searchResults} onStartQuiz={onStartQuiz} profile={profile} />;

};
const QuizPageWrapper = ({
                             pageType,
                             editingQuizDraft,
                             reviewPracticeQuiz,
                             customPracticeQuiz,
                             quizzes,
                             lastResult,
                             quizResults,
                             session,
                             profile,
                             existingCategories,
                             uniqueTags,
                             showToast,
                             handleSaveQuiz,
                             handleImportRequest,
                             handleAddFromBankRequest,
                             setEditingQuizDraft,
                             handleSaveAllQuestionsToBank,
                             handleSubmitQuiz,
                             fetchComments,
                             handleStartReviewPractice,
                             postComment,
                             deleteComment,
                             onSaveQuestionToBank,
                             setPasscodeQuiz,
                             setIsPasscodeModalOpen
                         }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isAccessGranted, setIsAccessGranted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const quiz = useMemo(() => {
        if (pageType === 'edit') return editingQuizDraft;
        if (pageType === 'custom_practice') return customPracticeQuiz;
        if (pageType === 'review_practice') return reviewPracticeQuiz;
        return quizzes.find(q => q.id === Number(id));
    }, [id, pageType, quizzes, editingQuizDraft, customPracticeQuiz, reviewPracticeQuiz]);

    const hasAccess = useHasAccess(quiz, profile);

    useEffect(() => {
        if (!['take', 'practice', 'review_practice'].includes(pageType)) {
            setIsAccessGranted(true);
            setIsLoading(false);
            return;
        }

        if (quiz) {
            if (!hasAccess) {
                showToast('Bu testə giriş üçün icazəniz yoxdur.');
                navigate('/quizzes');
                return;
            }

            const now = new Date();

            // --- Time checks for non-admins ---
            if (profile?.role !== 'admin') {
                if (quiz.start_time && now < new Date(quiz.start_time)) {
                    showToast(`Bu test ${new Date(quiz.start_time).toLocaleString()} tarixində başlayacaq.`);
                    navigate('/quizzes');
                    return;
                }
                const deadline = quiz.end_time || quiz.due_date;
                if (deadline && now > new Date(deadline)) {
                    showToast('Bu testin vaxtı bitib.');
                    navigate('/quizzes');
                    return;
                }
            }

            // --- Passcode check ---
            if (quiz.passcode) {
                const unlockedItems = JSON.parse(sessionStorage.getItem('unlockedContent') || '{}');
                if (unlockedItems[`quiz-${quiz.id}`] === quiz.passcode) {
                    setIsAccessGranted(true);
                } else {
                    setPasscodeQuiz(quiz);
                    setIsPasscodeModalOpen(true);
                    navigate('/quizzes');
                }
            } else {
                setIsAccessGranted(true);
            }
        }
        setIsLoading(false);
    }, [quiz, pageType, navigate, setPasscodeQuiz, setIsPasscodeModalOpen, showToast, profile, hasAccess]);

    if (isLoading) {
        return <div className="text-center py-12">Yüklənir...</div>;
    }
    if (!quiz) {
        return <div className="text-center py-12">Test məlumatları hazırlanır...</div>;
    }
    if (pageType !== 'edit' && (!isAccessGranted || !hasAccess)) {
        return <div className="text-center py-12">Giriş yoxlanılır...</div>;
    }

    // If access is granted, render the correct page
    switch (pageType) { 
        case 'edit': return <QuizEditorPage quiz={quiz} onSave={handleSaveQuiz} onBack={() => navigate('/')} showToast={showToast} existingCategories={existingCategories} uniqueTags={uniqueTags} onImportRequest={handleImportRequest} onAddFromBankRequest={handleAddFromBankRequest} onDraftChange={setEditingQuizDraft} onSaveQuestionToBank={onSaveQuestionToBank} onSaveAllQuestionsToBank={handleSaveAllQuestionsToBank} />;
        case 'take': return <TakeQuizPage quiz={quiz} user={profile} onSubmit={(answers, order, time) => handleSubmitQuiz(quiz.id, answers, order, time)} mode="exam" />;
        case 'practice': return <TakeQuizPage quiz={quiz} user={{ username: 'Tələbə' }} mode="practice" />;
        case 'review_practice': return <TakeQuizPage quiz={quiz} user={profile} mode="practice" />;
        case 'custom_practice': return <TakeQuizPage quiz={quiz} user={profile} mode="practice" />;
        case 'result': return <QuizResultPage lastResult={lastResult} onBack={() => navigate('/')} onReview={() => navigate(`/quiz/${id}/review`)} onReviewPractice={handleStartReviewPractice} />;
        case 'review':
            const resultForReview = lastResult || quizResults.find(r => r.quizId === quiz.id && r.user_id === session.user.id);
            if (!resultForReview) return <div className="text-center text-red-500">Nəticə tapılmadı!</div>;
            return <QuizReviewPage quiz={quiz} result={resultForReview} onBack={() => navigate(-1)} profile={profile} fetchComments={fetchComments} postComment={postComment} deleteComment={deleteComment} />;
        default: return navigate('/');
    }
};

export default function App() {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [quizzes, setQuizzes] = useState([]);
    const [questionBank, setQuestionBank] = useState([]);
    const [quizResults, setQuizResults] = useState([]);
    const [articles, setArticles] = useState([]);
    const [courses, setCourses] = useState([]);
    const [learningPaths, setLearningPaths] = useState([]);
    const [flashcardDecks, setFlashcardDecks] = useState([]);
    const [userFlashcardReviews, setUserFlashcardReviews] = useState([]);
    const [editingFlashcardDeckDraft, setEditingFlashcardDeckDraft] = useState(null);
    const [studentGroups, setStudentGroups] = useState([]);
    const [editingStudentGroupDraft, setEditingStudentGroupDraft] = useState(null);
    const [userAssignments, setUserAssignments] = useState([]);
    const [articleProgress, setArticleProgress] = useState([]);
    const [completedCourses, setCompletedCourses] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [reviewPracticeQuiz, setReviewPracticeQuiz] = useState(null);
    const [customPracticeQuiz, setCustomPracticeQuiz] = useState(null);
    const [editingCourseDraft, setEditingCourseDraft] = useState(null);
    const [editingLearningPathDraft, setEditingLearningPathDraft] = useState(null);
    const [editingQuizDraft, setEditingQuizDraft] = useState(null);
    const [editingArticleDraft, setEditingArticleDraft] = useState(null);
    const [userAchievements, setUserAchievements] = useState([]);
    const [userAnnotations, setUserAnnotations] = useState([]);
    const [allAchievements, setAllAchievements] = useState([]);
    const [allUsers, setAllUsers] = useState([]); // For admin panel
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [nextCourseRecommendation, setNextCourseRecommendation] = useState(null);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [assignmentData, setAssignmentData] = useState({ itemId: null, itemTitle: '', itemType: '' });
    const [allQuests, setAllQuests] = useState([]);
    const [isVisibilityModalOpen, setIsVisibilityModalOpen] = useState(false); // State for the new modal
    const [visibilityData, setVisibilityData] = useState({ itemId: null, itemTitle: '', itemType: '', currentVisibility: 'public' });

    const [userQuests, setUserQuests] = useState([]);

    const [lastResult, setLastResult] = useState(null);
    const [toast, setToast] = useState({ message: '', isVisible: false });

    const showToast = useCallback((message) => {
        setToast({ message, isVisible: true });
        setTimeout(() => setToast({ message: '', isVisible: false }), 3000);
    }, []);

    const { bookmarks, toggleBookmark, isBookmarked } = useBookmarks(session, showToast);

    const [quizToStartId, setQuizToStartId] = useState(null);
    const [isModeSelectionModalOpen, setIsModeSelectionModalOpen] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, idToDelete: null, type: null });
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isAddFromBankModalOpen, setIsAddFromBankModalOpen] = useState(false);
    const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
    const [passcodeQuiz, setPasscodeQuiz] = useState(null);
    const [isContentPasscodeModalOpen, setIsContentPasscodeModalOpen] = useState(false);
    const [passcodeContent, setPasscodeContent] = useState(null);

    const navigate = useNavigate();

    const mobileMenuRef = useRef(null);
    useOnClickOutside(mobileMenuRef, () => setIsMobileMenuOpen(false));

    const adminDashboardStats = useMemo(() => {
        if (profile?.role !== 'admin') {
            return null;
        }

        // 1. Количество тестов на ручной проверке
        const pendingReviewCount = quizResults.filter(r => r.status === 'pending_review').length;

        // 2. Количество новых пользователей за сегодня
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newUsersTodayCount = allUsers.filter(u => new Date(u.created_at) >= today).length;

        // 3. Общее количество пользователей
        const totalUsersCount = allUsers.length;

        // 4. Топ-3 самых активных студента за последнюю неделю
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const recentResults = quizResults.filter(r => new Date(r.created_at) >= oneWeekAgo);

        const userActivity = recentResults.reduce((acc, result) => {
            acc[result.user_id] = (acc[result.user_id] || 0) + 1;
            return acc;
        }, {});

        const topStudents = Object.entries(userActivity)
            .sort(([, countA], [, countB]) => countB - countA)
            .slice(0, 3)
            .map(([userId, quizCount]) => {
                const user = allUsers.find(u => u.id === userId);
                return { name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Неизвестный пользователь', quizCount, userId };
            });

        return { pendingReviewCount, newUsersTodayCount, totalUsersCount, topStudents };
    }, [quizResults, allUsers, profile]);

    const handleAddExperience = useCallback(async (pointsToAdd) => {
        if (!profile || pointsToAdd <= 0) return;

        const newExperience = (profile.experience_points || 0) + pointsToAdd;

        const { data: updatedProfile, error } = await supabase
            .from('profiles')
            .update({ experience_points: newExperience })
            .eq('id', profile.id)
            .select()
            .single();

        if (error) {
            showToast('Təcrübə xalı əlavə edilərkən xəta baş verdi.');
        } else {
            setProfile(updatedProfile);
            showToast(`+${pointsToAdd} təcrübə xalı qazandınız!`);
        }
    }, [profile, showToast]);

    const handleQuestProgress = useCallback(async (goalType) => {
        if (!session?.user || !userQuests || userQuests.length === 0) return;

        const questToUpdate = userQuests
            .filter(uq =>
                uq.quests.goal_type === goalType &&
                uq.status === 'in_progress'
            )
            .sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at))[0];

        if (!questToUpdate) return;

        const newProgress = questToUpdate.progress + 1;
        const questDefinition = questToUpdate.quests;

        if (newProgress >= questDefinition.goal_value) {
            const { data, error } = await supabase
                .from('user_quests')
                .update({ progress: newProgress, status: 'completed', completed_at: new Date().toISOString() })
                .eq('id', questToUpdate.id)
                .select('*, quests(*)')
                .single();

            if (error) {
                console.error('Error completing quest:', error);
            } else {
                showToast(`Tapşırıq tamamlandı: "${questDefinition.title}"!`);
                await handleAddExperience(questDefinition.reward_xp);
                setUserQuests(prev => prev.map(uq => uq.id === data.id ? data : uq));
            }
        } else {
            const { data, error } = await supabase
                .from('user_quests')
                .update({ progress: newProgress })
                .eq('id', questToUpdate.id)
                .select('*, quests(*)')
                .single();

            if (error) {
                console.error('Error updating quest progress:', error);
            } else {
                setUserQuests(prev => prev.map(uq => uq.id === data.id ? data : uq));
            }
        }
    }, [session, userQuests, handleAddExperience, showToast]);

    const handleCourseCompletionCheck = useCallback(async (courseId) => {
        if (!profile || !courseId || completedCourses.some(c => c.course_id === courseId)) {
            return;
        }

        const course = courses.find(c => c.id === courseId);
        if (!course || !course.course_items || course.course_items.length === 0) {
            return;
        }

        const articleIdsInCourse = new Set(course.course_items.filter(i => i.item_type === 'article').map(i => i.article_id));
        const quizIdsInCourse = new Set(course.course_items.filter(i => i.item_type === 'quiz').map(i => i.quiz_id));

        const completedArticleIds = new Set(articleProgress.map(p => p.article_id));
        const completedQuizIds = new Set(quizResults.filter(r => r.status === 'completed').map(r => r.quizId));

        const allArticlesRead = [...articleIdsInCourse].every(id => completedArticleIds.has(id));
        const allQuizzesDone = [...quizIdsInCourse].every(id => completedQuizIds.has(id));

        if (allArticlesRead && allQuizzesDone) {
            const { data, error } = await supabase
                .from('user_course_completions')
                .insert({ user_id: profile.id, course_id: courseId })
                .select()
                .single();

            if (!error && data) {
                setCompletedCourses(prev => [...prev, data]);
                showToast(`Təbriklər! "${course.title}" kursunu tamamladınız!`);
                await handleAddExperience(50); // Award 50 XP for course completion
                await handleQuestProgress('COMPLETE_COURSES');

                // --- NEW RECOMMENDATION LOGIC ---
                const parentPath = learningPaths.find(p => p.path_items.some(item => item.course_id === courseId));
                if (parentPath) {
                    const sortedItems = [...parentPath.path_items].sort((a, b) => a.order - b.order);
                    const currentItemIndex = sortedItems.findIndex(item => item.course_id === courseId);

                    if (currentItemIndex !== -1 && currentItemIndex < sortedItems.length - 1) {
                        const nextItem = sortedItems[currentItemIndex + 1];
                        const nextCourse = courses.find(c => c.id === nextItem.course_id);
                        if (nextCourse) {
                            setNextCourseRecommendation({
                                pathTitle: parentPath.title,
                                courseTitle: nextCourse.title,
                                courseId: nextCourse.id
                            });
                        }
                    }
                }
            }
        }
    }, [profile, completedCourses, courses, articleProgress, quizResults, handleAddExperience, showToast, learningPaths, handleQuestProgress]);

    const fetchNotifications = useCallback(async () => {
        if (session?.user) {
            const { data: notificationsData, error } = await supabase.from('notifications').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
            if (error) {
                console.error("Error fetching notifications:", error);
                showToast("Bildirişlər yüklənərkən xəta baş verdi.");
            } else {
                setNotifications(notificationsData || []);
            }
        }
    }, [session, showToast]);

    const checkAndAssignQuests = useCallback(async () => {
        if (!session?.user) return;

        const getStartOfWeek = (date) => {
            const d = new Date(date);
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            d.setHours(0, 0, 0, 0);
            return new Date(d.setDate(diff)).toISOString().slice(0, 10);
        };

        const { data: activeQuests, error: questsError } = await supabase
            .from('quests')
            .select('*')
            .eq('is_active', true);

        if (questsError) {
            console.error('Error fetching quests:', questsError);
            return;
        }
        if (!activeQuests || activeQuests.length === 0) {
            setUserQuests([]);
            return;
        }

        const today = new Date().toISOString().slice(0, 10);
        const startOfWeek = getStartOfWeek(new Date());

        const { data: recentUserQuests, error: userQuestsError } = await supabase
            .from('user_quests')
            .select('quest_id, assigned_at')
            .eq('user_id', session.user.id)
            .gte('assigned_at', startOfWeek);

        if (userQuestsError) {
            console.error('Error fetching recent user quests:', userQuestsError);
            return;
        }

        const assignedDailyQuestIds = new Set(recentUserQuests.filter(q => q.assigned_at === today).map(q => q.quest_id));
        const assignedWeeklyQuestIds = new Set(recentUserQuests.filter(q => q.assigned_at === startOfWeek).map(q => q.quest_id));

        const questsToAssign = [];

        for (const quest of activeQuests) {
            if (quest.type === 'DAILY' && !assignedDailyQuestIds.has(quest.id)) {
                questsToAssign.push({ user_id: session.user.id, quest_id: quest.id, assigned_at: today });
            } else if (quest.type === 'WEEKLY' && !assignedWeeklyQuestIds.has(quest.id)) {
                questsToAssign.push({ user_id: session.user.id, quest_id: quest.id, assigned_at: startOfWeek });
            }
        }

        if (questsToAssign.length > 0) {
            const { error: insertError } = await supabase.from('user_quests').insert(questsToAssign);
            if (insertError) {
                console.error('Error assigning new quests:', insertError);
            }
        }

        const { data: finalUserQuests, error: finalFetchError } = await supabase
            .from('user_quests')
            .select('*, quests(*)')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (finalFetchError) {
            console.error('Error fetching final user quests:', finalFetchError);
        } else {
            setUserQuests(finalUserQuests || []);
        }

    }, [session]);

    useEffect(() => {
        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setIsAuthLoading(false);
        };

        fetchSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const fetchUserData = async () => {
            if (session?.user) {
                let { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

                if (profileError) {
                    showToast('Profil yüklənərkən xəta baş verdi.');
                    setProfile(null);
                } else {
                    // --- GAMIFICATION: Daily Streak Logic ---
                    const today = new Date();
                    const lastLoginDate = profileData.last_login ? new Date(profileData.last_login) : null;
                    let needsUpdate = false;
                    let updates = {};

                    if (!lastLoginDate) { // First login ever
                        needsUpdate = true;
                        updates = { daily_streak: 1, last_login: today.toISOString() };
                        showToast('Xoş gəlmisiniz! İlk günlük girişiniz üçün +1 seriya qazandınız!');
                    } else {
                        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        const lastLoginMidnight = new Date(lastLoginDate.getFullYear(), lastLoginDate.getMonth(), lastLoginDate.getDate());
                        const diffDays = Math.round((todayMidnight - lastLoginMidnight) / (1000 * 60 * 60 * 24));

                        if (diffDays === 1) { // Consecutive day
                            needsUpdate = true;
                            const newStreak = (profileData.daily_streak || 0) + 1;
                            updates = { daily_streak: newStreak, last_login: today.toISOString() };
                            showToast(`Günlük seriyanız: ${newStreak} gün! Davam edin!`);
                        } else if (diffDays > 1) { // Streak broken
                            needsUpdate = true;
                            updates = { daily_streak: 1, last_login: today.toISOString() };
                            showToast('Günlük seriyanız sıfırlandı. Yeni seriyaya başlayın!');
                        }
                    }

                    if (needsUpdate) {
                        const { data: updatedProfile, error: updateError } = await supabase
                            .from('profiles')
                            .update(updates)
                            .eq('id', session.user.id)
                            .select()
                            .single();

                        if (!updateError) {
                            profileData = updatedProfile; // Use the updated profile for the rest of this session
                        }
                    }
                    // --- End of Gamification Logic ---

                    // NEW: Fetch user's group memberships and add to profile
                    const { data: memberships, error: membershipError } = await supabase
                        .from('group_memberships')
                        .select('group_id')
                        .eq('user_id', session.user.id);

                    if (membershipError) {
                        console.error("Error fetching group memberships:", membershipError);
                    } else {
                        profileData.groups = memberships.map(m => m.group_id);
                    }

                    setProfile(profileData);
                }
                const { data: usersData } = await supabase.from('profiles').select('*');
                setAllUsers(usersData || []);

                let quizzesQuery = supabase.from('quizzes').select('*');
                if (profileData?.role !== 'admin') {
                    quizzesQuery = quizzesQuery.eq('is_published', true);
                }
                const { data: quizzesData } = await quizzesQuery.order('id', { ascending: false });
                setQuizzes(quizzesData || []);

                const { data: questionBankData } = await supabase.from('question_bank').select('*').order('created_at', { ascending: false });
                setQuestionBank(questionBankData || []);

                const { data: resultsData } = await supabase.from('quiz_results').select('*').order('created_at', { ascending: false });
                setQuizResults(resultsData || []);

                let articlesQuery = supabase.from('articles').select('*, article_quizzes(quiz_id)');
                if (profileData?.role !== 'admin') {
                    articlesQuery = articlesQuery.eq('is_published', true);
                }
                const { data: articlesData } = await articlesQuery.order('created_at', { ascending: false });
                setArticles(articlesData || []);

                let coursesQuery = supabase.from('courses').select('*, course_items(*, articles(title), quizzes(title))');
                if (profileData?.role !== 'admin') {
                    coursesQuery = coursesQuery.eq('is_published', true);
                }
                const { data: coursesData } = await coursesQuery.order('created_at', { ascending: false });
                setCourses(coursesData || []);

                let pathsQuery = supabase.from('learning_paths').select('*, path_items(*, courses(title))');
                if (profileData?.role !== 'admin') {
                    pathsQuery = pathsQuery.eq('is_published', true);
                }
                const { data: pathsData } = await pathsQuery.order('created_at', { ascending: false });
                setLearningPaths(pathsData || []);

                const { data: decksData } = await supabase.from('flashcard_decks').select('*, flashcards(*)').order('created_at', { ascending: false });
                setFlashcardDecks(decksData || []);

                const { data: reviewsData } = await supabase.from('user_flashcard_reviews').select('*').eq('user_id', session.user.id);
                setUserFlashcardReviews(reviewsData || []);

                const { data: groupsData } = await supabase.from('student_groups').select('*, members:group_memberships(*, profiles(*))');
                setStudentGroups(groupsData || []);

                // Fetch assignments based on user role
                if (profileData.role === 'admin') {
                    // Admins see all assignments
                    const { data: assignmentsData } = await supabase.from('assignments').select('*');
                    setUserAssignments(assignmentsData || []);
                } else {
                    // Students see assignments for them or their groups
                    const { data: userGroupMemberships, error: groupsError } = await supabase
                        .from('group_memberships')
                        .select('group_id')
                        .eq('user_id', session.user.id);

                    if (groupsError) {
                        showToast('Qrup tapşırıqları yüklənərkən xəta baş verdi.');
                    }

                    const userGroupIds = userGroupMemberships ? userGroupMemberships.map(m => m.group_id) : [];

                    const filter = userGroupIds.length > 0
                        ? `assigned_to_user_id.eq.${session.user.id},assigned_to_group_id.in.(${userGroupIds.join(',')})`
                        : `assigned_to_user_id.eq.${session.user.id}`;

                    const { data: assignmentsData } = await supabase.from('assignments').select('*').or(filter);
                    setUserAssignments(assignmentsData || []);
                }

                const { data: progressData } = await supabase.from('user_article_progress').select('article_id').eq('user_id', session.user.id);
                setArticleProgress(progressData || []);

                const { data: completionsData } = await supabase.from('user_course_completions').select('course_id').eq('user_id', session.user.id);
                setCompletedCourses(completionsData || []);

                await fetchNotifications();
                await checkAndAssignQuests();

                const { data: achievementsData } = await supabase.from('user_achievements').select('*, achievements(*)').eq('user_id', session.user.id);
                setUserAchievements(achievementsData || []);

                const { data: allAchievementsData } = await supabase.from('achievements').select('*');
                setAllAchievements(allAchievementsData || []);

                const { data: allQuestsData } = await supabase.from('quests').select('*').order('created_at', { ascending: false });
                setAllQuests(allQuestsData || []);

                const { data: annotationsData } = await supabase.from('user_annotations').select('*').eq('user_id', session.user.id);
                setUserAnnotations(annotationsData || []);

            } else {
                setProfile(null);
                setQuizzes([]);
                setQuestionBank([]);
                setQuizResults([]);
                setUserAchievements([]);
                setAllAchievements([]);
                setAllUsers([]);
                setArticles([]);
                setArticleProgress([]);
                setCourses([]);
                setCompletedCourses([]);
                setNotifications([]);
                setLearningPaths([]);
                setFlashcardDecks([]);
                setUserFlashcardReviews([]);
                setStudentGroups([]);
                setUserAssignments([]);
                setUserQuests([]);
                setAllQuests([]);
                setUserAnnotations([]);
            }
        };

        if (!isAuthLoading) {
            fetchUserData();
        }
    }, [session, isAuthLoading, fetchNotifications, showToast, checkAndAssignQuests]);

    // --- REALTIME NOTIFICATIONS --- //
    useEffect(() => {
        if (!session?.user?.id) return;

        const channel = supabase
            .channel(`public:notifications:user_id=eq.${session.user.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
                (payload) => {
                    setNotifications(prev => [payload.new, ...prev]);
                    showToast('Yeni bildirişiniz var!');
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session, showToast]);

    const existingQuizCategories = useMemo(() => {
        const categories = new Set(quizzes.map(q => q.category).filter(Boolean));
        return Array.from(categories).sort();
    }, [quizzes]);

    const existingArticleCategories = useMemo(() => {
        const categories = new Set(articles.map(a => a.category).filter(Boolean));
        return Array.from(categories).sort();
    }, [articles]);

    const uniqueBankTags = useMemo(() => {
        const allTags = new Set();
        questionBank.forEach(q => {
            if (q.tags && Array.isArray(q.tags)) {
                q.tags.forEach(tag => allTags.add(tag));
            }
        });
        return Array.from(allTags).sort();
    }, [questionBank]);

    const dueFlashcardsCount = useMemo(() => {
        if (!flashcardDecks || !userFlashcardReviews || !session) return 0;

        const now = new Date().toISOString();

        const allPublishedCards = flashcardDecks
            .filter(deck => deck.is_published)
            .flatMap(deck => deck.flashcards || []);

        if (allPublishedCards.length === 0) return 0;

        const reviewsMap = new Map(userFlashcardReviews.map(review => [review.card_id, review]));

        let dueCount = 0;
        allPublishedCards.forEach(card => {
            const review = reviewsMap.get(card.id);
            // Карточка "готова", если по ней нет отзыва (новая) или дата следующего повторения уже наступила
            if (!review || (review.next_review_at && review.next_review_at <= now)) {
                dueCount++;
            }
        });

        return dueCount;
    }, [flashcardDecks, userFlashcardReviews, session]);

    const activeAssignmentsCount = useMemo(() => {
        if (!userAssignments || !quizResults || !completedCourses || !session) return 0;

        const completedQuizIds = new Set((quizResults || []).filter(r => r.user_id === session.user.id).map(r => r.quizId));
        const completedCourseIds = new Set((completedCourses || []).map(c => c.course_id));

        return userAssignments.filter(assignment => {
            let isCompleted = false;
            if (assignment.item_type === 'quiz') {
                isCompleted = completedQuizIds.has(assignment.item_id);
            } else if (assignment.item_type === 'course') {
                isCompleted = completedCourseIds.has(assignment.item_id);
            }
            return !isCompleted;
        }).length;
    }, [userAssignments, quizResults, completedCourses, session]);

    const checkAdmin = () => {
        if (profile?.role !== 'admin') {
            showToast('Bu əməliyyat üçün admin hüququ tələb olunur.');
            return false;
        }
        return true;
    };

    const handleAssignRequest = (itemId, itemTitle, itemType) => {
        setAssignmentData({ itemId, itemTitle, itemType });
        setIsAssignmentModalOpen(true);
    };

    const handleCreateAssignment = async ({ assignToType, assignToIds, dueDate }) => {
        if (!checkAdmin()) return;

        const assignmentsToCreate = assignToIds.map(id => ({
            assigned_by: session.user.id,
            item_id: assignmentData.itemId,
            item_type: assignmentData.itemType,
            due_date: dueDate,
            [assignToType === 'user' ? 'assigned_to_user_id' : 'assigned_to_group_id']: id,
        }));

        const { data, error } = await supabase.from('assignments').insert(assignmentsToCreate).select();

        if (error) {
            showToast(`Tapşırıq təyin edilərkən xəta: ${error.message}`);
        } else {
            showToast(`"${assignmentData.itemTitle}" ${assignToIds.length} nəfərə/qrupa uğurla təyin edildi.`);
            setIsAssignmentModalOpen(false);

            // Send notifications in a loop
            for (const assignment of data) {
                const { error: rpcError } = await supabase.rpc('create_assignment_notification', {
                    assignment_id_in: assignment.id,
                    assigned_by_user_id_in: session.user.id,
                    target_user_id_in: assignToType === 'user' ? assignment.assigned_to_user_id : null,
                    target_group_id_in: assignToType === 'group' ? Number(assignment.assigned_to_group_id) : null,
                    item_title_in: assignmentData.itemTitle
                });

                if (rpcError) {
                    console.error('Error sending notification for assignment:', assignment.id, rpcError);
                }
            }
        }
    };

    const handleSetVisibilityRequest = (itemId, itemTitle, itemType, currentVisibility) => {
        if (!checkAdmin()) return;
        setVisibilityData({ itemId, itemTitle, itemType, currentVisibility });
        setIsVisibilityModalOpen(true);
    };

    const handleSetVisibility = async ({ visibility, accessList }) => {
        if (!checkAdmin()) return;

        let userIds = null;
        let groupIds = null;

        if (visibility === 'restricted' && accessList) {
            if (accessList.type === 'user') {
                userIds = accessList.ids;
            } else if (accessList.type === 'group') {
                // Убедимся, что ID групп - это числа
                groupIds = accessList.ids.map(id => parseInt(id, 10));
            }
        }

        const { error } = await supabase.rpc('update_content_permissions', {
            p_item_id: visibilityData.itemId,
            p_item_type: visibilityData.itemType,
            p_visibility: visibility,
            p_user_ids: userIds,
            p_group_ids: groupIds
        });

        if (error) {
            showToast(`Giriş tənzimləmələri saxlanılarkən xəta: ${error.message}`);
        } else {
            showToast('Giriş tənzimləmələri uğurla yadda saxlandı!');
            setIsVisibilityModalOpen(false);

            // Обновляем локальное состояние для немедленного отображения изменений
            const stateSetterMap = {
                course: setCourses,
                article: setArticles,
                quiz: setQuizzes,
                flashcard_deck: setFlashcardDecks,
                learning_path: setLearningPaths
            };

            const setState = stateSetterMap[visibilityData.itemType];
            if (setState) {
                setState(prev => prev.map(item =>
                    item.id === visibilityData.itemId
                        ? { ...item, visibility, visible_to_users: userIds, visible_to_groups: groupIds }
                        : item
                ));
            }
        }
    };

    const handleAddNewQuizRequest = async () => {
        if (!checkAdmin()) return;
        const { data: newQuiz, error } = await supabase.from('quizzes').insert({ title: 'Yeni Test', questions: [], is_published: false }).select().single();
        if (error) {
            showToast(`Test yaradılarkən xəta: ${error.message}`);
        } else if (newQuiz) {
            setQuizzes(prev => [newQuiz, ...prev]);
            setEditingQuizDraft(newQuiz);
            navigate(`/quiz/${newQuiz.id}/edit`);
            showToast('Yeni test qaralama kimi yaradıldı!');
        }
    };

    const handleEditQuizRequest = (quizId) => {
        if (checkAdmin()) {
            const quizToEdit = quizzes.find(q => q.id === quizId);
            if (quizToEdit) {
                setEditingQuizDraft(quizToEdit);
                navigate(`/quiz/${quizId}/edit`);
            }
        }
    };

    const handleDeleteRequest = (id, type) => {
        if (!checkAdmin()) return;
        setDeleteModal({ isOpen: true, idToDelete: id, type: type });
    };

    const handleCloneQuizRequest = async (quizId) => {
        if (!checkAdmin()) return;
        const { data: originalQuiz, error: fetchError } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
        if (fetchError || !originalQuiz) {
            showToast('Kopyalanacaq test tapılmadı.');
            return;
        }
        const { id, created_at, ...quizToClone } = originalQuiz;
        quizToClone.title = `${quizToClone.title} (kopiya)`;
        quizToClone.is_published = false; // Cloned quizzes are drafts by default
        const { data: clonedQuiz, error: cloneError } = await supabase.from('quizzes').insert(quizToClone).select().single();
        if (cloneError) {
            showToast(`Test kopyalanarkən xəta: ${cloneError.message}`);
        } else if (clonedQuiz) {
            setQuizzes(prev => [clonedQuiz, ...prev]);
            setEditingQuizDraft(clonedQuiz);
            navigate(`/quiz/${clonedQuiz.id}/edit`);
            showToast('Test uğurla kopyalandı və qaralama kimi saxlanıldı!');
        }
    };

    const handleArchiveQuizRequest = async (quizId, isArchived) => {
        if (!checkAdmin()) return;
        const { data: updatedQuiz, error } = await supabase.from('quizzes').update({ isArchived }).eq('id', quizId).select().single();
        if (error) {
            showToast(`Test arxivlənərkən xəta: ${error.message}`);
        } else if (updatedQuiz) {
            setQuizzes(prev => prev.map(q => q.id === quizId ? updatedQuiz : q));
            showToast(isArchived ? 'Test arxivə əlavə edildi.' : 'Test arxivdən çıxarıldı.');
        }
    };

    const handleToggleQuizStatus = async (quizId, newStatus) => {
        if (!checkAdmin()) return;
        const { data, error } = await supabase.from('quizzes').update({ is_published: newStatus }).eq('id', quizId).select().single();
        if (error) {
            showToast('Statusu dəyişərkən xəta baş verdi.');
        } else {
            setQuizzes(prev => prev.map(a => a.id === quizId ? data : a));
            showToast(newStatus ? 'Test dərc edildi!' : 'Test qaralama kimi saxlanıldı.');
        }
    };

    const handleQuestionBankRequest = () => {
        if (checkAdmin()) {
            navigate('/question-bank');
        }
    };

    const handleSaveQuiz = async (quizToSave) => {
        const { id, ...quizDataToUpdate } = quizToSave;
        const { data, error } = await supabase.from('quizzes').update(quizDataToUpdate).eq('id', id).select().single();
        if (error) {
            showToast(`Testi yeniləyərkən xəta: ${error.message}`);
        } else if (data) {
            setQuizzes(prevQuizzes => prevQuizzes.map(q => (q.id === data.id ? data : q)));
            setEditingQuizDraft(null);
            showToast("Test uğurla yeniləndi!");
            navigate('/');
        }
    };

    const confirmDelete = async () => {
        const { idToDelete, type } = deleteModal;
        let error;
        if (type === 'quiz') {
            const { error: quizError } = await supabase.from('quizzes').delete().eq('id', idToDelete);
            error = quizError;
            if (!error) setQuizzes(prev => prev.filter(q => q.id !== idToDelete));
        } else if (type === 'article') {
            const { error: articleError } = await supabase.from('articles').delete().eq('id', idToDelete);
            error = articleError;
            if (!error) setArticles(prev => prev.filter(a => a.id !== idToDelete));
        } else if (type === 'course') {
            const { error: courseError } = await supabase.from('courses').delete().eq('id', idToDelete);
            error = courseError;
            if (!error) setCourses(prev => prev.filter(c => c.id !== idToDelete));
        } else if (type === 'path') {
            const { error: pathError } = await supabase.from('learning_paths').delete().eq('id', idToDelete);
            error = pathError;
            if (!error) setLearningPaths(prev => prev.filter(p => p.id !== idToDelete));
        } else if (type === 'deck') {
            const { error: deckError } = await supabase.from('flashcard_decks').delete().eq('id', idToDelete);
            error = deckError;
            if (!error) setFlashcardDecks(prev => prev.filter(d => d.id !== idToDelete));
        } else if (type === 'group') {
            const { error: groupError } = await supabase.from('student_groups').delete().eq('id', idToDelete);
            error = groupError;
            if (!error) setStudentGroups(prev => prev.filter(g => g.id !== idToDelete));
        } else if (type === 'quest') {
            const { error: questError } = await supabase.from('quests').delete().eq('id', idToDelete);
            error = questError;
            if (!error) setAllQuests(prev => prev.filter(q => q.id !== idToDelete));
        }

        if (error) {
            showToast(`${type} silərkən xəta: ${error.message}`);
        } else {
            showToast(`${type} uğurla silindi!`);
        }
        setDeleteModal({ isOpen: false, idToDelete: null, type: null });
    };

    const handleSaveQuest = async (questData) => {
        if (!checkAdmin()) return;

        const { id, ...questToSave } = questData;

        if (id) {
            // Update existing quest
            const { data, error } = await supabase.from('quests').update(questToSave).eq('id', id).select().single();
            if (error) {
                showToast(`Tapşırıq yenilənərkən xəta: ${error.message}`);
            } else {
                setAllQuests(prev => prev.map(q => q.id === id ? data : q));
                showToast('Tapşırıq uğurla yeniləndi!');
            }
        } else {
            // Create new quest
            const { data, error } = await supabase.from('quests').insert(questToSave).select().single();
            if (error) {
                showToast(`Tapşırıq yaradılarkən xəta: ${error.message}`);
            } else {
                setAllQuests(prev => [data, ...prev]);
                showToast('Yeni tapşırıq yaradıldı!');
            }
        }
    };

    const handleSaveQuestionToBank = async (question) => {
        const { id, ...questionData } = question;
        if (id && typeof id === 'number') {
            const { data, error } = await supabase.from('question_bank').update(questionData).eq('id', id).select().single();
            if (error) {
                showToast(`Sualı yeniləyərkən xəta: ${error.message}`);
            } else {
                setQuestionBank(prev => prev.map(q => q.id === id ? data : q));
                showToast('Sual uğurla yeniləndi!');
            }
        } else {
            const { data, error } = await supabase.from('question_bank').insert(questionData).select().single();
            if (error) {
                showToast(`Sualı əlavə edərkən xəta: ${error.message}`);
            } else {
                setQuestionBank(prev => [data, ...prev]);
                showToast('Sual banka əlavə edildi!');
            }
        }
    };

    const handleDeleteQuestionFromBank = async (questionId) => {
        const { error } = await supabase.from('question_bank').delete().eq('id', questionId);
        if (error) {
            showToast(`Sualı silərkən xəta: ${error.message}`);
        } else {
            setQuestionBank(prev => prev.filter(q => q.id !== questionId));
            showToast('Sual bankdan silindi.');
        }
    };

    const handleSaveQuestionFromEditorToBank = async (question) => {
        if (!checkAdmin()) return;

        // We don't want to save the temporary ID from the quiz draft
        const { id, ...questionToSave } = question;

        // Check for duplicates in the bank based on question text and options
        // We stringify the options to create a comparable value.
        const optionsString = JSON.stringify((questionToSave.options || []).sort());

        const { data: existing, error: checkError } = await supabase
            .from('question_bank')
            .select('id, options')
            .eq('text', questionToSave.text)

        if (checkError) {
            showToast(`Banka yoxlayarkən xəta: ${checkError.message}`);
            return;
        }

        // Now, check if any of the returned questions also have the same options.
        if (existing && existing.length > 0) {
            const isTrulyDuplicate = existing.some(q => JSON.stringify((q.options || []).sort()) === optionsString);
            if (isTrulyDuplicate) {
                showToast('Bu sual (eyni mətn və variantlarla) artıq bankda mövcuddur.');
                return;
            }
        }

        const { data, error } = await supabase.from('question_bank').insert(questionToSave).select().single();
        if (error) {
            showToast(`Sualı banka əlavə edərkən xəta: ${error.message}`);
        } else {
            setQuestionBank(prev => [data, ...prev]);
            showToast('Sual uğurla banka əlavə edildi!');
        }
    };

    const handleSaveAllQuestionsToBank = async (questions) => {
        if (!checkAdmin()) return;
        if (!questions || questions.length === 0) {
            showToast("Banka əlavə etmək üçün heç bir sual yoxdur.");
            return;
        }

        showToast("Suallar banka əlavə edilir...");

        let addedCount = 0;
        let skippedCount = 0;

        // Get all existing question texts from the bank to avoid multiple DB queries inside the loop.
        const { data: existingQuestions, error: fetchError } = await supabase
            .from('question_bank')
            .select('text, options');

        if (fetchError) {
            showToast(`Bankdakı sualları yoxlayarkən xəta: ${fetchError.message}`);
            return;
        }

        // Create a set of unique identifiers based on both text and sorted options.
        const existingQuestionSet = new Set(
            existingQuestions.map(q => `${q.text}::${JSON.stringify((q.options || []).sort())}`)
        );
        const questionsToInsert = [];

        for (const question of questions) {
            const { id, ...questionToSave } = question; // Remove temporary ID
            const uniqueIdentifier = `${questionToSave.text}::${JSON.stringify((questionToSave.options || []).sort())}`;

            if (!existingQuestionSet.has(uniqueIdentifier)) {
                questionsToInsert.push(questionToSave);
                // Add to the set to avoid adding duplicates from the same batch
                existingQuestionSet.add(uniqueIdentifier);
            } else {
                skippedCount++;
            }
        }

        if (questionsToInsert.length > 0) {
            const { data, error } = await supabase.from('question_bank').insert(questionsToInsert).select();
            if (error) {
                showToast(`Sualları banka əlavə edərkən xəta: ${error.message}`);
            } else {
                addedCount = data.length;
                setQuestionBank(prev => [...data, ...prev]);
            }
        }

        const summaryMessage = `${addedCount} sual uğurla banka əlavə edildi. ${skippedCount} sual (dublikat olduğu üçün) ötürüldü.`;
        showToast(summaryMessage);
    };
    const handleCreateSmartQuiz = (title, criteria) => {
        if (!checkAdmin()) return;

        let selectedQuestions = [];
        let errors = [];

        criteria.forEach(crit => {
            const availableQuestions = questionBank.filter(q => (q.tags || []).includes(crit.tag));
            if (availableQuestions.length < crit.count) {
                errors.push(`"${crit.tag}" teqi üçün kifayət qədər sual yoxdur (tələb olunan: ${crit.count}, mövcud: ${availableQuestions.length}).`);
            } else {
                // Select random questions
                const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
                selectedQuestions.push(...shuffled.slice(0, crit.count));
            }
        });

        if (errors.length > 0) {
            showToast(errors.join('\n'));
            return;
        }

        const newQuizDraft = {
            title: title || 'Ağıllı Test',
            description: 'Bu test avtomatik olaraq Suallar Bankından yaradılıb.',
            category: criteria.map(c => c.tag).join(', '),
            questions: selectedQuestions.map(q => ({ ...q, id: Date.now() + Math.random() })), // Assign temporary unique IDs
            is_published: false,
            shuffleQuestions: true,
            shuffleOptions: true,
        };

        setEditingQuizDraft(newQuizDraft);
        navigate(`/quiz/${Date.now()}/edit`); // Use a temporary ID for the URL
        showToast('Ağıllı test qaralaması yaradıldı! İndi onu redaktə edə bilərsiniz.');
    };

    const handleStartReviewPractice = (result) => {
        if (!result) {
            showToast("Təhlil üçün nəticə tapılmadı.");
            return;
        }

        const originalQuiz = quizzes.find(q => q.id === result.quizId);
        if (!originalQuiz) {
            showToast("Testin orijinal versiyası tapılmadı.");
            return;
        }

        const incorrectQuestions = result.questionOrder.filter(q_ordered => {
            const originalQuestion = (originalQuiz.questions || []).find(q => q.id === q_ordered.id);
            return originalQuestion && !isAnswerCorrect(originalQuestion, result.userAnswers[originalQuestion.id]);
        });

        if (incorrectQuestions.length === 0) {
            showToast("Təbrik edirik! Bu testdə səhv cavabınız yoxdur.");
            return;
        }

        const reviewQuiz = {
            id: `review-practice-${result.id}`,
            title: `Səhvlər üzərində iş: ${originalQuiz.title}`,
            questions: incorrectQuestions,
        };

        setReviewPracticeQuiz(reviewQuiz);
        navigate("/practice/review");
    };
    const handleStartQuizRequest = async (quizId) => {
        if (!session) {
            showToast('Testə başlamaq üçün daxil olun.');
            navigate('/auth');
            return;
        }

        const quiz = quizzes.find(q => q.id === quizId);
        if (!quiz) return;

        if (quiz.attempt_limit > 0) {
            const { data, error } = await supabase
                .from('quiz_results')
                .select('id', { count: 'exact' })
                .eq('user_id', session.user.id)
                .eq('quizId', quizId);

            if (error) {
                showToast('Cəhdləri yoxlayarkən xəta baş verdi.');
                return;
            }

            if (data.length >= quiz.attempt_limit) {
                showToast('Siz bu test üçün bütün cəhdlərinizi istifadə etmisiniz.');
                return;
            }
        }

        if (quiz.passcode) {
            setPasscodeQuiz(quiz);
            setIsPasscodeModalOpen(true);
        } else {
            setQuizToStartId(quizId);
            setIsModeSelectionModalOpen(true);
        }
    };

    const handlePasscodeConfirm = (enteredPasscode) => {
        if (passcodeQuiz && enteredPasscode === passcodeQuiz.passcode) {
            // Add to sessionStorage to remember the unlock
            const unlockedItems = JSON.parse(sessionStorage.getItem('unlockedContent') || '{}');
            unlockedItems[`quiz-${passcodeQuiz.id}`] = enteredPasscode;
            sessionStorage.setItem('unlockedContent', JSON.stringify(unlockedItems));
            setIsPasscodeModalOpen(false);
            setQuizToStartId(passcodeQuiz.id);
            setIsModeSelectionModalOpen(true);
            setPasscodeQuiz(null);
        } else {
            showToast('Yanlış giriş kodu!');
        }
    };

    const handleContentNavigationRequest = useCallback((item, type) => {
        if (item.passcode) {
            // Сначала проверяем, не был ли этот контент уже разблокирован в текущей сессии
            const unlockedItems = JSON.parse(sessionStorage.getItem('unlockedContent') || '{}');
            if (unlockedItems[`${type}-${item.id}`] === item.passcode) {
                navigate(`/${type}s/${item.id}`);
                return;
            }
            // Если не разблокирован, показываем модальное окно
            setPasscodeContent({ item, type });
            setIsContentPasscodeModalOpen(true);
        } else {
            navigate(`/${type}s/${item.id}`);
        }
    }, [navigate]);

    const handleContentPasscodeConfirm = useCallback((enteredPasscode) => {
        if (passcodeContent && enteredPasscode === passcodeContent.item.passcode) {
            // При успешном вводе сохраняем "ключ" в sessionStorage
            const unlockedItems = JSON.parse(sessionStorage.getItem('unlockedContent') || '{}');
            unlockedItems[`${passcodeContent.type}-${passcodeContent.item.id}`] = enteredPasscode;
            sessionStorage.setItem('unlockedContent', JSON.stringify(unlockedItems));

            setIsContentPasscodeModalOpen(false);
            navigate(`/${passcodeContent.type}s/${passcodeContent.item.id}`);
            setPasscodeContent(null);
        } else {
            showToast('Yanlış giriş kodu!');
        }
    }, [passcodeContent, navigate, showToast]);

    const handleStartSmartPractice = () => {
        if (!profile || !quizResults.length) {
            showToast("Ağıllı məşq üçün kifayət qədər data yoxdur.");
            return;
        }

        const userResults = quizResults.filter(r => r.user_id === profile.id);
        if (userResults.length === 0) {
            showToast("Siz hələ heç bir testi tamamlamamısınız.");
            return;
        }

        const incorrectQuestions = new Map();

        userResults.forEach(result => {
            const quiz = quizzes.find(q => q.id === result.quizId);
            if (!quiz) return;

            result.questionOrder.forEach(q_ordered => {
                const originalQuestion = (quiz.questions || []).find(q => q.id === q_ordered.id);
                if (originalQuestion && !isAnswerCorrect(originalQuestion, result.userAnswers[originalQuestion.id])) {
                    incorrectQuestions.set(originalQuestion.id, originalQuestion);
                }
            });
        });

        const questionsForPractice = Array.from(incorrectQuestions.values()).slice(0, 30);

        if (questionsForPractice.length === 0) {
            showToast("Təbrik edirik! Səhv cavabınız yoxdur.");
            return;
        }

        const smartQuiz = {
            id: `smart-practice-${Date.now()}`,
            title: `Ağıllı Məşq (Səhvləriniz)`,
            questions: questionsForPractice,
            isSmart: true,
        };

        setCustomPracticeQuiz(smartQuiz);
        navigate("/practice/custom");
    };

    const handleModeSelected = (mode) => {
        setIsModeSelectionModalOpen(false);
        if (mode === 'exam') {
            navigate(`/quiz/${quizToStartId}/take`);
        } else {
            navigate(`/quiz/${quizToStartId}/practice`);
        }
    };

    const checkAndAwardAchievements = async (newResult) => {
        const { data: allAchievementsFromDb } = await supabase.from('achievements').select('*');
        if (!allAchievementsFromDb) return;

        const userAchievementIds = new Set(userAchievements.map(a => a.achievement_id));
        const newAchievementsToAward = [];

        const newbieId = allAchievementsFromDb.find(a => a.icon_name === 'newbie')?.id;
        if (newbieId && !userAchievementIds.has(newbieId)) {
            const { count } = await supabase.from('quiz_results').select('id', { count: 'exact', head: true }).eq('user_id', newResult.user_id);
            if (count === 1) {
                newAchievementsToAward.push({ user_id: newResult.user_id, achievement_id: newbieId });
            }
        }

        const sniperId = allAchievementsFromDb.find(a => a.icon_name === 'sniper')?.id;
        if (sniperId && newResult.percentage === 100 && !userAchievementIds.has(sniperId)) {
            newAchievementsToAward.push({ user_id: newResult.user_id, achievement_id: sniperId });
        }

        const marathonerId = allAchievementsFromDb.find(a => a.icon_name === 'marathoner')?.id;
        if (marathonerId && !userAchievementIds.has(marathonerId)) {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const { count } = await supabase.from('quiz_results').select('id', { count: 'exact', head: true }).eq('user_id', newResult.user_id).gt('created_at', sevenDaysAgo.toISOString());
            if (count >= 5) {
                newAchievementsToAward.push({ user_id: newResult.user_id, achievement_id: marathonerId });
            }
        }

        if (newAchievementsToAward.length > 0) {
            const { data: awarded, error } = await supabase.from('user_achievements').insert(newAchievementsToAward).select('*, achievements(*)');
            if (!error && awarded) {
                setUserAchievements(prev => [...prev, ...awarded]);
                awarded.forEach(a => showToast(`Yeni nailiyyət: ${a.achievements.name}!`));
            }
        }
    };

    const handleSubmitQuiz = async (quizId, answers, questionsInOrder, timePerQuestion) => {
        const quiz = quizzes.find(q => q.id === quizId);
        let score = 0;
        let totalPoints = 0;
        let correctAnswersCount = 0;
        const hasOpenQuestions = questionsInOrder.some(q => q.type === 'open');

        questionsInOrder.forEach(q => {
            const userAnswer = answers[q.id];
            const questionPoints = q.points || 1;
            totalPoints += questionPoints;

            if (userAnswer === undefined) return;

            let isCorrect = false;
            if (q.type !== 'open') {
                if (q.type === 'single') isCorrect = userAnswer === q.options[q.correctAnswers[0]];
                else if (q.type === 'multiple') { const correct = q.correctAnswers.map(i => q.options[i]).sort(); const userAns = userAnswer ? [...userAnswer].sort() : []; isCorrect = JSON.stringify(correct) === JSON.stringify(userAns); }
                else if (q.type === 'textInput') isCorrect = userAnswer.trim().toLowerCase() === q.correctAnswers[0].trim().toLowerCase();
                else if (q.type === 'trueFalse') isCorrect = userAnswer === q.correctAnswer;
                else if (q.type === 'ordering') isCorrect = JSON.stringify(userAnswer) === JSON.stringify(q.orderItems);
                else if (q.type === 'fillInTheBlanks') {
                    if (Array.isArray(userAnswer) && userAnswer.length === q.correctAnswers.length) {
                        isCorrect = userAnswer.every((answer, index) =>
                            (answer || '').trim().toLowerCase() === (q.correctAnswers[index] || '').trim().toLowerCase()
                        );
                    }
                }
            }

            if (isCorrect) {
                score += questionPoints;
                correctAnswersCount++;
            }
        });

        const resultData = {
            userName: profile?.first_name || session.user.email.split('@')[0],
            userSurname: profile?.last_name || '',
            quizTitle: quiz.title,
            quizId: quiz.id,
            score,
            totalPoints,
            correctAnswersCount,
            totalQuestions: (quiz.questions || []).length,
            percentage: totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0,
            status: hasOpenQuestions ? 'pending_review' : 'completed',
            userAnswers: answers,
            questionOrder: questionsInOrder,
            user_id: session.user.id,
            time_per_question: timePerQuestion || {}
        };

        const { data: newResult, error } = await supabase.from('quiz_results').insert(resultData).select().single();

        if (error) {
            showToast(`Nəticəni yadda saxlayarkən xəta: ${error.message}`);
        } else {
            await checkAndAwardAchievements(newResult);
            if (newResult.percentage >= 50) {
                await handleAddExperience(10 + newResult.score);
            }
            setQuizResults(prev => [newResult, ...prev]);
            setLastResult(newResult);
            navigate(`/quiz/${quiz.id}/result`);
            await handleQuestProgress('COMPLETE_QUIZZES');

            // Check for course completion
            courses.forEach(course => {
                if (course.course_items.some(item => item.quiz_id === quizId)) {
                    handleCourseCompletionCheck(course.id);
                }
            });
        }
    };

    const handleImportRequest = () => {
        if (!checkAdmin()) return;
        setIsImportModalOpen(true);
    };

    const handleImportQuestions = (file) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const requiredHeaders = ['text', 'type', 'options', 'correctAnswers', 'explanation', 'points'];
                    if (!requiredHeaders.every(h => results.meta.fields.includes(h))) {
                        showToast('CSV faylında tələb olunan başlıqlar yoxdur.');
                        return;
                    }

                    const newQuestions = results.data.map(row => {
                        const options = row.options.split(';').map(o => o.trim());
                        let correctAnswers;
                        if (row.type === 'single' || row.type === 'multiple') {
                            correctAnswers = row.correctAnswers.split(';').map(ca => options.indexOf(ca.trim())).filter(i => i !== -1);
                        } else {
                            correctAnswers = [row.correctAnswers];
                        }

                        return {
                            id: Date.now() + Math.random(),
                            text: row.text,
                            type: row.type,
                            options,
                            correctAnswers,
                            explanation: row.explanation,
                            points: parseInt(row.points, 10) || 1,
                            correctAnswer: row.type === 'trueFalse' ? row.correctAnswers.toLowerCase() === 'true' : true,
                            orderItems: row.type === 'ordering' ? options : [],
                        };
                    });

                    setEditingQuizDraft(prev => ({...prev, questions: [...(prev.questions || []), ...newQuestions]}));
                    showToast(`${newQuestions.length} sual uğurla idxal edildi!`);
                } catch (error) {
                    showToast('Faylın emalı zamanı xəta baş verdi.');
                    console.error(error);
                }
            }
        });
    };

    const handleAddFromBankRequest = () => {
        if (!checkAdmin()) return;
        setIsAddFromBankModalOpen(true);
    };

    const handleAddQuestionsFromBank = (questionIds) => {
        const questionsToAdd = questionBank.filter(q => questionIds.includes(q.id));
        setEditingQuizDraft(prev => ({...prev, questions: [...(prev.questions || []), ...questionsToAdd.map(q => ({...q, id: Date.now() + Math.random()}))]}));
        showToast(`${questionsToAdd.length} sual bankdan əlavə edildi.`);
    };

    const handleUpdateResult = async (updatedResult) => {
        const { id, ...resultData } = updatedResult;
        const { data, error } = await supabase.from('quiz_results').update(resultData).eq('id', id).select().single();
        if (error) {
            showToast(`Nəticəni yeniləyərkən xəta: ${error.message}`);
        } else {
            setQuizResults(prev => prev.map(r => r.id === id ? data : r));
            navigate('/stats');
            showToast('Nəticə uğurla yeniləndi!');

            // Send notification to the user
            if (data.status === 'completed') {
                const { error: rpcError } = await supabase.rpc('create_manual_review_notification', {
                    result_id_in: id
                });

                if (rpcError) {
                    console.error('Error sending manual review notification:', rpcError);
                    // We don't show a toast here because the admin doesn't need to know about this error,
                    // but we log it for debugging.
                }
            }
        }
    };

    const handleReviewRequest = (result) => {
        if (profile?.role === 'admin' || result.user_id === profile?.id) {
            if (result.status === 'pending_review' && profile?.role === 'admin') {
                navigate(`/manual-review/${result.id}`);
            } else {
                navigate(`/review/${result.id}`);
            }
        } else {
            showToast('Bu nəticəyə baxmaq üçün icazəniz yoxdur.');
        }
    };

    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            showToast('Çıxış zamanı xəta baş verdi');
        } else {
            setProfile(null);
            setSession(null);
            navigate('/');
            showToast('Uğurla çıxış etdiniz.');
        }
    };

    const handleProfileUpdate = (updatedProfile) => {
        setProfile(updatedProfile);
    };

    const handleRoleChange = async (userId, newRole) => {
        if (!checkAdmin()) return;
        const { data, error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId).select().single();
        if (error) {
            showToast(`Rolu dəyişərkən xəta: ${error.message}`);
        } else {
            setAllUsers(prevUsers => prevUsers.map(u => u.id === userId ? data : u));
            showToast('Rol uğurla dəyişdirildi.');
        }
    };

    const handleSaveArticle = async (articleData) => {
        if (!checkAdmin()) return;

        const { selectedQuizIds, ...articleCoreData } = articleData;
        const dataToSave = {
            title: articleCoreData.title,
            content: articleCoreData.content,
            category: articleCoreData.category,
            passcode: articleCoreData.passcode || null,
            author_id: session.user.id,
            is_published: articleCoreData.is_published || false
        };

        let savedArticle;
        if (articleCoreData.id) {
            const { data, error } = await supabase.from('articles').update(dataToSave).eq('id', articleCoreData.id).select('id').single();
            if (error) { showToast(`Məqaləni yeniləyərkən xəta: ${error.message}`); return; }
            savedArticle = data;
        } else {
            const { data, error } = await supabase.from('articles').insert(dataToSave).select('id').single();
            if (error) { showToast(`Məqaləni yaradarkən xəta: ${error.message}`); return; }
            savedArticle = data;
        }

        const { error: deleteError } = await supabase.from('article_quizzes').delete().eq('article_id', savedArticle.id);
        if (deleteError) { showToast(`Test əlaqələrini yeniləyərkən xəta: ${deleteError.message}`); return; }

        if (selectedQuizIds && selectedQuizIds.length > 0) {
            const relationsToInsert = selectedQuizIds.map(quiz_id => ({ article_id: savedArticle.id, quiz_id }));
            const { error: insertError } = await supabase.from('article_quizzes').insert(relationsToInsert);
            if (insertError) { showToast(`Test əlaqələrini yaradarkən xəta: ${insertError.message}`); return; }
        }

        const { data: finalArticle, error: finalFetchError } = await supabase
            .from('articles')
            .select('*, article_quizzes(quiz_id)')
            .eq('id', savedArticle.id)
            .single();

        if (finalFetchError) {
            showToast('Məqalə yadda saxlanıldı, lakin məlumatları yeniləmək mümkün olmadı. Səhifəni yeniləyin.');
        } else {
            setArticles(prev => {
                const index = prev.findIndex(a => a.id === finalArticle.id);
                if (index !== -1) {
                    const newArticles = [...prev];
                    newArticles[index] = finalArticle;
                    return newArticles;
                } else {
                    return [finalArticle, ...prev];
                }
            });
            showToast('Məqalə uğurla yadda saxlandı!');
        }

        navigate(`/admin/articles`);
    };

    const handleMarkArticleAsRead = async (articleId) => {
        if (articleProgress.some(p => p.article_id === articleId)) {
            return;
        }

        const { data, error } = await supabase.from('user_article_progress').insert({ user_id: session.user.id, article_id: articleId }).select().single();
        if (error) {
            showToast('Proqresi yadda saxlayarkən xəta baş verdi.');
        } else {
            setArticleProgress(prev => [...prev, data]);
            showToast('Məqalə oxunmuş kimi işarələndi!');
            await handleAddExperience(5);

            // Check for course completion
            courses.forEach(course => {
                if (course.course_items.some(item => item.article_id === articleId)) {
                    handleCourseCompletionCheck(course.id);
                }
            });
        }
    };

    const handleToggleArticleStatus = async (articleId, newStatus) => {
        if (!checkAdmin()) return;
        const { data, error } = await supabase.from('articles').update({ is_published: newStatus }).eq('id', articleId).select('*, article_quizzes(quiz_id)').single();
        if (error) {
            showToast('Statusu dəyişərkən xəta baş verdi.');
        } else {
            setArticles(prev => prev.map(a => a.id === articleId ? data : a));
            showToast(newStatus ? 'Məqalə dərc edildi!' : 'Məqalə gizlədildi.');
        }
    };

    const handleSaveCourse = async (courseData) => {
        if (!checkAdmin()) return;
        const { items, ...courseCoreData } = courseData;
        const courseDetails = {
            title: courseCoreData.title,
            description: courseCoreData.description,
            passcode: courseCoreData.passcode || null,
            author_id: session.user.id,
            is_published: courseCoreData.is_published || false
        };

        let savedCourse;
        if (courseCoreData.id) {
            const { data, error } = await supabase.from('courses').update(courseDetails).eq('id', courseCoreData.id).select().single();
            if (error) { showToast(`Kursu yeniləyərkən xəta: ${error.message}`); return; }
            savedCourse = data;
        } else {
            const { data, error } = await supabase.from('courses').insert(courseDetails).select().single();
            if (error) { showToast(`Kursu yaradarkən xəta: ${error.message}`); return; }
            savedCourse = data;
        }

        const { error: deleteError } = await supabase.from('course_items').delete().eq('course_id', savedCourse.id);
        if (deleteError) { showToast(`Kursun tərkibini yeniləyərkən xəta: ${deleteError.message}`); return; }

        if (items && items.length > 0) {
            const itemsToInsert = items.map((item, index) => {
                const baseItem = {
                    course_id: savedCourse.id,
                    order: index,
                };
                if (item.item_type === 'article') {
                    baseItem.article_id = item.item_id;
                } else if (item.item_type === 'quiz') {
                    baseItem.quiz_id = item.item_id;
                }
                return baseItem;
            }).filter(item => item.article_id || item.quiz_id);

            if (itemsToInsert.length > 0) {
                const { error: insertError } = await supabase.from('course_items').insert(itemsToInsert);
                if (insertError) { showToast(`Kursun tərkibini yaradarkən xəta: ${insertError.message}`); return; }
            }
        }

        const { data: finalCourse } = await supabase.from('courses').select('*, course_items(*, articles(title), quizzes(title))').eq('id', savedCourse.id).single();
        if (!finalCourse) {
            showToast('Kurs yadda saxlanıldı, lakin məlumatları yeniləmək mümkün olmadı. Səhifəni yeniləyin.');
            navigate('/admin/courses');
            return;
        }
        setCourses(prev => {
            const index = prev.findIndex(c => c.id === finalCourse.id);
            if (index !== -1) {
                const newCourses = [...prev];
                newCourses[index] = finalCourse;
                return newCourses;
            } else {
                return [finalCourse, ...prev];
            }
        });
        setEditingCourseDraft(null);
        showToast('Kurs uğurla yadda saxlandı!');
        navigate('/admin/courses');
    };

    const handleSaveAnnotation = async (annotationData) => {
        const { id, ...dataToSave } = annotationData;
        let savedAnnotation;
        if (id) { // Update existing
            const { data, error } = await supabase.from('user_annotations').update(dataToSave).eq('id', id).select().single();
            if (error) { showToast(`Annotasiyanı yeniləyərkən xəta: ${error.message}`); return; }
            savedAnnotation = data;
            setUserAnnotations(prev => prev.map(a => a.id === id ? savedAnnotation : a));
        } else { // Create new
            const { data, error } = await supabase.from('user_annotations').insert({ ...dataToSave, user_id: session.user.id }).select().single();
            if (error) { showToast(`Annotasiyanı saxlayarkən xəta: ${error.message}`); return; }
            savedAnnotation = data;
            setUserAnnotations(prev => [...prev, savedAnnotation]);
        }
        showToast('Annotasiya yadda saxlandı!');
    };

    const handleDeleteAnnotation = async (annotationId) => {
        const { error } = await supabase.from('user_annotations').delete().eq('id', annotationId);
        if (error) {
            showToast(`Annotasiyanı silərkən xəta: ${error.message}`);
        } else {
            setUserAnnotations(prev => prev.filter(a => a.id !== annotationId));
            showToast('Annotasiya silindi.');
        }
    };


    const handleToggleCourseStatus = async (courseId, newStatus) => {
        if (!checkAdmin()) return;
        const { data, error } = await supabase.from('courses').update({ is_published: newStatus }).eq('id', courseId).select('*, course_items(*, articles(title), quizzes(title))').single();
        if (error) {
            showToast('Statusu dəyişərkən xəta baş verdi.');
        } else if (data) {
            setCourses(prev => prev.map(c => c.id === courseId ? data : c));
            showToast(newStatus ? 'Kurs dərc edildi!' : 'Kurs gizlədildi.');
        }
    };

    const handleNewLearningPath = () => {
        if (!checkAdmin()) return;
        setEditingLearningPathDraft({
            title: 'Yeni Tədris Yolu',
            description: '',
            is_published: false,
            items: []
        });
        navigate('/admin/paths/new');
    };

    const handleEditLearningPath = (pathId) => {
        if (!checkAdmin()) return;
        const pathTofind = learningPaths.find(p => p.id === pathId)
        if (pathTofind) {
            const draft = {
                id: pathTofind.id,
                title: pathTofind.title || '',
                description: pathTofind.description || '',
                is_published: pathTofind.is_published || false,
                items: (pathTofind.path_items || []).sort((a, b) => a.order - b.order),
            };
            setEditingLearningPathDraft(draft);
            navigate(`/admin/paths/edit/${pathId}`);
        }
    };

    const handleSaveLearningPath = async (pathData) => {
        if (!checkAdmin()) return;
        const { items, ...pathCoreData } = pathData;
        const pathDetails = {
            title: pathCoreData.title,
            description: pathCoreData.description,
            author_id: session.user.id,
            is_published: pathCoreData.is_published || false
        };

        let savedPath;
        if (pathCoreData.id) {
            const { data, error } = await supabase.from('learning_paths').update(pathDetails).eq('id', pathCoreData.id).select().single();
            if (error) { showToast(`Tədris yolunu yeniləyərkən xəta: ${error.message}`); return; }
            savedPath = data;
        } else {
            const { data, error } = await supabase.from('learning_paths').insert(pathDetails).select().single();
            if (error) { showToast(`Tədris yolunu yaradarkən xəta: ${error.message}`); return; }
            savedPath = data;
        }

        const { error: deleteError } = await supabase.from('path_items').delete().eq('path_id', savedPath.id);
        if (deleteError) { showToast(`Tədris yolunun tərkibini yeniləyərkən xəta: ${deleteError.message}`); return; }

        if (items && items.length > 0) {
            const itemsToInsert = items.map((item, index) => ({
                path_id: savedPath.id,
                course_id: item.course_id,
                order: index,
            }));

            if (itemsToInsert.length > 0) {
                const { error: insertError } = await supabase.from('path_items').insert(itemsToInsert);
                if (insertError) { showToast(`Tədris yolunun tərkibini yaradarkən xəta: ${insertError.message}`); return; }
            }
        }

        const { data: finalPath } = await supabase.from('learning_paths').select('*, path_items(*, courses(title))').eq('id', savedPath.id).single();
        if (!finalPath) {
            showToast('Tədris yolu yadda saxlanıldı, lakin məlumatları yeniləmək mümkün olmadı. Səhifəni yeniləyin.');
            navigate('/admin/paths');
            return;
        }
        setLearningPaths(prev => {
            const index = prev.findIndex(p => p.id === finalPath.id);
            if (index !== -1) {
                const newPaths = [...prev];
                newPaths[index] = finalPath;
                return newPaths;
            } else {
                return [finalPath, ...prev];
            }
        });
        setEditingLearningPathDraft(null);
        showToast('Tədris yolu uğurla yadda saxlandı!');
        navigate('/admin/paths');
    };

    const handleToggleLearningPathStatus = async (pathId, newStatus) => {
        if (!checkAdmin()) return;
        const { data, error } = await supabase.from('learning_paths').update({ is_published: newStatus }).eq('id', pathId).select('*, path_items(*, courses(title))').single();
        if (error) {
            showToast('Statusu dəyişərkən xəta baş verdi.');
        } else if (data) {
            setLearningPaths(prev => prev.map(p => p.id === pathId ? data : p));
            showToast(newStatus ? 'Tədris yolu dərc edildi!' : 'Tədris yolu gizlədildi.');
        }
    };

    const handleNewFlashcardDeck = () => {
        if (!checkAdmin()) return;
        setEditingFlashcardDeckDraft({
            title: 'Yeni Koloda',
            description: '',
            is_published: false,
            flashcards: []
        });
        navigate('/admin/decks/new');
    };

    const handleEditFlashcardDeck = (deckId) => {
        if (!checkAdmin()) return;
        const deckToEdit = flashcardDecks.find(d => d.id === deckId);
        if (deckToEdit) {
            setEditingFlashcardDeckDraft(deckToEdit);
            navigate(`/admin/decks/edit/${deckId}`);
        }
    };

    const handleSaveFlashcardDeck = async (deckData) => {
        if (!checkAdmin()) return;
        const { flashcards, ...deckCoreData } = deckData;
        const deckDetails = {
            title: deckCoreData.title,
            description: deckCoreData.description,
            author_id: session.user.id,
            is_published: deckCoreData.is_published || false
        };

        let savedDeck;
        if (deckCoreData.id) {
            const { data, error } = await supabase.from('flashcard_decks').update(deckDetails).eq('id', deckCoreData.id).select().single();
            if (error) { showToast(`Kolodanı yeniləyərkən xəta: ${error.message}`); return; }
            savedDeck = data;
        } else {
            const { data, error } = await supabase.from('flashcard_decks').insert(deckDetails).select().single();
            if (error) { showToast(`Koloda yaradarkən xəta: ${error.message}`); return; }
            savedDeck = data;
        }

        const cardsToUpsert = flashcards.map(fc => {
            const card = {
                deck_id: savedDeck.id,
                front: fc.front,
                back: fc.back,
            };
            if (typeof fc.id === 'number') {
                card.id = fc.id;
            }
            return card;
        });

        if (cardsToUpsert.length > 0) {
            const { error: upsertError } = await supabase.from('flashcards').upsert(cardsToUpsert);
            if (upsertError) { showToast(`Kartları yadda saxlayarkən xəta: ${upsertError.message}`); return; }
        }

        const newCardIds = flashcards.map(fc => fc.id).filter(id => typeof id === 'number');
        const originalDeck = flashcardDecks.find(d => d.id === savedDeck.id);
        if (originalDeck) {
            const idsToDelete = originalDeck.flashcards
                .filter(fc => !newCardIds.includes(fc.id))
                .map(fc => fc.id);
            if (idsToDelete.length > 0) {
                await supabase.from('flashcards').delete().in('id', idsToDelete);
            }
        }

        const { data: finalDeck } = await supabase.from('flashcard_decks').select('*, flashcards(*)').eq('id', savedDeck.id).single();
        if (!finalDeck) {
            showToast('Koloda yadda saxlanıldı, lakin məlumatları yeniləmək mümkün olmadı.');
            navigate('/admin/decks');
            return;
        }
        setFlashcardDecks(prev => {
            const index = prev.findIndex(d => d.id === finalDeck.id);
            if (index !== -1) {
                const newDecks = [...prev];
                newDecks[index] = finalDeck;
                return newDecks;
            } else {
                return [finalDeck, ...prev];
            }
        });
        setEditingFlashcardDeckDraft(null);
        showToast('Koloda uğurla yadda saxlandı!');
        navigate('/admin/decks');
    };

    const handleToggleFlashcardDeckStatus = async (deckId, newStatus) => {
        if (!checkAdmin()) return;
        const { data, error } = await supabase.from('flashcard_decks').update({ is_published: newStatus }).eq('id', deckId).select('*, flashcards(*)').single();
        if (error) {
            showToast('Statusu dəyişərkən xəta baş verdi.');
        } else if (data) {
            setFlashcardDecks(prev => prev.map(d => d.id === deckId ? data : d));
            showToast(newStatus ? 'Koloda dərc edildi!' : 'Koloda gizlədildi.');
        }
    };

    const handleUpdateFlashcardReview = async (reviewData) => {
        const { data, error } = await supabase
            .from('user_flashcard_reviews')
            .upsert({ ...reviewData, user_id: session.user.id }, { onConflict: 'user_id, card_id' })
            .select()
            .single();

        if (error) {
            showToast(`Təkrar məlumatı yenilənərkən xəta: ${error.message}`);
        } else if (data) {
            setUserFlashcardReviews(prev => {
                const index = prev.findIndex(r => r.card_id === data.card_id);
                if (index !== -1) {
                    const newReviews = [...prev];
                    newReviews[index] = data;
                    return newReviews;
                } else {
                    return [...prev, data];
                }
            });
            await handleQuestProgress('STUDY_FLASHCARDS');
        }
    };

    const handleNewStudentGroup = () => {
        if (!checkAdmin()) return;
        setEditingStudentGroupDraft({
            name: 'Yeni Qrup',
            description: '',
            members: []
        });
        navigate('/admin/groups/new');
    };

    const handleEditStudentGroup = (groupId) => {
        if (!checkAdmin()) return;
        const groupToEdit = studentGroups.find(g => g.id === groupId);
        if (groupToEdit) {
            setEditingStudentGroupDraft(groupToEdit);
            navigate(`/admin/groups/edit/${groupId}`);
        }
    };

    const handleSaveStudentGroup = async (groupData) => {
        if (!checkAdmin()) return;
        const { members, ...groupCoreData } = groupData;
        const groupDetails = {
            name: groupCoreData.name,
            description: groupCoreData.description,
            created_by: session.user.id
        };

        let savedGroup;
        if (groupCoreData.id) {
            const { data, error } = await supabase.from('student_groups').update(groupDetails).eq('id', groupCoreData.id).select().single();
            if (error) { showToast(`Qrupu yeniləyərkən xəta: ${error.message}`); return; }
            savedGroup = data;
        } else {
            const { data, error } = await supabase.from('student_groups').insert(groupDetails).select().single();
            if (error) { showToast(`Qrup yaradarkən xəta: ${error.message}`); return; }
            savedGroup = data;
        }

        const currentMemberIds = members.map(m => m.user_id);
        const { error: deleteError } = await supabase.from('group_memberships').delete().eq('group_id', savedGroup.id).not('user_id', 'in', `(${currentMemberIds.join(',')})`);
        if (deleteError) { showToast(`Qrup üzvlərini yeniləyərkən xəta: ${deleteError.message}`); }

        const membersToUpsert = currentMemberIds.map(userId => ({ group_id: savedGroup.id, user_id: userId }));
        if (membersToUpsert.length > 0) {
            await supabase.from('group_memberships').upsert(membersToUpsert);
        }

        const { data: finalGroup } = await supabase.from('student_groups').select('*, members:group_memberships(*, profiles(*))').eq('id', savedGroup.id).single();
        if (!finalGroup) {
            showToast('Qrup yadda saxlanıldı, lakin məlumatları yeniləmək mümkün olmadı.');
            navigate('/admin/groups');
            return;
        }

        setStudentGroups(prev => {
            const index = prev.findIndex(g => g.id === finalGroup.id);
            if (index !== -1) {
                const newGroups = [...prev];
                newGroups[index] = finalGroup;
                return newGroups;
            } else {
                return [finalGroup, ...prev];
            }
        });
        setEditingStudentGroupDraft(null);
        showToast('Qrup uğurla yadda saxlandı!');
        navigate('/admin/groups');
    };

    const fetchComments = async (targetId, targetType) => {
        const { data, error } = await supabase.from('comments').select(`*, profiles(id, first_name, last_name)`).eq(`${targetType}_id`, targetId).order('created_at', { ascending: true });
        if (error) {
            showToast('Şərhləri yükləyərkən xəta baş verdi.');
            return [];
        }
        return data;
    };

    const postComment = async (targetId, targetType, content, parentCommentId = null, targetUrl = null) => {
        const { data: newComment, error } = await supabase
            .from('comments')
            .insert({
                content,
                user_id: session.user.id,
                [`${targetType}_id`]: targetId,
                parent_comment_id: parentCommentId
            })
            .select(`*, profiles(id, first_name, last_name)`)
            .single();

        if (error) {
            showToast(`Şərh göndərilərkən xəta: ${error.message}`);
            return null;
        }

        // Create notification for the parent comment author
        if (parentCommentId) {
            const { error: rpcError } = await supabase.rpc('create_reply_notification', {
                parent_comment_id_in: parentCommentId,
                reply_author_profile_in: { first_name: profile.first_name },
                target_url_in: targetUrl || '#'
            });

            if (rpcError) {
                console.error('Error calling RPC function:', rpcError);
                showToast('Bildiriş göndərilərkən xəta baş verdi.');
            }
        } else if (targetType === 'group' && !parentCommentId) {
            const { error: rpcError } = await supabase.rpc('create_group_comment_notification', {
                p_group_id: targetId,
                p_author_id: session.user.id,
                p_comment_content: content,
                p_target_url: targetUrl || '#'
            });
            if (rpcError) {
                console.error('Error calling group comment notification RPC:', rpcError);
            }
        }

        return newComment;
    };

    const deleteComment = async (commentId) => {
        const { error } = await supabase.from('comments').delete().eq('id', commentId);
        if (error) {
            showToast(`Şərhi silərkən xəta: ${error.message}`);
            return false;
        }
        showToast('Şərh silindi.');
        return true;
    };

    const handleMarkNotificationAsRead = async (notificationId) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
        if (error) {
            console.error('Error marking notification as read:', error);
            showToast('Bildiriş oxundu olaraq işarələnərkən xəta baş verdi.');
            // Revert if error
            fetchNotifications();
        }
    };

    const handleMarkAllNotificationsAsRead = async () => {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', session.user.id).neq('is_read', true);
        if (error) {
            console.error('Error marking all notifications as read:', error);
            showToast('Bütün bildirişlər oxundu olaraq işarələnərkən xəta baş verdi.');
            // Revert if error
            fetchNotifications();
        }
    };

    const handleClearAllNotifications = async () => {
        if (!session?.user?.id) return;

        // Optimistic update
        setNotifications([]);
        showToast('Bütün bildirişlər silinir...');

        const { error } = await supabase.from('notifications').delete().eq('user_id', session.user.id);

        if (error) {
            console.error('Error clearing all notifications:', error);
            showToast('Bildirişlər silinərkən xəta baş verdi.');
            // Revert if error
            fetchNotifications(); // Re-fetch notifications to restore state
        } else {
            showToast('Bütün bildirişlər uğurla silindi!');
        }
    };

    const handleNewArticle = () => {
        if (!checkAdmin()) return;
        setEditingArticleDraft({ title: '', content: '', category: '', article_quizzes: [] });
        navigate('/admin/articles/new');
    };

    const handleEditArticle = (articleId) => {
        if (!checkAdmin()) return;
        const articleToEdit = articles.find(a => a.id === articleId);
        if (articleToEdit) {
            setEditingArticleDraft(articleToEdit);
            navigate(`/admin/articles/edit/${articleId}`);
        }
    };

    const handleNewCourse = () => {
        if (!checkAdmin()) return;
        setEditingCourseDraft({
            title: 'Yeni Kurs',
            description: '',
            is_published: false,
            items: []
        });
        navigate('/admin/courses/new');
    };

    const handleEditCourse = (courseId) => {
        if (!checkAdmin()) return;
        const courseToEdit = courses.find(c => c.id === courseId);
        if (courseToEdit) {
            const draft = {
                id: courseToEdit.id,
                title: courseToEdit.title || '',
                description: courseToEdit.description || '',
                is_published: courseToEdit.is_published || false,
                items: (courseToEdit.course_items || []).map(item => (item.article_id && item.articles) ? { item_id: item.article_id, item_type: 'article', title: item.articles.title, order: item.order } : (item.quiz_id && item.quizzes) ? { item_id: item.quiz_id, item_type: 'quiz', title: item.quizzes.title, order: item.order } : null).filter(Boolean).sort((a, b) => a.order - b.order),
            };
            setEditingCourseDraft(draft);
            navigate(`/admin/courses/edit/${courseId}`);
        }
    };

    const activeUserQuests = useMemo(() => {
        if (!userQuests) return [];
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
        startOfWeek.setHours(0, 0, 0, 0);

        const todayStr = today.toISOString().slice(0, 10);
        const startOfWeekStr = startOfWeek.toISOString().slice(0, 10);

        return userQuests.filter(uq => {
            if (!uq.quests) return false; // Guard against missing quest data
            if (uq.quests.type === 'DAILY') {
                return uq.assigned_at === todayStr;
            }
            if (uq.quests.type === 'WEEKLY') {
                return uq.assigned_at === startOfWeekStr;
            }
            return false;
        });
    }, [userQuests]);

    if (isAuthLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-orange-50">Sessiya yoxlanılır...</div>;
    }

    return (
        <>
            <Suspense fallback={<SuspenseFallback />}>
                <Routes>
                    <Route path="/auth" element={<AuthPage showToast={showToast} />} />
                    <Route path="/*" element={
                        session ? (
                            <div className="bg-orange-50 min-h-screen font-sans text-gray-900">
                                <header className="bg-white shadow-md sticky top-0 z-40">
                                    <div className="container mx-auto px-4 py-3 sm:py-4 flex justify-between items-center relative">
                                        <Link to="/" className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-500">EduventureWithSeda</Link>

                                        <div className="flex-grow flex justify-center px-4">
                                            <div className="w-full max-w-md">
                                                <GlobalSearch />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <NotificationBell notifications={notifications} onMarkAsRead={handleMarkNotificationAsRead} onMarkAllAsRead={handleMarkAllNotificationsAsRead} onClearAllNotifications={handleClearAllNotifications} />
                                            <div className="relative" ref={mobileMenuRef}>
                                                <Button variant="secondary" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                                                    {isMobileMenuOpen ? <XIcon /> : <MenuIcon />}
                                                </Button>
                                                {isMobileMenuOpen && (
                                                    <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                                                        <nav className="flex flex-col p-2 space-y-1">
                                                            <Link to="/bookmarks" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"><BookmarkIcon filled={false} /><span className="ml-3">Əlfəcinlərim</span></Link>
                                                            <Link to="/my-assignments" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"><ClipboardCheckIcon /><span className="ml-3">Tapşırıqlarım</span></Link>
                                                            <Link to="/quizzes" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"><BookOpenIcon /><span className="ml-3">Testlər</span></Link>
                                                            <Link to="/decks" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"><DuplicateIcon /><span className="ml-3">Kartlar</span></Link>
                                                            <Link to="/paths" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"><PaperAirplaneIcon /><span className="ml-3">Tədris Yolları</span></Link>
                                                            <Link to="/courses" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"><CollectionIcon /><span className="ml-3">Kurslar</span></Link>
                                                            <Link to="/articles" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"><DocumentTextIcon /><span className="ml-3">Məqalələr</span></Link>
                                                            <Link to="/leaderboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"><LeaderboardIcon /><span className="ml-3">Reytinq</span></Link>
                                                            <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"><UserCircleIcon /><span className="ml-3">Profil</span></Link>
                                                            <div className="border-t my-1"></div>
                                                            {profile?.role === 'admin' && (
                                                                <>
                                                                    <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"><ShieldCheckIcon /><span className="ml-3">Admin Panel</span></Link>
                                                                    <Link to="/stats" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"><ChartBarIcon /> <span className="ml-3">Statistika</span></Link>
                                                                    <button onClick={() => { handleQuestionBankRequest(); setIsMobileMenuOpen(false); }} className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"><LibraryIcon /> <span className="ml-3">Suallar Bankı</span></button>
                                                                    <div className="border-t my-1"></div>
                                                                </>
                                                            )}
                                                            <button onClick={() => { handleSignOut(); setIsMobileMenuOpen(false); }} className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50"><LogoutIcon /><span className="ml-3">Çıxış</span></button>
                                                        </nav>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </header>
                                <main className="container mx-auto px-4 py-6 md:py-8">
                                    <RecommendationCard
                                        recommendation={nextCourseRecommendation}
                                        onStart={(courseId) => {
                                            navigate(`/courses/${courseId}`);
                                            setNextCourseRecommendation(null);
                                        }}
                                        onClose={() => setNextCourseRecommendation(null)}
                                    />
                                    <Routes>
                                        <Route path="/" element={<DashboardPage
                                            profile={profile}
                                            activeAssignmentsCount={activeAssignmentsCount}
                                            dueFlashcardsCount={dueFlashcardsCount}
                                            quizResults={quizResults}
                                            quizzes={quizzes}
                                        />} />
                                        <Route path="/search" element={<GlobalSearchPageWrapper {...{ quizzes, courses, articles, learningPaths, onStartQuiz: handleStartQuizRequest, profile }} />} />
                                        <Route path="/quizzes" element={<QuizListPageWrapper quizzes={quizzes} onStartQuiz={handleStartQuizRequest} onAddNewQuiz={handleAddNewQuizRequest} onEditQuiz={handleEditQuizRequest} onDeleteRequest={(id) => handleDeleteRequest(id, 'quiz')} onCloneQuiz={handleCloneQuizRequest} onArchiveRequest={handleArchiveQuizRequest} onStartSmartPractice={handleStartSmartPractice} profile={profile} onToggleStatus={handleToggleQuizStatus} onAssignRequest={handleAssignRequest} toggleBookmark={toggleBookmark} isBookmarked={isBookmarked} onSetVisibilityRequest={handleSetVisibilityRequest} />} />
                                        <Route path="/my-assignments" element={<MyAssignmentsPage assignments={userAssignments} quizzes={quizzes} courses={courses} onStartQuiz={handleStartQuizRequest} quizResults={quizResults} completedCourses={completedCourses} userQuests={activeUserQuests} studentGroups={studentGroups} profile={profile} />} />
                                        <Route path="/bookmarks" element={<BookmarksPageWrapper bookmarks={bookmarks} quizzes={quizzes} articles={articles} courses={courses} onNavigate={handleContentNavigationRequest} onStartQuiz={handleStartQuizRequest} toggleBookmark={toggleBookmark} isBookmarked={isBookmarked} />} />
                                        <Route path="/student/:userId" element={<StudentReportPageWrapper results={quizResults} onReviewResult={handleReviewRequest} profile={profile} showToast={showToast} />} />
                                        <Route path="/review/:resultId" element={<PastQuizReviewPageWrapper quizResults={quizResults} quizzes={quizzes} profile={profile} fetchComments={fetchComments} postComment={postComment} deleteComment={deleteComment} />} />
                                        <Route path="/profile" element={<ProfilePage session={session} profile={profile} showToast={showToast} onProfileUpdate={handleProfileUpdate} userAchievements={userAchievements} allAchievements={allAchievements} />} />
                                        <Route path="/leaderboard" element={<LeaderboardPageWrapper results={quizResults} profile={profile} allUsers={allUsers} />} />
                                        <Route path="/articles" element={<PublicArticleListPage articles={articles} articleProgress={articleProgress} onNavigate={handleContentNavigationRequest} toggleBookmark={toggleBookmark} isBookmarked={isBookmarked} profile={profile} />} />
                                        <Route path="/articles/:articleId" element={<ArticleViewPageWrapper articles={articles} quizzes={quizzes} onStartQuiz={handleStartQuizRequest} onMarkAsRead={handleMarkArticleAsRead} articleProgress={articleProgress} profile={profile} fetchComments={fetchComments} postComment={postComment} deleteComment={deleteComment} setPasscodeContent={setPasscodeContent} setIsContentPasscodeModalOpen={setIsContentPasscodeModalOpen} showToast={showToast} userAnnotations={userAnnotations} onSaveAnnotation={handleSaveAnnotation} onDeleteAnnotation={handleDeleteAnnotation} />} />
                                        <Route path="/courses" element={<PublicCourseListPage courses={courses} articleProgress={articleProgress} quizResults={quizResults} session={session} onNavigate={handleContentNavigationRequest} toggleBookmark={toggleBookmark} isBookmarked={isBookmarked} profile={profile} />} />
                                        <Route path="/courses/:courseId" element={<CourseViewPageWrapper courses={courses} onStartQuiz={handleStartQuizRequest} articleProgress={articleProgress} quizResults={quizResults} session={session} profile={profile} setPasscodeContent={setPasscodeContent} setIsContentPasscodeModalOpen={setIsContentPasscodeModalOpen} showToast={showToast} />} />
                                        <Route path="/paths" element={<PublicLearningPathListPage learningPaths={learningPaths} profile={profile} />} />
                                        <Route path="/paths/:pathId" element={<LearningPathViewPageWrapper learningPaths={learningPaths} courses={courses} onStartQuiz={handleStartQuizRequest} articleProgress={articleProgress} quizResults={quizResults} session={session} profile={profile} showToast={showToast} />} />
                                        <Route path="/decks" element={<PublicFlashcardDeckListPage decks={flashcardDecks} userReviews={userFlashcardReviews} profile={profile} />} />
                                        <Route path="/decks/:deckId/study" element={<FlashcardStudyPage decks={flashcardDecks} userReviews={userFlashcardReviews} onUpdateReview={handleUpdateFlashcardReview} profile={profile} showToast={showToast} />} />
                                        <Route path="/groups/:groupId" element={<StudentGroupViewPageWrapper studentGroups={studentGroups} profile={profile} fetchComments={fetchComments} postComment={postComment} deleteComment={deleteComment} showToast={showToast} />} />

                                        {/* === ADMIN ROUTES === */}
                                        <Route path="/stats/*" element={<AdminRoute profile={profile} showToast={showToast}><Routes><Route path="/" element={<StatisticsPageWrapper results={quizResults} quizzes={quizzes} onReviewResult={handleReviewRequest} studentGroups={studentGroups} />} /><Route path="/quiz/:quizId" element={<QuizAnalysisPageWrapper quizzes={quizzes} results={quizResults} allUsers={allUsers} studentGroups={studentGroups} />} /></Routes></AdminRoute>} />
                                        <Route path="/question-bank" element={<AdminRoute profile={profile} showToast={showToast}><QuestionBankPageWrapper questionBank={questionBank} onSave={handleSaveQuestionToBank} onDelete={handleDeleteQuestionFromBank} showToast={showToast} onCreateSmartQuiz={handleCreateSmartQuiz} /></AdminRoute>} />
                                        <Route path="/manual-review/:resultId" element={<AdminRoute profile={profile} showToast={showToast}><ManualReviewPageWrapper results={quizResults} quizzes={quizzes} onUpdateResult={handleUpdateResult} /></AdminRoute>} />
                                        <Route path="/quiz/:id/edit" element={<AdminRoute profile={profile} showToast={showToast}><QuizPageWrapper pageType="edit" {...{ editingQuizDraft, quizzes, existingCategories: existingQuizCategories, uniqueTags: uniqueBankTags, showToast, handleSaveQuiz, handleImportRequest, handleAddFromBankRequest, setEditingQuizDraft, onSaveQuestionToBank: handleSaveQuestionFromEditorToBank, handleSaveAllQuestionsToBank }} /></AdminRoute>} />
                                        <Route path="/admin" element={<AdminRoute profile={profile} showToast={showToast}><AdminPage /></AdminRoute>}>
                                            <Route index element={<AdminDashboardPage stats={adminDashboardStats} />} />
                                            <Route path="users" element={<UserManagementPage users={allUsers} onRoleChange={handleRoleChange} currentUserId={profile?.id} />} />
                                            <Route path="quests" element={<QuestManagementPage quests={allQuests} onSave={handleSaveQuest} onDelete={(id) => handleDeleteRequest(id, 'quest')} showToast={showToast} />} />
                                            <Route path="groups" element={<StudentGroupListPage groups={studentGroups} onAddNew={handleNewStudentGroup} onEdit={handleEditStudentGroup} onDelete={(id) => handleDeleteRequest(id, 'group')} />} />
                                            <Route path="group-analysis" element={<GroupAnalysisPage studentGroups={studentGroups} allUsers={allUsers} results={quizResults} courses={courses} quizzes={quizzes} userCourseCompletions={completedCourses} />} />
                                            <Route path="permissions" element={<PermissionsPageWrapper quizzes={quizzes} articles={articles} courses={courses} learningPaths={learningPaths} flashcardDecks={flashcardDecks} onSetVisibilityRequest={handleSetVisibilityRequest} />} />
                                            <Route path="groups/new" element={<StudentGroupEditorPage group={editingStudentGroupDraft} onDraftChange={setEditingStudentGroupDraft} allUsers={allUsers} onSave={handleSaveStudentGroup} showToast={showToast} />} />
                                            <Route path="groups/edit/:groupId" element={<StudentGroupEditorPage group={editingStudentGroupDraft} onDraftChange={setEditingStudentGroupDraft} allUsers={allUsers} onSave={handleSaveStudentGroup} showToast={showToast} />} />
                                            <Route path="articles" element={<ArticleListPage articles={articles} onEdit={handleEditArticle} onDelete={(id) => handleDeleteRequest(id, 'article')} onAddNew={handleNewArticle} onToggleStatus={handleToggleArticleStatus} onSetVisibilityRequest={handleSetVisibilityRequest} />} />
                                            <Route path="articles/new" element={<ArticleEditorPageWrapper articles={articles} quizzes={quizzes} onSave={handleSaveArticle} showToast={showToast} existingArticleCategories={existingArticleCategories} editingArticleDraft={editingArticleDraft} />} />
                                            <Route path="articles/edit/:articleId" element={<ArticleEditorPageWrapper articles={articles} quizzes={quizzes} onSave={handleSaveArticle} showToast={showToast} existingArticleCategories={existingArticleCategories} editingArticleDraft={editingArticleDraft} />} />
                                            <Route path="courses" element={<CourseListPage courses={courses} onEdit={handleEditCourse} onDelete={(id) => handleDeleteRequest(id, 'course')} onAddNew={handleNewCourse} onToggleStatus={handleToggleCourseStatus} onAssignRequest={handleAssignRequest} onSetVisibilityRequest={handleSetVisibilityRequest} />} />
                                            <Route path="courses/new" element={<CourseEditorPageWrapper editingCourseDraft={editingCourseDraft} setEditingCourseDraft={setEditingCourseDraft} articles={articles} quizzes={quizzes} onSave={handleSaveCourse} showToast={showToast} />} />
                                            <Route path="courses/edit/:courseId" element={<CourseEditorPageWrapper editingCourseDraft={editingCourseDraft} setEditingCourseDraft={setEditingCourseDraft} articles={articles} quizzes={quizzes} onSave={handleSaveCourse} showToast={showToast} />} />
                                            <Route path="paths" element={<LearningPathListPage paths={learningPaths} onEdit={handleEditLearningPath} onDelete={(id) => handleDeleteRequest(id, 'path')} onAddNew={handleNewLearningPath} onToggleStatus={handleToggleLearningPathStatus} onSetVisibilityRequest={handleSetVisibilityRequest} />} />
                                            <Route path="paths/new" element={<LearningPathEditorPageWrapper editingLearningPathDraft={editingLearningPathDraft} setEditingLearningPathDraft={setEditingLearningPathDraft} courses={courses} onSave={handleSaveLearningPath} showToast={showToast} />} />
                                            <Route path="paths/edit/:pathId" element={<LearningPathEditorPageWrapper editingLearningPathDraft={editingLearningPathDraft} setEditingLearningPathDraft={setEditingLearningPathDraft} courses={courses} onSave={handleSaveLearningPath} showToast={showToast} />} />
                                            <Route path="decks" element={<FlashcardDeckListPage decks={flashcardDecks} onEdit={handleEditFlashcardDeck} onDelete={(id) => handleDeleteRequest(id, 'deck')} onAddNew={handleNewFlashcardDeck} onToggleStatus={handleToggleFlashcardDeckStatus} onSetVisibilityRequest={handleSetVisibilityRequest} />} />
                                            <Route path="decks/new" element={<FlashcardDeckEditorPage deck={editingFlashcardDeckDraft} onDraftChange={setEditingFlashcardDeckDraft} onSave={handleSaveFlashcardDeck} showToast={showToast} />} />
                                            <Route path="decks/edit/:deckId" element={<FlashcardDeckEditorPage deck={editingFlashcardDeckDraft} onDraftChange={setEditingFlashcardDeckDraft} onSave={handleSaveFlashcardDeck} showToast={showToast} />} />
                                        </Route>
                                        <Route path="/articles/:articleId" element={<ArticleViewPageWrapper articles={articles} quizzes={quizzes} onStartQuiz={handleStartQuizRequest} onMarkAsRead={handleMarkArticleAsRead} articleProgress={articleProgress} profile={profile} fetchComments={fetchComments} postComment={postComment} deleteComment={deleteComment} setPasscodeContent={setPasscodeContent} setIsContentPasscodeModalOpen={setIsContentPasscodeModalOpen} showToast={showToast} userAnnotations={userAnnotations} onSaveAnnotation={handleSaveAnnotation} onDeleteAnnotation={handleDeleteAnnotation} />} />
                                        {/* === PUBLIC & USER ROUTES (with passcode and due date protection) === */}
                                        <Route path="/quiz/:id/take" element={<QuizPageWrapper pageType="take" {...{ quizzes, profile, handleSubmitQuiz: (id, ans, ord, time) => handleSubmitQuiz(id, ans, ord, time), setPasscodeQuiz, setIsPasscodeModalOpen, showToast }} />} />
                                        <Route path="/quiz/:id/practice" element={<QuizPageWrapper pageType="practice" {...{ quizzes, profile, setPasscodeQuiz, setIsPasscodeModalOpen, showToast }} />} />
                                        <Route path="/practice/review" element={<QuizPageWrapper pageType="review_practice" {...{ reviewPracticeQuiz, profile }} />} />
                                        <Route path="/practice/custom" element={<QuizPageWrapper pageType="custom_practice" {...{ customPracticeQuiz, profile }} />} /> {/* Custom practice doesn't need passcode */}
                                        <Route path="/quiz/:id/result" element={<QuizPageWrapper pageType="result" {...{ quizzes, lastResult, quizResults, handleStartReviewPractice }} />} /> {/* Results/reviews don't need passcode */}
                                        <Route path="/quiz/:id/review" element={<QuizPageWrapper pageType="review" {...{ quizzes, lastResult, quizResults, session, profile, fetchComments, postComment, deleteComment }} />} />
                                    </Routes>
                                </main>
                                <footer className="text-center py-4 text-gray-500 text-sm"><p>&copy; {new Date().getFullYear()} EduventureWithSeda. Bütün hüquqlar qorunur.</p></footer>
                            </div>
                        ) : <AuthPage showToast={showToast} />
                    } />
                </Routes>
            </Suspense>
            <Toast message={toast.message} isVisible={toast.isVisible} />
            <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, idToDelete: null, type: null })} onConfirm={confirmDelete} title={`${deleteModal.type} silməni təsdiqləyin`}><p>Bu {deleteModal.type} silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarılmazdır.</p></Modal>
            <PasscodeModal isOpen={isPasscodeModalOpen || isContentPasscodeModalOpen} onClose={() => { setIsPasscodeModalOpen(false); setIsContentPasscodeModalOpen(false); }} onConfirm={isPasscodeModalOpen ? handlePasscodeConfirm : handleContentPasscodeConfirm} showToast={showToast} />
            <ModeSelectionModal isOpen={isModeSelectionModalOpen} onClose={() => setIsModeSelectionModalOpen(false)} onSelect={handleModeSelected} />
            <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={handleImportQuestions} showToast={showToast} />
            <AddFromBankModal isOpen={isAddFromBankModalOpen} onClose={() => setIsAddFromBankModalOpen(false)} onAdd={handleAddQuestionsFromBank} showToast={showToast} questionBank={questionBank} />
            <AssignmentModal isOpen={isAssignmentModalOpen} onClose={() => setIsAssignmentModalOpen(false)} onAssign={handleCreateAssignment} allUsers={allUsers} studentGroups={studentGroups} itemTitle={assignmentData.itemTitle} />
            <VisibilityModal isOpen={isVisibilityModalOpen} onClose={() => setIsVisibilityModalOpen(false)} onSetVisibility={handleSetVisibility} allUsers={allUsers} studentGroups={studentGroups} itemTitle={visibilityData.itemTitle} currentVisibility={visibilityData.currentVisibility} />
            <WavingCat />
        </>
    );
}