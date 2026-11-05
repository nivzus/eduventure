import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import { PaperAirplaneIcon, SearchIcon, LockClosedIcon } from '../assets/icons';
import { useHasAccess } from '../hooks/useHasAccess';

const PublicLearningPathListPage = ({ learningPaths, profile }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredPaths = useMemo(() => {
        const lowercasedTerm = searchTerm.toLowerCase();
        return learningPaths
            .filter(path => path.is_published)
            .filter(path =>
                path.title.toLowerCase().includes(lowercasedTerm) ||
                (path.description && path.description.toLowerCase().includes(lowercasedTerm))
            );
    }, [learningPaths, searchTerm]);

    const PathCard = ({ path }) => {
        const hasAccess = useHasAccess(path, profile);
        const isClickable = hasAccess;

        const cardContent = (
            <Card className={`relative group-hover:shadow-orange-200 hover:-translate-y-1 transition-transform duration-200 h-full flex flex-col ${!isClickable ? 'bg-gray-100' : ''}`}>
                {!hasAccess && (
                    <div className="absolute top-3 right-3 text-gray-400" title="Məhdud giriş">
                        <LockClosedIcon className="w-5 h-5" />
                    </div>
                )}
                <div className="flex-grow">
                    <h2 className="text-xl font-bold text-gray-800 mb-2 pr-8">{path.title}</h2>
                    <p className="text-sm text-gray-600">{path.description}</p>
                </div>
                <div className="text-sm text-gray-500 mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                    <span>{path.path_items?.length || 0} kurs</span>
                    <span className="flex items-center gap-1"><PaperAirplaneIcon className="w-4 h-4" /> Tədris Yolu</span>
                </div>
            </Card>
        );

        if (isClickable) {
            return <Link to={`/paths/${path.id}`} className="block h-full">{cardContent}</Link>;
        }
        return <div className="cursor-not-allowed h-full">{cardContent}</div>;
    }

    return (
        <div className="animate-fade-in">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Tədris Yolları</h1>
            <div className="mb-6">
                <Card className="!p-4 bg-gray-50 border border-gray-200">
                    <div className="relative flex-grow w-full">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><SearchIcon /></span>
                        <input
                            type="text"
                            placeholder="Tədris yolu adına və ya təsvirinə görə axtarış..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg w-full focus:ring-orange-400 focus:border-orange-400 transition"
                        />
                    </div>
                </Card>
            </div>
            {filteredPaths.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPaths.map(path => <PathCard key={path.id} path={path} />)}
                </div>
            ) : (
                <Card className="text-center py-12">
                    <p className="text-gray-500">{searchTerm ? 'Axtarışınıza uyğun heç bir tədris yolu tapılmadı.' : 'Hələ heç bir tədris yolu dərc edilməyib.'}</p>
                </Card>
            )}
        </div>
    );
};

export default PublicLearningPathListPage;
