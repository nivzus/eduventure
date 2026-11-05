import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';

const VisibilityModal = ({ isOpen, onClose, onSetVisibility, allUsers, studentGroups, itemTitle, currentVisibility }) => {
    const [visibility, setVisibility] = useState(currentVisibility);
    const [assignTo, setAssignTo] = useState('user');
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setVisibility(currentVisibility);
            setSelectedIds([]);
            setAssignTo('user');
        }
    }, [isOpen, currentVisibility]);

    const handleSubmit = () => {
        if (visibility === 'restricted' && selectedIds.length === 0) {
            alert('Məhdud giriş üçün ən azı bir tələbə və ya qrup seçin.');
            return;
        }
        onSetVisibility({
            visibility: visibility,
            accessList: visibility === 'restricted' ? {
                type: assignTo,
                ids: selectedIds
            } : null
        });
    };

    const handleSelectionChange = (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
        setSelectedIds(selectedOptions);
    }

    const students = allUsers.filter(u => u.role !== 'admin');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`"${itemTitle}" üçün giriş tənzimləmələri`}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Görünürlük Növü</label>
                    <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                        <option value="public">Hər kəsə açıq</option>
                        <option value="restricted">Məhdud</option>
                    </select>
                </div>

                {visibility === 'restricted' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Kimə giriş verilsin?</label>
                            <select value={assignTo} onChange={(e) => { setAssignTo(e.target.value); setSelectedIds([]); }} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                <option value="user">Fərdi Tələbə(lər)ə</option>
                                <option value="group">Qrup(lar)a</option>
                            </select>
                        </div>

                        {assignTo === 'user' ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tələbə(lər) seçin (Ctrl/Cmd ilə çoxlu seçim)</label>
                                <select multiple value={selectedIds} onChange={handleSelectionChange} className="mt-1 block w-full h-40 p-2 border border-gray-300 rounded-md">
                                    {students.map(user => (
                                        <option key={user.id} value={user.id}>{user.first_name} {user.last_name} ({user.email})</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Qrup(lar) seçin (Ctrl/Cmd ilə çoxlu seçim)</label>
                                <select multiple value={selectedIds} onChange={handleSelectionChange} className="mt-1 block w-full h-40 p-2 border border-gray-300 rounded-md">
                                    {studentGroups.map(group => (
                                        <option key={group.id} value={group.id}>{group.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </>
                )}
            </div>
            <div className="mt-6 flex justify-end">
                <Button onClick={handleSubmit}>Yadda Saxla</Button>
            </div>
        </Modal>
    );
};

export default VisibilityModal;