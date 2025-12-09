import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { LayoutGrid, List, LogOut, Moon, Sun, CheckCircle2, User, Calendar, Flag, BarChart2 } from 'lucide-react'
import KanbanBoard from '../components/KanbanBoard'
import TaskDetailsModal from '../components/TaskDetailsModal'
import NotificationCenter from '../components/NotificationCenter'
import TaskCalendar from '../components/TaskCalendar'
import TaskChart from '../components/TaskChart'

export default function EmployeeDashboard() {
    const { user, signOut } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const [tasks, setTasks] = useState<any[]>([])
    const [statuses, setStatuses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar' | 'chart'>('list')
    const [selectedTask, setSelectedTask] = useState<any>(null)
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

    useEffect(() => {
        loadData()

        const taskSubscription = supabase
            .channel('employee_dashboard_tasks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
                loadData()
            })
            .subscribe()

        return () => {
            taskSubscription.unsubscribe()
        }
    }, [user])

    const loadData = async () => {
        if (!user) return

        try {
            // 1. Get assignments for current user
            const { data: assignments, error: assignError } = await supabase
                .from('task_assignments')
                .select('task_id')
                .eq('user_id', user.id)

            if (assignError) throw assignError

            if (!assignments || assignments.length === 0) {
                setTasks([])
                setLoading(false)
                return
            }

            const taskIds = assignments.map(a => a.task_id)

            // 2. Get Tasks
            const { data: tasksData, error: tasksError } = await supabase
                .from('tasks')
                .select(`
                    *,
                    assignments:task_assignments(
                        user_id,
                        user:profiles(full_name, email)
                    )
                `)
                .in('id', taskIds)
                .order('created_at', { ascending: false })

            if (tasksError) throw tasksError

            // 3. Get Statuses
            const branchIds = [...new Set(tasksData?.map(t => t.department_id) || [])]

            if (branchIds.length > 0) {
                const { data: statusesData } = await supabase
                    .from('task_statuses')
                    .select('*')
                    .in('department_id', branchIds)
                    .order('position')

                setStatuses(statusesData || [])
            }

            setTasks(tasksData || [])
        } catch (error) {
            console.error('Error loading tasks:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateTaskStatus = async (taskId: string, newStatusLabel: string) => {
        const task = tasks.find(t => t.id === taskId)
        if (!task) return

        // Try to find status by Label AND Department first
        let newStatus = statuses.find(s =>
            s.department_id === task.department_id &&
            (s.id === newStatusLabel || s.label === newStatusLabel)
        )

        // Fallback: If passed ID is actually a Status ID (not Label), this works.
        // Or if we need to fall back to ANY status with that label (less safe but OK for display grouping)
        if (!newStatus) {
            newStatus = statuses.find(s => s.id === newStatusLabel || s.label === newStatusLabel)
        }

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
            console.error('Error updating status:', error)
            loadData()
        }
    }

    const handleSignOut = async () => {
        try {
            await signOut()
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', transition: 'background-color 0.3s, color 0.3s' }}>
            {/* Header */}
            <header style={{
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-color)',
                padding: '1rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                zIndex: 40
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                        WD
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>My Dashboard</h1>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            Welcome back, <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{user?.email}</span>
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <NotificationCenter />

                    <button
                        onClick={toggleTheme}
                        style={{
                            padding: '0.625rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-primary)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                        {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                    </button>

                    <button
                        onClick={handleSignOut}
                        style={{
                            padding: '0.625rem 1.25rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: '0.5rem',
                            background: 'transparent',
                            color: 'var(--danger-color)',
                            fontWeight: '600',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                        }}
                    >
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>

                {/* Stats / Welcome Widget */}
                <div style={{
                    background: 'linear-gradient(to right, var(--accent-color), #8b5cf6)',
                    borderRadius: '1rem',
                    padding: '2rem',
                    marginBottom: '2rem',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Your Tasks Overview</h2>
                        <p style={{ opacity: 0.9 }}>You have {tasks.length} tasks assigned to you across {new Set(tasks.map(t => t.department_id)).size} departments.</p>
                    </div>
                </div>

                {/* Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)' }}>Assigned Tasks</h2>

                    <div style={{ display: 'flex', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '2px' }}>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                padding: '0.375rem 0.75rem',
                                background: viewMode === 'list' ? 'var(--bg-tertiary)' : 'transparent',
                                color: viewMode === 'list' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                fontSize: '0.875rem',
                                fontWeight: '500'
                            }}
                        >
                            <List size={16} /> List
                        </button>
                        <button
                            onClick={() => setViewMode('board')}
                            style={{
                                padding: '0.375rem 0.75rem',
                                background: viewMode === 'board' ? 'var(--bg-tertiary)' : 'transparent',
                                color: viewMode === 'board' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                fontSize: '0.875rem',
                                fontWeight: '500'
                            }}
                        >
                            <LayoutGrid size={16} /> Board
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            style={{
                                padding: '0.375rem 0.75rem',
                                background: viewMode === 'calendar' ? 'var(--bg-tertiary)' : 'transparent',
                                color: viewMode === 'calendar' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                fontSize: '0.875rem',
                                fontWeight: '500'
                            }}
                        >
                            <Calendar size={16} /> Calendar
                        </button>
                        <button
                            onClick={() => setViewMode('chart')}
                            style={{
                                padding: '0.375rem 0.75rem',
                                background: viewMode === 'chart' ? 'var(--bg-tertiary)' : 'transparent',
                                color: viewMode === 'chart' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                fontSize: '0.875rem',
                                fontWeight: '500'
                            }}
                        >
                            <BarChart2 size={16} /> Chart
                        </button>
                    </div>
                </div>

                {/* Task View */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Loading your tasks...</div>
                ) : tasks.length === 0 ? (
                    <div style={{
                        background: 'var(--bg-secondary)',
                        padding: '4rem',
                        borderRadius: '1rem',
                        border: '1px solid var(--border-color)',
                        textAlign: 'center'
                    }}>
                        <CheckCircle2 size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>All Caught Up!</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>You have no pending tasks assigned to you.</p>
                    </div>
                ) : viewMode === 'board' ? (
                    <KanbanBoard
                        tasks={tasks}
                        statuses={statuses}
                        onUpdateTaskStatus={handleUpdateTaskStatus}
                        onEdit={(task) => {
                            setSelectedTask(task)
                            setIsTaskModalOpen(true)
                        }}
                        onDelete={() => { }}
                        onAddStatus={() => { }}
                        onReorderStatus={() => { }}
                        onDeleteStatus={() => { }}
                        groupByLabel={true}
                    />
                ) : viewMode === 'calendar' ? (
                    <TaskCalendar
                        tasks={tasks}
                        statuses={statuses}
                        onEdit={(task) => {
                            setSelectedTask(task)
                            setIsTaskModalOpen(true)
                        }}
                    />
                ) : viewMode === 'chart' ? (
                    <TaskChart
                        tasks={tasks}
                        statuses={statuses}
                    />
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {tasks.map(task => {
                            const status = statuses.find(s => s.id === task.status_id)
                            return (
                                <div
                                    key={task.id}
                                    onClick={() => {
                                        setSelectedTask(task)
                                        setIsTaskModalOpen(true)
                                    }}
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '0.75rem',
                                        padding: '1.25rem',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)'
                                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)'
                                        e.currentTarget.style.boxShadow = 'none'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>{task.title}</h3>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '0.25rem 0.625rem',
                                                borderRadius: '9999px',
                                                background: status?.color ? `${status.color}20` : 'var(--bg-tertiary)',
                                                color: status?.color || 'var(--text-secondary)',
                                                fontWeight: '600',
                                                border: `1px solid ${status?.color}40`
                                            }}>
                                                {status?.label || 'Unknown'}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '800px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {task.description ? task.description.replace(/<[^>]*>/g, '') : 'No description'}
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                            <Flag size={14} />
                                            <span style={{ textTransform: 'capitalize' }}>{task.priority || 'Medium'}</span>
                                        </div>
                                        {task.due_date && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                                <Calendar size={14} />
                                                <span>{new Date(task.due_date).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                            <User size={14} />
                                            <span>{task.assignments?.length || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>

            <TaskDetailsModal
                isOpen={isTaskModalOpen}
                onClose={() => {
                    setIsTaskModalOpen(false)
                    setSelectedTask(null)
                }}
                task={selectedTask}
                onUpdate={loadData}
            />
        </div>
    )
}
