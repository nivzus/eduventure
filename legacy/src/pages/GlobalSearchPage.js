import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Card from '../components/ui/Card';
import { BookOpenIcon, CollectionIcon, DocumentTextIcon, PaperAirplaneIcon, LockClosedIcon } from '../assets/icons';
import { useHasAccess } from '../hooks/useHasAccess';

const SearchResultItem = ({ item, type, onStartQuiz, profile }) => {
    const hasAccess = useHasAccess(item, profile);
    const isClickable = hasAccess;
    const icons = {
        quizzes: <BookOpenIcon className="w-6 h-6 text-purple-500" />,
        courses: <CollectionIcon className="w-6 h-6 text-blue-500" />,
        articles: <DocumentTextIcon className="w-6 h-6 text-green-500" />,
        paths: <PaperAirplaneIcon className="w-6 h-6 text-orange-500" />,
    };
    const links = {
        courses: `/courses/${item.id}`,
        articles: `/articles/${item.id}`,
        paths: `/paths/${item.id}`,
    };
    const typeNames = {
        quizzes: 'Test',
        courses: 'Kurs',
        articles: 'Məqalə',
        paths: 'Tədris Yolu',
    };

    const content = (
        <Card className={`transition-shadow duration-200 w-full text-left ${isClickable ? 'hover:shadow-orange-200 hover:-translate-y-1' : 'bg-gray-100'}`}>
            <div className="flex items-center gap-4">
                <div className="flex-shrink-0">{icons[type]}</div>
                <div className="flex-grow">
                    <p className="font-bold text-gray-800">{item.title}</p>
                    <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    {!hasAccess && <LockClosedIcon className="w-5 h-5 text-gray-400" />}
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-200 px-2 py-1 rounded-full whitespace-nowrap">
                        {typeNames[type]}
                    </span>
                </div>
            </div>
        </Card>
    );

    if (type === 'quizzes') {
        return <button onClick={() => isClickable && onStartQuiz(item.id)} className={`block w-full ${!isClickable && 'cursor-not-allowed'}`}>{content}</button>;
    }

    if (isClickable) {
        return <Link to={links[type]} className="block">{content}</Link>;
    }

    return <div className="cursor-not-allowed">{content}</div>;
};

const GlobalSearchPage = ({ searchResults, onStartQuiz, profile }) => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q');

    const allResults = useMemo(() => {
        // Filtering is now done in the parent wrapper, but we could also do it here if needed.
        // For now, we just structure the data.
        return [
            ...searchResults.quizzes.map(item => ({ ...item, resultType: 'quizzes' })),
            ...searchResults.courses.map(item => ({ ...item, resultType: 'courses' })),
            ...searchResults.articles.map(item => ({ ...item, resultType: 'articles' })),
            ...searchResults.paths.map(item => ({ ...item, resultType: 'paths' })),
        ];
    }, [searchResults]);

    return (
        <div className="animate-fade-in space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">
                Axtarış nəticələri: <span className="text-orange-600">"{query}"</span>
            </h1>

            {allResults.length > 0 ? (
                <div className="space-y-4">
                    {allResults.map(item => (
                        <SearchResultItem key={`${item.resultType}-${item.id}`} item={item} type={item.resultType} onStartQuiz={onStartQuiz} profile={profile} />
                    ))}
                </div>
            ) : (
                <Card className="text-center py-12">
                    <p className="text-gray-500">Axtarışınıza uyğun heç bir nəticə tapılmadı.</p>
                </Card>
            )}
        </div>
    );
};

export default GlobalSearchPage;