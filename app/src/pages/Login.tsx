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
            background: 'linear-gradient(135deg, #0f172a 0%, #3b0764 50%, #be185d 100%)', // Navy -> Deep Purple -> Pink
            padding: '1rem',
            fontFamily: "'Inter', sans-serif",
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.03)', // Glass effect
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                padding: '3rem',
                borderRadius: '1.5rem',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                width: '100%',
                maxWidth: '450px',
                animation: 'slideIn 0.4s ease-out',
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        margin: '0 auto 1.5rem',
                        background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', // Pink to Purple
                        borderRadius: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2.5rem',
                        boxShadow: 'none',
                    }}>
                        🏢
                    </div>
                    <h1 style={{
                        fontSize: '2.25rem',
                        marginBottom: '0.75rem',
                        color: '#f0f9ff', // Very light blue/white
                        fontWeight: '700',
                        letterSpacing: '-0.025em'
                    }}>
                        Welcome Back
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '1rem' }}>
                        Sign in to your workspace dashboard
                    </p>
                </div>

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: '#e2e8f0', // Light grey-blue
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
                                padding: '1rem 1.25rem',
                                background: 'rgba(15, 23, 42, 0.6)', // Dark semi-transparent
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '0.75rem',
                                fontSize: '1rem',
                                color: '#fff',
                                transition: 'all 0.2s',
                                outline: 'none',
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = '#38bdf8'
                                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(56, 189, 248, 0.2)'
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                                e.currentTarget.style.boxShadow = 'none'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: '#e2e8f0',
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
                                padding: '1rem 1.25rem',
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '0.75rem',
                                fontSize: '1rem',
                                color: '#fff',
                                transition: 'all 0.2s',
                                outline: 'none',
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = '#38bdf8'
                                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(56, 189, 248, 0.2)'
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                                e.currentTarget.style.boxShadow = 'none'
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding: '1rem',
                            marginBottom: '1.5rem',
                            background: 'rgba(220, 38, 38, 0.1)',
                            color: '#fca5a5',
                            borderRadius: '0.75rem',
                            border: '1px solid rgba(220, 38, 38, 0.2)',
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
                                ? '#475569'
                                : 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', // Pink to Purple
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.75rem',
                            fontSize: '1.05rem',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s',
                            boxShadow: 'none',
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.currentTarget.style.transform = 'translateY(-2px)'
                                e.currentTarget.style.boxShadow = 'none'
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!loading) {
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = 'none'
                            }
                        }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                {/* Admin registration link removed */}
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
