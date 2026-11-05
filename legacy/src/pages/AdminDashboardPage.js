import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import { UsersIcon, ClipboardCheckIcon, UserGroupIcon } from '../assets/icons';

const StatCard = ({ title, value, icon, linkTo, linkText }) => (
    <Card className="flex flex-col justify-between">
        <div>
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-600">{title}</h3>
                <div className="text-orange-500">{icon}</div>
            </div>
            <p className="text-4xl font-bold text-gray-800 mt-2">{value ?? 0}</p>
        </div>
        {linkTo && (
            <div className="mt-4">
                <Link to={linkTo}>
                    <span className="text-sm font-medium text-orange-600 hover:underline">{linkText}</span>
                </Link>
            </div>
        )}
    </Card>
);

const AdminDashboardPage = ({ stats }) => {
    if (!stats) {
        return <div className="text-center py-12">Statistika yüklənir...</div>;
    }

    return (
        <div className="animate-fade-in space-y-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">İdarəetmə Paneli</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard 
                    title="Yoxlama Gözləyən Testlər" 
                    value={stats.pendingReviewCount} 
                    icon={<ClipboardCheckIcon className="w-8 h-8" />} 
                    linkTo="/stats" 
                    linkText="Yoxlamalara keçid et"
                />
                <StatCard 
                    title="Bugün Qeydiyyatdan Keçənlər" 
                    value={stats.newUsersTodayCount} 
                    icon={<UsersIcon className="w-8 h-8" />} 
                    linkTo="/admin/users" 
                    linkText="Bütün istifadəçilər"
                />
                <StatCard 
                    title="Cəmi İstifadəçi Sayı" 
                    value={stats.totalUsersCount} 
                    icon={<UserGroupIcon className="w-8 h-8" />} 
                />
            </div>

            <Card>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Həftənin Ən Aktiv Tələbələri</h3>
                {stats.topStudents.length > 0 ? (
                    <ol className="space-y-3">
                        {stats.topStudents.map((student, index) => (
                            <li key={student.userId} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-gray-500">#{index + 1}</span>
                                    <Link to={`/student/${student.userId}`} className="font-semibold text-blue-600 hover:underline">
                                        {student.name}
                                    </Link>
                                </div>
                                <span className="font-bold text-orange-500">{student.quizCount} test</span>
                            </li>
                        ))}
                    </ol>
                ) : (
                    <p className="text-gray-500">Son bir həftədə heç bir aktivlik olmayıb.</p>
                )}
            </Card>
        </div>
    );
};

export default AdminDashboardPage;
