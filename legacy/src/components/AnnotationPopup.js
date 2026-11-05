import React, { useState, useEffect, useRef } from 'react';
import Button from './ui/Button';
import { TrashIcon } from '../assets/icons';

const AnnotationPopup = ({ x, y, annotation, onSave, onDelete, onClose, className = '' }) => {
    const [note, setNote] = useState('');
    const ref = useRef(null);

    useEffect(() => {
        setNote(annotation?.note_content || '');
    }, [annotation]);

    const handleSave = () => {
        onSave(note);
    };

    const handleDelete = () => {
        if (window.confirm('Bu annotasiyanı silmək istədiyinizə əminsiniz?')) {
            onDelete(annotation.id);
            onClose();
        }
    };

    return (
        <div
            ref={ref}
            className={`absolute z-20 w-80 bg-white rounded-lg shadow-xl p-4 border border-gray-200 ${className}`}
            style={{ left: `${x}px`, top: `${y}px` }}
        >
            <h4 className="font-bold text-gray-800 mb-2">Şəxsi Qeyd</h4>
            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Bura qeydinizi yazın..."
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                rows="4"
                autoFocus
            />
            <div className="flex justify-between items-center mt-3">
                {annotation?.id && (
                    <Button onClick={handleDelete} variant="danger" size="sm">
                        <TrashIcon />
                    </Button>
                )}
                <div className="flex-grow" />
                <Button onClick={handleSave} size="sm">
                    Yadda saxla
                </Button>
            </div>
        </div>
    );
};

export default AnnotationPopup;