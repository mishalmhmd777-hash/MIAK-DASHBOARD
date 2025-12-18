import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Play, Square, Clock } from 'lucide-react'

interface SubtaskTimeLog {
    id: string
    task_id: string
    user_id: string
    subtask_name: string
    start_time: string
    end_time: string | null
    duration_seconds: number | null
    created_at: string
}

interface SubtaskTimerProps {
    taskId: string
    subtasksContent: string
}

export default function SubtaskTimer({ taskId, subtasksContent }: SubtaskTimerProps) {
    const { user } = useAuth()
    const [todoItems, setTodoItems] = useState<string[]>([])
    const [selectedSubtask, setSelectedSubtask] = useState<string>('')
    const [activeTimer, setActiveTimer] = useState<{ id: string; subtaskName: string; startTime: Date } | null>(null)
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const [timeLogs, setTimeLogs] = useState<SubtaskTimeLog[]>([])
    const [loading, setLoading] = useState(false)

    // Extract to-do items from rich text content
    useEffect(() => {
        if (!subtasksContent) {
            setTodoItems([])
            return
        }

        const parser = new DOMParser()
        const doc = parser.parseFromString(subtasksContent, 'text/html')
        const todos = doc.querySelectorAll('li[data-type="taskItem"]')
        const items = Array.from(todos)
            .map(todo => todo.textContent?.trim() || '')
            .filter(item => item.length > 0)

        setTodoItems(items)

        // Reset selected subtask if it's no longer in the list
        if (selectedSubtask && !items.includes(selectedSubtask)) {
            setSelectedSubtask('')
        }
    }, [subtasksContent])

    // Load time logs
    useEffect(() => {
        if (user && taskId) {
            loadTimeLogs()
            loadActiveTimer()
        }
    }, [user, taskId])

    // Timer tick
    useEffect(() => {
        if (!activeTimer) return

        const interval = setInterval(() => {
            const elapsed = Math.floor((new Date().getTime() - activeTimer.startTime.getTime()) / 1000)
            setElapsedSeconds(elapsed)
        }, 1000)

        return () => clearInterval(interval)
    }, [activeTimer])

    const loadTimeLogs = async () => {
        if (!user) return

        try {
            const { data, error } = await supabase
                .from('subtask_time_logs')
                .select('*')
                .eq('task_id', taskId)
                .order('created_at', { ascending: false })

            if (error) throw error
            setTimeLogs(data || [])
        } catch (error) {
            console.error('Error loading time logs:', error)
        }
    }

    const loadActiveTimer = async () => {
        if (!user) return

        try {
            const { data } = await supabase
                .from('subtask_time_logs')
                .select('*')
                .eq('task_id', taskId)
                .eq('user_id', user.id)
                .is('end_time', null)
                .single()

            if (data) {
                const startTime = new Date(data.start_time)
                setActiveTimer({
                    id: data.id,
                    subtaskName: data.subtask_name,
                    startTime: startTime
                })
                setSelectedSubtask(data.subtask_name)
                // Calculate initial elapsed time
                setElapsedSeconds(Math.floor((new Date().getTime() - startTime.getTime()) / 1000))
            }
        } catch (error) {
            // No active timer found or error (ignore 'PGRST116' which is "The result contains 0 rows")
            // console.log('No active timer found')
        }
    }

    const handleStartTimer = async () => {
        if (!selectedSubtask || !user) return

        setLoading(true)
        try {
            const startTime = new Date()
            const payload = {
                task_id: taskId,
                user_id: user.id,
                subtask_name: selectedSubtask,
                start_time: startTime.toISOString(),
                end_time: null
            }

            const { data, error } = await supabase
                .from('subtask_time_logs')
                .insert(payload)
                .select()
                .single()

            if (error) throw error

            if (data) {
                setActiveTimer({
                    id: data.id,
                    subtaskName: selectedSubtask,
                    startTime: startTime
                })
                setElapsedSeconds(0)
            }
        } catch (error) {
            console.error('Error starting timer:', error)
            alert('Failed to start timer.')
        } finally {
            setLoading(false)
        }
    }

    const handleStopTimer = async () => {
        if (!activeTimer || !user) return

        setLoading(true)
        try {
            const endTime = new Date()
            const durationSeconds = Math.floor((endTime.getTime() - activeTimer.startTime.getTime()) / 1000)

            const { error } = await supabase
                .from('subtask_time_logs')
                .update({
                    end_time: endTime.toISOString(),
                    duration_seconds: durationSeconds
                })
                .eq('id', activeTimer.id)

            if (error) throw error

            setActiveTimer(null)
            setElapsedSeconds(0)
            loadTimeLogs()
            loadActiveTimer() // Clean up state
        } catch (error) {
            console.error('Error stopping timer:', error)
            alert('Failed to stop timer.')
        } finally {
            setLoading(false)
        }
    }

    const formatTime = (seconds: number): string => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    const getTotalTimeForSubtask = (subtaskName: string): number => {
        return timeLogs
            .filter(log => log.subtask_name === subtaskName && log.duration_seconds)
            .reduce((total, log) => total + (log.duration_seconds || 0), 0)
    }

    if (todoItems.length === 0) {
        return (
            <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    Add subtasks above to start tracking time
                </p>
            </div>
        )
    }

    return (
        <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={20} />
                Subtask Timer
            </h3>

            {/* Timer Controls */}
            <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <select
                        value={selectedSubtask}
                        onChange={(e) => setSelectedSubtask(e.target.value)}
                        disabled={!!activeTimer}
                        style={{
                            flex: 1,
                            padding: '0.5rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            outline: 'none',
                            cursor: activeTimer ? 'not-allowed' : 'pointer',
                            opacity: activeTimer ? 0.6 : 1,
                            background: 'var(--bg-primary)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <option value="">Select a subtask...</option>
                        {todoItems.map((item, index) => (
                            <option key={index} value={item}>{item}</option>
                        ))}
                    </select>

                    {!activeTimer ? (
                        <button
                            onClick={handleStartTimer}
                            disabled={!selectedSubtask || loading}
                            style={{
                                padding: '0.5rem 1rem',
                                background: selectedSubtask ? 'var(--success-color)' : 'var(--bg-secondary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: selectedSubtask ? 'pointer' : 'not-allowed',
                                fontWeight: '500',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <Play size={16} fill="currentColor" />
                            Start
                        </button>
                    ) : (
                        <button
                            onClick={handleStopTimer}
                            disabled={loading}
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'var(--danger-color)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                fontWeight: '500',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <Square size={16} fill="currentColor" />
                            Stop
                        </button>
                    )}
                </div>

                {activeTimer && (
                    <div style={{
                        padding: '0.75rem',
                        background: 'var(--bg-primary)',
                        borderRadius: '0.375rem',
                        border: '2px solid var(--success-color)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            Tracking: {activeTimer.subtaskName}
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success-color)', fontFamily: 'monospace' }}>
                            {formatTime(elapsedSeconds)}
                        </div>
                    </div>
                )}
            </div>

            {/* Time Log Summary */}
            {timeLogs.length > 0 && (
                <div>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                        Time Summary
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {Array.from(new Set(timeLogs.map(log => log.subtask_name))).map(subtaskName => {
                            const totalSeconds = getTotalTimeForSubtask(subtaskName)
                            const logCount = timeLogs.filter(log => log.subtask_name === subtaskName).length

                            return (
                                <div
                                    key={subtaskName}
                                    style={{
                                        padding: '0.75rem',
                                        background: 'var(--bg-primary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '0.375rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                                            {subtaskName}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {logCount} session{logCount !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--accent-color)', fontFamily: 'monospace' }}>
                                        {formatTime(totalSeconds)}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
