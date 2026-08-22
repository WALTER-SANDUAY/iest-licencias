import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [perfil, setPerfil]   = useState(null)  // { rol, nombre, apellido, ... }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Sesión activa al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) cargarPerfil(session.user.id)
      else setLoading(false)
    })

    // Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) cargarPerfil(session.user.id)
      else { setPerfil(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function cargarPerfil(userId) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    setPerfil(data)
    setLoading(false)
  }

  // Login rector (email + password)
  async function loginRector(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  // Login docente (solo DNI — busca en tabla users)
  async function loginDocente(dni) {
    const { data: docente, error } = await supabase
      .from('users')
      .select('email')
      .eq('dni', dni)
      .eq('rol', 'docente')
      .single()

    if (error || !docente) return { error: { message: 'DNI no encontrado en el sistema' } }

    // Los docentes tienen password = su DNI (configurado al crearlos)
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: docente.email,
      password: dni
    })
    return { data, error: loginError }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  const esRector  = perfil?.rol === 'rector'
  const esDocente = perfil?.rol === 'docente'

  return (
    <AuthContext.Provider value={{
      user, perfil, loading,
      esRector, esDocente,
      loginRector, loginDocente, logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
