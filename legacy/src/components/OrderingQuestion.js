import React, { useState, useEffect, useRef } from 'react';

const OrderingQuestion = ({ question, onAnswer }) => {
    const [items, setItems] = useState([]);
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);

    useEffect(() => {
        // Shuffle the items initially
        setItems([...question.orderItems].sort(() => Math.random() - 0.5));
    }, [question]);

    const handleDragEnd = () => {
        const newItems = [...items];
        const draggedItemContent = newItems.splice(dragItem.current, 1)[0];
        newItems.splice(dragOverItem.current, 0, draggedItemContent);
        dragItem.current = null;
        dragOverItem.current = null;
        setItems(newItems);
        onAnswer(newItems);
    };

    return (
        <div>
            <p className="text-sm text-gray-500 mb-2">Elementləri düzgün ardıcıllıqla yerləşdirmək üçün sürüşdürün.</p>
            {items.map((item, index) => (
                <div 
                    key={index} 
                    draggable 
                    onDragStart={() => (dragItem.current = index)} 
                    onDragEnter={() => (dragOverItem.current = index)} 
                    onDragEnd={handleDragEnd} 
                    onDragOver={(e) => e.preventDefault()} 
                    className="p-3 mb-2 bg-gray-100 rounded-md cursor-grab active:cursor-grabbing border border-gray-200"
                >
                    {item}
                </div>
            ))}
        </div>
    );
};

export default OrderingQuestion;