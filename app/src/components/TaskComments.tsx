import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Send, Edit2, Trash2 } from 'lucide-react'

interface Comment {
    id: string
    task_id: string
    user_id: string
    content: string
    created_at: string
    updated_at: string
    user?: {
        full_name: string
        email: string
    }
}

interface TaskCommentsProps {
    taskId: string
}

export default function TaskComments({ taskId }: TaskCommentsProps) {
    const { user } = useAuth()
    const [comments, setComments] = useState<Comment[]>([])
    const [newComment, setNewComment] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editContent, setEditContent] = useState('')
    const [loading, setLoading] = useState(true)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        loadComments()

        // Subscribe to real-time updates
        const subscription = supabase
            .channel(`task_comments_${taskId}`, {
                config: {
                    broadcast: { self: true }
                }
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'task_comments',
                filter: `task_id=eq.${taskId}`
            }, (payload) => {
                console.log('Comment change detected:', payload)
                loadComments()
            })
            .subscribe((status, err) => {
                console.log('Subscription status:', status)
                if (err) console.error('Subscription error:', err)
            })

        // Fallback: Poll for updates every 5 seconds if realtime fails
        const pollInterval = setInterval(() => {
            loadComments()
        }, 5000)

        return () => {
            clearInterval(pollInterval)
            supabase.removeChannel(subscription)
        }
    }, [taskId])

    const loadComments = async () => {
        try {
            const { data, error } = await supabase
                .from('task_comments')
                .select('*, user:profiles(full_name, email)')
                .eq('task_id', taskId)
                .order('created_at', { ascending: true })

            if (error) throw error
            setComments(data || [])
        } catch (error) {
            console.error('Error loading comments:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddComment = async () => {
        if (!newComment.trim() || !user) return

        try {
            const { error } = await supabase
                .from('task_comments')
                .insert({
                    task_id: taskId,
                    user_id: user.id,
                    content: newComment.trim()
                })

            if (error) throw error
            setNewComment('')
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'
            }
        } catch (error) {
            console.error('Error adding comment:', error)
            alert('Failed to add comment')
        }
    }

    const handleUpdateComment = async (commentId: string) => {
        if (!editContent.trim()) return

        try {
            const { error } = await supabase
                .from('task_comments')
                .update({
                    content: editContent.trim()
                })
                .eq('id', commentId)

            if (error) throw error
            setEditingId(null)
            setEditContent('')
        } catch (error) {
            console.error('Error updating comment:', error)
            alert('Failed to update comment')
        }
    }

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm('Delete this comment?')) return

        try {
            const { error } = await supabase
                .from('task_comments')
                .delete()
                .eq('id', commentId)

            if (error) throw error
        } catch (error) {
            console.error('Error deleting comment:', error)
            alert('Failed to delete comment')
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            action()
        }
    }

    const autoResize = (textarea: HTMLTextAreaElement) => {
        textarea.style.height = 'auto'
        textarea.style.height = textarea.scrollHeight + 'px'
    }

    if (loading) {
        return (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af' }}>
                Loading comments...
            </div>
        )
    }

    return (
        <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                💬 Comments
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: '400' }}>
                    ({comments.length})
                </span>
            </h3>

            {/* Comments List */}
            <div style={{ marginBottom: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                {comments.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                        No comments yet. Be the first to comment!
                    </div>
                ) : (
                    comments.map(comment => (
                        <div key={comment.id} style={{
                            padding: '0.75rem',
                            marginBottom: '0.75rem',
                            background: '#f9fafb',
                            borderRadius: '0.5rem',
                            border: '1px solid #e5e7eb'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        background: '#4f46e5',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.75rem',
                                        fontWeight: '600'
                                    }}>
                                        {comment.user?.full_name?.[0]?.toUpperCase() || comment.user?.email?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                                            {comment.user?.full_name || comment.user?.email || 'Unknown User'}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                            {new Date(comment.created_at).toLocaleString()}
                                            {comment.updated_at !== comment.created_at && ' (edited)'}
                                        </div>
                                    </div>
                                </div>

                                {comment.user_id === user?.id && (
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                console.log('Edit clicked for comment:', comment.id)
                                                setEditingId(comment.id)
                                                setEditContent(comment.content)
                                            }}
                                            style={{
                                                padding: '0.25rem',
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#6b7280',
                                                cursor: 'pointer',
                                                borderRadius: '0.25rem'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDeleteComment(comment.id)
                                            }}
                                            style={{
                                                padding: '0.25rem',
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                borderRadius: '0.25rem'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {editingId === comment.id ? (
                                <div>
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => {
                                            setEditContent(e.target.value)
                                            autoResize(e.target)
                                        }}
                                        onKeyDown={(e) => handleKeyDown(e, () => handleUpdateComment(comment.id))}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '0.375rem',
                                            fontSize: '0.875rem',
                                            resize: 'none',
                                            minHeight: '60px',
                                            outline: 'none',
                                            fontFamily: 'inherit'
                                        }}
                                        autoFocus
                                        onFocus={(e) => {
                                            autoResize(e.target)
                                            e.target.setSelectionRange(e.target.value.length, e.target.value.length)
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <button
                                            onClick={() => handleUpdateComment(comment.id)}
                                            disabled={!editContent.trim()}
                                            style={{
                                                padding: '0.375rem 0.75rem',
                                                background: editContent.trim() ? '#4f46e5' : '#d1d5db',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '0.375rem',
                                                fontSize: '0.75rem',
                                                cursor: editContent.trim() ? 'pointer' : 'not-allowed',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingId(null)
                                                setEditContent('')
                                            }}
                                            style={{
                                                padding: '0.375rem 0.75rem',
                                                background: '#f3f4f6',
                                                color: '#374151',
                                                border: 'none',
                                                borderRadius: '0.375rem',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{
                                    fontSize: '0.875rem',
                                    color: '#374151',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word'
                                }}>
                                    {comment.content}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Add Comment Input */}
            <div style={{ position: 'relative' }}>
                <textarea
                    ref={textareaRef}
                    value={newComment}
                    onChange={(e) => {
                        setNewComment(e.target.value)
                        autoResize(e.target)
                    }}
                    onKeyDown={(e) => handleKeyDown(e, handleAddComment)}
                    placeholder="Add a comment... (Cmd/Ctrl + Enter to send)"
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        paddingRight: '3rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        resize: 'none',
                        minHeight: '44px',
                        maxHeight: '120px',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
                <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    style={{
                        position: 'absolute',
                        right: '0.5rem',
                        bottom: '0.5rem',
                        padding: '0.5rem',
                        background: newComment.trim() ? '#4f46e5' : '#e5e7eb',
                        color: newComment.trim() ? 'white' : '#9ca3af',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                >
                    <Send size={16} />
                </button>
            </div>
        </div>
    )
}
