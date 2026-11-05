import React, { useState, useMemo } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const UserManagementPage = ({ users, onRoleChange, currentUserId }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
            const email = (user.email || '').toLowerCase();
            const lowerCaseSearchTerm = searchTerm.toLowerCase();

            return fullName.includes(lowerCaseSearchTerm) || email.includes(lowerCaseSearchTerm);
        });
    }, [users, searchTerm]);

    return (
        <Card>
            <h2 className="text-xl font-bold mb-4">İstifadəçi İdarəetməsi</h2>
            <input 
                type="text"
                placeholder="Ad və ya email ilə axtarış..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full p-2 mb-4 border border-gray-300 rounded-md"
            />
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Soyad</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Əməliyyat</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredUsers.map(user => (
                            <tr key={user.id}>
                                <td className="px-4 py-4 whitespace-nowrap">{user.first_name} {user.last_name}</td>
                                <td className="px-4 py-4 whitespace-nowrap">{user.email}</td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                    <Button 
                                        size="sm"
                                        onClick={() => onRoleChange(user.id, user.role === 'admin' ? 'student' : 'admin')}
                                        disabled={user.id === currentUserId} // Нельзя изменить свою собственную роль
                                        variant={user.role === 'admin' ? 'danger' : 'primary'}
                                    >
                                        {user.role === 'admin' ? 'Admin hüququnu al' : 'Admin et'}
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

export default UserManagementPage;