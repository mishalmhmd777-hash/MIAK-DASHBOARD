import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import {
    Users,
    Briefcase,
    Building2,
    UserPlus,
    Plus,
    LogOut,
    LayoutGrid,
    ChevronRight,
    User,
    Pencil,
    Trash2,
    ClipboardList,
    BarChart3,
    Search,
    Moon,
    Sun
} from 'lucide-react'
import DepartmentTasksModal from '../components/DepartmentTasksModal'
import DashboardAnalyticsModal from '../components/DashboardAnalyticsModal'
import EmployeeAssignmentModal from '../components/EmployeeAssignmentModal'
import ActivityFeed from '../components/ActivityFeed'
import NotificationCenter from '../components/NotificationCenter'


interface Profile {
    id: string
    email: string
    full_name: string
    role: 'admin' | 'client_coordinator' | 'employee'
}

interface Client {
    id: string
    name: string
    cc_id: string
    created_at: string
}

interface Workspace {
    id: string
    client_id: string
    name: string
    created_at: string
}

interface Department {
    id: string
    workspace_id: string
    name: string
    created_at: string
}

interface Employee {
    id: string
    email: string
    full_name: string
    created_at: string
    status?: 'active' | 'inactive'
    created_by?: string
}

export default function CCDashboard() {
    const { user, signOut } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const [profile, setProfile] = useState<Profile | null>(null)
    const [clients, setClients] = useState<Client[]>([])
    const [selectedClient, setSelectedClient] = useState<string | null>(null)
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null)
    const [departments, setDepartments] = useState<Department[]>([])
    const [employees, setEmployees] = useState<Employee[]>([])
    const [loading, setLoading] = useState(true)

    // Form states
    const [showAddClient, setShowAddClient] = useState(false)
    const [showAddWorkspace, setShowAddWorkspace] = useState(false)
    const [showAddDepartment, setShowAddDepartment] = useState(false)
    const [showAddEmployee, setShowAddEmployee] = useState(false)

    const [clientName, setClientName] = useState('')
    const [workspaceName, setWorkspaceName] = useState('')
    const [departmentName, setDepartmentName] = useState('')
    const [empFullName, setEmpFullName] = useState('')
    const [empEmail, setEmpEmail] = useState('')
    const [empPassword, setEmpPassword] = useState('')
    const [error, setError] = useState<string | null>(null)

    // Department-Employee Assignment states
    const [showAssignEmployees, setShowAssignEmployees] = useState(false)
    const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
    const [, setDepartmentEmployees] = useState<{ [key: string]: Employee[] }>({})
    const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<Set<string>>(new Set())
    const [showDepartmentTasks, setShowDepartmentTasks] = useState(false)
    const [showAnalytics, setShowAnalytics] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
    const [editingClient, setEditingClient] = useState<Client | null>(null)
    const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null)
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)

    const handleSignOut = async () => {
        try {
            await signOut()
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

    useEffect(() => {
        loadProfile()
        loadClients()
        loadEmployees()
        checkOverdueTasks()
    }, [user])

    const checkOverdueTasks = async () => {
        if (!user) return

        try {
            // 1. Get all tasks for this CC's clients -> workspaces -> departments
            const { data: tasks, error } = await supabase
                .from('tasks')
                .select(`
                    id,
                    title,
                    due_date,
                    status_id,
                    department:departments!inner(
                        workspace:workspaces!inner(
                            client:clients!inner(
                                cc_id
                            )
                        )
                    ),
                    status:task_statuses(label)
                `)
                .eq('department.workspace.client.cc_id', user.id)
                .lt('due_date', new Date().toISOString())

            if (error) throw error

            if (tasks && tasks.length > 0) {
                // 2. Filter out completed tasks
                const overdueTasks = tasks.filter((task: any) => {
                    const statusLabel = task.status?.label?.toLowerCase() || ''
                    return !statusLabel.includes('done') && !statusLabel.includes('complete') && !statusLabel.includes('finish')
                })

                // 3. Check and create notifications
                for (const task of overdueTasks) {
                    const notificationTitle = `Task Overdue: ${task.title}`

                    // Check if notification already exists
                    const { data: existing } = await supabase
                        .from('notifications')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('title', notificationTitle)
                        .single()

                    if (!existing) {
                        await createNotification(
                            notificationTitle,
                            `The task "${task.title}" was due on ${new Date(task.due_date).toLocaleDateString()}`,
                            'warning'
                        )
                    }
                }
            }
        } catch (error) {
            console.error('Error checking overdue tasks:', error)
        }
    }

    useEffect(() => {
        if (selectedClient) {
            loadWorkspaces(selectedClient)
            setSelectedWorkspace(null)
            setDepartments([])
        }
    }, [selectedClient])

    useEffect(() => {
        if (selectedWorkspace) {
            loadDepartments(selectedWorkspace)
        }
    }, [selectedWorkspace])

    const loadProfile = async () => {
        if (!user) return
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
        setProfile(data)
        setLoading(false)
    }

    const loadClients = async () => {
        const { data } = await supabase
            .from('clients')
            .select('*')
            .eq('cc_id', user?.id)
            .order('created_at', { ascending: false })
        setClients(data || [])

        // Auto-create demo data if no clients exist
        if (data && data.length === 0 && user) {
            try {
                // 1. Create Client
                const { data: newClient, error: clientError } = await supabase
                    .from('clients')
                    .insert({ name: 'Demo Client', cc_id: user.id })
                    .select()
                    .single()

                if (clientError) throw clientError

                // 2. Create Workspace
                const { data: newWorkspace, error: workspaceError } = await supabase
                    .from('workspaces')
                    .insert({ name: 'Demo Workspace', client_id: newClient.id })
                    .select()
                    .single()

                if (workspaceError) throw workspaceError

                // 3. Create Department
                const { error: deptError } = await supabase
                    .from('departments')
                    .insert({ name: 'Engineering', workspace_id: newWorkspace.id })

                if (deptError) throw deptError

                // Reload clients
                const { data: refreshedClients } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('cc_id', user.id)
                    .order('created_at', { ascending: false })

                setClients(refreshedClients || [])
                createNotification('Welcome!', 'We created a demo client for you to get started.', 'success')

            } catch (err) {
                console.error('Error creating demo data:', err)
            }
        }
    }

    const loadWorkspaces = async (clientId: string) => {
        const { data } = await supabase
            .from('workspaces')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false })
        setWorkspaces(data || [])
    }

    const loadDepartments = async (workspaceId: string) => {
        const { data } = await supabase
            .from('departments')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
        setDepartments(data || [])
    }

    const loadEmployees = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'employee')
            .eq('created_by', user?.id)
            .order('created_at', { ascending: false })
        setEmployees(data || [])
    }

    const logActivity = async (actionType: string, description: string, entityId?: string) => {
        if (!user) return
        await supabase.from('activities').insert({
            user_id: user.id,
            action_type: actionType,
            description,
            entity_id: entityId
        })
    }

    const createNotification = async (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        if (!user) return
        await supabase.from('notifications').insert({
            user_id: user.id,
            title,
            message,
            type
        })
    }

    const handleSaveClient = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (editingClient) {
            const { error } = await supabase
                .from('clients')
                .update({ name: clientName })
                .eq('id', editingClient.id)

            if (error) {
                setError(error.message)
                return
            }
            logActivity('update_client', `updated client: ${clientName}`)
            createNotification('Client Updated', `Successfully updated client: ${clientName}`, 'success')
        } else {
            const { error } = await supabase
                .from('clients')
                .insert({ name: clientName, cc_id: user?.id })

            if (error) {
                setError(error.message)
                return
            }
            logActivity('create_client', `added a new client: ${clientName}`)
            createNotification('Client Added', `Successfully added client: ${clientName}`, 'success')
        }

        setClientName('')
        setEditingClient(null)
        setShowAddClient(false)
        loadClients()
    }

    const handleDeleteClient = async (id: string) => {
        if (!confirm('Are you sure you want to delete this client? This will delete all associated workspaces, departments, and tasks.')) return

        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id)

        if (error) {
            alert('Error deleting client: ' + error.message)
        } else {
            logActivity('delete_client', 'deleted a client')
            createNotification('Client Deleted', 'Successfully deleted client', 'success')
            if (selectedClient === id) {
                setSelectedClient(null)
                setWorkspaces([])
                setDepartments([])
            }
            loadClients()
        }
    }

    const handleSaveWorkspace = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedClient && !editingWorkspace) return
        setError(null)

        if (editingWorkspace) {
            const { error } = await supabase
                .from('workspaces')
                .update({ name: workspaceName })
                .eq('id', editingWorkspace.id)

            if (error) {
                setError(error.message)
                return
            }
            logActivity('update_workspace', `updated workspace: ${workspaceName}`)
            createNotification('Workspace Updated', `Successfully updated workspace: ${workspaceName}`, 'success')
        } else {
            const { error } = await supabase
                .from('workspaces')
                .insert({ name: workspaceName, client_id: selectedClient })

            if (error) {
                setError(error.message)
                return
            }
            logActivity('create_workspace', `added a new workspace: ${workspaceName}`)
            createNotification('Workspace Added', `Successfully added workspace: ${workspaceName}`, 'success')
        }

        setWorkspaceName('')
        setEditingWorkspace(null)
        setShowAddWorkspace(false)
        if (selectedClient) loadWorkspaces(selectedClient)
    }

    const handleDeleteWorkspace = async (id: string) => {
        if (!confirm('Are you sure you want to delete this workspace? This will delete all associated departments and tasks.')) return

        const { error } = await supabase
            .from('workspaces')
            .delete()
            .eq('id', id)

        if (error) {
            alert('Error deleting workspace: ' + error.message)
        } else {
            logActivity('delete_workspace', 'deleted a workspace')
            createNotification('Workspace Deleted', 'Successfully deleted workspace', 'success')
            if (selectedWorkspace === id) {
                setSelectedWorkspace(null)
                setDepartments([])
            }
            if (selectedClient) loadWorkspaces(selectedClient)
        }
    }

    const handleSaveDepartment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedWorkspace && !editingDepartment) return
        setError(null)

        if (editingDepartment) {
            const { error } = await supabase
                .from('departments')
                .update({ name: departmentName })
                .eq('id', editingDepartment.id)

            if (error) {
                setError(error.message)
                return
            }
            logActivity('update_department', `updated department: ${departmentName}`)
            createNotification('Department Updated', `Successfully updated department: ${departmentName}`, 'success')
        } else {
            const { error } = await supabase
                .from('departments')
                .insert({ name: departmentName, workspace_id: selectedWorkspace })

            if (error) {
                setError(error.message)
                return
            }
            logActivity('create_department', `added a new department: ${departmentName}`)
            createNotification('Department Added', `Successfully added department: ${departmentName}`, 'success')
        }

        setDepartmentName('')
        setEditingDepartment(null)
        setShowAddDepartment(false)
        if (selectedWorkspace) loadDepartments(selectedWorkspace)
    }

    const handleDeleteDepartment = async (id: string) => {
        if (!confirm('Are you sure you want to delete this department? This will delete all associated tasks.')) return

        const { error } = await supabase
            .from('departments')
            .delete()
            .eq('id', id)

        if (error) {
            alert('Error deleting department: ' + error.message)
        } else {
            logActivity('delete_department', 'deleted a department')
            createNotification('Department Deleted', 'Successfully deleted department', 'success')
            if (selectedDepartment === id) {
                setSelectedDepartment(null)
            }
            if (selectedWorkspace) loadDepartments(selectedWorkspace)
        }
    }

    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (editingEmployee) {
            // Update existing employee
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: empFullName })
                .eq('id', editingEmployee.id)

            if (error) {
                setError(error.message)
                return
            }
            logActivity('update_employee', `updated employee: ${empFullName}`)
            createNotification('Employee Updated', `Successfully updated employee: ${empFullName}`, 'success')
        } else {
            // Create new employee
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: empEmail,
                password: empPassword,
                options: {
                    data: {
                        full_name: empFullName,
                        role: 'employee',
                        status: 'active'
                    },
                },
            })

            if (signUpError) {
                setError(signUpError.message)
                return
            }

            if (data.user) {
                await supabase
                    .from('profiles')
                    .update({ created_by: user?.id, status: 'active' })
                    .eq('id', data.user.id)
                logActivity('create_employee', `added a new employee: ${empFullName}`)
                createNotification('Employee Created', `Successfully created employee: ${empFullName}`, 'success')
            }
        }

        setEmpFullName('')
        setEmpEmail('')
        setEmpPassword('')
        setEditingEmployee(null)
        setShowAddEmployee(false)
        loadEmployees()
    }

    const handleDeleteEmployee = async (id: string) => {
        if (!confirm('Are you sure you want to delete this employee?')) return

        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', id)

        if (error) {
            alert('Error deleting employee: ' + error.message)
        } else {
            logActivity('delete_employee', 'deleted an employee')
            createNotification('Employee Deleted', 'Successfully deleted employee', 'success')
            loadEmployees()
        }
    }

    const handleStatusChange = async (id: string, newStatus: 'active' | 'inactive') => {
        const { error } = await supabase
            .from('profiles')
            .update({ status: newStatus })
            .eq('id', id)

        if (error) {
            alert('Error updating status: ' + error.message)
        } else {
            logActivity('update_status', `updated employee status to ${newStatus}`)
            createNotification('Status Updated', `Updated employee status to ${newStatus}`, 'info')
            loadEmployees()
        }
    }

    const loadDepartmentEmployees = async (departmentId: string) => {
        const { data } = await supabase
            .from('department_employees')
            .select('employee_id, profiles!inner(id, email, full_name, created_at)')
            .eq('department_id', departmentId)

        if (data) {
            const empList = data.map((de: any) => de.profiles)
            setDepartmentEmployees(prev => ({ ...prev, [departmentId]: empList }))
            setAssignedEmployeeIds(new Set(empList.map((e: Employee) => e.id)))
        }
    }

    const handleOpenAssignEmployees = async (departmentId: string) => {
        setSelectedDepartment(departmentId)
        await loadDepartmentEmployees(departmentId)
        setShowAssignEmployees(true)
    }

    const handleToggleEmployeeAssignment = async (employeeId: string) => {
        if (!selectedDepartment) return

        const isAssigned = assignedEmployeeIds.has(employeeId)

        if (isAssigned) {
            // Unassign
            const { error } = await supabase
                .from('department_employees')
                .delete()
                .eq('department_id', selectedDepartment)
                .eq('employee_id', employeeId)

            if (!error) {
                setAssignedEmployeeIds(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(employeeId)
                    return newSet
                })
                await loadDepartmentEmployees(selectedDepartment)
            }
        } else {
            // Assign
            const { error } = await supabase
                .from('department_employees')
                .insert({ department_id: selectedDepartment, employee_id: employeeId })

            if (!error) {
                setAssignedEmployeeIds(prev => new Set(prev).add(employeeId))
                await loadDepartmentEmployees(selectedDepartment)
            }
        }
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7280' }}>
                <div className="animate-pulse">Loading dashboard...</div>
            </div>
        )
    }

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredWorkspaces = workspaces.filter(ws =>
        ws.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredDepartments = departments.filter(dept =>
        dept.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = (emp.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            emp.email.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === 'all' || emp.status === statusFilter
        return matchesSearch && matchesStatus
    })

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <header style={{
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-color)',
                padding: '1rem 2rem',
                position: 'sticky',
                top: 0,
                zIndex: 10,
            }}>
                <div style={{
                    maxWidth: '1400px',
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
                        }}>
                            <LayoutGrid size={24} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                Coordinator Dashboard
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                                {profile?.full_name || user?.email}
                            </p>
                        </div>
                    </div>

                    <div style={{ flex: 1, maxWidth: '400px', margin: '0 2rem' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem 0.5rem 0.5rem 2.5rem',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <NotificationCenter />
                        <button
                            onClick={toggleTheme}
                            style={{
                                padding: '0.5rem',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                            }}
                        >
                            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                        <button
                            onClick={() => setShowAnalytics(true)}
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'var(--bg-secondary)',
                                color: '#4f46e5',
                                border: '1px solid #e0e7ff',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#eef2ff';
                                e.currentTarget.style.borderColor = '#c7d2fe';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'white';
                                e.currentTarget.style.borderColor = '#e0e7ff';
                            }}
                        >
                            <BarChart3 size={18} />
                            Analytics
                        </button>
                        <button

                            style={{
                                padding: '0.5rem 1rem',
                                background: 'var(--bg-secondary)',
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
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#fef2f2';
                                e.currentTarget.style.borderColor = '#fecaca';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'white';
                                e.currentTarget.style.borderColor = '#fee2e2';
                            }}
                            onClick={handleSignOut}
                        >
                            <LogOut size={18} />
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
                {/* Stats Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '2rem',
                }}>
                    {[
                        { label: 'Total Clients', value: clients.length, icon: Users, color: '#4f46e5', bg: '#eef2ff' },
                        { label: 'Active Workspaces', value: workspaces.length, icon: Briefcase, color: '#0891b2', bg: '#ecfeff' },
                        { label: 'Departments', value: departments.length, icon: Building2, color: '#ea580c', bg: '#fff7ed' },
                        { label: 'Total Employees', value: employees.length, icon: UserPlus, color: '#059669', bg: '#ecfdf5' },
                    ].map((stat, i) => (
                        <div key={i} style={{
                            background: 'var(--bg-secondary)',
                            padding: '1.5rem',
                            borderRadius: '1rem',
                            border: '1px solid var(--border-color)',
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            transition: 'transform 0.2s',
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                background: stat.bg,
                                color: stat.color,
                            }}>
                                <stat.icon size={24} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{stat.label}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>{stat.value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '2rem', alignItems: 'start' }}>

                    {/* Left Column: Hierarchy Management */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* Clients Section */}
                        <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                            <div style={{
                                padding: '1rem 1.5rem',
                                borderBottom: '1px solid var(--border-color)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'var(--bg-primary)',
                            }}>
                                <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Users size={18} /> Clients
                                </h2>
                                <button
                                    onClick={() => setShowAddClient(true)}
                                    style={{
                                        padding: '0.375rem 0.75rem',
                                        background: '#4f46e5',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                    }}
                                >
                                    <Plus size={16} /> Add
                                </button>
                            </div>
                            <div style={{ padding: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                                {filteredClients.length === 0 ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                                        {searchTerm ? 'No clients match your search.' : 'No clients found. Add one to get started.'}
                                    </div>
                                ) : (
                                    filteredClients.map((client) => (
                                        <div
                                            key={client.id}
                                            onClick={() => setSelectedClient(client.id)}
                                            style={{
                                                padding: '0.75rem 1rem',
                                                borderRadius: '0.5rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                background: selectedClient === client.id ? '#eef2ff' : 'transparent',
                                                color: selectedClient === client.id ? '#4f46e5' : '#374151',
                                                fontWeight: selectedClient === client.id ? '600' : '400',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            <span>{client.name}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {selectedClient === client.id && <ChevronRight size={16} />}
                                                <div style={{ display: 'flex', gap: '0.25rem' }} onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => {
                                                            setEditingClient(client)
                                                            setClientName(client.name)
                                                            setShowAddClient(true)
                                                        }}
                                                        style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                                                        title="Edit"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClient(client.id)}
                                                        style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Workspaces Section */}
                        {selectedClient && (
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', overflow: 'hidden', animation: 'fadeIn 0.3s ease-out' }}>
                                <div style={{
                                    padding: '1rem 1.5rem',
                                    borderBottom: '1px solid var(--border-color)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: 'var(--bg-primary)',
                                }}>
                                    <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Briefcase size={18} /> Workspaces
                                    </h2>
                                    <button
                                        onClick={() => setShowAddWorkspace(true)}
                                        style={{
                                            padding: '0.375rem 0.75rem',
                                            background: '#0891b2',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '0.375rem',
                                            fontSize: '0.875rem',
                                            fontWeight: '500',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                        }}
                                    >
                                        <Plus size={16} /> Add
                                    </button>
                                </div>
                                <div style={{ padding: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                                    {filteredWorkspaces.length === 0 ? (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                                            {searchTerm ? 'No workspaces match your search.' : 'No workspaces found.'}
                                        </div>
                                    ) : (
                                        filteredWorkspaces.map((ws) => (
                                            <div
                                                key={ws.id}
                                                onClick={() => setSelectedWorkspace(ws.id)}
                                                style={{
                                                    padding: '0.75rem 1rem',
                                                    borderRadius: '0.5rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    background: selectedWorkspace === ws.id ? '#ecfeff' : 'transparent',
                                                    color: selectedWorkspace === ws.id ? '#0891b2' : '#374151',
                                                    fontWeight: selectedWorkspace === ws.id ? '600' : '400',
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                <span>{ws.name}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {selectedWorkspace === ws.id && <ChevronRight size={16} />}
                                                    <div style={{ display: 'flex', gap: '0.25rem' }} onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => {
                                                                setEditingWorkspace(ws)
                                                                setWorkspaceName(ws.name)
                                                                setShowAddWorkspace(true)
                                                            }}
                                                            style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                                                            title="Edit"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteWorkspace(ws.id)}
                                                            style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Departments Section */}
                        {selectedWorkspace && (
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', overflow: 'hidden', animation: 'fadeIn 0.3s ease-out' }}>
                                <div style={{
                                    padding: '1rem 1.5rem',
                                    borderBottom: '1px solid var(--border-color)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: 'var(--bg-primary)',
                                }}>
                                    <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Building2 size={18} /> Departments
                                    </h2>
                                    <button
                                        onClick={() => setShowAddDepartment(true)}
                                        style={{
                                            padding: '0.375rem 0.75rem',
                                            background: '#ea580c',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '0.375rem',
                                            fontSize: '0.875rem',
                                            fontWeight: '500',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                        }}
                                    >
                                        <Plus size={16} /> Add
                                    </button>
                                </div>
                                <div style={{ padding: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                                    {filteredDepartments.length === 0 ? (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                                            {searchTerm ? 'No departments match your search.' : 'No departments in this workspace.'}
                                        </div>
                                    ) : (
                                        filteredDepartments.map((dept) => (
                                            <div
                                                key={dept.id}
                                                style={{
                                                    padding: '0.75rem 1rem',
                                                    borderRadius: '0.5rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    background: 'transparent',
                                                    color: '#374151',
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span>{dept.name}</span>
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        <button
                                                            onClick={() => {
                                                                setEditingDepartment(dept)
                                                                setDepartmentName(dept.name)
                                                                setShowAddDepartment(true)
                                                            }}
                                                            style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                                                            title="Edit"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteDepartment(dept.id)}
                                                            style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={() => handleOpenAssignEmployees(dept.id)}
                                                        style={{
                                                            padding: '0.25rem 0.5rem',
                                                            background: '#f3f4f6',
                                                            color: '#4b5563',
                                                            border: 'none',
                                                            borderRadius: '0.25rem',
                                                            fontSize: '0.75rem',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem',
                                                        }}
                                                    >
                                                        <UserPlus size={14} /> Assign
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedDepartment(dept.id)
                                                            setShowDepartmentTasks(true)
                                                        }}
                                                        style={{
                                                            padding: '0.25rem 0.5rem',
                                                            background: '#e0e7ff',
                                                            color: '#4f46e5',
                                                            border: 'none',
                                                            borderRadius: '0.25rem',
                                                            fontSize: '0.75rem',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem',
                                                        }}
                                                    >
                                                        <ClipboardList size={14} /> Tasks
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Employees */}
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                        <div style={{
                            padding: '1.5rem',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                    Employees
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                                    Manage your team members and roles
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                                    style={{
                                        padding: '0.625rem 1rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--border-color)',
                                        fontSize: '0.875rem',
                                        color: '#374151',
                                        outline: 'none',
                                        cursor: 'pointer',
                                        background: 'var(--bg-secondary)',
                                    }}
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                                <button
                                    onClick={() => setShowAddEmployee(true)}
                                    style={{
                                        padding: '0.625rem 1.25rem',
                                        background: '#059669',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)',
                                    }}
                                >
                                    <UserPlus size={18} /> Add Employee
                                </button>
                            </div>
                        </div>

                        <div style={{ padding: '0' }}>
                            {filteredEmployees.length === 0 ? (
                                <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                                    <div style={{
                                        width: '64px', height: '64px', background: '#f3f4f6', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
                                        color: '#9ca3af'
                                    }}>
                                        <UserPlus size={32} />
                                    </div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>No employees yet</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                        Start by adding employees to your organization.
                                    </p>
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: 'var(--bg-primary)' }}>
                                        <tr>
                                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Joined</th>
                                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredEmployees.map((emp) => (
                                            <tr key={emp.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '1rem 1.5rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <div style={{
                                                            width: '32px', height: '32px', borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '0.875rem'
                                                        }}>
                                                            {emp.full_name?.[0]?.toUpperCase() || emp.email[0].toUpperCase()}
                                                        </div>
                                                        <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{emp.full_name || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{emp.email}</td>
                                                <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                                    {new Date(emp.created_at).toLocaleDateString()}
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                    <select
                                                        value={emp.status || 'active'}
                                                        onChange={(e) => handleStatusChange(emp.id, e.target.value as 'active' | 'inactive')}
                                                        style={{
                                                            padding: '0.25rem 0.5rem',
                                                            borderRadius: '9999px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '500',
                                                            border: 'none',
                                                            background: emp.status === 'inactive' ? '#fef2f2' : '#ecfdf5',
                                                            color: emp.status === 'inactive' ? '#ef4444' : '#059669',
                                                            cursor: 'pointer',
                                                            outline: 'none',
                                                        }}
                                                    >
                                                        <option value="active">Active</option>
                                                        <option value="inactive">Inactive</option>
                                                    </select>
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                        <button
                                                            onClick={() => {
                                                                setEditingEmployee(emp)
                                                                setEmpFullName(emp.full_name)
                                                                setEmpEmail(emp.email)
                                                                setEmpPassword('') // Don't show password
                                                                setShowAddEmployee(true)
                                                            }}
                                                            style={{
                                                                padding: '0.25rem',
                                                                background: 'transparent',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                color: 'var(--text-secondary)',
                                                                transition: 'color 0.2s',
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.color = '#4f46e5'}
                                                            onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                                                            title="Edit"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteEmployee(emp.id)}
                                                            style={{
                                                                padding: '0.25rem',
                                                                background: 'transparent',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                color: 'var(--text-secondary)',
                                                                transition: 'color 0.2s',
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                                            onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                    {/* Activity Feed Column */}
                    <div style={{ height: 'calc(100vh - 140px)', position: 'sticky', top: '100px' }}>
                        <ActivityFeed />
                    </div>
                </div>
            </main>

            {/* Modals */}
            <Modal
                isOpen={showAddClient}
                onClose={() => {
                    setShowAddClient(false)
                    setEditingClient(null)
                    setClientName('')
                }}
                title={editingClient ? "Edit Client" : "Add New Client"}
            >
                <form onSubmit={handleSaveClient}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500', fontSize: '0.875rem' }}>
                            Client Name
                        </label>
                        <input
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="e.g. Acme Corp"
                            required
                            style={{
                                width: '100%',
                                padding: '0.625rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.5rem',
                                fontSize: '0.95rem',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                        />
                    </div>
                    {error && <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <button
                            type="button"
                            onClick={() => setShowAddClient(false)}
                            style={{
                                padding: '0.625rem 1rem',
                                background: 'var(--bg-secondary)',
                                color: '#374151',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontWeight: '500',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '0.625rem 1rem',
                                background: '#4f46e5',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontWeight: '500',
                            }}
                        >
                            {editingClient ? 'Update Client' : 'Create Client'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={showAddWorkspace}
                onClose={() => {
                    setShowAddWorkspace(false)
                    setEditingWorkspace(null)
                    setWorkspaceName('')
                }}
                title={editingWorkspace ? "Edit Workspace" : "Add New Workspace"}
            >
                <form onSubmit={handleSaveWorkspace}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500', fontSize: '0.875rem' }}>
                            Workspace Name
                        </label>
                        <input
                            type="text"
                            value={workspaceName}
                            onChange={(e) => setWorkspaceName(e.target.value)}
                            placeholder="e.g. Marketing Projects"
                            required
                            style={{
                                width: '100%',
                                padding: '0.625rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.5rem',
                                fontSize: '0.95rem',
                                outline: 'none',
                            }}
                        />
                    </div>
                    {error && <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <button
                            type="button"
                            onClick={() => setShowAddWorkspace(false)}
                            style={{
                                padding: '0.625rem 1rem',
                                background: 'var(--bg-secondary)',
                                color: '#374151',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontWeight: '500',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '0.625rem 1rem',
                                background: '#0891b2',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontWeight: '500',
                            }}
                        >
                            {editingWorkspace ? 'Update Workspace' : 'Create Workspace'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={showAddDepartment}
                onClose={() => {
                    setShowAddDepartment(false)
                    setEditingDepartment(null)
                    setDepartmentName('')
                }}
                title={editingDepartment ? "Edit Department" : "Add New Department"}
            >
                <form onSubmit={handleSaveDepartment}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500', fontSize: '0.875rem' }}>
                            Department Name
                        </label>
                        <input
                            type="text"
                            value={departmentName}
                            onChange={(e) => setDepartmentName(e.target.value)}
                            placeholder="e.g. Design Team"
                            required
                            style={{
                                width: '100%',
                                padding: '0.625rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.5rem',
                                fontSize: '0.95rem',
                                outline: 'none',
                            }}
                        />
                    </div>
                    {error && <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <button
                            type="button"
                            onClick={() => setShowAddDepartment(false)}
                            style={{
                                padding: '0.625rem 1rem',
                                background: 'var(--bg-secondary)',
                                color: '#374151',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontWeight: '500',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '0.625rem 1rem',
                                background: '#ea580c',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontWeight: '500',
                            }}
                        >
                            {editingDepartment ? 'Update Department' : 'Create Department'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={showAddEmployee}
                onClose={() => {
                    setShowAddEmployee(false)
                    setEditingEmployee(null)
                    setEmpFullName('')
                    setEmpEmail('')
                    setEmpPassword('')
                }}
                title={editingEmployee ? "Edit Employee" : "Add New Employee"}
            >
                <form onSubmit={handleAddEmployee}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500', fontSize: '0.875rem' }}>
                            Full Name
                        </label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                            <input
                                type="text"
                                value={empFullName}
                                onChange={(e) => setEmpFullName(e.target.value)}
                                placeholder="John Doe"
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.625rem 0.625rem 0.625rem 2.5rem',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                }}
                            />
                        </div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500', fontSize: '0.875rem' }}>
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={empEmail}
                            onChange={(e) => setEmpEmail(e.target.value)}
                            placeholder="john@example.com"
                            required
                            disabled={!!editingEmployee}
                            style={{
                                width: '100%',
                                padding: '0.625rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.5rem',
                                fontSize: '0.95rem',
                                outline: 'none',
                                background: editingEmployee ? '#f3f4f6' : 'white',
                            }}
                        />
                    </div>
                    {!editingEmployee && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500', fontSize: '0.875rem' }}>
                                Password
                            </label>
                            <input
                                type="password"
                                value={empPassword}
                                onChange={(e) => setEmpPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                style={{
                                    width: '100%',
                                    padding: '0.625rem',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                }}
                            />
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Must be at least 6 characters</p>
                        </div>
                    )}
                    {error && <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setShowAddEmployee(false)
                                setEditingEmployee(null)
                            }}
                            style={{
                                padding: '0.625rem 1rem',
                                background: 'var(--bg-secondary)',
                                color: '#374151',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontWeight: '500',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '0.625rem 1rem',
                                background: '#059669',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontWeight: '500',
                            }}
                        >
                            {editingEmployee ? 'Update Employee' : 'Create Employee'}
                        </button>
                    </div>
                </form>
            </Modal>

            <EmployeeAssignmentModal
                isOpen={showAssignEmployees}
                onClose={() => setShowAssignEmployees(false)}
                departmentId={selectedDepartment}
                departmentName={departments.find(d => d.id === selectedDepartment)?.name || ''}
                allEmployees={employees}
                assignedEmployeeIds={assignedEmployeeIds}
                onToggleAssignment={handleToggleEmployeeAssignment}
            />

            <DepartmentTasksModal
                isOpen={showDepartmentTasks}
                onClose={() => setShowDepartmentTasks(false)}
                departmentId={selectedDepartment}
                departmentName={departments.find(d => d.id === selectedDepartment)?.name || ''}
                employees={employees}
            />

            <DashboardAnalyticsModal
                isOpen={showAnalytics}
                onClose={() => setShowAnalytics(false)}
                ccId={user?.id}
            />

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div >
    )
}
