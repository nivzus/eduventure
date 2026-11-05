import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { PlusIcon, EditIcon, TrashIcon, SparklesIcon } from '../assets/icons';

const QuestEditorModal = ({ isOpen, onClose, onSave, quest, showToast }) => {
    const [draft, setDraft] = useState(quest);

    useEffect(() => {
        setDraft(quest);
    }, [quest]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : (type === 'number' ? parseInt(value, 10) : value);
        setDraft(prev => ({ ...prev, [name]: val }));
    };

    const handleSave = () => {
        if (!draft.title || !draft.description || !draft.goal_type || !draft.goal_value || !draft.reward_xp) {
            showToast('Bütün xanaları doldurun.');
            return;
        }
        onSave(draft);
        onClose();
    };

    if (!isOpen || !draft) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={draft.id ? 'Tapşırığı Redaktə Et' : 'Yeni Tapşırıq Yarat'}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Başlıq</label>
                    <input type="text" name="title" value={draft.title} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Təsvir</label>
                    <textarea name="description" value={draft.description} onChange={handleChange} rows="3" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></textarea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Növ</label>
                        <select name="type" value={draft.type} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            <option value="DAILY">Günlük</option>
                            <option value="WEEKLY">Həftəlik</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Məqsəd Növü</label>
                        <select name="goal_type" value={draft.goal_type} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            <option value="COMPLETE_QUIZZES">Testi Tamamla</option>
                            <option value="COMPLETE_COURSES">Kursu Tamamla</option>
                            <option value="STUDY_FLASHCARDS">Kartları Öyrən</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Məqsəd Dəyəri</label>
                        <input type="number" name="goal_value" value={draft.goal_value} onChange={handleChange} min="1" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Mükafat (XP)</label>
                        <input type="number" name="reward_xp" value={draft.reward_xp} onChange={handleChange} min="1" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </div>
                </div>
                <div>
                    <label className="flex items-center">
                        <input type="checkbox" name="is_active" checked={draft.is_active} onChange={handleChange} className="h-4 w-4 text-orange-600 rounded border-gray-300" />
                        <span className="ml-2 text-sm text-gray-700">Aktivdir</span>
                    </label>
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                <Button onClick={handleSave}>Yadda Saxla</Button>
            </div>
        </Modal>
    );
};

const QuestManagementPage = ({ quests, onSave, onDelete, showToast }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedQuest, setSelectedQuest] = useState(null);

    const handleAddNew = () => {
        setSelectedQuest({
            type: 'DAILY',
            title: '',
            description: '',
            goal_type: 'COMPLETE_QUIZZES',
            goal_value: 1,
            reward_xp: 10,
            is_active: true
        });
        setIsModalOpen(true);
    };

    const handleEdit = (quest) => {
        setSelectedQuest(quest);
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Bu tapşırığı silmək istədiyinizə əminsiniz? İstifadəçi proqresi də silinəcək.')) {
            onDelete(id);
        }
    };

    return (
        <>
            <QuestEditorModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={onSave} 
                quest={selectedQuest} 
                showToast={showToast} 
            />
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold flex items-center gap-2"><SparklesIcon /> Tapşırıqların İdarəetməsi</h1>
                    <Button onClick={handleAddNew}><PlusIcon /> Yeni Tapşırıq</Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Başlıq</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Növ</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Məqsəd</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mükafat</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Əməliyyatlar</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {quests.map(quest => (
                                <tr key={quest.id}>
                                    <td className="px-4 py-4 whitespace-nowrap font-medium">{quest.title}</td>
                                    <td className="px-4 py-4 whitespace-nowrap">{quest.type}</td>
                                    <td className="px-4 py-4 whitespace-nowrap">{quest.goal_value} {quest.goal_type.replace('_', ' ').toLowerCase()}</td>
                                    <td className="px-4 py-4 whitespace-nowrap">{quest.reward_xp} XP</td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${quest.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {quest.is_active ? 'Aktiv' : 'Deaktiv'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="secondary" onClick={() => handleEdit(quest)}><EditIcon /></Button>
                                            <Button size="sm" variant="danger" onClick={() => handleDelete(quest.id)}><TrashIcon /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </>
    );
};

export default QuestManagementPage;
