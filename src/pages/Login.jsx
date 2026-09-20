import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/Login.scss'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)

  const checkSession = async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      setSessionReady(true)
      navigate('/reservations', { replace: true })
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw signInError
      }

      await checkSession()
    } catch (signInError) {
      setError(signInError.message || 'A apărut o eroare la autentificare.')
    } finally {
      setLoading(false)
    }
  }

  if (sessionReady) {
    return <Navigate to="/reservations" replace />
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="auth-badge">N</span>
          <div className="auth-brand-copy">
            <span className="auth-brand-title">Norvex</span>
            <span className="auth-brand-subtitle">Admin Panel</span>
          </div>
        </div>

        <div className="auth-heading">
          <h1>Bine ai venit</h1>
          <p>Intră pentru a administra rezervările și serviciile.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@norvex.ro"
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="password">Parolă</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Se conectează...' : 'Conectare'}
          </button>
        </form>
      </section>
    </main>
  )
}