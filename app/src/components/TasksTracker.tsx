import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
    LayoutGrid,
    List,
    Search,
    User,
    Calendar
} from 'lucide-react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import KanbanColumn from './KanbanColumn'

interface Task {
    id: string
    title: string
    description?: string
    status_id: string
    department_id: string
    priority: 'low' | 'medium' | 'high'
    due_date?: string
    assigned_to?: string
    assignee?: {
        full_name: string
        avatar_url?: string
    }
    status?: {
        label: string
        color: string
    }
    department?: {
        name: string
        workspace?: {
            client?: {
                name: string
            }
        }
    }
}



interface TaskStatus {
    id: string
    label: string
    color: string
}

interface TasksTrackerProps {
    clientId?: string | null
}

export default function TasksTracker({ clientId }: TasksTrackerProps) {
    const [viewMode, setViewMode] = useState<'list' | 'board'>('list')
    const [tasks, setTasks] = useState<Task[]>([])
    const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // For the Kanban board, it usually works best within a single context (like a department).
    // If we are showing ALL tasks, a Kanban board might be messy if columns are department-specific.
    // For now, let's implement the List View as the primary view for "All Tasks", 
    // and maybe disable Board view if no department filter is selected, OR just show List view initially as per User Request for "Tracker".

    useEffect(() => {
        fetchTasks()
    }, [])

    const fetchTasks = async () => {
        setLoading(true)
        try {
            // Fetch Statuses
            const { data: statusData } = await supabase
                .from('task_statuses')
                .select('*')
                .order('position', { ascending: true })

            if (statusData) {
                // Deduplicate statuses by label
                const uniqueStatuses = statusData.reduce((acc: any[], current) => {
                    const x = acc.find(item => item.label === current.label);
                    if (!x) {
                        return acc.concat([current]);
                    } else {
                        return acc;
                    }
                }, []);
                setTaskStatuses(uniqueStatuses)
            }

            let query = supabase
                .from('tasks')
                .select(`
                    id,
                    title,
                    description,
                    priority,
                    due_date,
                    status_id,
                    department_id,
                    status:task_statuses(label, color),
                    assignee:profiles!tasks_assigned_to_fkey(full_name, avatar_url),
                    department:departments!inner(
                        name,
                        workspace:workspaces!inner(
                            client:clients!inner(name)
                        )
                    )
                `)
                .order('created_at', { ascending: false })

            if (clientId) {
                // @ts-ignore
                query = query.eq('department.workspace.client_id', clientId)
            }

            const { data, error } = await query

            if (error) throw error

            const formattedTasks = data.map((t: any) => ({
                ...t,
                assignee: t.assignee, // Profile object
                client_name: t.department?.workspace?.client?.name,
                dept_name: t.department?.name
            }))

            setTasks(formattedTasks)
        } catch (error) {
            console.error('Error fetching tasks:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredTasks = tasks.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.department?.workspace?.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result

        if (!destination) return
        if (destination.droppableId === source.droppableId && destination.index === source.index) return

        // Find the target status
        const targetStatusId = destination.droppableId
        const newStatus = taskStatuses.find(s => s.id === targetStatusId)

        if (!newStatus) return

        // Optimistic update
        const taskIndex = tasks.findIndex(t => t.id === draggableId)
        if (taskIndex === -1) return

        const updatedTasks = [...tasks]
        updatedTasks[taskIndex] = {
            ...updatedTasks[taskIndex],
            status_id: targetStatusId,
            status: {
                label: newStatus.label,
                color: newStatus.color
            }
        }
        setTasks(updatedTasks)

        try {
            const { error } = await supabase
                .from('tasks')
                .update({ status_id: targetStatusId })
                .eq('id', draggableId)

            if (error) throw error
        } catch (error) {
            console.error('Error updating task status:', error)
            fetchTasks() // Revert/Sync on error
        }
    }

    // function removed

    return (
        <div style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Tasks Tracker</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Track and manage tasks across all clients and departments.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                width: '250px'
                            }}
                        />
                    </div>
                    {/* View Toggle - simplified for now */}
                    <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                padding: '0.5rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: viewMode === 'list' ? 'var(--bg-primary)' : 'transparent',
                                color: viewMode === 'list' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('board')}
                            style={{
                                padding: '0.5rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: viewMode === 'board' ? 'var(--bg-primary)' : 'transparent',
                                color: viewMode === 'board' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                boxShadow: viewMode === 'board' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* List View */}
            {viewMode === 'list' && (
                <div style={{
                    flex: 1,
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(300px, 2fr) 150px 150px 150px 150px 100px',
                        padding: '1rem 1.5rem',
                        borderBottom: '1px solid var(--border-color)',
                        background: 'var(--bg-tertiary)',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        <div>Task</div>
                        <div>Client / Dept</div>
                        <div>Assignee</div>
                        <div>Status</div>
                        <div>Due Date</div>
                        <div>Priority</div>
                    </div>

                    {/* Body */}
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {loading ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading tasks...</div>
                        ) : filteredTasks.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No tasks found.</div>
                        ) : (
                            filteredTasks.map(task => (
                                <div key={task.id} style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'minmax(300px, 2fr) 150px 150px 150px 150px 100px',
                                    padding: '1rem 1.5rem',
                                    borderBottom: '1px solid var(--border-color)',
                                    alignItems: 'center',
                                    transition: 'background 0.2s',
                                    cursor: 'pointer',
                                    background: 'var(--bg-secondary)'
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                >
                                    {/* Task Title & Desc */}
                                    <div>
                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{task.title}</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {task.description ? task.description.replace(/<[^>]*>?/gm, '') : 'No description'}
                                        </div>
                                    </div>

                                    {/* Client */}
                                    <div>
                                        <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>{task.department?.workspace?.client?.name || '-'}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{task.department?.name}</div>
                                    </div>

                                    {/* Assignee */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{
                                            width: '24px', height: '24px', borderRadius: '50%',
                                            background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)'
                                        }}>
                                            {task.assignee?.full_name?.[0] || <User size={12} />}
                                        </div>
                                        <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{task.assignee?.full_name || 'Unassigned'}</span>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '9999px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            background: task.status?.color || '#e5e7eb',
                                            color: '#374151'
                                        }}>
                                            {task.status?.label || 'No Status'}
                                        </span>
                                    </div>

                                    {/* Due Date */}
                                    <div style={{ fontSize: '0.875rem', color: task.due_date && new Date(task.due_date) < new Date() ? 'var(--danger-color)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        {task.due_date ? (
                                            <>
                                                <Calendar size={14} />
                                                {new Date(task.due_date).toLocaleDateString()}
                                            </>
                                        ) : '-'}
                                    </div>

                                    {/* Priority */}
                                    <div>
                                        <span style={{
                                            padding: '0.2rem 0.6rem',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            textTransform: 'capitalize',
                                            ...(() => {
                                                switch (task.priority) {
                                                    case 'high': return { background: '#fee2e2', color: '#dc2626' } // Red
                                                    case 'medium': return { background: '#fef3c7', color: '#d97706' } // Amber/Yellow
                                                    case 'low': return { background: '#dcfce7', color: '#16a34a' } // Green
                                                    default: return { background: '#f3f4f6', color: '#6b7280' }
                                                }
                                            })()
                                        }}>
                                            {task.priority || 'Normal'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Board View */}
            {viewMode === 'board' && (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', gap: '1rem', paddingBottom: '0.5rem' }}>
                        {taskStatuses.map(status => {
                            const columnTasks = filteredTasks.filter(t => t.status?.label === status.label)
                            return (
                                <KanbanColumn key={status.id} status={status} tasks={columnTasks} />
                            )
                        })}
                    </div>
                </DragDropContext>
            )}
        </div >
    )
}
