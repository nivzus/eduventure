import React, { useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ArrowLeftIcon, DocumentTextIcon, PencilAltIcon, PlayIcon, CheckCircleIcon, StarIcon, DownloadIcon } from '../assets/icons';
import Certificate from '../components/Certificate';

const CourseViewPage = ({ courses, onStartQuiz, articleProgress, quizResults, session, profile }) => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const certificateRef = useRef();
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const course = useMemo(() => {
        return courses.find(c => c.id === Number(courseId));
    }, [courses, courseId]);

    const contentWithStatus = useMemo(() => {
        if (!course || !session) return (course?.course_items || []).sort((a, b) => a.order - b.order).map(item => ({ ...item, isCompleted: false }));

        const completedArticleIds = new Set((articleProgress || []).map(p => p.article_id));
        const completedQuizIds = new Set((quizResults || []).filter(r => r.user_id === session.user.id).map(r => r.quizId));

        return (course.course_items || []).sort((a, b) => a.order - b.order).map(item => {
            let isCompleted = false;
            if (item.article_id) {
                isCompleted = completedArticleIds.has(item.article_id);
            } else if (item.quiz_id) {
                isCompleted = completedQuizIds.has(item.quiz_id);
            }
            return { ...item, isCompleted };
        });
    }, [course, articleProgress, quizResults, session]);

    const courseProgress = useMemo(() => {
        const totalItems = contentWithStatus.length;
        if (totalItems === 0) return { completedCount: 0, totalCount: 0, percentage: 0, nextItem: null };

        const completedCount = contentWithStatus.filter(item => item.isCompleted).length;
        const percentage = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;
        const nextItem = contentWithStatus.find(item => !item.isCompleted);

        return { completedCount, totalCount: totalItems, percentage, nextItem };
    }, [contentWithStatus]);

    const handleContinue = () => {
        if (courseProgress.nextItem) {
            const { article_id, quiz_id } = courseProgress.nextItem;
            if (article_id) {
                navigate(`/articles/${article_id}`);
            } else if (quiz_id) {
                onStartQuiz(quiz_id);
            }
        }
    };

    const handleDownloadCertificate = async () => {
        if (!certificateRef.current || !profile) return;
        setIsGeneratingPdf(true);

        try {
            const canvas = await html2canvas(certificateRef.current, {
                scale: 1,
                useCORS: true,
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [1123, 794]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, 1123, 794);
            pdf.save(`${profile.first_name}_${profile.last_name}_${course.title}_sertifikat.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            // Optionally show a toast message for the error
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    if (!course) {
        return <Card className="text-center py-12"><p className="text-gray-500">Yüklənir...</p></Card>;
    }

    return (
        <>
            {/* Hidden Certificate for PDF generation */}
            <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
                <Certificate
                    ref={certificateRef}
                    studentName={`${profile?.first_name || ''} ${profile?.last_name || ''}`}
                    courseTitle={course.title}
                    completionDate={new Date().toLocaleDateString('az-AZ')}
                />
            </div>
            <div className="animate-fade-in max-w-4xl mx-auto space-y-8">
                <div>
                    <Link to="/courses">
                        <Button variant="secondary" className="mb-4"><ArrowLeftIcon /> Kurslar siyahısına qayıt</Button>
                    </Link>
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <h1 className="text-4xl font-extrabold text-gray-900 mb-3">{course.title}</h1>
                        <p className="text-lg text-gray-600 mb-6">{course.description}</p>
                        
                        {/* Progress Bar and Continue Button */}
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-orange-600">Kursun proqresi</span>
                                    <span className="text-sm text-gray-500">{courseProgress.completedCount} / {courseProgress.totalCount} tamamlanıb</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div className="bg-gradient-to-r from-orange-400 to-red-500 h-2.5 rounded-full" style={{ width: `${courseProgress.percentage}%` }}></div>
                                </div>
                            </div>
                            {courseProgress.nextItem ? (
                                <Button onClick={handleContinue} className="w-full sm:w-auto"><PlayIcon /> Davam et</Button>
                            ) : courseProgress.totalCount > 0 && courseProgress.percentage === 100 ? (
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-lg font-semibold text-green-600 bg-green-50 p-3 rounded-md">
                                    <div className="flex items-center gap-2">
                                        <StarIcon />
                                        <span>Təbriklər, kursu tamamladınız!</span>
                                    </div>
                                    <Button onClick={handleDownloadCertificate} disabled={isGeneratingPdf} className="w-full sm:w-auto">
                                        <DownloadIcon />
                                        {isGeneratingPdf ? 'Generasiya olunur...' : 'Sertifikatı Yüklə'}
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Kursun Proqramı</h2>
                    <ol className="space-y-4">
                        {contentWithStatus.map((item, index) => {
                                let itemTitle = 'Yüklənir...';
                                let itemIcon = null;
                                let itemLink = null;
                                let actionButton = null;

                                if (item.articles) {
                                    itemTitle = item.articles.title;
                                    itemIcon = <DocumentTextIcon className="w-6 h-6 text-blue-500" />;
                                    itemLink = `/articles/${item.article_id}`;
                                    actionButton = <Link to={itemLink}><Button variant="secondary" size="sm">Bax</Button></Link>;
                                } else if (item.quizzes) {
                                    itemTitle = item.quizzes.title;
                                    itemIcon = <PencilAltIcon className="w-6 h-6 text-purple-500" />;
                                    actionButton = <Button size="sm" onClick={() => onStartQuiz(item.quiz_id)}><PlayIcon /> Başla</Button>;
                                }

                                return (
                                    <li key={item.id || `${item.article_id || item.quiz_id}-${item.order}`} className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-200 ${!item.isCompleted && courseProgress.nextItem?.id === item.id ? 'border-orange-400 bg-orange-50/50' : 'hover:border-gray-300'}`}>
                                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${item.isCompleted ? 'bg-green-100' : 'bg-gray-100'}`}>
                                            {item.isCompleted ? <CheckCircleIcon className="w-6 h-6 text-green-500" /> : <span className="font-bold text-gray-500">{index + 1}</span>}
                                        </div>
                                        <div className="flex-shrink-0">
                                            {itemIcon}
                                        </div>
                                        <div className="flex-grow">
                                            <p className="font-semibold text-gray-800">{itemTitle}</p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            {actionButton}
                                        </div>
                                    </li>
                                );
                        })}
                    </ol>
                    {(course.course_items || []).length === 0 && (
                        <p className="text-center text-gray-500 py-8">Kursun proqramı boşdur.</p>
                    )}
                </div>
            </div>
        </>
    );
};

export default CourseViewPage;
