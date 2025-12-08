import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'
import { Plus, CheckCircle2, Calendar, User, LayoutGrid, List, X } from 'lucide-react'
import KanbanBoard from './KanbanBoard'
import RichTextEditor from './RichTextEditor'

interface DepartmentTasksModalProps {
    isOpen: boolean
    onClose: () => void
    departmentId: string | null
    departmentName: string
    employees: any[]
}

interface Task {
    id: string
    title: string
    description?: string
    status_id: string
    priority: 'low' | 'medium' | 'high'
    due_date?: string
    created_at: string
    assignments?: {
        user_id: string
        user: {
            full_name: string
            email: string
        }
    }[]
}

interface TaskStatus {
    id: string
    label: string
    color: string
    position: number
}

interface TimeLogSummary {
    task_id: string
    total_seconds: number
}

export default function DepartmentTasksModal({
    isOpen,
    onClose,
    departmentId,
    departmentName,
    employees
}: DepartmentTasksModalProps) {
    const [tasks, setTasks] = useState<Task[]>([])
    const [statuses, setStatuses] = useState<TaskStatus[]>([])
    const [timeLogs, setTimeLogs] = useState<TimeLogSummary[]>([])
    const [loading, setLoading] = useState(false)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [viewMode, setViewMode] = useState<'list' | 'board'>('list')
    const [editingTask, setEditingTask] = useState<Task | null>(null)

    // Form State
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [assignedTo, setAssignedTo] = useState<string[]>([])
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
    const [dueDate, setDueDate] = useState('')

    useEffect(() => {
        if (isOpen && departmentId) {
            loadData()
        }
    }, [isOpen, departmentId])

    const loadData = async () => {
        if (!departmentId) return
        setLoading(true)
        try {
            // 1. Ensure statuses exist
            let { data: statusData } = await supabase
                .from('task_statuses')
                .select('*')
                .eq('department_id', departmentId)
                .order('position')

            if (!statusData || statusData.length === 0) {
                // Create default statuses
                const defaultStatuses = [
                    { department_id: departmentId, label: 'To Do', position: 0, color: '#e2e8f0' },
                    { department_id: departmentId, label: 'In Progress', position: 1, color: '#fef3c7' },
                    { department_id: departmentId, label: 'Done', position: 2, color: '#ecfdf5' }
                ]
                const { data: newStatuses, error: createError } = await supabase
                    .from('task_statuses')
                    .insert(defaultStatuses)
                    .select()

                if (createError) throw createError
                statusData = newStatuses
            }
            setStatuses(statusData || [])

            // 2. Load Tasks with Assignments
            const { data: tasksData, error: tasksError } = await supabase
                .from('tasks')
                .select(`
                    *,
                    assignments:task_assignments(
                        user_id,
                        user:profiles(full_name, email)
                    )
                `)
                .eq('department_id', departmentId)
                .order('created_at', { ascending: false })

            if (tasksError) throw tasksError
            setTasks(tasksData || [])

            // 3. Load Time Logs Summary
            if (tasksData && tasksData.length > 0) {
                const { data: logsData, error: logsError } = await supabase
                    .from('task_time_logs')
                    .select('task_id, duration_seconds, end_time, start_time')
                    .in('task_id', tasksData.map(t => t.id))

                if (logsError) throw logsError

                // Calculate total time per task
                const summary: Record<string, number> = {}
                logsData?.forEach(log => {
                    let duration = log.duration_seconds || 0
                    if (!duration && log.end_time && log.start_time) {
                        duration = (new Date(log.end_time).getTime() - new Date(log.start_time).getTime()) / 1000
                    }
                    summary[log.task_id] = (summary[log.task_id] || 0) + duration
                })

                setTimeLogs(Object.entries(summary).map(([task_id, total_seconds]) => ({ task_id, total_seconds })))
            }

        } catch (error) {
            console.error('Error loading department tasks:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!departmentId) return

        try {
            let taskId: string

            if (editingTask) {
                // Update existing task
                const { error } = await supabase
                    .from('tasks')
                    .update({
                        title,
                        description,
                        priority,
                        due_date: dueDate || null
                    })
                    .eq('id', editingTask.id)

                if (error) throw error
                taskId = editingTask.id

                // Update assignments
                // First delete existing
                const { error: deleteError } = await supabase
                    .from('task_assignments')
                    .delete()
                    .eq('task_id', taskId)

                if (deleteError) throw deleteError

            } else {
                // Create new task
                const todoStatus = statuses.find(s => s.label === 'To Do') || statuses[0]

                const { data, error } = await supabase
                    .from('tasks')
                    .insert({
                        department_id: departmentId,
                        title,
                        description,
                        priority,
                        due_date: dueDate || null,
                        status_id: todoStatus?.id
                    })
                    .select()
                    .single()

                if (error) throw error
                taskId = data.id
            }

            // Insert new assignments
            if (assignedTo.length > 0) {
                // Ensure unique user IDs
                const uniqueUserIds = [...new Set(assignedTo)]
                const assignments = uniqueUserIds.map(userId => ({
                    task_id: taskId,
                    user_id: userId
                }))

                // Use upsert to be safe against race conditions or failed deletes
                const { error: assignError } = await supabase
                    .from('task_assignments')
                    .upsert(assignments, { onConflict: 'task_id,user_id' })

                if (assignError) throw assignError
            }

            // Reset form and reload
            setTitle('')
            setDescription('')
            setAssignedTo([])
            setPriority('medium')
            setDueDate('')
            setShowCreateForm(false)
            setEditingTask(null)
            loadData()

        } catch (error) {
            console.error('Error creating/updating task:', error)
            alert('Failed to create/update task')
        }
    }

    const handleUpdateTaskStatus = async (taskId: string, newStatusLabel: string) => {
        const newStatus = statuses.find(s => s.label === newStatusLabel)
        if (!newStatus) return

        // Optimistic update
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, status_id: newStatus.id } : t
        ))

        const { error } = await supabase
            .from('tasks')
            .update({ status_id: newStatus.id })
            .eq('id', taskId)

        if (error) {
            console.error('Error updating task status:', error)
            // Revert on error
            loadData()
        }
    }

    const handleEditTask = (task: Task) => {
        setEditingTask(task)
        setTitle(task.title)
        setDescription(task.description || '')
        setAssignedTo(task.assignments?.map(a => a.user_id) || [])
        setPriority(task.priority)
        setDueDate(task.due_date ? task.due_date.split('T')[0] : '')
        setShowCreateForm(true)
    }

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return

        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId)

            if (error) throw error
            loadData()
        } catch (error) {
            console.error('Error deleting task:', error)
            alert('Failed to delete task')
        }
    }

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        return `${h}h ${m}m`
    }

    const toggleAssignee = (employeeId: string) => {
        setAssignedTo(prev =>
            prev.includes(employeeId)
                ? prev.filter(id => id !== employeeId)
                : [...prev, employeeId]
        )
    }

    const stripHtml = (html: string) => {
        const tmp = document.createElement('DIV')
        tmp.innerHTML = html
        return tmp.textContent || tmp.innerText || ''
    }

    const handleCreateStatus = async (label: string) => {
        if (!departmentId) return

        try {
            const { error } = await supabase
                .from('task_statuses')
                .insert({
                    department_id: departmentId,
                    label,
                    position: statuses.length
                })

            if (error) throw error
            loadData()
        } catch (error) {
            console.error('Error creating status:', error)
            alert('Failed to create status')
        }
    }

    const handleReorderStatus = async (startIndex: number, endIndex: number) => {
        if (!departmentId) return

        const result = Array.from(statuses)
        const [removed] = result.splice(startIndex, 1)
        result.splice(endIndex, 0, removed)

        // Optimistic update
        const newStatuses = result.map((s, index) => ({ ...s, position: index }))
        setStatuses(newStatuses)

        try {
            // Update all positions in db
            const updates = newStatuses.map(s => ({
                id: s.id,
                position: s.position,
                label: s.label,
                department_id: departmentId
            }))

            const { error } = await supabase
                .from('task_statuses')
                .upsert(updates)

            if (error) throw error
        } catch (error) {
            console.error('Error reordering statuses:', error)
            loadData() // Revert
        }
    }

    const handleDeleteStatus = async (statusId: string) => {
        try {
            const { error } = await supabase
                .from('task_statuses')
                .delete()
                .eq('id', statusId)

            if (error) throw error
            loadData()
        } catch (error) {
            console.error('Error deleting status:', error)
            alert('Failed to delete status')
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Tasks - ${departmentName}`}
            maxWidth="1400px"
            bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: 'calc(90vh - 65px)', overflow: 'hidden' }}
        >
            <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

                {/* Left Panel: Task List */}
                <div style={{
                    width: showCreateForm || editingTask ? '40%' : '100%',
                    borderRight: showCreateForm || editingTask ? '1px solid #e5e7eb' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'width 0.3s ease'
                }}>
                    {/* Toolbar */}
                    <div style={{
                        padding: '1rem',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#f9fafb'
                    }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                <span style={{ fontWeight: '600', color: '#111827' }}>{tasks.length}</span> Tasks
                            </div>
                            <div style={{ height: '16px', width: '1px', background: '#d1d5db' }}></div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                <span style={{ fontWeight: '600', color: '#111827' }}>
                                    {formatDuration(timeLogs.reduce((acc, curr) => acc + curr.total_seconds, 0))}
                                </span> Logged
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '2px' }}>
                                <button
                                    onClick={() => setViewMode('list')}
                                    style={{
                                        padding: '0.25rem 0.5rem',
                                        background: viewMode === 'list' ? '#f3f4f6' : 'transparent',
                                        color: viewMode === 'list' ? '#4f46e5' : '#6b7280',
                                        border: 'none',
                                        borderRadius: '0.375rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        fontSize: '0.75rem',
                                        fontWeight: '500'
                                    }}
                                >
                                    <List size={14} /> List
                                </button>
                                <button
                                    onClick={() => setViewMode('board')}
                                    style={{
                                        padding: '0.25rem 0.5rem',
                                        background: viewMode === 'board' ? '#f3f4f6' : 'transparent',
                                        color: viewMode === 'board' ? '#4f46e5' : '#6b7280',
                                        border: 'none',
                                        borderRadius: '0.375rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        fontSize: '0.75rem',
                                        fontWeight: '500'
                                    }}
                                >
                                    <LayoutGrid size={14} /> Board
                                </button>
                            </div>
                            <button
                                onClick={() => {
                                    setShowCreateForm(true)
                                    setEditingTask(null)
                                    setTitle('')
                                    setDescription('')
                                    setAssignedTo([])
                                    setPriority('medium')
                                    setDueDate('')
                                }}
                                style={{
                                    padding: '0.375rem 0.75rem',
                                    background: '#4f46e5',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem'
                                }}
                            >
                                <Plus size={16} /> New Task
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: '#f3f4f6' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading tasks...</div>
                        ) : tasks.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                                <CheckCircle2 size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                <p>No tasks found.</p>
                            </div>
                        ) : viewMode === 'board' ? (
                            <KanbanBoard
                                tasks={tasks}
                                statuses={statuses}
                                onUpdateTaskStatus={handleUpdateTaskStatus}
                                onEdit={handleEditTask}
                                onDelete={handleDeleteTask}
                                onAddStatus={handleCreateStatus}
                                onReorderStatus={handleReorderStatus}
                                onDeleteStatus={handleDeleteStatus}
                            />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {tasks.map(task => {
                                    const status = statuses.find(s => s.id === task.status_id)
                                    const timeLogged = timeLogs.find(l => l.task_id === task.id)?.total_seconds || 0
                                    const isSelected = editingTask?.id === task.id

                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => handleEditTask(task)}
                                            style={{
                                                padding: '1rem',
                                                border: isSelected ? '1px solid #4f46e5' : '1px solid #e5e7eb',
                                                borderRadius: '0.5rem',
                                                background: isSelected ? '#eef2ff' : 'white',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', color: '#111827' }}>{task.title}</h4>
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    padding: '0.125rem 0.5rem',
                                                    borderRadius: '9999px',
                                                    background: status?.color || '#f3f4f6',
                                                    color: '#374151',
                                                    fontWeight: '500'
                                                }}>
                                                    {status?.label}
                                                </span>
                                            </div>
                                            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', color: '#6b7280', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {stripHtml(task.description || '')}
                                            </p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
                                                        <User size={12} />
                                                        {task.assignments && task.assignments.length > 0 ? task.assignments.length : '0'}
                                                    </div>
                                                    {task.due_date && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
                                                            <Calendar size={12} /> {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#4f46e5' }}>
                                                    {formatDuration(timeLogged)}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Form */}
                {(showCreateForm || editingTask) && (
                    <div style={{ width: '60%', display: 'flex', flexDirection: 'column', background: 'white', animation: 'slideIn 0.2s ease-out' }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                                {editingTask ? 'Edit Task' : 'Create New Task'}
                            </h3>
                            <button
                                onClick={() => { setShowCreateForm(false); setEditingTask(null); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                            <form id="task-form" onSubmit={handleCreateTask}>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>Task Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        required
                                        placeholder="What needs to be done?"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', fontSize: '1rem' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>Priority</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {['low', 'medium', 'high'].map(p => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setPriority(p as any)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '0.5rem',
                                                        borderRadius: '0.375rem',
                                                        border: `1px solid ${priority === p ? (p === 'high' ? '#fca5a5' : p === 'medium' ? '#fcd34d' : '#a5b4fc') : '#e5e7eb'}`,
                                                        background: priority === p ? (p === 'high' ? '#fef2f2' : p === 'medium' ? '#fffbeb' : '#eef2ff') : 'white',
                                                        color: priority === p ? (p === 'high' ? '#b91c1c' : p === 'medium' ? '#b45309' : '#4338ca') : '#6b7280',
                                                        fontWeight: '500',
                                                        textTransform: 'capitalize',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>Due Date</label>
                                        <input
                                            type="date"
                                            value={dueDate}
                                            onChange={e => setDueDate(e.target.value)}
                                            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>Description</label>
                                    <RichTextEditor
                                        value={description}
                                        onChange={setDescription}
                                        placeholder="Add details..."
                                        style={{ height: '200px', marginBottom: '3rem' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>Assignees</label>
                                    <div style={{
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.5rem',
                                        background: '#f9fafb',
                                        padding: '0.5rem'
                                    }}>
                                        {employees.length === 0 ? (
                                            <div style={{ fontSize: '0.875rem', color: '#9ca3af', textAlign: 'center', padding: '1rem' }}>No employees found</div>
                                        ) : (
                                            employees.map(emp => (
                                                <label
                                                    key={emp.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.75rem',
                                                        padding: '0.5rem',
                                                        borderRadius: '0.375rem',
                                                        cursor: 'pointer',
                                                        background: assignedTo.includes(emp.id) ? '#eef2ff' : 'transparent',
                                                        transition: 'background 0.2s'
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={assignedTo.includes(emp.id)}
                                                        onChange={() => toggleAssignee(emp.id)}
                                                        style={{ width: '16px', height: '16px', accentColor: '#4f46e5' }}
                                                    />
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <div style={{
                                                            width: '24px',
                                                            height: '24px',
                                                            borderRadius: '50%',
                                                            background: '#e0e7ff',
                                                            color: '#4f46e5',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600'
                                                        }}>
                                                            {(emp.full_name || emp.email).charAt(0).toUpperCase()}
                                                        </div>
                                                        <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: assignedTo.includes(emp.id) ? '500' : '400' }}>
                                                            {emp.full_name || emp.email}
                                                        </span>
                                                    </div>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div style={{ padding: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: '#f9fafb' }}>
                            {editingTask && (
                                <button
                                    type="button"
                                    onClick={() => handleDeleteTask(editingTask.id)}
                                    style={{ padding: '0.625rem 1.25rem', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '0.5rem', fontWeight: '500', cursor: 'pointer' }}
                                >
                                    Delete Task
                                </button>
                            )}
                            <button
                                type="submit"
                                form="task-form"
                                style={{ padding: '0.625rem 1.5rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '500', cursor: 'pointer', boxShadow: '0 1px 2px rgba(79, 70, 229, 0.2)' }}
                            >
                                {editingTask ? 'Save Changes' : 'Create Task'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </Modal>
    )
}
