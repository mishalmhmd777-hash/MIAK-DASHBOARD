import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'
import { X, Briefcase, Link, MapPin } from 'lucide-react'

interface MeetingModalProps {
    isOpen: boolean
    onClose: () => void
    onMeetingCreated: () => void
}

export default function MeetingModal({ isOpen, onClose, onMeetingCreated }: MeetingModalProps) {
    const [title, setTitle] = useState('')
    const [clientId, setClientId] = useState('')
    const [description, setDescription] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [platform, setPlatform] = useState('Google Meet')
    const [meetingLink, setMeetingLink] = useState('')
    const [loading, setLoading] = useState(false)

    const [clients, setClients] = useState<any[]>([])

    useEffect(() => {
        if (isOpen) {
            fetchClients()
        }
    }, [isOpen])

    const fetchClients = async () => {
        const { data } = await supabase.from('clients').select('id, name')
        setClients(data || [])
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await supabase
                .from('meetings')
                .insert({
                    title,
                    client_id: clientId || null,
                    description,
                    start_time: new Date(startTime).toISOString(),
                    end_time: new Date(endTime).toISOString(),
                    platform,
                    meeting_link: meetingLink
                })

            if (error) throw error

            onMeetingCreated()
            onClose()
            resetForm()

        } catch (error) {
            console.error('Error creating meeting:', error)
            alert('Failed to create meeting')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setTitle('')
        setClientId('')
        setDescription('')
        setStartTime('')
        setEndTime('')
        setMeetingLink('')
        setPlatform('Google Meet')
    }

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Schedule Meeting"
            maxWidth="600px"
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>Schedule Meeting</h2>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Title */}
                <div>
                    <label style={labelStyle}>Meeting Title</label>
                    <input
                        required
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. Weekly Sync"
                        style={inputStyle}
                    />
                </div>

                {/* Client */}
                <div>
                    <label style={labelStyle}>Client (Optional)</label>
                    <div style={{ position: 'relative' }}>
                        <Briefcase size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <select
                            value={clientId}
                            onChange={e => setClientId(e.target.value)}
                            style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                        >
                            <option value="">No Client</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* Start Time */}
                    <div>
                        <label style={labelStyle}>Start Time</label>
                        <input
                            required
                            type="datetime-local"
                            value={startTime}
                            onChange={e => setStartTime(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    {/* End Time */}
                    <div>
                        <label style={labelStyle}>End Time</label>
                        <input
                            required
                            type="datetime-local"
                            value={endTime}
                            onChange={e => setEndTime(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </div>

                {/* Platform & Link */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                    <div>
                        <label style={labelStyle}>Platform</label>
                        <div style={{ position: 'relative' }}>
                            <MapPin size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <select
                                value={platform}
                                onChange={e => setPlatform(e.target.value)}
                                style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                            >
                                <option>Google Meet</option>
                                <option>Zoom</option>
                                <option>Teams</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={labelStyle}>Meeting Link</label>
                        <div style={{ position: 'relative' }}>
                            <Link size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="text"
                                value={meetingLink}
                                onChange={e => setMeetingLink(e.target.value)}
                                placeholder="https://..."
                                style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label style={labelStyle}>Description</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={3}
                        style={{ ...inputStyle, resize: 'vertical' }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '0.5rem 1.5rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#3b82f6',
                            color: 'white',
                            fontWeight: '500',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Creating...' : 'Schedule'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    marginBottom: '0.5rem'
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    outline: 'none'
}
