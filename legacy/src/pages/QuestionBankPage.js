import React, { useState, useMemo } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import QuestionEditor from '../components/QuestionEditor';
import { PlusIcon, EditIcon, TrashIcon, SearchIcon, TagIcon, SparklesIcon } from '../assets/icons';

const SmartQuizModal = ({ isOpen, onClose, uniqueTags, onCreate, showToast }) => {
    const [title, setTitle] = useState('');
    const [criteria, setCriteria] = useState([{ tag: uniqueTags[0] || '', count: 5 }]);

    const handleCriteriaChange = (index, field, value) => {
        const newCriteria = [...criteria];
        newCriteria[index][field] = field === 'count' ? parseInt(value, 10) : value;
        setCriteria(newCriteria);
    };

    const addCriteria = () => {
        setCriteria([...criteria, { tag: uniqueTags[0] || '', count: 5 }]);
    };

    const removeCriteria = (index) => {
        setCriteria(criteria.filter((_, i) => i !== index));
    };

    const handleCreate = () => {
        if (!title.trim()) {
            showToast('Testin başlığını daxil edin.');
            return;
        }
        onCreate(title, criteria);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ağıllı Test Yarat">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Testin Başlığı</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Yeni testin adı" />
                </div>
                <h4 className="font-semibold pt-2 border-t">Kriteriyalar</h4>
                {criteria.map((crit, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                        <select value={crit.tag} onChange={e => handleCriteriaChange(index, 'tag', e.target.value)} className="p-2 border border-gray-300 rounded-md bg-white flex-grow">
                            {uniqueTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                        </select>
                        <input type="number" value={crit.count} onChange={e => handleCriteriaChange(index, 'count', e.target.value)} min="1" className="w-20 p-2 border border-gray-300 rounded-md" />
                        <Button onClick={() => removeCriteria(index)} variant="danger" size="sm"><TrashIcon /></Button>
                    </div>
                ))}
                <Button onClick={addCriteria} variant="secondary" size="sm" className="w-full"><PlusIcon /> Yeni Kriteriya</Button>
            </div>
            <div className="mt-6 flex justify-end"><Button onClick={handleCreate}>Yarat</Button></div>
        </Modal>
    );
};

const QuestionBankPage = ({ questionBank, onSave, onDelete, showToast, onCreateSmartQuiz }) => {
    const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
    const [isSmartQuizModalOpen, setIsSmartQuizModalOpen] = useState(false);
    const [questionToEdit, setQuestionToEdit] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTag, setSelectedTag] = useState('all');

    const uniqueTags = useMemo(() => {
        const allTags = new Set();
        questionBank.forEach(q => {
            if (q.tags && Array.isArray(q.tags)) {
                q.tags.forEach(tag => allTags.add(tag));
            }
        });
        return Array.from(allTags).sort();
    }, [questionBank]);

    const handleAddNewQuestion = () => {
        const newQuestion = {
            text: '',
            type: 'single',
            options: ['', ''],
            correctAnswers: [],
            correctAnswer: true,
            orderItems: ['', ''],
            imageUrl: '',
            audioUrl: '',
            explanation: '',
            points: 1,
            tags: []
        };
        setQuestionToEdit(newQuestion);
        setIsEditorModalOpen(true);
    };

    const handleEditQuestion = (question) => {
        setQuestionToEdit(question);
        setIsEditorModalOpen(true);
    };

    const handleSaveQuestion = (question) => {
        if (!question.text.trim()) {
            showToast("Sualın mətni boş ola bilməz!");
            return;
        }
        onSave(question);
        setIsEditorModalOpen(false);
        setQuestionToEdit(null);
    };

    const handleDeleteWithConfirmation = (questionId) => {
        if (window.confirm("Bu sualı bankdan silmək istədiyinizə əminsiniz?")) {
            onDelete(questionId);
        }
    };

    const filteredQuestions = useMemo(() => {
        return questionBank.filter(q => {
            const searchTermMatch = q.text.toLowerCase().includes(searchTerm.toLowerCase());
            const tagMatch = selectedTag === 'all' || (q.tags && q.tags.includes(selectedTag));
            return searchTermMatch && tagMatch;
        });
    }, [questionBank, searchTerm, selectedTag]);

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Suallar Bankı</h1>
                <div className="flex gap-2">
                    <Button onClick={() => setIsSmartQuizModalOpen(true)} variant="primary"><SparklesIcon /> Ağıllı Test Yarat</Button>
                    <Button onClick={handleAddNewQuestion} variant="secondary"><PlusIcon /> Yeni Sual Yarat</Button>
                </div>
            </div>

            <Card>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3"><SearchIcon /></span>
                        <input 
                            type="text" 
                            placeholder="Sualın mətninə görə axtarış..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg w-full focus:ring-orange-400 focus:border-orange-400 transition"
                        />
                    </div>
                    <div className="relative flex-shrink-0">
                         <span className="absolute inset-y-0 left-0 flex items-center pl-3"><TagIcon /></span>
                        <select 
                            value={selectedTag} 
                            onChange={e => setSelectedTag(e.target.value)} 
                            className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg w-full bg-white focus:ring-orange-400 focus:border-orange-400 transition appearance-none">
                            <option value="all">Bütün Teqlər</option>
                            {uniqueTags.map(tag => (
                                <option key={tag} value={tag}>{tag === 'all' ? 'Bütün Teqlər' : tag}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            <div className="space-y-4">
                {filteredQuestions.length > 0 ? (
                    filteredQuestions.map((question) => (
                        <Card key={question.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div className="flex-1">
                                <p className="font-semibold text-gray-800">{question.text}</p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className="text-sm text-gray-500">Növ: {question.type} | Bal: {question.points || 1}</span>
                                    {(question.tags || []).map(tag => (
                                        <span key={tag} className="text-xs font-medium bg-orange-100 text-orange-800 px-2 py-1 rounded-full">{tag}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2 self-end sm:self-center">
                                <Button onClick={() => handleEditQuestion(question)} variant="secondary"><EditIcon /></Button>
                                <Button onClick={() => handleDeleteWithConfirmation(question.id)} variant="danger"><TrashIcon /></Button>
                            </div>
                        </Card>
                    ))
                ) : (
                    <Card className="text-center py-12">
                        <p className="text-gray-500">Filtrlərə uyğun sual tapılmadı.</p>
                    </Card>
                )}
            </div>

            {isEditorModalOpen && (
                <Modal isOpen={isEditorModalOpen} onClose={() => setIsEditorModalOpen(false)} title={questionToEdit?.id ? "Sualı Redaktə Et" : "Yeni Sual Yarat"}>
                    <QuestionEditor 
                        question={questionToEdit}
                        index={0} 
                        onUpdate={setQuestionToEdit} 
                    />
                    <div className="flex justify-end mt-6">
                        <Button onClick={() => handleSaveQuestion(questionToEdit)}>Yadda Saxla</Button>
                    </div>
                </Modal>
            )}
            <SmartQuizModal
                isOpen={isSmartQuizModalOpen}
                onClose={() => setIsSmartQuizModalOpen(false)}
                uniqueTags={uniqueTags}
                onCreate={onCreateSmartQuiz}
                showToast={showToast}
            />
        </div>
    );
};

export default QuestionBankPage;
