import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './components/auth/LoginPage'
import Dashboard from './components/dashboard/Dashboard'
import ProfileEditor from './components/profiles/ProfileEditor'
import ConversionPage from './pages/ConversionPage'
import { Loader2 } from 'lucide-react'

// Composant de route protégée : redirige vers /connexion si non authentifié
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-700" />
          <p className="text-sm">Chargement…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/connexion" replace />
  }

  return <>{children}</>
}

// Composant de route publique : redirige vers /dashboard si déjà authentifié
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-700" />
      </div>
    )
  }

  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

// Composant de redirection initiale : envoie vers /dashboard si déjà connecté
function RootRedirect() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-700" />
      </div>
    )
  }

  return <Navigate to={user ? '/dashboard' : '/connexion'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirection racine */}
        <Route path="/" element={<RootRedirect />} />

        {/* Authentification — redirige vers dashboard si déjà connecté */}
        <Route
          path="/connexion"
          element={<PublicRoute><LoginPage /></PublicRoute>}
        />

        {/* Routes protégées */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profils/nouveau"
          element={
            <ProtectedRoute>
              <ProfileEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profils/:id"
          element={
            <ProtectedRoute>
              <ProfileEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/conversion"
          element={
            <ProtectedRoute>
              <ConversionPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
