import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import Login from './pages/Login'
import Contact from './pages/Contact'
import Rezervations from './pages/Reservations'
import ServicesEdits from './pages/ServicesEdits'
import WebsiteRenovations from './pages/WebsiteRenovations'
import PasswordChange from './pages/PasswordChange'
import { supabase } from './lib/supabaseClient'

const ProtectedLayout = ({ children, onLogout }) => (
  <>
    <Header onLogout={onLogout} />
    {children}
  </>
)

const ProtectedRoute = ({ children, onLogout }) => {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const getSession = async () => {
      const { data } = await supabase.auth.getSession()

      if (isMounted) {
        setSession(data.session)
        setLoading(false)
      }
    }

    getSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (isMounted) {
        setSession(currentSession)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return <div className="page-shell loading-shell">Se încarcă...</div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <ProtectedLayout onLogout={onLogout}>{children}</ProtectedLayout>
}

const App = () => {
  const [session, setSession] = useState(null)

  useEffect(() => {
    let isMounted = true

    const getSession = async () => {
      const { data } = await supabase.auth.getSession()

      if (isMounted) {
        setSession(data.session)
      }
    }

    getSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (isMounted) {
        setSession(currentSession)
      }
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    window.location.href = '/login'
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={session ? '/home' : '/login'} replace />} />
      <Route path="/home" element={<ProtectedRoute onLogout={handleLogout}><Home /></ProtectedRoute>} />
      <Route path="/login" element={session ? <Navigate to="/home" replace /> : <Login />} />

      <Route path="/contact" element={<ProtectedRoute onLogout={handleLogout}><Contact /></ProtectedRoute>} />
      <Route path="/reservations" element={<ProtectedRoute onLogout={handleLogout}><Rezervations /></ProtectedRoute>} />
      <Route path="/services-edits" element={<ProtectedRoute onLogout={handleLogout}><ServicesEdits /></ProtectedRoute>} />
      <Route path="/website-renovations" element={<ProtectedRoute onLogout={handleLogout}><WebsiteRenovations /></ProtectedRoute>} />
      <Route path="/password-change" element={<ProtectedRoute onLogout={handleLogout}><PasswordChange /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to={session ? '/home' : '/login'} replace />} />
    </Routes>
  )
}

export default App