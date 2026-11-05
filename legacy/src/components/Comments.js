import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Button from './ui/Button';
import { ReplyIcon, TrashIcon } from '../assets/icons';

const Comment = ({ comment, onReply, onDelete, profile }) => {
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [replyContent, setReplyContent] = useState('');

    const handleReplySubmit = (e) => {
        e.preventDefault();
        if (!replyContent.trim()) return;
        onReply(replyContent, comment.id);
        setReplyContent('');
        setShowReplyForm(false);
    };

    return (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-white shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center font-bold text-orange-600">
                        {comment.profiles.first_name?.[0] || 'U'}
                    </div>
                    <span className="font-semibold text-gray-800">{comment.profiles.first_name} {comment.profiles.last_name}</span>
                </div>
                <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleString()}</span>
            </div>
            <p className="text-gray-700 pl-10">{comment.content}</p>
            <div className="flex items-center justify-end gap-2 pl-10">
                {profile && <Button variant="secondary" size="sm" onClick={() => setShowReplyForm(!showReplyForm)}><ReplyIcon /> Cavab ver</Button>}
                {profile?.id === comment.user_id && <Button variant="danger" size="sm" onClick={() => onDelete(comment.id)}><TrashIcon /></Button>}
            </div>
            {showReplyForm && (
                <form onSubmit={handleReplySubmit} className="pl-10 mt-2 flex gap-2">
                    <input 
                        type="text" 
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={`Cavab verilir: ${comment.profiles.first_name}...`}
                        className="flex-grow mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                    />
                    <Button type="submit" size="sm">Göndər</Button>
                </form>
            )}
            {comment.children && comment.children.length > 0 && (
                <div className="pl-6 border-l-2 border-orange-100 mt-2 space-y-3">
                    {comment.children.map(child => (
                        <Comment key={child.id} comment={child} onReply={onReply} onDelete={onDelete} profile={profile} />
                    ))}
                </div>
            )}
        </div>
    );
};

const Comments = ({ targetId, targetType, profile, fetchComments, postComment, deleteComment }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const location = useLocation();

    useEffect(() => {
        const loadComments = async () => {
            const fetchedComments = await fetchComments(targetId, targetType);
            setComments(fetchedComments || []);
        };
        if (targetId && targetType) {
            loadComments();
        }
    }, [targetId, targetType, fetchComments]);

    const handlePostComment = async (content, parentId = null) => {
        const targetUrl = `${location.pathname}#comment-${parentId || 'new'}`;
        const postedComment = await postComment(targetId, targetType, content, parentId, targetUrl);
        if (postedComment) {
            const fetchedComments = await fetchComments(targetId, targetType);
            setComments(fetchedComments || []);
            if (!parentId) {
                setNewComment('');
            }
        }
    };

    const handleDeleteComment = async (commentId) => {
        const success = await deleteComment(commentId);
        if (success) {
            setComments(prev => prev.filter(c => c.id !== commentId));
        }
    };

    const commentTree = useMemo(() => {
        const map = {};
        const roots = [];
        comments.forEach(comment => {
            map[comment.id] = { ...comment, children: [] };
        });
        comments.forEach(comment => {
            if (comment.parent_comment_id && map[comment.parent_comment_id]) {
                map[comment.parent_comment_id].children.push(map[comment.id]);
            } else {
                roots.push(map[comment.id]);
            }
        });
        return roots;
    }, [comments]);

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800">Şərhlər ({comments.length})</h3>
            {profile && (
                <form onSubmit={(e) => { e.preventDefault(); handlePostComment(newComment); }} className="flex gap-2 items-start">
                    <textarea 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Şərhinizi yazın..."
                        className="flex-grow mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        rows="3"
                    />
                    <Button type="submit">Göndər</Button>
                </form>
            )}
            {!profile && <p className="text-center p-4 bg-gray-50 rounded-md">Şərh yazmaq üçün <Link to="/auth" className="text-orange-600 font-semibold hover:underline">daxil olun</Link>.</p>}
            
            <div className="space-y-4">
                {commentTree.map(comment => (
                    <Comment key={comment.id} comment={comment} onReply={handlePostComment} onDelete={handleDeleteComment} profile={profile} />
                ))}
            </div>
        </div>
    );
};

export default Comments;
