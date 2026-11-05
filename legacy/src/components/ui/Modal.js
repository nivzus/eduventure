import React from 'react';
import Button from './Button';

const Modal = ({ isOpen, onClose, onConfirm, title, children }) => {
    if (!isOpen) return null;

    // Определяем, используется ли модальное окно для подтверждения (например, удаления)
    const isConfirmationModal = !!onConfirm;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
                <div className="text-gray-600 mb-6">{children}</div>
                {isConfirmationModal && (
                    <div className="flex justify-end gap-3">
                        <Button onClick={onClose} variant="secondary">Ləğv et</Button>
                        <Button onClick={onConfirm} variant="danger">Sil</Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;