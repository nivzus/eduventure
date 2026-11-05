import React, { useState, useMemo } from 'react';
import Card from '../components/ui/Card';
import { CollectionIcon, SearchIcon, BookmarkIcon, LockClosedIcon } from '../assets/icons';
import { useHasAccess } from '../hooks/useHasAccess';

const PublicCourseListPage = ({ courses, articleProgress, quizResults, session, onNavigate, toggleBookmark, isBookmarked, profile }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const coursesWithProgress = useMemo(() => {
        const lowercasedTerm = searchTerm.toLowerCase();

        const publishedAndFiltered = courses
            .filter(course => course.is_published)
            .filter(course =>
                course.title.toLowerCase().includes(lowercasedTerm) ||
                (course.description && course.description.toLowerCase().includes(lowercasedTerm))
            );

        if (!session) {
            return publishedAndFiltered.map(course => ({ ...course, progress: 0 }));
        }

        const completedArticleIds = new Set((articleProgress || []).map(p => p.article_id));
        const completedQuizIds = new Set((quizResults || []).filter(r => r.user_id === session.user.id).map(r => r.quizId));

        return publishedAndFiltered.map(course => {
            const totalItems = course.course_items?.length || 0;
            if (totalItems === 0) {
                return { ...course, progress: 0 };
            }

            let completedCount = 0;
            (course.course_items || []).forEach(item => {
                if (item.article_id && completedArticleIds.has(item.article_id)) {
                    completedCount++;
                } else if (item.quiz_id && completedQuizIds.has(item.quiz_id)) {
                    completedCount++;
                }
            });

            const progress = Math.round((completedCount / totalItems) * 100);
            return { ...course, progress };
        });
    }, [courses, articleProgress, quizResults, session, searchTerm]);

    const CourseCard = ({ course }) => {
        const hasAccess = useHasAccess(course, profile);
        const isSaved = isBookmarked(course.id, 'course');
        const isClickable = hasAccess;

        return (
            <div
                key={course.id}
                onClick={() => isClickable && onNavigate(course, 'course')}
                className={`relative group transition-transform duration-200 ${isClickable ? 'cursor-pointer hover:-translate-y-1' : 'cursor-not-allowed'}`}
            >
                <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                    {!hasAccess && (
                        <div className="text-gray-400" title="Məhdud giriş">
                            <LockClosedIcon className="w-5 h-5" />
                        </div>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleBookmark(course.id, 'course'); }}
                        className="p-1 rounded-full hover:bg-orange-100 text-orange-500"
                        title={isSaved ? "Əlfəcini sil" : "Əlfəcinlərə əlavə et"}
                    >
                        <BookmarkIcon filled={isSaved} />
                    </button>
                </div>
                <Card className={`group-hover:shadow-orange-200 transition-shadow duration-200 h-full flex flex-col ${!hasAccess ? 'bg-gray-100' : ''}`}>
                    <div className="flex-grow">
                        <h2 className="text-xl font-bold text-gray-800 mb-2 pr-12">{course.title}</h2>
                        <p className="text-sm text-gray-600">{course.description}</p>
                    </div>
                    {session && hasAccess && (
                        <div className="mt-4">
                            <div className="flex justify-between mb-1"><span className="text-xs font-medium text-gray-700">Proqres</span><span className="text-xs font-medium text-green-700">{course.progress}%</span></div>
                            <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${course.progress}%` }}></div></div>
                        </div>)}
                    <div className="text-sm text-gray-500 mt-4 pt-4 border-t border-gray-200 flex justify-between items-center"><span>{course.course_items?.length || 0} dərs</span><span className="flex items-center gap-1"><CollectionIcon className="w-4 h-4" /> Kurs</span></div>
                </Card>
            </div>)
    }

    return (
        <div className="animate-fade-in">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Kurslar</h1>
            <div className="mb-6">
                <Card className="!p-4 bg-gray-50 border border-gray-200">
                    <div className="relative flex-grow w-full">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><SearchIcon /></span>
                        <input
                            type="text"
                            placeholder="Kurs adına və ya təsvirinə görə axtarış..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg w-full focus:ring-orange-400 focus:border-orange-400 transition"
                        />
                    </div>
                </Card>
            </div>
            {coursesWithProgress.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {coursesWithProgress.map(course => <CourseCard key={course.id} course={course} />)}
                </div>
            ) : (
                <Card className="text-center py-12">
                    <p className="text-gray-500">{searchTerm ? 'Axtarışınıza uyğun heç bir kurs tapılmadı.' : 'Hələ heç bir kurs dərc edilməyib.'}</p>
                </Card>
            )}
        </div>
    );
};

export default PublicCourseListPage;