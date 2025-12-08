import { supabase } from '../lib/supabase'
import { useState } from 'react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
        }

        setLoading(false)
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '1rem',
        }}>
            <div style={{
                background: 'white',
                padding: '2.5rem',
                borderRadius: '1.5rem',
                boxShadow: '0 25px 80px rgba(0,0,0,0.25)',
                width: '100%',
                maxWidth: '450px',
                animation: 'slideIn 0.3s ease-out',
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '70px',
                        height: '70px',
                        margin: '0 auto 1rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
                    }}>
                        🏢
                    </div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#1f2937', fontWeight: '700' }}>
                        Welcome Back
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
                        Sign in to your workspace dashboard
                    </p>
                </div>

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: '#374151',
                            fontWeight: '500',
                            fontSize: '0.95rem',
                        }}>
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
                            style={{
                                width: '100%',
                                padding: '0.875rem 1rem',
                                border: '2px solid #e5e7eb',
                                borderRadius: '0.75rem',
                                fontSize: '1rem',
                                transition: 'all 0.2s',
                                outline: 'none',
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: '#374151',
                            fontWeight: '500',
                            fontSize: '0.95rem',
                        }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter your password"
                            style={{
                                width: '100%',
                                padding: '0.875rem 1rem',
                                border: '2px solid #e5e7eb',
                                borderRadius: '0.75rem',
                                fontSize: '1rem',
                                transition: 'all 0.2s',
                                outline: 'none',
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding: '1rem',
                            marginBottom: '1.25rem',
                            background: '#fef2f2',
                            color: '#dc2626',
                            borderRadius: '0.75rem',
                            border: '1px solid #fecaca',
                            fontSize: '0.95rem',
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            background: loading
                                ? '#9ca3af'
                                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.75rem',
                            fontSize: '1.05rem',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: loading ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)',
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'
                        }}
                        onMouseLeave={(e) => {
                            if (!loading) e.currentTarget.style.transform = 'translateY(0)'
                        }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div style={{
                    marginTop: '1.5rem',
                    textAlign: 'center',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid #e5e7eb',
                }}>
                    <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
                        Need to create an admin account?{' '}
                        <a
                            href="/admin-register"
                            style={{
                                color: '#667eea',
                                textDecoration: 'none',
                                fontWeight: '600',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                            Register here
                        </a>
                    </p>
                </div>
            </div>

            <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
        </div>
    )
}
