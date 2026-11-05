import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Card from '../components/ui/Card';
import { UsersIcon, DocumentTextIcon, CollectionIcon, ChartBarIcon as DashboardIcon, PaperAirplaneIcon, DuplicateIcon, UserGroupIcon, SparklesIcon, ChartBarIcon, LockClosedIcon, BookOpenIcon, LibraryIcon, ChevronDownIcon } from '../assets/icons';

const Accordion = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="py-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left font-bold text-gray-700 hover:text-orange-600 transition-colors"
            >
                <span>{title}</span>
                <ChevronDownIcon className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="mt-2 pl-4 border-l-2 border-orange-100 space-y-1">
                    {children}
                </div>
            )}
        </div>
    );
};

const AdminPage = () => {
    const navLinkClasses = ({ isActive }) =>
        `flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ` + 
        (isActive ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
                <Card>
                    <h2 className="text-lg font-bold mb-4">Admin Panel</h2>
                    <nav className="space-y-1">
                        <NavLink to="/admin" end className={navLinkClasses}>
                            <DashboardIcon className="w-5 h-5 mr-3" />
                            İdarəetmə Paneli
                        </NavLink>
                        <div className="border-t -mx-6 my-2"></div>
                        <Accordion title="İstifadəçi İdarəetməsi" defaultOpen={true}>
                            <NavLink to="/admin/users" className={navLinkClasses}><UsersIcon className="w-5 h-5 mr-3" />İstifadəçilər</NavLink>
                            <NavLink to="/admin/groups" className={navLinkClasses}><UserGroupIcon className="w-5 h-5 mr-3" />Tələbə Qrupları</NavLink>
                            <NavLink to="/admin/group-analysis" className={navLinkClasses}><ChartBarIcon className="w-5 h-5 mr-3" />Qrup Analizi</NavLink>
                        </Accordion>
                        <div className="border-t -mx-6 my-2"></div>
                        <Accordion title="Məzmun İdarəetməsi" defaultOpen={true}>
                            <NavLink to="/quizzes" className={navLinkClasses}><BookOpenIcon className="w-5 h-5 mr-3" />Testlər</NavLink>
                            <NavLink to="/admin/articles" className={navLinkClasses}><DocumentTextIcon className="w-5 h-5 mr-3" />Məqalələr</NavLink>
                            <NavLink to="/admin/courses" className={navLinkClasses}><CollectionIcon className="w-5 h-5 mr-3" />Kurslar</NavLink>
                            <NavLink to="/admin/paths" className={navLinkClasses}><PaperAirplaneIcon className="w-5 h-5 mr-3" />Tədris Yolları</NavLink>
                            <NavLink to="/admin/decks" className={navLinkClasses}><DuplicateIcon className="w-5 h-5 mr-3" />Kart Kolodaları</NavLink>
                        </Accordion>
                        <div className="border-t -mx-6 my-2"></div>
                        <Accordion title="Alətlər və Tənzimləmələr">
                            <NavLink to="/stats" className={navLinkClasses}><ChartBarIcon className="w-5 h-5 mr-3" />Ümumi Statistika</NavLink>
                            <NavLink to="/question-bank" className={navLinkClasses}><LibraryIcon className="w-5 h-5 mr-3" />Suallar Bankı</NavLink>
                            <NavLink to="/admin/permissions" className={navLinkClasses}><LockClosedIcon className="w-5 h-5 mr-3" />Giriş İdarəetməsi</NavLink>
                            <NavLink to="/admin/quests" className={navLinkClasses}><SparklesIcon className="w-5 h-5 mr-3" />Tapşırıqlar (Quests)</NavLink>
                        </Accordion>
                    </nav>
                </Card>
            </div>
            <div className="lg:col-span-3">
                <Outlet />
            </div>
        </div>
    );
};

export default AdminPage;
