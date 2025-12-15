import { LayoutGrid, Plus, Pencil, Trash2, LogOut, Briefcase } from 'lucide-react'


interface Client {
    id: string
    name: string
    cc_id: string
    created_at: string
}

interface Profile {
    full_name: string
    email: string
    avatar_url?: string
}

interface ClientSidebarProps {
    clients: Client[]
    selectedId: string | null
    onSelect: (id: string) => void
    onAdd: () => void
    onEdit: (client: Client) => void
    onDelete: (id: string) => void
    profile: Profile | null
    onSignOut: () => void
    onProfileClick?: () => void
}

export default function ClientSidebar({
    clients,
    selectedId,
    onSelect,
    onAdd,
    onEdit,
    onDelete,
    profile,
    onSignOut,
    onProfileClick
}: ClientSidebarProps) {

    return (
        <aside style={{
            width: '280px',
            background: 'var(--sidebar-bg)',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            zIndex: 50,
            transition: 'width 0.3s ease',
            color: 'var(--text-primary)'
        }}>
            {/* User Profile Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--sidebar-bg)' }}>
                <div
                    onClick={onProfileClick}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        cursor: onProfileClick ? 'pointer' : 'default'
                    }}
                >
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)', fontWeight: '600', fontSize: '0.875rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            profile?.full_name?.[0] || 'U'
                        )}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{profile?.full_name}</p>
                        <button onClick={(e) => { e.stopPropagation(); onSignOut(); }} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginTop: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.25rem', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger-color)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                            <LogOut size={12} /> Sign Out
                        </button>
                    </div>
                </div>
            </div>

            {/* Logo Area */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                    width: 40, height: 40,
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', // Purple to Pink
                    borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)'
                }}>
                    <LayoutGrid size={20} />
                </div>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        Coordinator
                    </h1>
                </div>
            </div>

            {/* Clients List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 0.5rem' }}>
                    <h2 style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Clients
                    </h2>
                    <button
                        onClick={onAdd}
                        style={{
                            padding: '0.3rem',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#8b5cf6'
                            e.currentTarget.style.color = '#8b5cf6'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-color)'
                            e.currentTarget.style.color = 'var(--text-secondary)'
                        }}
                    >
                        <Plus size={14} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {clients.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            No clients found.
                        </div>
                    ) : (
                        clients.map(client => (
                            <div
                                key={client.id}
                                onClick={() => onSelect(client.id)}
                                style={{
                                    padding: '0.75rem 0.75rem',
                                    borderRadius: '0.5rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: selectedId === client.id
                                        ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
                                        : 'transparent',
                                    color: selectedId === client.id ? 'white' : 'var(--text-secondary)',
                                    transition: 'all 0.2s',
                                    fontWeight: selectedId === client.id ? '600' : '400',
                                    boxShadow: selectedId === client.id ? '0 4px 12px rgba(236, 72, 153, 0.3)' : 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (selectedId !== client.id) {
                                        e.currentTarget.style.background = 'var(--bg-tertiary)'
                                        e.currentTarget.style.color = 'var(--text-primary)'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (selectedId !== client.id) {
                                        e.currentTarget.style.background = 'transparent'
                                        e.currentTarget.style.color = 'var(--text-secondary)'
                                    }
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                    <Briefcase size={16} style={{ opacity: selectedId === client.id ? 1 : 0.7 }} />
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.name}</span>
                                </div>

                                {selectedId === client.id && (
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <button onClick={(e) => { e.stopPropagation(); onEdit(client); }} style={{ padding: '0.25rem', border: 'none', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer', color: 'white' }} title="Edit"><Pencil size={12} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); onDelete(client.id); }} style={{ padding: '0.25rem', border: 'none', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer', color: '#fecaca' }} title="Delete"><Trash2 size={12} /></button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </aside>
    )
}
