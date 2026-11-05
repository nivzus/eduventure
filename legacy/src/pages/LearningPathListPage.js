import React from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { PlusIcon, EditIcon, TrashIcon, EyeIcon, EyeOffIcon, LockClosedIcon } from '../assets/icons';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('az-AZ');
};

const LearningPathListPage = ({ paths, onAddNew, onEdit, onDelete, onToggleStatus, onSetVisibilityRequest }) => {
    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Tədris Yolları</h2>
                <Button onClick={onAddNew}><PlusIcon /> Yeni Yol</Button>
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
                    {paths.map(path => (
                        <tr key={path.id}>
                            <td className="px-4 py-4 whitespace-nowrap font-medium">{path.title}</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${path.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {path.is_published ? 'Dərc edilib' : 'Qaralama'}
                                    </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${path.visibility === 'public' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                        {path.visibility === 'public' ? 'Hər kəsə açıq' : 'Məhdud'}
                                    </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">{formatDate(path.created_at)}</td>
                            <td className="px-4 py-4 text-sm font-medium">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Button size="sm" variant="secondary" onClick={() => onSetVisibilityRequest(path.id, path.title, 'learning_path', path.visibility)}><LockClosedIcon /> Giriş</Button>
                                    <Button size="sm" variant="secondary" onClick={() => onEdit(path.id)}><EditIcon /> Redaktə et</Button>
                                    <Button size="sm" variant="secondary" onClick={() => onToggleStatus(path.id, !path.is_published)} title={path.is_published ? 'Gizlət' : 'Dərc et'}>
                                        {path.is_published ? <EyeOffIcon /> : <EyeIcon />}
                                    </Button>
                                    <Button size="sm" variant="danger" onClick={() => onDelete(path.id)}><TrashIcon /> Sil</Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                {paths.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Hələ heç bir tədris yolu yaradılmayıb.</p>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default LearningPathListPage;