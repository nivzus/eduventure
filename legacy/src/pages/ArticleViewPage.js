import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import Card from '../components/ui/Card';
import { useOnClickOutside } from 'usehooks-ts';
import Button from '../components/ui/Button';
import { ArrowLeftIcon, PlayIcon, CheckCircleIcon, PencilSquareIcon } from '../assets/icons';
import Comments from '../components/Comments'; 
import AnnotationPopup from '../components/AnnotationPopup';

const ArticleStyles = () => (
    <style>{`
        .article-content h1, .article-content h2, .article-content h3, .article-content h4 {
            margin-bottom: 0.75em !important;
            margin-top: 1.5em !important;
            font-weight: 700 !important;
            line-height: 1.3 !important;
        }
        .article-content h1 { font-size: 2.25em !important; !important; /* red-600 */ }
        .article-content h2 { font-size: 1.875em !important; !important; /* blue-600 */ }
        .article-content h3 { font-size: 1.5em !important; !important; /* green-600 */ }
        .article-content p {
            margin-bottom: 1.25em !important;
            line-height: 1.7 !important;
            color: #374151 !important; /* gray-700 */
        }
        .article-content ul, .article-content ol {
            margin-left: 1.5em !important;
            margin-bottom: 1.25em !important;
            padding-left: 1.5em !important;
        }
        .article-content ul { list-style-type: disc !important; }
        .article-content ol { list-style-type: decimal !important; }
        .article-content li { margin-bottom: 0.5em !important; }
        .article-content table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 1.5em !important;
            border: 1px solid #e5e7eb !important; /* gray-200 */
        }
        .article-content th, .article-content td {
            border: 1px solid #e5e7eb !important; /* gray-200 */
            padding: 0.75em 1em !important;
            text-align: left !important;
        }
        .article-content th {
            background-color: #f9fafb !important; /* gray-50 */
            font-weight: 600 !important;
        }
        .article-content a {
            color: #ea580c !important; /* orange-600 */
            text-decoration: underline !important;
        }
        .article-content strong { font-weight: 700 !important; }
        .article-content em { font-style: italic !important; }
        .article-content blockquote {
            border-left: 4px solid #f97316 !important; /* orange-500 */
            padding-left: 1em !important;
            margin-left: 0 !important;
            font-style: italic !important;
            color: #4b5563 !important; /* gray-600 */
        }
        .highlighted-annotation {
            background-color: rgba(253, 230, 138, 0.5) !important; /* yellow-300 with 50% opacity */
            cursor: pointer;
            position: relative;
        }
        .highlighted-annotation:hover {
            background-color: rgba(252, 211, 77, 0.6) !important; /* yellow-400 with 60% opacity */
        }
    `}</style>
);

