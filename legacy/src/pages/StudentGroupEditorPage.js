import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { ArrowLeftIcon, CheckIcon, PlusIcon, TrashIcon, DocumentTextIcon, UsersIcon } from '../assets/icons';

// Modal for adding students to a group
const AddStudentModal = ({ isOpen, onClose, allUsers, onAddMembers, existingMembers }) => {
    const [selectedIds, setSelectedIds] = useState(new Set());

    const availableStudents = useMemo(() => {
        const existingMemberIds = new Set(existingMembers.map(m => m.user_id));
        return allUsers.filter(u => u.role !== 'admin' && !existingMemberIds.has(u.id));
    }, [allUsers, existingMembers]);

    const handleToggleSelection = (userId) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(userId)) {
            newSelection.delete(userId);
        } else {
            newSelection.add(userId);
        }
        setSelectedIds(newSelection);
    };

    const handleAdd = () => {
        onAddMembers(Array.from(selectedIds));
        setSelectedIds(new Set());
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Qrupa tələbə əlavə et">
            <div className="max-h-72 overflow-y-auto space-y-2 pr-2">
                {availableStudents.length > 0 ? availableStudents.map(user => (
                    <div key={user.id} className="flex items-center p-2 rounded-md hover:bg-gray-100">
                        <input
                            type="checkbox"
                            id={`user-${user.id}`}
                            checked={selectedIds.has(user.id)}
                            onChange={() => handleToggleSelection(user.id)}
                            className="h-4 w-4 text-orange-600 rounded mr-3"
                        />
                        <label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer text-sm font-medium">
                            {user.first_name} {user.last_name} ({user.email})
                        </label>
                    </div>
                )) : (
                    <p className="text-center text-gray-500 py-10">Əlavə ediləcək tələbə yoxdur.</p>
                )}
            </div>
            <div className="mt-6 flex justify-end">
                <Button onClick={handleAdd} disabled={selectedIds.size === 0}><PlusIcon /> Seçilmişləri əlavə et ({selectedIds.size})</Button>
            </div>
        </Modal>
    );
};

const StudentGroupEditorPage = ({ group, onDraftChange, allUsers, onSave, showToast }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    const handleGroupInfoChange = (e) => {
        const { name, value } = e.target;
        onDraftChange(prev => ({ ...prev, [name]: value }));
    };

    const addMembers = (userIds) => {
        const membersToAdd = allUsers
            .filter(u => userIds.includes(u.id))
            .map(u => ({
                user_id: u.id,
                profiles: { // Mimic structure for immediate display
                    first_name: u.first_name,
                    last_name: u.last_name,
                    email: u.email
                }
            }));
        onDraftChange(prev => ({ ...prev, members: [...(prev.members || []), ...membersToAdd] }));
    };


    const removeMember = (userId) => {
        onDraftChange(prev => ({ ...prev, members: prev.members.filter(m => m.user_id !== userId) }));
    };

    const handleSave = () => {
        if (!group.name.trim()) {
            showToast('Qrupun adı boş ola bilməz.');
            return;
        }
        onSave(group);
    };

    if (!group) return <div>Yüklənir...</div>;

    return (
        <>
            <AddStudentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                allUsers={allUsers}
                onAddMembers={addMembers}
                existingMembers={group.members || []}
            />
            <div className="animate-fade-in grid lg:grid-cols-3 gap-8 items-start">
                {/* Left Panel */}
                <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{group.id ? 'Qrupu Redaktə Et' : 'Yeni Qrup Yarat'}</h1>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button variant="secondary" onClick={() => navigate('/admin/groups')} className="w-full justify-center"><ArrowLeftIcon /> Siyahıya qayıt</Button>
                            <Button onClick={handleSave} className="w-full justify-center"><CheckIcon /> Yadda saxla</Button>
                        </div>
                    </div>
                    <Card>
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><DocumentTextIcon /> Qrup Məlumatları</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Qrupun Adı</label>
                                <input type="text" name="name" value={group.name || ''} onChange={handleGroupInfoChange} className="w-full p-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Təsvir</label>
                                <textarea name="description" value={group.description || ''} onChange={handleGroupInfoChange} rows="4" className="w-full p-2 border border-gray-300 rounded-md"></textarea>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Panel */}
                <div className="lg:col-span-2">
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold flex items-center gap-2"><UsersIcon /> Qrup Üzvləri ({(group.members || []).length})</h3>
                            <Button onClick={() => setIsModalOpen(true)}><PlusIcon /> Üzv əlavə et</Button>
                        </div>
                        <div className="space-y-2">
                            {(group.members || []).map((member) => (
                                <div key={member.user_id} className="p-3 rounded-lg flex items-center justify-between bg-white border">
                                    <span className="font-medium">{member.profiles?.first_name} {member.profiles?.last_name}</span>
                                    <Button size="sm" variant="danger" onClick={() => removeMember(member.user_id)}><TrashIcon /></Button>
                                </div>
                            ))}
                            {(group.members || []).length === 0 && <p className="text-center text-gray-500 py-8">Qrupda tələbə yoxdur.</p>}
                        </div>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default StudentGroupEditorPage;