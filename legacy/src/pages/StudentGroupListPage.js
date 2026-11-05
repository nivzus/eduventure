import React from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { PlusIcon, EditIcon, TrashIcon, UsersIcon } from '../assets/icons';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('az-AZ');
};

const StudentGroupListPage = ({ groups, onAddNew, onEdit, onDelete }) => {
    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Tələbə Qrupları</h2>
                <Button onClick={onAddNew}><PlusIcon /> Yeni Qrup</Button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qrup Adı</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tələbə Sayı</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yaradılma Tarixi</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Əməliyyatlar</th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {groups.map(group => (
                        <tr key={group.id}>
                            <td className="px-4 py-4 whitespace-nowrap font-medium">{group.name}</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <UsersIcon className="w-5 h-5 text-gray-400 mr-2" />
                                    {group.members?.length || 0}
                                </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">{formatDate(group.created_at)}</td>
                            <td className="px-4 py-4 text-sm font-medium">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Button size="sm" variant="secondary" onClick={() => onEdit(group.id)}><EditIcon /> Redaktə et</Button>
                                    <Button size="sm" variant="danger" onClick={() => onDelete(group.id)}><TrashIcon /> Sil</Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                {groups.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Hələ heç bir qrup yaradılmayıb.</p>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default StudentGroupListPage;