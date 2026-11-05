import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';

const AssignmentModal = ({ isOpen, onClose, onAssign, allUsers, studentGroups, itemTitle }) => {
    const [assignTo, setAssignTo] = useState('user'); // 'user' or 'group'
    const [selectedIds, setSelectedIds] = useState([]);
    const [dueDate, setDueDate] = useState('');

    // Reset form state when modal is closed or reopened
    useEffect(() => {
        if (isOpen) {
            setSelectedIds([]);
            setDueDate('');
        } else {
            // A short delay to prevent user from seeing the reset before the modal fades out
            setTimeout(() => {
                setAssignTo('user');
            }, 200);
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (selectedIds.length === 0) {
            alert('Zəhmət olmasa, ən azı bir tələbə və ya qrup seçin.');
            return;
        }
        onAssign({
            assignToType: assignTo,
            assignToIds: selectedIds, // Changed from assignToId to assignToIds
            dueDate: dueDate || null
        });
        onClose();
    };

    const handleSelectionChange = (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
        setSelectedIds(selectedOptions);
    }

    const students = allUsers.filter(u => u.role !== 'admin');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`"${itemTitle}" üçün tapşırıq təyin et`}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Kimə təyin edilsin?</label>
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

                <div>
                    <label className="block text-sm font-medium text-gray-700">Son tarix (istəyə bağlı)</label>
                    <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                <Button onClick={handleSubmit} disabled={selectedIds.length === 0}>Təyin et</Button>
            </div>
        </Modal>
    );
};

export default AssignmentModal;
