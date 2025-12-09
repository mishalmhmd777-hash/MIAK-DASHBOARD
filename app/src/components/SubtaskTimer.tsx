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
    const [activeTimer, setActiveTimer] = useState<{ subtaskName: string; startTime: Date } | null>(null)
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

    const handleStartTimer = async () => {
        if (!selectedSubtask || !user) return

        setActiveTimer({
            subtaskName: selectedSubtask,
            startTime: new Date()
        })
        setElapsedSeconds(0)
    }

    const handleStopTimer = async () => {
        if (!activeTimer || !user) return

        console.log('Stopping timer for user:', user.id)
        setLoading(true)
        try {
            const endTime = new Date()
            const durationSeconds = Math.floor((endTime.getTime() - activeTimer.startTime.getTime()) / 1000)

            const payload = {
                task_id: taskId,
                user_id: user.id,
                subtask_name: activeTimer.subtaskName,
                start_time: activeTimer.startTime.toISOString(),
                end_time: endTime.toISOString(),
                duration_seconds: durationSeconds
            }

            console.log('Inserting time log:', payload)

            const { data, error } = await supabase
                .from('subtask_time_logs')
                .insert(payload)
                .select()

            if (error) {
                console.error('Supabase error:', error)
                throw error
            }

            console.log('Time log saved successfully:', data)
            setActiveTimer(null)
            setElapsedSeconds(0)
            loadTimeLogs()
        } catch (error) {
            console.error('Error saving time log:', error)
            alert('Failed to save time log. Check console for details.')
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
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#9ca3af', textAlign: 'center' }}>
                    Add subtasks above to start tracking time
                </p>
            </div>
        )
    }

    return (
        <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={20} />
                Subtask Timer
            </h3>

            {/* Timer Controls */}
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <select
                        value={selectedSubtask}
                        onChange={(e) => setSelectedSubtask(e.target.value)}
                        disabled={!!activeTimer}
                        style={{
                            flex: 1,
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            outline: 'none',
                            cursor: activeTimer ? 'not-allowed' : 'pointer',
                            opacity: activeTimer ? 0.6 : 1
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
                                background: selectedSubtask ? '#10b981' : '#d1d5db',
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
                                background: '#ef4444',
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
                        background: 'white',
                        borderRadius: '0.375rem',
                        border: '2px solid #10b981',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                            Tracking: {activeTimer.subtaskName}
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981', fontFamily: 'monospace' }}>
                            {formatTime(elapsedSeconds)}
                        </div>
                    </div>
                )}
            </div>

            {/* Time Log Summary */}
            {timeLogs.length > 0 && (
                <div>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
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
                                        background: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '0.375rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                                            {subtaskName}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                            {logCount} session{logCount !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4f46e5', fontFamily: 'monospace' }}>
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
