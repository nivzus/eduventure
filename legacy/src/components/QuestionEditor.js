import React, { useState, useEffect, useMemo } from 'react';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { TrashIcon, PlusIcon, DuplicateIcon, LightbulbIcon, LibraryIcon } from '../assets/icons';

const XCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const TagPickerModal = ({ isOpen, onClose, onAddTags, uniqueTags, existingTags }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTags, setSelectedTags] = useState(new Set());

    const availableTags = useMemo(() => {
        const lowercasedTerm = searchTerm.toLowerCase();
        return uniqueTags.filter(tag => 
            !existingTags.includes(tag) && tag.toLowerCase().includes(lowercasedTerm)
        );
    }, [uniqueTags, existingTags, searchTerm]);

    const handleToggleTag = (tag) => {
        const newSelection = new Set(selectedTags);
        if (newSelection.has(tag)) {
            newSelection.delete(tag);
        } else {
            newSelection.add(tag);
        }
        setSelectedTags(newSelection);
    };

    const handleAdd = () => {
        onAddTags(Array.from(selectedTags));
        onClose();
        setSelectedTags(new Set());
        setSearchTerm('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Bankdan teq seçin">
            <input type="text" placeholder="Teq axtar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 mb-4 border border-gray-300 rounded-md" />
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {availableTags.map(tag => (
                    <label key={tag} className="flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                        <input type="checkbox" checked={selectedTags.has(tag)} onChange={() => handleToggleTag(tag)} className="h-4 w-4 text-orange-600 rounded mr-3" />
                        {tag}
                    </label>
                ))}
            </div>
            <div className="mt-6 flex justify-end">
                <Button onClick={handleAdd} disabled={selectedTags.size === 0}>Seçilmişləri əlavə et ({selectedTags.size})</Button>
            </div>
        </Modal>
    );
};

