import React from 'react';

const Toast = ({ message, isVisible }) => {
    if (!isVisible) return null;
    return (
        <div className="fixed bottom-5 right-5 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in-up z-50">{message}</div>
    );
};

export default Toast;