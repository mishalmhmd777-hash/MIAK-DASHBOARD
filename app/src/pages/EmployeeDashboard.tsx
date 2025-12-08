import { useAuth } from '../contexts/AuthContext'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import KanbanBoard from '../components/KanbanBoard'
import TaskDetailsModal from '../components/TaskDetailsModal'
import CalendarView from '../components/CalendarView'
import AnalyticsView from '../components/AnalyticsView'
import GalleryView from '../components/GalleryView'
import NotificationDropdown from '../components/NotificationDropdown'
import { LogOut, Clock, CheckCircle2, List, LayoutGrid, Calendar, BarChart2, Grid, Bell } from 'lucide-react'

interface Task {
    id: string
    title: string
    description: string
    status_id: string
    priority: 'low' | 'medium' | 'high'
    due_date: string
    created_at: string
    department_id: string
    department?: {
        name: string
    }
}

interface TaskStatus {
    id: string
    label: string
    color: string
    position: number
    department_id: string
}

export default function EmployeeDashboard() {
    const { user, signOut } = useAuth()
    const [tasks, setTasks] = useState<Task[]>([])
    const [statuses, setStatuses] = useState<TaskStatus[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar' | 'analytics' | 'gallery'>('board')
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

    const handleSignOut = async () => {
        try {
            await signOut()
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    useEffect(() => {
        loadData(true)
    }, [user])

    const handleOpenTaskDetails = (task: Task) => {
        setSelectedTask(task)
        setIsDetailsModalOpen(true)
    }

    const loadData = async (isInitialLoad = false) => {
        if (!user) return
        if (isInitialLoad) setLoading(true)
        try {
            // Load tasks assigned to user
            const { data: tasksData, error: tasksError } = await supabase
                .from('tasks')
                .select('*, department:departments(name), task_assignments!inner(user_id, user:profiles(full_name, email))')
                .eq('task_assignments.user_id', user.id)
                .order('due_date', { ascending: true })

            if (tasksError) throw tasksError
            setTasks(tasksData || [])

            // Set initial department if not set
            if (tasksData && tasksData.length > 0 && !selectedDepartmentId) {
                setSelectedDepartmentId(tasksData[0].department_id)
            }

            // Load task statuses
            const { data: statusData, error: statusError } = await supabase
                .from('task_statuses')
                .select('*')
                .order('position')

            if (statusError) throw statusError
            setStatuses(statusData || [])



        } catch (error) {
            console.error('Error loading dashboard data:', error)
        } finally {
            if (isInitialLoad) setLoading(false)
        }
    }

    const handleStatusChange = async (taskId: string, newStatusId: string) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ status_id: newStatusId })
                .eq('id', taskId)

            if (error) throw error

            // Optimistic update
            setTasks(tasks.map(t => t.id === taskId ? { ...t, status_id: newStatusId } : t))
        } catch (error) {
            console.error('Error updating status:', error)
            alert('Failed to update status')
        }
    }



    const stripHtml = (html: string) => {
        const tmp = document.createElement('DIV')
        tmp.innerHTML = html
        return tmp.textContent || tmp.innerText || ''
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7280' }}>
                <div className="animate-pulse">Loading dashboard...</div>
            </div>
        )
    }

    // Get unique departments from tasks
    const availableDepartments = Array.from(new Set(tasks.map(t => t.department_id)))
        .map(id => {
            const task = tasks.find(t => t.department_id === id)
            return {
                id,
                name: task?.department?.name || 'Unknown Department'
            }
        })

    // Use selected department or fallback to first available
    const currentDepartmentId = selectedDepartmentId || (availableDepartments.length > 0 ? availableDepartments[0].id : null)

    const handleCreateStatus = async (label: string) => {
        if (!currentDepartmentId) {
            alert('Cannot determine department to add status to.')
            return
        }

        try {
            const { error } = await supabase
                .from('task_statuses')
                .insert({
                    department_id: currentDepartmentId,
                    label,
                    position: statuses.filter(s => s.department_id === currentDepartmentId).length
                })

            if (error) throw error
            loadData()
        } catch (error) {
            console.error('Error creating status:', error)
            alert('Failed to create status')
        }
    }

    const handleReorderStatus = async (startIndex: number, endIndex: number) => {
        if (!currentDepartmentId) return

        const deptStatuses = statuses.filter(s => s.department_id === currentDepartmentId)
        const result = Array.from(deptStatuses)
        const [removed] = result.splice(startIndex, 1)
        result.splice(endIndex, 0, removed)

        // Optimistic update
        const newStatuses = statuses.map(s => {
            if (s.department_id !== currentDepartmentId) return s
            const index = result.findIndex(r => r.id === s.id)
            return index !== -1 ? { ...s, position: index } : s
        }).sort((a, b) => a.position - b.position)

        setStatuses(newStatuses)

        try {
            // Update all positions in db
            const updates = result.map((s, index) => ({
                id: s.id,
                position: index,
                label: s.label, // Required for upsert if not partial
                department_id: s.department_id
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

    const boardStatuses = currentDepartmentId
        ? statuses.filter(s => s.department_id === currentDepartmentId)
        : []

    // Filter tasks for the board view based on selected department
    const boardTasks = currentDepartmentId
        ? tasks.filter(t => t.department_id === currentDepartmentId)
        : []

    return (
        <div style={{ height: '100vh', background: '#f9fafb', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <header style={{
                background: 'white',
                borderBottom: '1px solid #e5e7eb',
                padding: '1rem 2rem',
                flexShrink: 0,
                zIndex: 10,
            }}>
                <div style={{
                    maxWidth: '1400px',
                    width: '100%',
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                            Employee Dashboard
                        </h1>

                        {/* Department Selector */}
                        {availableDepartments.length > 1 && (
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={currentDepartmentId || ''}
                                    onChange={(e) => setSelectedDepartmentId(e.target.value)}
                                    style={{
                                        appearance: 'none',
                                        padding: '0.375rem 2rem 0.375rem 0.75rem',
                                        background: '#f3f4f6',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#374151',
                                        cursor: 'pointer',
                                        outline: 'none'
                                    }}
                                >
                                    {availableDepartments.map(dept => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </select>
                                <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1L5 5L9 1" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        )}
                        {availableDepartments.length === 1 && (
                            <span style={{ fontSize: '0.875rem', color: '#6b7280', background: '#f3f4f6', padding: '0.25rem 0.75rem', borderRadius: '9999px' }}>
                                {availableDepartments[0].name}
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', background: '#f3f4f6', padding: '0.25rem', borderRadius: '0.5rem' }}>
                            <button
                                onClick={() => setViewMode('list')}
                                style={{
                                    padding: '0.375rem 0.75rem',
                                    background: viewMode === 'list' ? 'white' : 'transparent',
                                    color: viewMode === 'list' ? '#4f46e5' : '#6b7280',
                                    border: 'none',
                                    borderRadius: '0.375rem',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    fontSize: '0.875rem',
                                    boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <List size={16} /> List
                            </button>
                            <button
                                onClick={() => setViewMode('board')}
                                style={{
                                    padding: '0.375rem 0.75rem',
                                    background: viewMode === 'board' ? 'white' : 'transparent',
                                    color: viewMode === 'board' ? '#4f46e5' : '#6b7280',
                                    border: 'none',
                                    borderRadius: '0.375rem',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    fontSize: '0.875rem',
                                    boxShadow: viewMode === 'board' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <LayoutGrid size={16} /> Board
                            </button>
                            <button
                                onClick={() => setViewMode('calendar')}
                                style={{
                                    padding: '0.375rem 0.75rem',
                                    background: viewMode === 'calendar' ? 'white' : 'transparent',
                                    color: viewMode === 'calendar' ? '#4f46e5' : '#6b7280',
                                    border: 'none',
                                    borderRadius: '0.375rem',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    fontSize: '0.875rem',
                                    boxShadow: viewMode === 'calendar' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <Calendar size={16} /> Calendar
                            </button>
                            <button
                                onClick={() => setViewMode('analytics')}
                                style={{
                                    padding: '0.375rem 0.75rem',
                                    background: viewMode === 'analytics' ? 'white' : 'transparent',
                                    color: viewMode === 'analytics' ? '#4f46e5' : '#6b7280',
                                    border: 'none',
                                    borderRadius: '0.375rem',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    fontSize: '0.875rem',
                                    boxShadow: viewMode === 'analytics' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <BarChart2 size={16} /> Analytics
                            </button>
                            <button
                                onClick={() => setViewMode('gallery')}
                                style={{
                                    padding: '0.375rem 0.75rem',
                                    background: viewMode === 'gallery' ? 'white' : 'transparent',
                                    color: viewMode === 'gallery' ? '#4f46e5' : '#6b7280',
                                    border: 'none',
                                    borderRadius: '0.375rem',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    fontSize: '0.875rem',
                                    boxShadow: viewMode === 'gallery' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <Grid size={16} /> Gallery
                            </button>
                        </div>

                        {/* Notifications */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                style={{
                                    background: 'white',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '0.5rem',
                                    padding: '0.5rem',
                                    cursor: 'pointer',
                                    color: '#6b7280',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative'
                                }}
                            >
                                <Bell size={20} />
                                {/* Badge calculation */}
                                {(() => {
                                    const now = new Date()
                                    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
                                    const count = boardTasks.filter(t => {
                                        if (!t.due_date) return false
                                        const status = boardStatuses.find(s => s.id === t.status_id)
                                        const label = status?.label.toLowerCase() || ''
                                        if (label.includes('done') || label.includes('complete') || label.includes('finish')) return false
                                        const dueDate = new Date(t.due_date)
                                        return dueDate < next24Hours
                                    }).length

                                    if (count > 0) {
                                        return (
                                            <span style={{
                                                position: 'absolute',
                                                top: '-5px',
                                                right: '-5px',
                                                background: '#ef4444',
                                                color: 'white',
                                                fontSize: '0.625rem',
                                                fontWeight: 'bold',
                                                minWidth: '16px',
                                                height: '16px',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '0 4px'
                                            }}>
                                                {count}
                                            </span>
                                        )
                                    }
                                    return null
                                })()}
                            </button>
                            {isNotificationsOpen && (
                                <NotificationDropdown
                                    tasks={boardTasks}
                                    statuses={boardStatuses}
                                    onTaskClick={handleOpenTaskDetails}
                                    onClose={() => setIsNotificationsOpen(false)}
                                />
                            )}
                        </div>

                        <button
                            onClick={handleSignOut}
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'white',
                                color: '#ef4444',
                                border: '1px solid #fee2e2',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s',
                            }}
                        >
                            <LogOut size={16} />
                            Sign Out
                        </button>
                    </div>
                </div>
            </header >

            <main style={{ flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '2rem 3rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', flexShrink: 0, position: 'relative', minHeight: '80px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                            Welcome back, {user?.email}
                        </h2>
                        <p style={{ color: '#6b7280' }}>Here are your assigned tasks for today.</p>
                    </div>

                    {/* Compact Task Progress Widget */}
                    <div style={{
                        background: 'white',
                        padding: '1rem 1.25rem',
                        borderRadius: '0.75rem',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        width: '280px',
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        top: 0
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Task Progress</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#4f46e5' }}>
                                {tasks.length > 0 ? Math.round((tasks.filter(t => statuses.find(s => s.id === t.status_id)?.label.toLowerCase().includes('done') || statuses.find(s => s.id === t.status_id)?.label.toLowerCase().includes('completed')).length / tasks.length) * 100) : 0}%
                            </span>
                        </div>

                        <div style={{ height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                            <div style={{
                                height: '100%',
                                width: `${tasks.length > 0 ? Math.round((tasks.filter(t => statuses.find(s => s.id === t.status_id)?.label.toLowerCase().includes('done') || statuses.find(s => s.id === t.status_id)?.label.toLowerCase().includes('completed')).length / tasks.length) * 100) : 0}%`,
                                background: 'linear-gradient(90deg, #4f46e5 0%, #818cf8 100%)',
                                transition: 'width 0.5s ease-out',
                                borderRadius: '4px'
                            }} />
                        </div>

                        <div style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
                            <span>
                                <span style={{ fontWeight: '600', color: '#111827' }}>
                                    {tasks.filter(t => statuses.find(s => s.id === t.status_id)?.label.toLowerCase().includes('done') || statuses.find(s => s.id === t.status_id)?.label.toLowerCase().includes('completed')).length}
                                </span>/{tasks.length} Completed
                            </span>
                            <span>
                                <span style={{ fontWeight: '600', color: '#ea580c' }}>
                                    {tasks.filter(t => !statuses.find(s => s.id === t.status_id)?.label.toLowerCase().includes('done') && !statuses.find(s => s.id === t.status_id)?.label.toLowerCase().includes('completed')).length}
                                </span> Pending
                            </span>
                        </div>
                    </div>
                </div>

                {/* Task View */}
                {viewMode === 'board' ? (
                    <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                        <KanbanBoard
                            tasks={boardTasks}
                            statuses={boardStatuses}
                            onUpdateTaskStatus={handleStatusChange}
                            onEdit={(task: any) => handleOpenTaskDetails(task)}
                            onDelete={(taskId: string) => {
                                // TODO: Implement Delete
                                console.log('Delete task', taskId)
                            }}
                            onAddStatus={handleCreateStatus}
                            onReorderStatus={handleReorderStatus}
                            onDeleteStatus={handleDeleteStatus}
                        />
                    </div>
                ) : viewMode === 'calendar' ? (
                    <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                        <CalendarView
                            tasks={boardTasks}
                            statuses={boardStatuses}
                            onTaskClick={(task: any) => handleOpenTaskDetails(task)}
                        />
                    </div>
                ) : viewMode === 'analytics' ? (
                    <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                        <AnalyticsView
                            tasks={boardTasks}
                            statuses={boardStatuses}
                        />
                    </div>
                ) : viewMode === 'gallery' ? (
                    <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                        <GalleryView
                            tasks={boardTasks}
                            statuses={boardStatuses}
                            onEdit={(task: any) => handleOpenTaskDetails(task)}
                            onDelete={(taskId: string) => {
                                // TODO: Implement Delete
                                console.log('Delete task', taskId)
                            }}
                        />
                    </div>
                ) : (
                    <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid #e5e7eb', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', flexShrink: 0 }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>My Tasks</h3>
                        </div>

                        {tasks.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
                                <CheckCircle2 size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                <p>No tasks assigned to you yet.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1 }}>
                                {tasks.map(task => (
                                    <div key={task.id} style={{
                                        padding: '1.5rem',
                                        borderBottom: '1px solid #e5e7eb',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'background-color 0.2s',
                                        cursor: 'pointer',
                                        flexShrink: 0
                                    }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                        onClick={() => handleOpenTaskDetails(task)}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>{task.title}</h4>
                                                <span style={{
                                                    padding: '0.125rem 0.5rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '500',
                                                    background: task.priority === 'high' ? '#fee2e2' : task.priority === 'medium' ? '#fef3c7' : '#e0e7ff',
                                                    color: task.priority === 'high' ? '#b91c1c' : task.priority === 'medium' ? '#b45309' : '#4338ca',
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {task.priority}
                                                </span>
                                            </div>
                                            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>{stripHtml(task.description)}</p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#9ca3af' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <Clock size={14} /> Due: {new Date(task.due_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} onClick={(e) => e.stopPropagation()}>
                                            <select
                                                value={task.status_id || ''}
                                                onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                                style={{
                                                    padding: '0.375rem 2rem 0.375rem 0.75rem',
                                                    background: '#f3f4f6',
                                                    borderRadius: '0.375rem',
                                                    fontSize: '0.875rem',
                                                    fontWeight: '500',
                                                    color: '#374151',
                                                    border: '1px solid transparent',
                                                    cursor: 'pointer',
                                                    outline: 'none'
                                                }}
                                            >
                                                <option value="" disabled>Select Status</option>
                                                {statuses
                                                    .filter(status => status.department_id === task.department_id)
                                                    .map(status => (
                                                        <option key={status.id} value={status.id}>
                                                            {status.label}
                                                        </option>
                                                    ))}
                                            </select>


                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            <TaskDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                task={selectedTask}
                onUpdate={loadData}
            />
        </div >
    )
}
