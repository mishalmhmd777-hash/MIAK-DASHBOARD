import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { User, Flag, Clock, Layout, AlignLeft } from 'lucide-react'
import Modal from './Modal'
import RichTextEditor from './RichTextEditor'
import { useAuth } from '../contexts/AuthContext'

interface TaskDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    task: any
    onUpdate: () => void
}

export default function TaskDetailsModal({ isOpen, onClose, task, onUpdate }: TaskDetailsModalProps) {
    // Data State
    const [description, setDescription] = useState('')
    const [title, setTitle] = useState('')
    const [statuses, setStatuses] = useState<any[]>([])

    // Load statuses
    useEffect(() => {
        const loadStatuses = async () => {
            if (!task?.department_id) return
            const { data } = await supabase
                .from('task_statuses')
                .select('*')
                .eq('department_id', task.department_id)
                .order('position')
            setStatuses(data || [])
        }
        loadStatuses()
    }, [task?.department_id])

    // Initialize
    useEffect(() => {
        if (isOpen && task) {
            setDescription(task.description || '')
            setTitle(task.title || '')
        }
    }, [isOpen, task])

    const handleUpdateDescription = async (newDesc: string) => {
        setDescription(newDesc)
        try {
            await supabase.from('tasks').update({ description: newDesc }).eq('id', task.id)
            onUpdate()
        } catch (error) {
            console.error('Error updating description:', error)
        }
    }

    const handleUpdateTitle = async () => {
        if (title !== task.title) {
            try {
                await supabase.from('tasks').update({ title }).eq('id', task.id)
                onUpdate()
            } catch (error) {
                console.error('Error updating title:', error)
            }
        }
    }

    const handleUpdateStatus = async (statusId: string) => {
        try {
            await supabase.from('tasks').update({ status_id: statusId }).eq('id', task.id)
            onUpdate()
        } catch (error) {
            console.error('Error updating status:', error)
        }
    }

    if (!task) return null

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" variant="fullscreen" bodyStyle={{ padding: 0 }}>
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 4rem', fontFamily: 'Inter, sans-serif', height: '100%', display: 'flex', flexDirection: 'column' }}>

                {/* Main Content Area - Scrollable */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }}>

                    {/* Title Input */}
                    <div style={{ marginBottom: '2rem' }}>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={handleUpdateTitle}
                            style={{
                                fontSize: '2.5rem',
                                fontWeight: '700',
                                color: '#111827',
                                border: 'none',
                                outline: 'none',
                                width: '100%',
                                background: 'transparent',
                                marginBottom: '0.5rem'
                            }}
                            placeholder="Task Title"
                        />
                    </div>

                    {/* Task Properties */}
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem 1rem', alignItems: 'center', fontSize: '0.9rem', marginBottom: '2rem' }}>
                        {/* Status */}
                        <div style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Layout size={16} /> Status
                        </div>
                        <div>
                            <select
                                value={task.status_id || ''}
                                onChange={(e) => handleUpdateStatus(e.target.value)}
                                style={{
                                    background: '#e5e7eb',
                                    color: '#374151',
                                    padding: '0.125rem 0.5rem',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.85rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                <option value="" disabled>Select Status</option>
                                {statuses.map(status => (
                                    <option key={status.id} value={status.id}>
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {/* Priority */}
                        <div style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Flag size={16} /> Priority
                        </div>
                        <div>
                            <span style={{
                                background: task.priority === 'high' ? '#fee2e2' : task.priority === 'medium' ? '#fef3c7' : '#e0e7ff',
                                color: task.priority === 'high' ? '#b91c1c' : task.priority === 'medium' ? '#b45309' : '#4338ca',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.85rem',
                                textTransform: 'capitalize'
                            }}>
                                {task.priority || 'Medium'}
                            </span>
                        </div>
                        {/* Assignee */}
                        <div style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={16} /> Assignee
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {task.task_assignments?.map((assignment: any) => (
                                <div key={assignment.user_id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '600' }}>
                                        {(assignment.user?.full_name || assignment.user?.email || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <span style={{ color: '#374151' }}>{assignment.user?.full_name || 'Unknown'}</span>
                                </div>
                            ))}
                        </div>
                        {/* Due Date */}
                        <div style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={16} /> Due Date
                        </div>
                        <div style={{ color: '#374151' }}>
                            {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                        </div>
                    </div>
                    <hr style={{ border: 'none', borderBottom: '1px solid #e5e7eb', margin: '2rem 0' }} />

                    {/* Description */}
                    <div style={{ marginBottom: '3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#374151' }}>
                            <AlignLeft size={20} />
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>Description</h3>
                        </div>
                        <div className="notion-editor-wrapper">
                            <RichTextEditor
                                value={description}
                                onChange={handleUpdateDescription}
                                placeholder="Type a description... (Type '/' for commands)"
                                style={{ minHeight: '100px' }}
                            />
                        </div>
                    </div>

                </div>
            </div>
        </Modal>
    )
}
