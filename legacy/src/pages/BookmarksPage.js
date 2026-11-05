import React, { useMemo } from 'react';
import { BookOpenIcon, DocumentTextIcon, CollectionIcon, BookmarkIcon } from '../assets/icons';

const ItemCard = ({ item, type, onNavigate, onStartQuiz, onToggleBookmark, isBookmarked }) => {
    const typeInfo = {
        quiz: { icon: <BookOpenIcon />, title: item.title, typeName: 'Test' },
        article: { icon: <DocumentTextIcon />, title: item.title, typeName: 'Məqalə' },
        course: { icon: <CollectionIcon />, title: item.title, typeName: 'Kurs' },
    };

    const info = typeInfo[type];
    if (!info) return null;

    const handleBookmarkClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleBookmark(item.id, type);
    };

    const handleCardClick = (e) => {
        if (e.target.closest('.bookmark-btn')) {
            return;
        }
        if (type === 'quiz') {
            onStartQuiz(item.id);
        } else {
            onNavigate(item, type);
        }
    };

    return (
        <div onClick={handleCardClick} className="block bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow relative group cursor-pointer">
            <button
                onClick={handleBookmarkClick}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-orange-100 text-orange-500 bookmark-btn"
                title={isBookmarked ? "Əlfəcini sil" : "Əlfəcinlərə əlavə et"}
            >
                <BookmarkIcon filled={isBookmarked} />
            </button>
            <div className="flex items-start gap-4">
                <div className="text-orange-500 mt-1">{info.icon}</div>
                <div className="flex-1">
                    <h3 className="font-bold text-lg pr-8">{info.title}</h3>
                    <p className="text-sm text-gray-500 capitalize">{info.typeName}</p>
                </div>
            </div>
        </div>
    );
};

const BookmarksPage = ({ bookmarks, quizzes, articles, courses, onNavigate, onStartQuiz, toggleBookmark, isBookmarked }) => {
    const groupedBookmarks = useMemo(() => {
        const groups = {
            quiz: [],
            article: [],
            course: [],
        };

        bookmarks.forEach(bookmark => {
            const { item_type, item_id } = bookmark;
            let source;
            if (item_type === 'quiz') source = quizzes;
            else if (item_type === 'article') source = articles;
            else if (item_type === 'course') source = courses;

            if (source) {
                const itemData = source.find(item => item.id === item_id);
                if (itemData) {
                    groups[item_type].push({ ...bookmark, itemData });
                }
            }
        });

        return groups;
    }, [bookmarks, quizzes, articles, courses]);

    const totalBookmarks = groupedBookmarks.quiz.length + groupedBookmarks.article.length + groupedBookmarks.course.length;

    const typeHeadings = {
        course: { title: 'Kurslar', icon: <CollectionIcon /> },
        article: { title: 'Məqalələr', icon: <DocumentTextIcon /> },
        quiz: { title: 'Testlər', icon: <BookOpenIcon /> },
    };

    const renderGroup = (items, type) => {
        if (items.length === 0) return null;
        const headingInfo = typeHeadings[type];
        return (
            <div key={type} className="mb-8">
                <div className="flex items-center gap-3 mb-4 border-b pb-2">
                    <div className="text-orange-500">{headingInfo.icon}</div>
                    <h2 className="text-xl font-bold text-gray-700">{headingInfo.title}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map(({ item_id, item_type, itemData }) => (<ItemCard key={`${item_type}-${item_id}`} item={itemData} type={item_type} onNavigate={onNavigate} onStartQuiz={onStartQuiz} onToggleBookmark={toggleBookmark} isBookmarked={isBookmarked(item_id, item_type)} />))}
                </div>
            </div>
        );
    };

    return (
        <div className="container mx-auto p-4">
            <div className="flex items-center gap-2 mb-6">
                <BookmarkIcon filled={true} />
                <h1 className="text-2xl font-bold">Əlfəcinlərim</h1>
            </div>

            {totalBookmarks > 0 ? (<div>
                    {renderGroup(groupedBookmarks.course, 'course')}
                    {renderGroup(groupedBookmarks.article, 'article')}
                    {renderGroup(groupedBookmarks.quiz, 'quiz')}
                </div>) : (<div className="text-center py-12 bg-white rounded-lg shadow">
                    <p className="text-gray-500">Sizin hələ əlfəcininiz yoxdur.</p>
                    <p className="text-sm text-gray-400 mt-2">Onları burada saxlamaq üçün kurs, məqalə və ya test kartındakı əlfəcin işarəsinə klikləyin.</p>
                </div>)}
        </div>);
};

export default BookmarksPage;