const ArticleViewPage = ({ articles, quizzes, onStartQuiz, onMarkAsRead, articleProgress, profile, fetchComments, postComment, deleteComment, userAnnotations, onSaveAnnotation, onDeleteAnnotation }) => {
    const { articleId } = useParams();
    const navigate = useNavigate();
    const articleContentRef = useRef(null); 
    const [popupState, setPopupState] = useState({ stage: 'hidden', x: 0, y: 0, selection: null, existingAnnotation: null });

    const articleAnnotations = useMemo(() => (userAnnotations || []).filter(a => a.article_id === Number(articleId)), [userAnnotations, articleId]);

    const article = useMemo(() => {
        if (!articles || !quizzes) return null;
        const currentArticle = articles.find(a => a.id === Number(articleId));
        if (!currentArticle) return null;

        const attachedQuizIds = new Set((currentArticle.article_quizzes || []).map(aq => aq.quiz_id));
        const attachedQuizzes = quizzes.filter(q => attachedQuizIds.has(q.id));

        return { ...currentArticle, quizzes: attachedQuizzes };
    }, [articles, quizzes, articleId]);

    const isCompleted = useMemo(() => {
        return articleProgress.some(p => p.article_id === Number(articleId));
    }, [articleProgress, articleId]);

    const annotatedContent = useMemo(() => {
        let content = article?.content || '';
        if (articleAnnotations.length > 0) {
            articleAnnotations.forEach(annotation => {
                // Use a regular expression to replace all occurrences of the highlighted text
                // This is a simplified approach. A more robust solution might need to handle HTML tags within the text.
                const highlightedHtml = `<mark class="highlighted-annotation" data-annotation-id="${annotation.id}">${annotation.highlighted_text}</mark>`;
                // Escape special characters for regex
                const escapedText = annotation.highlighted_text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                content = content.replace(new RegExp(escapedText, 'g'), highlightedHtml);
            });
        }
        return DOMPurify.sanitize(content);
    }, [article?.content, articleAnnotations]);

    useEffect(() => {
        const contentNode = articleContentRef.current;
        if (!contentNode) return;

        const handleMouseUp = (e) => {
            // Don't trigger a new annotation if clicking on an existing one
            if (e.target.closest('.annotation-trigger-container')) {
                return;
            }

            // Don't trigger a new annotation if clicking on an existing one
            if (e.target.closest('.highlighted-annotation')) {
                return;
            }

            const selection = window.getSelection();
            const selectedText = selection.toString().trim();

            if (selectedText.length > 0 && contentNode.contains(selection.anchorNode)) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                setPopupState({
                    stage: 'trigger',
                    x: rect.left + window.scrollX,
                    y: rect.top + window.scrollY - 40, // Position above selection
                    selection: { text: selectedText, range },
                    existingAnnotation: null
                });
            } else {
                if (!e.target.closest('.annotation-popup-container')) { setPopupState({ stage: 'hidden' }); }
            }
        };

        const handleHighlightClick = (e) => {
            const highlightElement = e.target.closest('.highlighted-annotation');
            if (highlightElement) {
                const annotationId = highlightElement.dataset.annotationId;
                const annotation = articleAnnotations.find(a => a.id === Number(annotationId));
                if (annotation) {
                    const rect = highlightElement.getBoundingClientRect(); 
                    setPopupState({
                        stage: 'editor',
                        x: rect.left + window.scrollX,
                        y: rect.top + window.scrollY - 40,
                        selection: null,
                        existingAnnotation: annotation
                    });
                }
            }
        };

        document.addEventListener('mouseup', handleMouseUp);
        contentNode.addEventListener('click', handleHighlightClick);

        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
            contentNode.removeEventListener('click', handleHighlightClick);
        };
    }, [articleAnnotations]); // Re-bind events if annotations change



    const handleSaveAnnotation = (noteContent) => { 
        const data = popupState.existingAnnotation
            ? { ...popupState.existingAnnotation, note_content: noteContent }
            : { article_id: article.id, highlighted_text: popupState.selection.text, note_content: noteContent };
        onSaveAnnotation(data);
        setPopupState({ stage: 'hidden' });
    };

    if (!article) {
        return <Card><p className="text-center">Məqalə tapılmadı.</p></Card>;
    }

    const AnnotationTrigger = ({ x, y, onClick, onClose }) => {
        const ref = useRef(null);
        useOnClickOutside(ref, onClose);
        return (
            <div ref={ref} className="absolute z-20 annotation-trigger-container" style={{ left: `${x}px`, top: `${y}px` }}>
                <Button onClick={onClick} size="sm">
                    <PencilSquareIcon /> Qeyd əlavə et
                </Button>
            </div>
        );
    };

    return (
        <>
            <ArticleStyles /> 
            {popupState.stage === 'trigger' && (
                <AnnotationTrigger
                    x={popupState.x}
                    y={popupState.y}
                    onClick={() => setPopupState(prev => ({ ...prev, stage: 'editor' }))}
                    onClose={() => setPopupState({ stage: 'hidden' })}
                />
            )}
            {popupState.stage === 'editor' && (
                <AnnotationPopup
                    x={popupState.x}
                    y={popupState.y}
                    annotation={popupState.existingAnnotation}
                    onSave={handleSaveAnnotation}
                    onDelete={onDeleteAnnotation}
                    onClose={() => setPopupState({ stage: 'hidden' })}
                    className="annotation-popup-container"
                />
            )}
            <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <Button variant="secondary" onClick={() => navigate('/articles')}><ArrowLeftIcon /> Məqalələr siyahısına qayıt</Button>
                    {isCompleted ? (
                        <span className="flex items-center font-semibold text-green-600"><CheckCircleIcon className="w-6 h-6 mr-2" /> Oxunub</span>
                    ) : (
                        <Button onClick={() => onMarkAsRead(article.id)}>Oxunmuş kimi işarələ</Button>
                    )}
                </div>
                <Card>
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">{article.title}</h1>
                    <div ref={articleContentRef} className="article-content" dangerouslySetInnerHTML={{ __html: annotatedContent }} />
                    <div className="mt-6 pt-6 border-t">
                        <Comments
                            targetId={article.id}
                            targetType="article"
                            profile={profile}
                            fetchComments={fetchComments}
                            postComment={postComment}
                            deleteComment={deleteComment}
                        />
                    </div>
                </Card>

                {article.quizzes && article.quizzes.length > 0 && (
                    <Card>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Mövzuya aid testlər</h2>
                        <div className="space-y-3">
                            {article.quizzes.map(quiz => (
                                <div key={quiz.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50">
                                    <div>
                                        <h3 className="font-semibold text-lg">{quiz.title}</h3>
                                        <p className="text-sm text-gray-500">{quiz.questions.length} sual</p>
                                    </div>
                                    <Button onClick={() => onStartQuiz(quiz.id)}><PlayIcon /> Testə Başla</Button>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        </>
    );
};

export default ArticleViewPage;
