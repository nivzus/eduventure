import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { CheckIcon, ArrowLeftIcon, PlusIcon, ArrowUpIcon, ArrowDownIcon, TrashIcon, DocumentTextIcon, CollectionIcon } from '../assets/icons';

// Modal for adding courses to a learning path
const AddCoursesModal = ({ isOpen, onClose, courses, onAddItems, existingItems }) => {
    const [selectedItems, setSelectedItems] = useState(new Set());

    const availableCourses = useMemo(() => {
        const existingIds = new Set(existingItems.map(i => i.course_id));
        return courses.filter(c => !existingIds.has(c.id));
    }, [courses, existingItems]);

    const handleToggleSelection = (courseId) => {
        const newSelection = new Set(selectedItems);
        if (newSelection.has(courseId)) {
            newSelection.delete(courseId);
        } else {
            newSelection.add(courseId);
        }
        setSelectedItems(newSelection);
    };

    const handleAdd = () => {
        const itemsToAdd = availableCourses.filter(course => selectedItems.has(course.id));
        onAddItems(itemsToAdd);
        setSelectedItems(new Set());
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Kursa əlavə et">
            <div className="max-h-72 overflow-y-auto space-y-2 pr-2">
                {availableCourses.length > 0 ? availableCourses.map(course => {
                    return (
                        <div key={course.id} className="flex items-center p-2 rounded-md hover:bg-gray-100">
                            <input
                                type="checkbox"
                                id={`course-${course.id}`}
                                checked={selectedItems.has(course.id)}
                                onChange={() => handleToggleSelection(course.id)}
                                className="h-4 w-4 text-orange-600 rounded mr-3"
                            />
                            <label htmlFor={`course-${course.id}`} className="flex-1 cursor-pointer text-sm font-medium flex items-center">
                                <CollectionIcon className="mr-2 text-purple-500" />
                                {course.title}
                            </label>
                        </div>
                    )
                }) : (
                    <p className="text-center text-gray-500 py-10">Əlavə ediləcək kurs yoxdur.</p>
                )}
            </div>
            <div className="mt-6 flex justify-end">
                <Button onClick={handleAdd} disabled={selectedItems.size === 0}><PlusIcon /> Seçilmişləri əlavə et ({selectedItems.size})</Button>
            </div>
        </Modal>
    );
};


const LearningPathEditorPage = ({ path, onDraftChange, courses, onSave, showToast }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    const handleDraftChange = (e) => {
        const { name, value, type, checked } = e.target;
        onDraftChange(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const moveItem = (index, direction) => {
        const newItems = [...path.items];
        const [item] = newItems.splice(index, 1);
        newItems.splice(index + direction, 0, item);
        onDraftChange(prev => ({ ...prev, items: newItems }));
    };

    const removeItem = (index) => {
        const newItems = path.items.filter((_, i) => i !== index);
        onDraftChange(prev => ({ ...prev, items: newItems }));
    };

    const addItems = (newCourses) => {
        const formattedItems = newCourses.map(course => ({
            course_id: course.id,
            courses: { // Mimic the structure from a Supabase join
                title: course.title
            }
        }));
        onDraftChange(prev => ({ ...prev, items: [...prev.items, ...formattedItems] }));
    };

    const handleSave = () => {
        if (!path.title.trim()) {
            showToast('Tədris yolunun başlığı boş ola bilməz.');
            return;
        }
        // Add order to each item before saving
        const finalDraft = { ...path, items: path.items.map((item, index) => ({ ...item, order: index })) };
        onSave(finalDraft);
    };

    if (!path) return <div>Yüklənir...</div>;

    return (
        <>
            <AddCoursesModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                courses={courses}
                onAddItems={addItems}
                existingItems={path.items}
            />
            <div className="grid lg:grid-cols-3 gap-8 items-start">
                {/* Left Panel */}
                <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{path.id ? 'Tədris Yolunu Redaktə Et' : 'Yeni Tədris Yolu Yarat'}</h1>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button variant="secondary" onClick={() => navigate('/admin/paths')} className="w-full justify-center"><ArrowLeftIcon /> Ləğv et</Button>
                            <Button onClick={handleSave} className="w-full justify-center"><CheckIcon /> Yadda saxla</Button>
                        </div>
                    </div>
                    <Card>
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><DocumentTextIcon /> Əsas Məlumatlar</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Yolun Başlığı</label>
                                <input type="text" name="title" value={path.title} onChange={handleDraftChange} className="w-full p-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Təsvir</label>
                                <textarea name="description" value={path.description} onChange={handleDraftChange} rows="4" className="w-full p-2 border border-gray-300 rounded-md"></textarea>
                            </div>
                            <div>
                                <label className="flex items-center cursor-pointer">
                                    <input type="checkbox" name="is_published" checked={!!path.is_published} onChange={handleDraftChange} className="h-4 w-4 text-orange-600 rounded border-gray-300" />
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
                            <h3 className="font-bold">Tədris Yolunun Proqramı</h3>
                            <Button onClick={() => setIsModalOpen(true)}><PlusIcon /> Kurs əlavə et</Button>
                        </div>
                        <div className="space-y-2">
                            {path.items.map((item, index) => (
                                <div key={`${item.course_id}-${index}`} className="p-3 rounded-lg flex items-center justify-between bg-white border">
                                    <div className="flex items-center">
                                        <CollectionIcon className="mr-3 text-purple-500" />
                                        <span className="font-medium">{item.courses?.title || 'Kurs adı tapılmadı'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => moveItem(index, -1)} disabled={index === 0}><ArrowUpIcon /></Button>
                                        <Button size="sm" variant="ghost" onClick={() => moveItem(index, 1)} disabled={index === path.items.length - 1}><ArrowDownIcon /></Button>
                                        <Button size="sm" variant="danger" onClick={() => removeItem(index)}><TrashIcon /></Button>
                                    </div>
                                </div>
                            ))}
                            {path.items.length === 0 && <p className="text-center text-gray-500 py-8">Tədris yolunun proqramı boşdur.</p>}
                        </div>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default LearningPathEditorPage;