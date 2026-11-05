import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ArrowLeftIcon, CollectionIcon, CheckCircleIcon } from '../assets/icons';

const LearningPathViewPage = ({ learningPaths, courses, onStartQuiz, articleProgress, quizResults, profile }) => {
    const { pathId } = useParams();

    const path = useMemo(() => {
        return learningPaths.find(p => p.id === Number(pathId));
    }, [learningPaths, pathId]);

    const contentWithStatus = useMemo(() => {
        if (!path || !courses) return [];

        const completedArticleIds = new Set((articleProgress || []).filter(p => p.user_id === profile?.id).map(p => p.article_id));
        const completedQuizIds = new Set((quizResults || []).filter(r => r.user_id === profile?.id).map(r => r.quizId));

        return (path.path_items || []).sort((a, b) => a.order - b.order).map(item => {
            const courseDetails = courses.find(c => c.id === item.course_id);
            if (!courseDetails) return { ...item, course: null, isCompleted: false, progress: 0 };

            const totalItems = courseDetails.course_items?.length || 0;
            if (totalItems === 0) {
                return { ...item, course: courseDetails, isCompleted: false, progress: 0 };
            }

            let completedCount = 0;
            (courseDetails.course_items || []).forEach(courseItem => {
                if (courseItem.article_id && completedArticleIds.has(courseItem.article_id)) {
                    completedCount++;
                } else if (courseItem.quiz_id && completedQuizIds.has(courseItem.quiz_id)) {
                    completedCount++;
                }
            });

            const progress = Math.round((completedCount / totalItems) * 100);
            const isCompleted = progress === 100;

            return { ...item, course: courseDetails, isCompleted, progress };
        });
    }, [path, courses, articleProgress, quizResults, profile]);

    const pathProgress = useMemo(() => {
        const totalItems = contentWithStatus.length;
        if (totalItems === 0) return { completedCount: 0, totalCount: 0, percentage: 0 };

        const completedCount = contentWithStatus.filter(item => item.isCompleted).length;
        const percentage = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

        return { completedCount, totalCount: totalItems, percentage };
    }, [contentWithStatus]);

    if (!path) {
        return <Card className="text-center py-12"><p className="text-gray-500">Yüklənir...</p></Card>;
    }

    return (
        <div className="animate-fade-in max-w-4xl mx-auto space-y-8">
            <div>
                <Link to="/paths">
                    <Button variant="secondary" className="mb-4"><ArrowLeftIcon /> Tədris Yolları siyahısına qayıt</Button>
                </Link>
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-3">{path.title}</h1>
                    <p className="text-lg text-gray-600 mb-6">{path.description}</p>
                    
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-orange-600">Ümumi proqres</span>
                                <span className="text-sm text-gray-500">{pathProgress.completedCount} / {pathProgress.totalCount} kurs tamamlanıb</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-gradient-to-r from-orange-400 to-red-500 h-2.5 rounded-full" style={{ width: `${pathProgress.percentage}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Tədris Yolunun Proqramı</h2>
                <ol className="space-y-4">
                    {contentWithStatus.map((item, index) => {
                        if (!item.course) return null; // Skip if course data is missing

                        return (
                            <li key={item.id} className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-200 ${item.isCompleted ? 'bg-green-50' : 'hover:border-gray-300'}`}>
                                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${item.isCompleted ? 'bg-green-100' : 'bg-gray-100'}`}>
                                    {item.isCompleted ? <CheckCircleIcon className="w-6 h-6 text-green-500" /> : <span className="font-bold text-gray-500">{index + 1}</span>}
                                </div>
                                <div className="flex-shrink-0">
                                    <CollectionIcon className="w-6 h-6 text-purple-500" />
                                </div>
                                <div className="flex-grow">
                                    <p className="font-semibold text-gray-800">{item.course.title}</p>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${item.progress}%` }}></div>
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    <Link to={`/courses/${item.course.id}`}><Button variant="secondary" size="sm">Kursa Keç</Button></Link>
                                </div>
                            </li>
                        );
                    })}
                </ol>
                {(path.path_items || []).length === 0 && (
                    <p className="text-center text-gray-500 py-8">Tədris yolunun proqramı boşdur.</p>
                )}
            </div>
        </div>
    );
};

export default LearningPathViewPage;