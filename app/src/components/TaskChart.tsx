import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface Task {
    id: string
    status_id?: string
    [key: string]: any
}

interface TaskChartProps {
    tasks: Task[]
    statuses: any[]
}

export default function TaskChart({ tasks, statuses }: TaskChartProps) {
    // Premium vibrant color palette
    const COLORS = [
        '#6366f1', // Indigo
        '#8b5cf6', // Violet
        '#ec4899', // Pink
        '#f43f5e', // Rose
        '#f97316', // Orange
        '#eab308', // Yellow
        '#22c55e', // Green
        '#06b6d4', // Cyan
        '#3b82f6', // Blue
    ]

    // Process data for the chart
    const data = statuses.map((status, index) => {
        const count = tasks.filter(t => t.status_id === status.id).length
        return {
            name: status.label,
            count: count,
            color: COLORS[index % COLORS.length] // Cycle through vibrant colors
        }
    })

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                    <p style={{ margin: 0, fontWeight: '600', color: 'var(--text-primary)' }}>{label}</p>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        Tasks: <span style={{ color: payload[0].payload.color, fontWeight: 'bold' }}>{payload[0].value}</span>
                    </p>
                </div>
            )
        }
        return null
    }

    if (tasks.length === 0) {
        return (
            <div style={{
                height: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                background: 'var(--bg-secondary)',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)'
            }}>
                No task data to display
            </div>
        )
    }

    return (
        <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '0.75rem',
            border: '1px solid var(--border-color)',
            padding: '1.5rem',
            height: '500px'
        }}>
            <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '1.5rem'
            }}>
                Tasks by Status
            </h3>

            <ResponsiveContainer width="100%" height="90%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke="var(--text-secondary)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="var(--text-secondary)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                    />
                    <Tooltip cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.5 }} content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={60}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
