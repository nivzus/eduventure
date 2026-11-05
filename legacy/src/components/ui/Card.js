import React from 'react';

const Card = ({ children, className = '' }) => (
    <div className={`bg-white rounded-xl shadow-lg p-6 transition-all duration-300 ${className}`}>{children}</div>
);

export default Card;