import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SearchIcon } from '../../assets/icons';

const GlobalSearch = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');

    useEffect(() => {
        setSearchTerm(searchParams.get('q') || '');
    }, [searchParams]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
        }
    };

    return (
        <form onSubmit={handleSearch} className="relative w-full max-w-lg mx-auto">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                <SearchIcon />
            </span>
            <input type="search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Bütün platformada axtar..." className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-full w-full focus:ring-orange-400 focus:border-orange-400 transition" />
        </form>
    );
};

export default GlobalSearch;