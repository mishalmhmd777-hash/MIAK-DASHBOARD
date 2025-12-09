import { useState } from 'react'
import {
    format,
    startOfWeek,
    addDays,
    startOfMonth,
    endOfMonth,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Task {
    id: string
    title: string
    description?: string
    due_date?: string
    priority?: string
    status_id?: string
}

interface TaskCalendarProps {
    tasks: Task[]
    statuses: any[]
    onEdit: (task: Task) => void
}

export default function TaskCalendar({ tasks, statuses, onEdit }: TaskCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())


    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

    const renderHeader = () => {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                padding: '0 0.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                        {format(currentMonth, 'MMMM yyyy')}
                    </h2>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={prevMonth}
                        style={{
                            padding: '0.5rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: '0.375rem',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={nextMonth}
                        style={{
                            padding: '0.5rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: '0.375rem',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        )
    }

    const renderDays = () => {
        const dateFormat = "EEE"
        const days = []
        let startDate = startOfWeek(currentMonth)

        for (let i = 0; i < 7; i++) {
            days.push(
                <div key={i} style={{
                    flex: 1,
                    textAlign: 'center',
                    fontWeight: '600',
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    padding: '0.75rem 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    {format(addDays(startDate, i), dateFormat)}
                </div>
            )
        }

        return <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>{days}</div>
    }

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth)
        const monthEnd = endOfMonth(monthStart)
        const startDate = startOfWeek(monthStart)
        const endDate = endOfWeek(monthEnd)

        const dateFormat = "d"
        const rows = []
        let days = []
        let day = startDate
        let formattedDate = ""

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, dateFormat)


                // Get tasks for this day
                const dayTasks = tasks.filter(t =>
                    t.due_date && isSameDay(new Date(t.due_date), day)
                )

                const isCurrentMonth = isSameMonth(day, monthStart)

                const isTodayDate = isToday(day)

                days.push(
                    <div
                        key={day.toString()}
                        style={{
                            flex: 1,
                            minHeight: '120px',
                            borderRight: '1px solid var(--border-color)',
                            borderBottom: '1px solid var(--border-color)',
                            padding: '0.5rem',
                            color: isCurrentMonth ? 'var(--text-primary)' : 'var(--text-secondary)',
                            background: isTodayDate ? 'var(--bg-tertiary)' : isCurrentMonth ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                            opacity: isCurrentMonth ? 1 : 0.5,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem',
                            position: 'relative'
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '0.25rem',
                            fontSize: '0.875rem',
                            fontWeight: isTodayDate ? '700' : '500',
                            color: isTodayDate ? 'var(--accent-color)' : 'inherit'
                        }}>
                            <span>{formattedDate}</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto', maxHeight: '100px' }}>
                            {dayTasks.map(task => {
                                const status = statuses.find(s => s.id === task.status_id)
                                return (
                                    <div
                                        key={task.id}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onEdit(task)
                                        }}
                                        style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '0.25rem',
                                            background: status?.color ? `${status.color}20` : 'var(--bg-tertiary)',
                                            borderLeft: `3px solid ${status?.color || '#ccc'}`,
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            color: 'var(--text-primary)',
                                            transition: 'filter 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(0.95)'}
                                        onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                                        title={task.title}
                                    >
                                        {task.title}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
                day = addDays(day, 1)
            }
            rows.push(
                <div key={day.toISOString()} style={{ display: 'flex' }}>
                    {days}
                </div>
            )
            days = []
        }
        return <div style={{ borderTop: '1px solid var(--border-color)', borderLeft: '1px solid var(--border-color)' }}>{rows}</div>
    }

    return (
        <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '0.75rem',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            padding: '1.5rem'
        }}>
            {renderHeader()}
            {renderDays()}
            {renderCells()}
        </div>
    )
}
