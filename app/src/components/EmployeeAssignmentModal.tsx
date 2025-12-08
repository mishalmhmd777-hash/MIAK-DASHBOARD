import { useState } from 'react'
import Modal from './Modal'
import { User, Check, Search } from 'lucide-react'

interface Employee {
    id: string
    email: string
    full_name: string
    created_at: string
}

interface EmployeeAssignmentModalProps {
    isOpen: boolean
    onClose: () => void
    departmentId: string | null
    departmentName: string
    allEmployees: Employee[]
    assignedEmployeeIds: Set<string>
    onToggleAssignment: (employeeId: string) => Promise<void>
}

export default function EmployeeAssignmentModal({
    isOpen,
    onClose,
    departmentId,
    departmentName,
    allEmployees,
    assignedEmployeeIds,
    onToggleAssignment
}: EmployeeAssignmentModalProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [loadingId, setLoadingId] = useState<string | null>(null)

    const filteredEmployees = allEmployees.filter(emp =>
        emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleToggle = async (employeeId: string) => {
        setLoadingId(employeeId)
        await onToggleAssignment(employeeId)
        setLoadingId(null)
    }

    if (!departmentId) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Assign Employees to ${departmentName}`}
        >
            <div style={{ marginBottom: '1rem' }}>
                <div style={{
                    position: 'relative',
                    marginBottom: '1rem'
                }}>
                    <Search size={18} style={{
                        position: 'absolute',
                        left: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9ca3af'
                    }} />
                    <input
                        type="text"
                        placeholder="Search employees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.625rem 0.625rem 0.625rem 2.5rem',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.5rem',
                            fontSize: '0.95rem',
                            outline: 'none'
                        }}
                    />
                </div>

                <div style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem'
                }}>
                    {filteredEmployees.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                            No employees found matching "{searchTerm}"
                        </div>
                    ) : (
                        filteredEmployees.map(emp => {
                            const isAssigned = assignedEmployeeIds.has(emp.id)
                            const isLoading = loadingId === emp.id

                            return (
                                <div
                                    key={emp.id}
                                    onClick={() => !isLoading && handleToggle(emp.id)}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        borderBottom: '1px solid #f3f4f6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: isLoading ? 'wait' : 'pointer',
                                        background: isAssigned ? '#f0fdf4' : 'white',
                                        transition: 'background-color 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{
                                            width: '32px', height: '32px',
                                            borderRadius: '50%',
                                            background: isAssigned ? '#dcfce7' : '#f3f4f6',
                                            color: isAssigned ? '#166534' : '#6b7280',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.875rem', fontWeight: '600'
                                        }}>
                                            {emp.full_name?.[0]?.toUpperCase() || <User size={16} />}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '500', color: '#111827' }}>{emp.full_name}</div>
                                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{emp.email}</div>
                                        </div>
                                    </div>

                                    <div style={{
                                        width: '24px', height: '24px',
                                        borderRadius: '50%',
                                        border: isAssigned ? 'none' : '2px solid #d1d5db',
                                        background: isAssigned ? '#16a34a' : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white'
                                    }}>
                                        {isAssigned && <Check size={16} />}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={onClose}
                    style={{
                        padding: '0.625rem 1rem',
                        background: 'white',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontWeight: '500'
                    }}
                >
                    Done
                </button>
            </div>
        </Modal>
    )
}