const TagEditor = ({ tags = [], onUpdate, uniqueTags = [] }) => {
    const [inputValue, setInputValue] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(inputValue.trim());
            setInputValue('');
        }
    };

    const removeTag = (tagToRemove) => {
        onUpdate(tags.filter(tag => tag !== tagToRemove));
    };

    const addTag = (tag) => {
        if (tag && !tags.includes(tag)) {
            onUpdate([...tags, tag]);
        }
    };

    const handleAddMultipleTags = (tagsToAdd) => {
        onUpdate([...tags, ...tagsToAdd]);
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teqlər (Enter və ya vergül ilə əlavə et)</label>
            <div className="flex flex-wrap items-center gap-2 p-1.5 border border-gray-300 rounded-md bg-white">
                {tags.map((tag, index) => (
                    <span key={index} className="flex items-center gap-1 bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-1 rounded-full">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="text-orange-600 hover:text-orange-800">
                            <XCircleIcon className="h-4 w-4" />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Yeni teq əlavə et..."
                    className="flex-1 bg-transparent outline-none p-1 text-sm min-w-[120px]"
                />
                {uniqueTags.length > 0 && (
                    <Button onClick={() => setIsModalOpen(true)} variant="secondary" size="sm" className="!p-1.5 !rounded-full h-6 w-6" title="Bankdan teq seç">
                        <PlusIcon className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <TagPickerModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onAddTags={handleAddMultipleTags}
                uniqueTags={uniqueTags}
                existingTags={tags}
            />
        </div>
    );
};

const AnswerEditor = ({ question, onUpdate }) => {
    const handleOptionChange = (index, value) => {
        const newOptions = [...question.options];
        newOptions[index] = value;
        onUpdate({ ...question, options: newOptions });
    };
    const handleCorrectAnswerChange = (index) => {
        if (question.type === 'single') {
            onUpdate({ ...question, correctAnswers: [index] });
        } else {
            const newCorrect = question.correctAnswers.includes(index)
                ? question.correctAnswers.filter(i => i !== index)
                : [...question.correctAnswers, index];
            onUpdate({ ...question, correctAnswers: newCorrect });
        }
    };
    const handleCorrectTextAnswerChange = (e) => {
        onUpdate({ ...question, correctAnswers: [e.target.value] });
    };
    const handleTrueFalseChange = (value) => {
        onUpdate({ ...question, correctAnswer: value });
    };
    const addOption = () => {
        onUpdate({ ...question, options: [...question.options, ''] });
    };
    const removeOption = (index) => {
        const newOptions = question.options.filter((_, i) => i !== index);
        const newCorrect = question.correctAnswers
            .filter(i => i !== index)
            .map(i => (i > index ? i - 1 : i));
        onUpdate({ ...question, options: newOptions, correctAnswers: newCorrect });
    };
    const handleOrderItemChange = (index, value) => {
        const newItems = [...(question.orderItems || [])];
        newItems[index] = value;
        onUpdate({ ...question, orderItems: newItems });
    };
    const addOrderItem = () => {
        onUpdate({ ...question, orderItems: [...(question.orderItems || []), ''] });
    };
    const removeOrderItem = (index) => {
        const newItems = question.orderItems.filter((_, i) => i !== index);
        onUpdate({ ...question, orderItems: newItems });
    };
    const handleFillInTheBlanksChange = (e) => {
        const text = e.target.value;
        const correctAnswers = (text.match(/\[(.*?)\]/g) || []).map(b => b.slice(1, -1));
        onUpdate({
            ...question,
            text: text, // The text itself now contains the answers
            correctAnswers: correctAnswers,
            options: [] // Not used for this type
        });
    };

    switch (question.type) {
        case 'single':
        case 'multiple':
            return (
                <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Cavab variantları</h4>
                    <div className="space-y-2">
                        {question.options.map((option, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <input type={question.type === 'single' ? 'radio' : 'checkbox'} name={`correctAnswer_${question.id}`} checked={question.correctAnswers.includes(idx)} onChange={() => handleCorrectAnswerChange(idx)} className="h-5 w-5 text-orange-600 focus:ring-orange-500 border-gray-300 rounded" />
                                <input type="text" value={option} onChange={(e) => handleOptionChange(idx, e.target.value)} placeholder={`Variant ${idx + 1}`} className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm" />
                                <button onClick={() => removeOption(idx)} className="text-gray-400 hover:text-red-500 p-1 rounded-full"><TrashIcon /></button>
                            </div>
                        ))}
                    </div>
                    <Button onClick={addOption} variant="secondary" className="mt-3 text-sm"><PlusIcon /> Variant əlavə et</Button>
                </div>
            );
        case 'textInput':
            return (
                <div>
                    <label className="block text-sm font-medium text-gray-700">Düzgün cavab (hərf registri nəzərə alınmır)</label>
                    <input type="text" value={question.correctAnswers[0] || ''} onChange={handleCorrectTextAnswerChange} placeholder="Düzgün cavabı daxil edin" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm" />
                </div>
            );
        case 'trueFalse':
            return (
                <div className="flex items-center gap-4 pt-2">
                    <label className="flex items-center p-3 rounded-lg hover:bg-gray-100 cursor-pointer border-2 border-transparent has-[:checked]:bg-orange-100 has-[:checked]:border-orange-300"><input type="radio" name={`tf_${question.id}`} checked={question.correctAnswer === true} onChange={() => handleTrueFalseChange(true)} className="h-4 w-4 text-orange-600" /> <span className="ml-2">Doğru</span></label>
                    <label className="flex items-center p-3 rounded-lg hover:bg-gray-100 cursor-pointer border-2 border-transparent has-[:checked]:bg-orange-100 has-[:checked]:border-orange-300"><input type="radio" name={`tf_${question.id}`} checked={question.correctAnswer === false} onChange={() => handleTrueFalseChange(false)} className="h-4 w-4 text-orange-600" /> <span className="ml-2">Yanlış</span></label>
                </div>
            );
        case 'ordering':
            return (
                <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Sıralama üçün elementlər (düzgün ardıcıllıqla)</h4>
                    <div className="space-y-2">
                        {question.orderItems?.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <span className="text-gray-500 font-bold">{idx + 1}.</span>
                                <input type="text" value={item} onChange={(e) => handleOrderItemChange(idx, e.target.value)} placeholder={`Element ${idx + 1}`} className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm" />
                                <button onClick={() => removeOrderItem(idx)} className="text-gray-400 hover:text-red-500 p-1 rounded-full"><TrashIcon /></button>
                            </div>
                        ))}
                    </div>
                    <Button onClick={addOrderItem} variant="secondary" className="mt-3 text-sm"><PlusIcon /> Element əlavə et</Button>
                </div>
            );
        case 'fillInTheBlanks':
            return (
                <div>
                    <label className="block text-sm font-medium text-gray-700">Mətn və boşluqlar</label>
                    <p className="text-xs text-gray-500 mb-2">Düzgün cavabları kvadrat mötərizə içinə alın. Məsələn: `Paytaxt [Bakı]`.</p>
                    <textarea value={question.text || ''} onChange={handleFillInTheBlanksChange} placeholder="Mətni daxil edin..." rows="4" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"></textarea>
                </div>
            );
        case 'open':
            return (
                <div className="p-3 bg-blue-50 text-blue-800 rounded-md text-sm flex items-center gap-2">
                    <LightbulbIcon className="w-5 h-5" />
                    <span>Bu sualın cavabı müəllim tərəfindən manual olaraq yoxlanılacaq.</span>
                </div>
            );
        default: return null;
    }
};

const QuestionEditor = ({ question, index, onUpdate, onDelete, onDuplicate, onSaveToBank, onGenerateVariation, uniqueTags }) => {
    const [localQuestion, setLocalQuestion] = useState(question);

    useEffect(() => {
        setLocalQuestion(question);
    }, [question]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (JSON.stringify(localQuestion) !== JSON.stringify(question)) {
                onUpdate(localQuestion);
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [localQuestion, onUpdate, question]);

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        const processedValue = type === 'number' ? parseInt(value, 10) : value;
        setLocalQuestion(prev => ({ ...prev, [name]: processedValue }));
    };

    const handleTagsChange = (newTags) => {
        setLocalQuestion(prev => ({ ...prev, tags: newTags }));
    };

    return (
        <div className="border border-gray-200 rounded-lg shadow-sm mb-6 bg-white relative">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50 rounded-t-lg">
                <div className="flex items-center gap-4 flex-wrap">
                    <span className="bg-orange-500 text-white rounded-full h-8 w-8 flex items-center justify-center font-bold text-sm flex-shrink-0">{index + 1}</span>
                    <div>
                        <label className="block text-xs font-medium text-gray-500">Sualın növü</label>
                        <select name="type" value={localQuestion.type} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm text-xs p-1">
                            <option value="single">Tək cavab</option>
                            <option value="multiple">Bir neçə cavab</option>
                            <option value="textInput">Mətn daxil etmə</option>
                            <option value="trueFalse">Doğru/Yanlış</option>
                            <option value="ordering">Sıralama</option>
                            <option value="open">Açıq Sual</option>
                            <option value="fillInTheBlanks">Boşluqları Doldur</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500">Ballar</label>
                        <input type="number" name="points" value={localQuestion.points || 1} onChange={handleInputChange} min="1" className="mt-1 block w-20 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm text-xs p-1" />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={onGenerateVariation} variant="secondary" className="!p-2" title="Bənzər sual yarat (AI)"><LightbulbIcon /></Button>
                    <Button onClick={onSaveToBank} variant="secondary" className="!p-2" title="Sualı banka əlavə et"><LibraryIcon /></Button>
                    <Button onClick={onDuplicate} variant="secondary" className="!p-2" title="Dublikat et"><DuplicateIcon /></Button>
                    <Button onClick={onDelete} variant="danger" className="!p-2" title="Sualı sil"><TrashIcon /></Button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {localQuestion.type === 'fillInTheBlanks' ? (
                    <AnswerEditor question={localQuestion} onUpdate={setLocalQuestion} />
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Sualın mətni</label>
                        <textarea name="text" value={localQuestion.text} onChange={handleInputChange} placeholder="Sualınızı bura daxil edin..." rows="2" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"></textarea>
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Şəkil URL-i (istəyə bağlı)</label>
                    <input type="text" name="imageUrl" value={localQuestion.imageUrl || ''} onChange={handleInputChange} placeholder="https://example.com/image.png" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Audio URL-i (istəyə bağlı)</label>
                    <input type="text" name="audioUrl" value={localQuestion.audioUrl || ''} onChange={handleInputChange} placeholder="https://example.com/audio.mp3" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm" />
                </div>
                <TagEditor tags={localQuestion.tags || []} onUpdate={handleTagsChange} uniqueTags={uniqueTags} />
                <div>
                    <label className="block text-sm font-medium text-gray-700">İzah (istəyə bağlı)</label>
                    <textarea name="explanation" value={localQuestion.explanation || ''} onChange={handleInputChange} placeholder="Düzgün cavabın izahını bura daxil edin..." rows="2" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"></textarea>
                </div>
            </div>

            {localQuestion.type !== 'fillInTheBlanks' && (
                <div className="p-4 bg-gray-50/50 border-t border-gray-200 rounded-b-lg">
                    <AnswerEditor question={localQuestion} onUpdate={setLocalQuestion} />
                </div>
            )}
        </div>
    );
};

export default QuestionEditor;
