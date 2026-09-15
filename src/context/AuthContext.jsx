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

  // ✅ CORREGIDO: BUSCA EN LA TABLA CORRECTA (teachers)
async function loginDocente(dni) {
  console.log("🔍 BUSCANDO DNI:", dni)
  const dniLimpio = dni.trim() // quitamos espacios por si acaso
  
  const { data: docentes, error } = await supabase
    .from('teachers')
    .select('id, dni, nombre, apellido')
    .eq('dni', dniLimpio)  // ✅ Buscamos limpio
    .limit(1)              // ✅ Solo necesitamos uno

  console.log("📄 RESULTADO:", docentes, "ERROR:", error)

  // ✅ Verificamos si encontró al menos uno
  if (error || !docentes || docentes.length === 0) {
    console.log("❌ DNI no encontrado:", dniLimpio)
    return { error: { message: 'DNI no encontrado en el sistema' } }
  }

  const docente = docentes[0] // ✅ Tomamos el primero
  console.log("✅ DOCENTE ENCONTRADO → ACCESO PERMITIDO")
  
  return { 
    error: null, 
    usuario: { 
      id: docente.id, 
      dni: docente.dni,
      nombre: docente.nombre,
      apellido: docente.apellido,
      rol: 'docente'
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