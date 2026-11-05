import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Comments from '../components/Comments';
import { ArrowLeftIcon, UserGroupIcon, UserCircleIcon } from '../assets/icons';

const StudentGroupViewPage = ({ group, profile, fetchComments, postComment, deleteComment }) => {
    return (
        <div className="animate-fade-in grid lg:grid-cols-3 gap-8 items-start">
            {/* Left Panel: Group Info & Members */}
            <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                <div className="flex flex-col gap-2">
                    <Link to="/my-assignments">
                        <Button variant="secondary" className="w-full justify-center">
                            <ArrowLeftIcon /> Tapşırıqlarıma qayıt
                        </Button>
                    </Link>
                </div>
                <Card>
                    <div className="flex items-center gap-3 mb-4">
                        <UserGroupIcon className="w-8 h-8 text-orange-500" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">{group.name}</h1>
                            <p className="text-sm text-gray-500">{group.description}</p>
                        </div>
                    </div>
                    <h3 className="font-bold text-gray-800 mb-3 mt-4 pt-4 border-t">Üzvlər ({group.members.length})</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {group.members.map(member => (
                            <div key={member.user_id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                                <UserCircleIcon className="w-6 h-6 text-gray-400" />
                                <span className="font-medium text-gray-700">
                                    {member.profiles?.first_name} {member.profiles?.last_name}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Right Panel: Discussion Board */}
            <div className="lg:col-span-2">
                <Card>
                    <Comments
                        targetId={group.id}
                        targetType="group"
                        profile={profile}
                        fetchComments={fetchComments}
                        postComment={postComment}
                        deleteComment={deleteComment}
                    />
                </Card>
            </div>
        </div>
    );
};

export default StudentGroupViewPage;