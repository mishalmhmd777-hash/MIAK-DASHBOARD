import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'
import { Calendar, User, Briefcase, Video, LayoutGrid, Camera, Image as ImageIcon } from 'lucide-react'

interface CreativeTaskModalProps {
    isOpen: boolean
    onClose: () => void
    onTaskCreated: () => void
    taskToEdit?: any // Using any for simplicity now, ideally Task type
}

export default function CreativeTaskModal({ isOpen, onClose, onTaskCreated, taskToEdit }: CreativeTaskModalProps) {
    const [title, setTitle] = useState('')
    const [clientId, setClientId] = useState('')
    const [contentType, setContentType] = useState<string>('Static')
    const [priority, setPriority] = useState<string>('medium')
    const [startDate, setStartDate] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [assigneeId, setAssigneeId] = useState('')
    const [loading, setLoading] = useState(false)

    // Data for dropdowns
    const [profiles, setProfiles] = useState<any[]>([])
    const [departments, setDepartments] = useState<any[]>([])

    useEffect(() => {
        if (isOpen) {
            fetchFormData()
            if (taskToEdit) {
                // Populate form
                setTitle(taskToEdit.title)
                setContentType(taskToEdit.content_type || 'Static')
                setPriority(taskToEdit.priority || 'medium')

                // Dates need to be formatted for datetime-local (YYYY-MM-DDTHH:mm)
                if (taskToEdit.start_date) setStartDate(new Date(taskToEdit.start_date).toISOString().slice(0, 16))
                if (taskToEdit.due_date) setDueDate(new Date(taskToEdit.due_date).toISOString().slice(0, 16))

                if (taskToEdit.assignee) setAssigneeId(taskToEdit.assignee.id)
            } else {
                resetForm()
            }
        }
    }, [isOpen, taskToEdit])

    const fetchFormData = async () => {
        try {
            // Fetch Departments with Client names
            const { data: depts, error: deptError } = await supabase
                .from('departments')
                .select(`
                    id, 
                    name, 
                    workspace:workspaces!inner(
                        name, 
                        client:clients!inner(name)
                    )
                `)

            if (deptError) throw deptError
            setDepartments(depts || [])

            // Fetch Profiles for assignment
            const { data: profs, error: profError } = await supabase
                .from('profiles')
                .select('id, full_name, email')

            if (profError) throw profError
            setProfiles(profs || [])

        } catch (error) {
            console.error('Error loading form data:', error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Get department_id from our selection 
            const departmentId = clientId

            let statusId = null

            if (!taskToEdit) {
                // Only find default status if creating new
                const { data: statuses } = await supabase
                    .from('task_statuses')
                    .select('id')
                    .eq('department_id', departmentId)
                    .ilike('label', 'Not Started')
                    .single()

                if (statuses) {
                    statusId = statuses.id
                } else {
                    const { data: anyStatus } = await supabase
                        .from('task_statuses')
                        .select('id')
                        .eq('department_id', departmentId)
                        .limit(1)
                        .single()
                    statusId = anyStatus?.id
                }
            }

            const payload: any = {
                title,
                department_id: departmentId,
                content_type: contentType,
                priority,
                start_date: startDate ? new Date(startDate).toISOString() : null,
                due_date: dueDate ? new Date(dueDate).toISOString() : null,
                assigned_to: assigneeId || null
            }

            if (statusId) payload.status_id = statusId

            let error = null

            if (taskToEdit) {
                const { error: updateError } = await supabase
                    .from('tasks')
                    .update(payload)
                    .eq('id', taskToEdit.id)
                error = updateError
            } else {
                const { error: insertError } = await supabase
                    .from('tasks')
                    .insert(payload)
                error = insertError
            }

            if (error) throw error

            onTaskCreated()
            onClose()
            resetForm()

        } catch (error) {
            console.error('Error saving task:', error)
            alert('Failed to save task')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setTitle('')
        setClientId('')
        setContentType('Static')
        setPriority('medium')
        setStartDate('')
        setDueDate('')
        setAssigneeId('')
    }

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={taskToEdit ? "Edit Content Task" : "New Content Task"}
            maxWidth="1000px"
        >

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Title */}
                <div>
                    <label style={labelStyle}>Content Title</label>
                    <input
                        required
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. Summer Campaign Video"
                        style={inputStyle}
                    />
                </div>

                {/* Account / Department */}
                <div>
                    <label style={labelStyle}>Client / Department</label>
                    <div style={{ position: 'relative' }}>
                        <Briefcase size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <select
                            required
                            value={clientId} // Storing department_id here
                            onChange={e => setClientId(e.target.value)}
                            style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                        >
                            <option value="">Select a Client...</option>
                            {departments.map((dept: any) => (
                                <option key={dept.id} value={dept.id}>
                                    {dept.workspace.client.name} - {dept.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* Content Type */}
                    <div>
                        <label style={labelStyle}>Content Type</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            {['Static', 'Video', 'Reel', 'Shooting'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setContentType(type)}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '6px',
                                        border: contentType === type ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                                        background: contentType === type ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-tertiary)',
                                        color: contentType === type ? '#3b82f6' : 'var(--text-secondary)',
                                        fontSize: '0.75rem',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}
                                >
                                    {type === 'Static' && <ImageIcon size={14} />}
                                    {type === 'Video' && <Video size={14} />}
                                    {type === 'Reel' && <LayoutGrid size={14} />}
                                    {type === 'Shooting' && <Camera size={14} />}
                                    {type}
                                </button>
                            ))}
                        </div>
                        {/* Custom Type Input */}
                        <div style={{ marginBottom: '0.5rem' }}>
                            <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Or Custom Type:</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    value={['Static', 'Video', 'Reel', 'Shooting'].includes(contentType) ? '' : contentType}
                                    onChange={(e) => setContentType(e.target.value)}
                                    placeholder="Type custom name..."
                                    style={{ ...inputStyle, paddingLeft: '0.75rem' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Designer / Assignee */}
                    <div>
                        <label style={labelStyle}>Designer</label>
                        <div style={{ position: 'relative', marginBottom: '1rem' }}>
                            <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <select
                                value={assigneeId}
                                onChange={e => setAssigneeId(e.target.value)}
                                style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                            >
                                <option value="">Unassigned</option>
                                {profiles.map(p => (
                                    <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                                ))}
                            </select>
                        </div>

                        {/* Priority - Moved here to balance column */}
                        <label style={labelStyle}>Priority</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {['low', 'medium', 'high'].map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPriority(p)}
                                    style={{
                                        flex: 1,
                                        padding: '0.5rem',
                                        borderRadius: '6px',
                                        border: priority === p
                                            ? (p === 'high' ? '1px solid #ef4444' : p === 'medium' ? '1px solid #f59e0b' : '1px solid #22c55e')
                                            : '1px solid var(--border-color)',
                                        background: priority === p
                                            ? (p === 'high' ? 'rgba(239, 68, 68, 0.1)' : p === 'medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)')
                                            : 'var(--bg-tertiary)',
                                        color: priority === p
                                            ? (p === 'high' ? '#ef4444' : p === 'medium' ? '#f59e0b' : '#22c55e')
                                            : 'var(--text-secondary)',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        textTransform: 'capitalize',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* Start Date */}
                    <div>
                        <label style={labelStyle}>Work Start Date</label>
                        <div style={{ position: 'relative' }}>
                            <Calendar size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="datetime-local"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                            />
                        </div>
                    </div>

                    {/* Due Date */}
                    <div>
                        <label style={labelStyle}>Publish/Due Date</label>
                        <div style={{ position: 'relative' }}>
                            <Calendar size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="datetime-local"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '0.5rem 1.5rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#3b82f6',
                            color: 'white',
                            fontWeight: '500',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Saving...' : (taskToEdit ? 'Save Changes' : 'Create Task')}
                    </button>
                </div>

            </form>
        </Modal>
    )
}

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    marginBottom: '0.5rem'
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    outline: 'none'
}
