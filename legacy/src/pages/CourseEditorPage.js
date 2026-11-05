import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { CheckIcon, ArrowLeftIcon, PlusIcon, ArrowUpIcon, ArrowDownIcon, TrashIcon, DocumentTextIcon, PencilAltIcon } from '../assets/icons';

const AddContentModal = ({ isOpen, onClose, articles, quizzes, onAddItems, existingItems }) => {
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [activeTab, setActiveTab] = useState('articles');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const { availableArticles, availableQuizzes } = useMemo(() => {
        const existingIds = new Set(existingItems.map(i => `${i.item_type}-${i.item_id}`));
        const availableArticles = articles
            .filter(a => !existingIds.has(`article-${a.id}`))
            .map(a => ({ ...a, type: 'article' }));
        const availableQuizzes = quizzes
            .filter(q => !existingIds.has(`quiz-${q.id}`))
            .map(q => ({ ...q, type: 'quiz' }));
        return { availableArticles, availableQuizzes };
    }, [articles, quizzes, existingItems]);

    const categories = useMemo(() => {
        const source = activeTab === 'articles' ? availableArticles : availableQuizzes;
        return ['all', ...new Set(source.map(item => item.category || 'Kateqoriyasız'))];
    }, [activeTab, availableArticles, availableQuizzes]);

    // Reset category filter when tab changes
    useEffect(() => {
        setSelectedCategory('all');
    }, [activeTab]);

    const handleToggleSelection = (item) => {
        const newSelection = new Set(selectedItems);
        const itemId = `${item.type}-${item.id}`;
        if (newSelection.has(itemId)) {
            newSelection.delete(itemId);
        } else {
            newSelection.add(itemId);
        }
        setSelectedItems(newSelection);
    };

    const handleAdd = () => {
        const allAvailableContent = [...availableArticles, ...availableQuizzes];
        const itemsToAdd = allAvailableContent.filter(item => selectedItems.has(`${item.type}-${item.id}`));
        onAddItems(itemsToAdd);
        setSelectedItems(new Set());
        onClose();
    };

    const contentToDisplay = useMemo(() => {
        const source = activeTab === 'articles' ? availableArticles : availableQuizzes;
        if (selectedCategory === 'all') {
            return source;
        }
        return source.filter(item => (item.category || 'Kateqoriyasız') === selectedCategory);
    }, [activeTab, availableArticles, availableQuizzes, selectedCategory]);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Material əlavə et">
            <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('articles')}
                        className={`${activeTab === 'articles' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <DocumentTextIcon /> Məqalələr ({availableArticles.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('quizzes')}
                        className={`${activeTab === 'quizzes' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <PencilAltIcon /> Testlər ({availableQuizzes.length})
                    </button>
                </nav>
            </div>
            <div className="mb-4">
                <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">Kateqoriya üzrə filtr</label>
                <select
                    id="category-filter"
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-orange-500 focus:border-orange-500"
                >
                    {categories.map(cat => <option key={cat} value={cat}>{cat === 'all' ? 'Bütün Kateqoriyalar' : cat}</option>)}
                </select>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2 pr-2">
                {contentToDisplay.length > 0 ? contentToDisplay.map(item => {
                    const itemId = `${item.type}-${item.id}`;
                    return (
                        <div key={itemId} className="flex items-center p-2 rounded-md hover:bg-gray-100">
                            <input
                                type="checkbox"
                                id={itemId}
                                checked={selectedItems.has(itemId)}
                                onChange={() => handleToggleSelection(item)}
                                className="h-4 w-4 text-orange-600 rounded mr-3"
                            />
                            <label htmlFor={itemId} className="flex-1 cursor-pointer text-sm font-medium flex items-center">
                                {item.type === 'article' ? <DocumentTextIcon className="mr-2 text-blue-500" /> : <PencilAltIcon className="mr-2 text-purple-500" />}
                                {item.title}
                            </label>
                        </div>
                    )
                }) : (
                    <p className="text-center text-gray-500 py-10">Bu kateqoriyada əlavə ediləcək material yoxdur.</p>
                )}
            </div>
            <div className="mt-6 flex justify-end">
                <Button onClick={handleAdd} disabled={selectedItems.size === 0}><PlusIcon /> Seçilmişləri əlavə et ({selectedItems.size})</Button>
            </div>
        </Modal>
    );
};

