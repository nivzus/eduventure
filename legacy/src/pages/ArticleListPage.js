import React from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { PlusIcon, EditIcon, TrashIcon, EyeIcon, EyeOffIcon, LockClosedIcon } from '../assets/icons';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('az-AZ');
};

const ArticleListPage = ({ articles, onAddNew, onEdit, onDelete, onToggleStatus, onSetVisibilityRequest }) => {
    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Məqalələr</h2>
                <Button onClick={onAddNew}><PlusIcon /> Yeni Məqalə</Button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Başlıq</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Görünürlük</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yaradılma Tarixi</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Əməliyyatlar</th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {articles.map(article => (
                        <tr key={article.id}>
                            <td className="px-4 py-4 whitespace-nowrap font-medium">{article.title}</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${article.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {article.is_published ? 'Dərc edilib' : 'Qaralama'}
                                    </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${article.visibility === 'public' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                        {article.visibility === 'public' ? 'Hər kəsə açıq' : 'Məhdud'}
                                    </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">{formatDate(article.created_at)}</td>
                            <td className="px-4 py-4 text-sm font-medium">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Button size="sm" variant="secondary" onClick={() => onSetVisibilityRequest(article.id, article.title, 'article', article.visibility)}><LockClosedIcon /> Giriş</Button>
                                    <Button size="sm" variant="secondary" onClick={() => onEdit(article.id)}><EditIcon /> Redaktə et</Button>
                                    <Button size="sm" variant="secondary" onClick={() => onToggleStatus(article.id, !article.is_published)} title={article.is_published ? 'Gizlət' : 'Dərc et'}>
                                        {article.is_published ? <EyeOffIcon /> : <EyeIcon />}
                                    </Button>
                                    <Button size="sm" variant="danger" onClick={() => onDelete(article.id)}><TrashIcon /> Sil</Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                {articles.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Hələ heç bir məqalə yaradılmayıb.</p>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default ArticleListPage;