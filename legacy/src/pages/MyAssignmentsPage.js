import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { PlayIcon, DocumentTextIcon, CollectionIcon, ClockIcon, CheckCircleIcon, EyeIcon, StarIcon, UserGroupIcon } from '../assets/icons';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date)) return 'Invalid Date';
    return date.toLocaleString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// --- Quest Component ---
const QuestCard = ({ quests }) => {
    if (!quests || quests.length === 0) {
        return null; // Don't render the card if there are no quests
    }

    const dailyQuests = quests.filter(q => q.quests.type === 'DAILY');
    const weeklyQuests = quests.filter(q => q.quests.type === 'WEEKLY');

    const QuestList = ({ title, questsOfType }) => (
        <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3">{title}</h3>
            {questsOfType.length > 0 ? (
                 <div className="space-y-3">
                    {questsOfType.map(quest => {
                        const progressPercentage = quest.quests.goal_value > 0 ? (quest.progress / quest.quests.goal_value) * 100 : 0;
                        const isCompleted = quest.status === 'completed';
                        return (
                            <div key={quest.id} className={`p-3 rounded-lg ${isCompleted ? 'bg-green-100 border-l-4 border-green-400' : 'bg-gray-50'}`}>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-gray-800">{quest.quests.title}</h4>
                                        <p className="text-sm text-gray-600">{quest.quests.description}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-4">
                                        <p className="font-bold text-yellow-500 flex items-center gap-1">
                                            <StarIcon className="w-4 h-4" /> +{quest.quests.reward_xp} XP
                                        </p>
                                        {isCompleted && <div className="flex items-center justify-end gap-1 text-xs text-green-600 font-semibold mt-1"><CheckCircleIcon className="w-4 h-4"/>Tamamlandı!</div>}
                                    </div>
                                </div>
                                {!isCompleted && (
                                    <div className="mt-2">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-xs font-medium text-gray-700">Proqres</span>
                                            <span className="text-xs font-medium text-orange-700">{quest.progress} / {quest.quests.goal_value}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                 <p className="text-sm text-gray-500">Bu dövr üçün tapşırıq yoxdur.</p>
            )}
        </div>
    );

    return (
        <Card>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Məqsədlər və Tapşırıqlar</h2>
            <div className="space-y-6">
                <QuestList title="Günlük Məqsədlər" questsOfType={dailyQuests} />
                <QuestList title="Həftəlik Məqsədlər" questsOfType={weeklyQuests} />
            </div>
        </Card>
    );
};

// --- My Groups Component ---
const MyGroupsCard = ({ groups, className = '' }) => {
    if (!groups || groups.length === 0) {
        return null;
    }

    return (
        <div className={className}>
            <Card>
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <UserGroupIcon /> Mənim Qruplarım
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groups.map(group => (
                        <Link to={`/groups/${group.id}`} key={group.id} className="block p-4 rounded-lg bg-gray-50 hover:bg-orange-50 transition-colors border flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-gray-800">{group.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">{group.members?.length || 0} üzv</p>
                            </div>
                            <div className="flex items-center -space-x-2 mt-3">
                                {(group.members || []).slice(0, 5).map(member => (
                                    <div 
                                        key={member.user_id} 
                                        className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center text-orange-700 font-bold text-xs border-2 border-white"
                                        title={`${member.profiles?.first_name || ''} ${member.profiles?.last_name || ''}`}
                                    >
                                        {member.profiles?.first_name?.[0] || 'U'}
                                    </div>
                                ))}
                                {(group.members?.length || 0) > 5 && (
                                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-bold text-xs border-2 border-white">
                                        +{(group.members.length) - 5}
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            </Card>
        </div>
    );
};


const MyAssignmentsPage = ({ assignments, quizzes, courses, quizResults, completedCourses, onStartQuiz, userQuests, studentGroups, profile }) => {

    const myGroups = useMemo(() => {
        if (!profile || !studentGroups) return [];

        if (profile.role === 'admin') {
            // Администратор видит группы, которые он создал ИЛИ в которых он состоит.
            // Используем Set для избежания дубликатов.
            const groupIds = new Set();
            const adminGroups = [];

            (studentGroups || []).forEach(g => {
                const isMember = g.members.some(m => m.user_id === profile.id);
                const isCreator = g.created_by === profile.id;
                if ((isMember || isCreator) && !groupIds.has(g.id)) {
                    adminGroups.push(g);
                    groupIds.add(g.id);
                }
            });
            return adminGroups;
        }
        // Студент видит только группы, в которых он состоит.
        return (studentGroups || []).filter(g => g.members.some(m => m.user_id === profile.id));
    }, [studentGroups, profile]);

    const enrichedAssignments = useMemo(() => {
        const completedQuizIds = new Set((quizResults || []).map(r => r.quizId));
        const completedCourseIds = new Set((completedCourses || []).map(c => c.course_id));

        return assignments.map(assignment => {
            let item = null;
            let isCompleted = false;
            if (assignment.item_type === 'quiz') {
                item = quizzes.find(q => q.id === assignment.item_id);
                if (item) {
                    isCompleted = completedQuizIds.has(item.id);
                }
            } else if (assignment.item_type === 'course') {
                item = courses.find(c => c.id === assignment.item_id);
                if (item) {
                    isCompleted = completedCourseIds.has(item.id);
                }
            }
            return { ...assignment, item, isCompleted };
        }).filter(a => a.item); // Filter out assignments where the item might have been deleted
    }, [assignments, quizzes, courses, quizResults, completedCourses]);

    const now = new Date();
    const activeAssignments = enrichedAssignments.filter(a => !a.isCompleted);
    const completedAssignments = enrichedAssignments.filter(a => a.isCompleted);

    const AssignmentCard = ({ assignment }) => {
        const { item, item_type, due_date, isCompleted } = assignment;
        const isOverdue = !isCompleted && due_date && new Date(due_date) < now;

        return (
            <Card className={`border-l-4 ${isCompleted ? 'border-green-500 bg-green-50/50 opacity-70' : (isOverdue ? 'border-red-500' : 'border-gray-200')}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                            {item_type === 'quiz' ? <DocumentTextIcon className="text-purple-500" /> : <CollectionIcon className="text-blue-500" />}
                            <span className="text-xs font-semibold uppercase tracking-wider">{item_type === 'quiz' ? 'Test' : 'Kurs'}</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">{item.title}</h3>
                    </div>
                    <div className="flex-shrink-0 w-full sm:w-auto">
                        {isCompleted ? (
                            <p className="text-sm font-semibold flex items-center gap-2 text-green-600">
                                <CheckCircleIcon />
                                <span>Tamamlanıb</span>
                            </p>
                        ) : (
                            <p className={`text-sm font-semibold flex items-center gap-2 ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                                <ClockIcon />
                                <span>Son tarix: {formatDate(due_date) || 'Yoxdur'}</span>
                            </p>
                        )}
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    {isCompleted ? (
                        <Link to={item_type === 'quiz' ? `/review/${quizResults.find(r => r.quizId === item.id)?.id}` : `/courses/${item.id}`}>
                            <Button variant="secondary" size="sm"><EyeIcon /> Nəticəyə bax</Button>
                        </Link>
                    ) : (
                        item_type === 'quiz' ? (
                            <Button onClick={() => onStartQuiz(item.id)}><PlayIcon /> Başla</Button>
                        ) : (
                            <Link to={`/courses/${item.id}`}><Button><PlayIcon /> Başla</Button></Link>
                        )
                    )}
                </div>
            </Card>
        );
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Tapşırıqlarım</h1>
                <MyGroupsCard groups={myGroups} className="mb-8" />
                <QuestCard quests={userQuests} />
            </div>
            
            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Müəllim Tərəfindən Verilən Tapşırıqlar</h2>
                {activeAssignments.length > 0 ? (
                    <div className="space-y-4">
                        {activeAssignments.map(a => <AssignmentCard key={a.id} assignment={a} />)}
                    </div>
                ) : (
                    <Card className="text-center py-12">
                        <p className="text-gray-500">Aktiv tapşırığınız yoxdur. Afərin!</p>
                    </Card>
                )}
            </div>

            {completedAssignments.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Tamamlanmış Tapşırıqlar</h2>
                    <div className="space-y-4">
                        {completedAssignments.map(a => <AssignmentCard key={a.id} assignment={a} />)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyAssignmentsPage;
