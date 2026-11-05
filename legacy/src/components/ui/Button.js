import React from 'react';

const Button = ({ as: Component = 'button', onClick, children, className = '', variant = 'primary', size = 'md', disabled = false, ...props }) => {
    const baseClasses = 'font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed';
    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm rounded-md',
        md: 'px-4 py-2 text-base rounded-lg',
    };
    const variants = {
        primary: 'bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-400',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
        danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-400',
        ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 shadow-none'
    };
    return <Component onClick={onClick} disabled={disabled} className={`${baseClasses} ${sizeClasses[size]} ${variants[variant]} ${className}`} {...props}>{children}</Component>;
};

export default Button;