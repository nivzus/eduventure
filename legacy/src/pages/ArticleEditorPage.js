import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import mammoth from 'mammoth';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ComboBox from '../components/ui/ComboBox';
import { ArrowLeftIcon, CheckIcon, DocumentTextIcon, PencilAltIcon, UploadIcon } from '../assets/icons';

const ArticleEditorPage = ({ article, onSave, showToast, existingArticleCategories, quizzes }) => {
    const [draft, setDraft] = useState(article);
    const [selectedQuizIds, setSelectedQuizIds] = useState(new Set());
    const [selectedQuizCategory, setSelectedQuizCategory] = useState('all');
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const editorRef = useRef(null); // Ref for TinyMCE editor instance

    useEffect(() => {
        setDraft(article);
        const initialQuizIds = new Set((article?.article_quizzes || []).map(aq => aq.quiz_id));
        setSelectedQuizIds(initialQuizIds);
    }, [article]);

    const handleDraftChange = (e) => {
        const { name, value, type, checked } = e.target;
        setDraft(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleCategoryChange = (value) => {
        setDraft(prev => ({ ...prev, category: value }));
    };

    const onContentChange = (content) => {
        setDraft(prev => ({ ...prev, content: content }));
    };

    const handleQuizSelection = (quizId) => {
        const newSelection = new Set(selectedQuizIds);
        if (newSelection.has(quizId)) {
            newSelection.delete(quizId);
        } else {
            newSelection.add(quizId);
        }
        setSelectedQuizIds(newSelection);
    };

    const handleSave = () => {
        if (!draft.title || !draft.title.trim()) {
            showToast('Məqalə başlığı boş ola bilməz.');
            return;
        }
        onSave({ ...draft, selectedQuizIds: Array.from(selectedQuizIds) });
    };

    const handleWordUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        showToast('Word sənədi çevrilir...');
        const reader = new FileReader();

        reader.onload = (loadEvent) => {
            const arrayBuffer = loadEvent.target.result;
            mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
                .then(result => {
                    // Insert HTML directly into TinyMCE editor
                    if (editorRef.current) {
                        editorRef.current.setContent(result.value);
                        onContentChange(result.value); // Also update React state
                    }
                    showToast('Məqalə uğurla idxal edildi!', 'success');
                })
                .catch(error => {
                    console.error("Docx to HTML conversion error:", error);
                    showToast('Word sənədini çevirərkən xəta baş verdi.', 'error');
                });
        };

        reader.onerror = (error) => {
            console.error("File reading error:", error);
            showToast('Sənədi oxuyarkən xəta baş verdi.', 'error');
        };

        reader.readAsArrayBuffer(file);
        event.target.value = null; // Reset file input
    };

    const triggerFileUpload = () => {
        fileInputRef.current.click();
    };

    const quizCategories = useMemo(() => {
        return ['all', ...new Set((quizzes || []).map(q => q.category || 'Kateqoriyasız'))];
    }, [quizzes]);

    const filteredQuizzes = useMemo(() => {
        if (!quizzes) return [];
        if (selectedQuizCategory === 'all') {
            return quizzes;
        }
        return quizzes.filter(q => (q.category || 'Kateqoriyasız') === selectedQuizCategory);
    }, [quizzes, selectedQuizCategory]);

    if (!draft) return <div>Yüklənir...</div>;

    return (
        <div className="animate-fade-in">
            <div className="grid lg:grid-cols-3 gap-8 items-start">
                {/* Left Panel */}
                <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Məqalə Redaktoru</h1>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button onClick={() => navigate('/admin/articles')} variant="secondary" className="w-full justify-center"><ArrowLeftIcon /> Siyahıya qayıt</Button>
                            <Button onClick={handleSave} className="w-full justify-center"><CheckIcon /> Yadda saxla</Button>
                        </div>
                    </div>
                    <Card>
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><DocumentTextIcon /> Əsas Məlumatlar</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Başlıq</label>
                                <input type="text" name="title" value={draft.title || ''} onChange={handleDraftChange} className="w-full p-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kateqoriya</label>
                                <ComboBox options={existingArticleCategories} value={draft.category || ''} onChange={handleCategoryChange} placeholder="Kateqoriya seçin..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Giriş Kodu (Könüllü)</label>
                                <input type="text" name="passcode" value={draft.passcode || ''} onChange={handleDraftChange} className="w-full p-2 border border-gray-300 rounded-md" placeholder="Məqalə üçün parol təyin et" />
                            </div>
                            <div>
                                <label className="flex items-center cursor-pointer">
                                    <input type="checkbox" name="is_published" checked={!!draft.is_published} onChange={handleDraftChange} className="h-4 w-4 text-orange-600 rounded border-gray-300" />
                                    <span className="ml-2 text-sm text-gray-700">Dərc edilsin</span>
                                </label>
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><PencilAltIcon /> Əlaqəli Testlər</h3>
                        <div className="mb-4">
                            <label htmlFor="quiz-category-filter" className="block text-sm font-medium text-gray-700 mb-1">Testləri kateqoriya üzrə filtr edin</label>
                            <select
                                id="quiz-category-filter"
                                value={selectedQuizCategory}
                                onChange={e => setSelectedQuizCategory(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-orange-500 focus:border-orange-500"
                            >
                                {quizCategories.map(cat => <option key={cat} value={cat}>{cat === 'all' ? 'Bütün Testlər' : cat}</option>)}
                            </select>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                            {filteredQuizzes.length > 0 ? filteredQuizzes.map(quiz => (
                                <div key={quiz.id}>
                                    <label className="flex items-center cursor-pointer p-2 rounded-md hover:bg-gray-100">
                                        <input type="checkbox" checked={selectedQuizIds.has(quiz.id)} onChange={() => handleQuizSelection(quiz.id)} className="h-4 w-4 text-orange-600 rounded border-gray-300" />
                                        <span className="ml-3 text-sm text-gray-800">{quiz.title}</span>
                                    </label>
                                </div>
                            )) : <p className="text-sm text-gray-500 text-center py-4">Bu kateqoriyada test yoxdur.</p>}
                        </div>
                    </Card>
                </div>

                {/* Right Panel */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-gray-800">Məqalə Məzmunu</h3>
                            <div>
                                <input type="file" ref={fileInputRef} onChange={handleWordUpload} accept=".docx" className="hidden" />
                                <Button onClick={triggerFileUpload} variant="secondary"><UploadIcon /> Word-dən idxal et</Button>
                            </div>
                        </div>
                        <Editor
                            apiKey="ocpsuuiv9mu6iw0y1u66hwuexghbh8jfdb2tmom17zk5nqo5"
                            onInit={(evt, editor) => editorRef.current = editor}
                            value={draft.content || ''}
                            onEditorChange={onContentChange}
                            init={{
                                height: 500,
                                menubar: false,
                                plugins: [
                                    'advlist autolink lists link image charmap print preview anchor',
                                    'searchreplace visualblocks code fullscreen',
                                    'insertdatetime media table paste code help wordcount'
                                ],
                                toolbar: 'undo redo | formatselect | ' +
                                    'bold italic backcolor | alignleft aligncenter ' +
                                    'alignright alignjustify | bullist numlist outdent indent | ' +
                                    'removeformat | help'
                            }}
                        />
                    </Card>
                    {/* Preview Card is no longer needed as TinyMCE is WYSIWYG */}
                    {/* <Card>
                        <h3 className="font-bold text-gray-800 mb-3">Önizləmə</h3>
                        <div className="prose max-w-none p-4 border rounded-md bg-gray-50 min-h-[200px]">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft.content || 'Önizləmə üçün məzmun daxil edin...'}</ReactMarkdown>
                        </div>
                    </Card> */}
                </div>
            </div>
        </div>
    );
};

export default ArticleEditorPage;
