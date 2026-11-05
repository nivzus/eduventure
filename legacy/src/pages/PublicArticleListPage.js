import React, { useState, useMemo } from 'react';
import Card from '../components/ui/Card';
import { DocumentTextIcon, CheckCircleIcon, TagIcon, SearchIcon, BookmarkIcon, LockClosedIcon } from '../assets/icons';
import { useHasAccess } from '../hooks/useHasAccess';

const PublicArticleListPage = ({ articles, articleProgress, onNavigate, toggleBookmark, isBookmarked, profile }) => {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const completedArticleIds = new Set(articleProgress.map(p => p.article_id));

    const categories = useMemo(() => {
        return ['all', ...new Set(articles.filter(a => a.is_published).map(a => a.category).filter(Boolean))];
    }, [articles]);

    const filteredArticles = useMemo(() => {
        const lowercasedTerm = searchTerm.toLowerCase();
        return articles
            .filter(a => a.is_published) // Only show published articles
            .filter(a => {
                if (selectedCategory === 'all') {
                    return a.title.toLowerCase().includes(lowercasedTerm);
                }
                return a.category === selectedCategory && a.title.toLowerCase().includes(lowercasedTerm);
            });
    }, [articles, selectedCategory, searchTerm]);

    const ArticleCard = ({ article }) => {
        const hasAccess = useHasAccess(article, profile);
        const isCompleted = completedArticleIds.has(article.id);
        const isSaved = isBookmarked(article.id, 'article');
        const isClickable = hasAccess;

        return (
            <div
                key={article.id}
                onClick={() => isClickable && onNavigate(article, 'article')}
                className={`relative group transition-transform duration-200 ${isClickable ? 'cursor-pointer hover:-translate-y-1' : 'cursor-not-allowed'}`}
            >
                <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                    {!hasAccess && (
                        <div className="text-gray-400" title="Məhdud giriş">
                            <LockClosedIcon className="w-5 h-5" />
                        </div>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleBookmark(article.id, 'article'); }}
                        className="p-1 rounded-full hover:bg-orange-100 text-orange-500"
                        title={isSaved ? "Əlfəcini sil" : "Əlfəcinlərə əlavə et"}
                    >
                        <BookmarkIcon filled={isSaved} />
                    </button>
                </div>
                <Card className={`group-hover:shadow-orange-200 transition-shadow duration-200 h-full flex flex-col ${!hasAccess ? 'bg-gray-100' : (isCompleted ? 'bg-green-50' : '')}`}>
                    <div className="flex-grow">
                        <div className="flex justify-between items-start">
                            <h2 className="text-xl font-bold text-gray-800 mb-2 pr-12">{article.title}</h2>
                            {hasAccess && isCompleted && <CheckCircleIcon className="w-6 h-6 text-green-500" title="Oxunub" />}
                        </div>
                    </div>
                    <div className="text-sm text-gray-500 mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                        <span className="font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                            <TagIcon className="w-4 h-4" />
                            {article.category || 'Kateqoriyasız'}
                        </span>
                        <span className="flex items-center gap-1"><DocumentTextIcon className="w-4 h-4" /> Məqalə</span>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="animate-fade-in">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Tədris Modulları</h1>
            <div className="mb-6">
                <Card className="!p-4 bg-gray-50 border border-gray-200">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="relative flex-grow w-full">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><SearchIcon /></span>
                            <input type="text" placeholder="Modul adına görə axtarış..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg w-full focus:ring-orange-400 focus:border-orange-400 transition" />
                        </div>
                        <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                            className="py-2 px-4 border-2 border-gray-200 rounded-lg bg-white w-full md:w-auto"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat === 'all' ? 'Bütün Kateqoriyalar' : cat}</option>
                            ))}
                        </select>
                    </div>
                </Card>
            </div>
            {filteredArticles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredArticles.map(article => <ArticleCard key={article.id} article={article} />)}
                </div>
            ) : (
                <Card className="text-center py-12">
                    <p className="text-gray-500">Axtarışınıza uyğun heç bir modul tapılmadı.</p>
                </Card>
            )}
        </div>
    );
};

export default PublicArticleListPage;