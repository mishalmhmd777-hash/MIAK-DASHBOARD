import React from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { User, Calendar } from 'lucide-react'

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

interface TaskCardProps {
    task: Task
    index: number
    style?: React.CSSProperties
}

const TaskCard = React.memo(({ task, index, style }: TaskCardProps) => {
    return (
        <Draggable draggableId={task.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                        ...provided.draggableProps.style,
                        ...style, // Apply virtualization style if passed (mostly for positioning in fixed lists, though standard DnD might fight this, we need to be careful)
                        top: style?.top, // React-window passes absolute positioning
                        left: style?.left,
                        width: style?.width,
                        height: style?.height,
                        background: 'var(--bg-primary)',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        boxShadow: snapshot.isDragging ? '0 5px 10px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.05)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        marginBottom: '0.75rem' // Add margin since virtualization usually assumes tight packing, but we can handle valid spacing via row gap or this.
                    }}
                >
                    <div style={{ fontWeight: '500', fontSize: '0.875rem', lineHeight: '1.3', color: 'var(--text-primary)' }}>{task.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {task.department?.workspace?.client?.name} • {task.department?.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                        <div title={task.assignee?.full_name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <div style={{
                                width: '20px', height: '20px', borderRadius: '50%',
                                background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-secondary)'
                            }}>
                                {task.assignee?.full_name?.[0] || <User size={10} />}
                            </div>
                            {task.assignee?.full_name || 'Unassigned'}
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {task.due_date && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.65rem', color: new Date(task.due_date) < new Date() ? 'var(--danger-color)' : 'var(--text-secondary)' }}>
                                    <Calendar size={10} />
                                    {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </div>
                            )}
                            {task.priority && (
                                <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', borderRadius: '3px', background: task.priority === 'high' ? '#fee2e2' : task.priority === 'medium' ? '#fef3c7' : '#dcfce7', color: task.priority === 'high' ? '#dc2626' : task.priority === 'medium' ? '#d97706' : '#16a34a' }}>
                                    {task.priority}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    )
}, (prev, next) => {
    return (
        prev.task.id === next.task.id &&
        prev.task.title === next.task.title &&
        prev.task.status_id === next.task.status_id &&
        prev.index === next.index &&
        prev.style === next.style
    )
})

export default TaskCard
