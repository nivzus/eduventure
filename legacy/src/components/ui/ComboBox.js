import React, { useState, useMemo } from 'react';

const ComboBox = ({ options, value, onChange, placeholder }) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const filteredOptions = useMemo(() => 
        query === ''
            ? options
            : options.filter(option => 
                option.toLowerCase().includes(query.toLowerCase())
            )
    , [query, options]);

    const handleSelect = (option) => {
        onChange(option);
        setQuery('');
        setIsOpen(false);
    };

    const handleInputChange = (e) => {
        setQuery(e.target.value);
        onChange(e.target.value); // Allow creating new categories
        if (!isOpen) {
            setIsOpen(true);
        }
    };

    return (
        <div className="relative w-full">
            <input 
                type="text"
                value={value}
                onChange={handleInputChange}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 150)} // Delay to allow click on option
                placeholder={placeholder}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
            />
            {isOpen && (
                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(option => (
                            <li 
                                key={option}
                                onMouseDown={() => handleSelect(option)} // Use onMouseDown to fire before onBlur
                                className="px-3 py-2 cursor-pointer hover:bg-orange-100"
                            >
                                {option}
                            </li>
                        ))
                    ) : (
                        <li className="px-3 py-2 text-gray-500">Nəticə tapılmadı.</li>
                    )}
                </ul>
            )}
        </div>
    );
};

export default ComboBox;