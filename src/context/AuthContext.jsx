import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [perfil, setPerfil]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await cargarPerfil(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await cargarPerfil(session.user.id)
      } else {
        setPerfil(null)
        setLoading(false)
      }
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

  async function loginRector(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function loginDocente(dni) {
  console.log("🔍 BUSCANDO DNI:", dni)
  const { data: docente, error } = await supabase
    .from('users')
    .select('id, email, rol')
    .eq('dni', String(dni))
    .eq('rol', 'docente')
    .single()

  console.log("📄 RESULTADO:", docente, "ERROR:", error)

  if (error || !docente) {
    console.log("❌ DNI no encontrado:", dni)
    return { error: { message: 'DNI no encontrado en el sistema' } }
  }

  console.log("✅ DOCENTE ENCONTRADO → ACCESO PERMITIDO")
  
  // ✅ NO PEDIMOS CONTRASEÑA → YA VERIFICAMOS QUE ES DOCENTE VÁLIDO
  return { 
    error: null, 
    usuario: { 
      id: docente.id, 
      email: docente.email, 
      rol: docente.rol 
    } 
  }
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
      setUser, setPerfil,
      loginRector, loginDocente, logout,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)