const CourseEditorPage = ({ course, onDraftChange, articles, quizzes, onSave, showToast }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    const handleDraftChange = (e) => {
        const { name, value, type, checked } = e.target;
        onDraftChange(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const moveItem = (index, direction) => {
        const newItems = [...course.items];
        const [item] = newItems.splice(index, 1);
        newItems.splice(index + direction, 0, item);
        onDraftChange(prev => ({ ...prev, items: newItems }));
    };

    const removeItem = (index) => {
        const newItems = course.items.filter((_, i) => i !== index);
        onDraftChange(prev => ({ ...prev, items: newItems }));
    };

    const addItems = (newItems) => {
        const formattedItems = newItems.map(item => ({
            item_id: item.id,
            item_type: item.type,
            title: item.title
        }));
        onDraftChange(prev => ({ ...prev, items: [...prev.items, ...formattedItems] }));
    };

    const handleSave = () => {
        if (!course.title.trim()) {
            showToast('Kursun başlığı boş ola bilməz.');
            return;
        }
        const finalDraft = { ...course, items: course.items.map((item, index) => ({ ...item, order: index })) };
        onSave(finalDraft);
    };

    if (!course) return <div>Yüklənir...</div>;

    return (
        <>
            <AddContentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                articles={articles}
                quizzes={quizzes}
                onAddItems={addItems}
                existingItems={course.items}
            />
            <div className="grid lg:grid-cols-3 gap-8 items-start">
                {/* Left Panel */}
                <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{course.id ? 'Kursu Redaktə Et' : 'Yeni Kurs Yarat'}</h1>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button variant="secondary" onClick={() => navigate('/admin/courses')} className="w-full justify-center"><ArrowLeftIcon /> Ləğv et</Button>
                            <Button onClick={handleSave} className="w-full justify-center"><CheckIcon /> Yadda saxla</Button>
                        </div>
                    </div>
                    <Card>
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><DocumentTextIcon /> Əsas Məlumatlar</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kursun Başlığı</label>
                                <input type="text" name="title" value={course.title} onChange={handleDraftChange} className="w-full p-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Təsvir</label>
                                <textarea name="description" value={course.description} onChange={handleDraftChange} rows="4" className="w-full p-2 border border-gray-300 rounded-md"></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Giriş Kodu (Könüllü)</label>
                                <input type="text" name="passcode" value={course.passcode || ''} onChange={handleDraftChange} className="w-full p-2 border border-gray-300 rounded-md" placeholder="Kurs üçün parol təyin et" />
                            </div>
                            <div>
                                <label className="flex items-center cursor-pointer">
                                    <input type="checkbox" name="is_published" checked={!!course.is_published} onChange={handleDraftChange} className="h-4 w-4 text-orange-600 rounded border-gray-300" />
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
                            <h3 className="font-bold">Kursun Proqramı</h3>
                            <Button onClick={() => setIsModalOpen(true)}><PlusIcon /> Material əlavə et</Button>
                        </div>
                        <div className="space-y-2">
                            {course.items.map((item, index) => (
                                <div key={`${item.item_type}-${item.item_id}-${index}`} className="p-3 rounded-lg flex items-center justify-between bg-white border">
                                    <div className="flex items-center">
                                        {item.item_type === 'article' ? <DocumentTextIcon className="mr-3 text-blue-500" /> : <PencilAltIcon className="mr-3 text-purple-500" />}
                                        <span className="font-medium">{item.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => moveItem(index, -1)} disabled={index === 0}><ArrowUpIcon /></Button>
                                        <Button size="sm" variant="ghost" onClick={() => moveItem(index, 1)} disabled={index === course.items.length - 1}><ArrowDownIcon /></Button>
                                        <Button size="sm" variant="danger" onClick={() => removeItem(index)}><TrashIcon /></Button>
                                    </div>
                                </div>
                            ))}
                            {course.items.length === 0 && <p className="text-center text-gray-500 py-8">Kursun proqramı boşdur.</p>}
                        </div>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default CourseEditorPage;
