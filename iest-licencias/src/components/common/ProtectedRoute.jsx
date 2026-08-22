import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, rol }) {
  const { user, perfil, loading } = useAuth()

  if (loading) return <div className="loading">⏳ Cargando...</div>
  if (!user)   return <Navigate to="/login" replace />
  if (rol && perfil?.rol !== rol) return <Navigate to="/login" replace />

  return children
}
