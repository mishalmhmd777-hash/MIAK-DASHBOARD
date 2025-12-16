import React, { type CSSProperties } from 'react'
import { Droppable } from '@hello-pangea/dnd'
import * as ReactWindow from 'react-window';
const { FixedSizeList, areEqual } = ReactWindow;
import AutoSizer from 'react-virtualized-auto-sizer'
import TaskCard from './TaskCard'

interface KanbanColumnProps {
    status: {
        id: string
        label: string
        color: string
    }
    tasks: any[]
}

const Row = React.memo(({ data, index, style }: { data: any[], index: number, style: CSSProperties }) => {
    const task = data[index]
    // We pass the style from react-window to position the item absolutely
    // But we also need to account for margin/gutter.
    // FixedSizeList items are usually tight.
    // We'll pass the style to TaskCard, which will apply it.
    // We adjust height slightly in the List itemSize to account for gaps if needed, 
    // or we just render the card smaller than the slot.

    // Adjust style to add a "gutter" within the slot
    const gutter = 8
    const itemStyle = {
        ...style,
        left: Number(style.left) + gutter,
        width: Number(style.width) - (gutter * 2),
        height: Number(style.height) - gutter,
    }

    return <TaskCard task={task} index={index} style={itemStyle} />
}, areEqual) // react-window's areEqual checks for style/data changes

const KanbanColumn = ({ status, tasks }: KanbanColumnProps) => {
    return (
        <div style={{
            width: '320px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            height: '100%',
            maxHeight: '100%'
        }}>
            {/* Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{status.label}</h3>
                <span style={{ fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>{tasks.length}</span>
            </div>

            {/* List Body */}
            <div style={{ flex: 1, minHeight: 0 }}>
                <Droppable
                    droppableId={status.id}
                    mode="virtual"
                    renderClone={(provided, _snapshot, _rubric) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{ ...provided.draggableProps.style, padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                        >
                            {/* Simplified clone for performance or just render the TaskCard */}
                            <div style={{ fontWeight: 'bold' }}>Moving task...</div>
                        </div>
                    )}
                >
                    {(provided) => (
                        <AutoSizer>
                            {({ height, width }) => (
                                <FixedSizeList
                                    height={height}
                                    itemCount={tasks.length}
                                    itemSize={160} // Estimate card height + gap
                                    width={width}
                                    outerRef={provided.innerRef}
                                    itemData={tasks}
                                    className="task-list"
                                >
                                    {Row}
                                </FixedSizeList>
                            )}
                        </AutoSizer>
                    )}
                </Droppable>
            </div>
        </div>
    )
}


export default React.memo(KanbanColumn)
