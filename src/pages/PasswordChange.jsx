import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import '../styles/PasswordChange.scss'

const PasswordChange = () => {
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loadingUser, setLoadingUser] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data, error: userError } = await supabase.auth.getUser()

      if (userError) {
        setError(userError.message)
      } else {
        setEmail(data.user?.email || '')
      }

      setLoadingUser(false)
    }

    loadCurrentUser()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!email) {
      setError('Nu am putut identifica utilizatorul autentificat.')
      return
    }

    if (newPassword.length < 8) {
      setError('Parola nouă trebuie să aibă cel puțin 8 caractere.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Confirmarea parolei nu coincide cu parola nouă.')
      return
    }

    if (currentPassword === newPassword) {
      setError('Parola nouă trebuie să fie diferită de parola actuală.')
      return
    }

    setSaving(true)

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    })

    if (verifyError) {
      setError('Parola actuală este incorectă.')
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    setSaving(false)

    if (updateError) {
      setError(updateError.message || 'Parola nu a putut fi schimbată.')
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setSuccess('Parola a fost schimbată cu succes.')
  }

  return (
    <main className="password-page">
      <section className="password-card">
        <div className="password-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
          </svg>
        </div>

        <div className="password-heading">
          <div className="password-eyebrow">Securitate cont</div>
          <h1>Schimbă parola</h1>
          <p>Actualizează parola contului de administrator.</p>
        </div>

        <div className="current-account">
          <span>Cont autentificat</span>
          <strong>{loadingUser ? 'Se încarcă...' : email || '—'}</strong>
        </div>

        <form className="password-form" onSubmit={handleSubmit}>
          <label>
            <span>Parola actuală</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <label>
            <span>Parola nouă</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <small>Folosește cel puțin 8 caractere.</small>
          </label>

          <label>
            <span>Confirmă parola nouă</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          {error && <div className="password-feedback is-error">{error}</div>}
          {success && <div className="password-feedback is-success">{success}</div>}

          <button type="submit" className="password-submit" disabled={saving || loadingUser}>
            {saving ? 'Se actualizează...' : 'Schimbă parola'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default PasswordChange
