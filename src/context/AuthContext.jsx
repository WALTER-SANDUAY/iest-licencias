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

  // ✅ CORREGIDO: Convertimos a NÚMERO porque así está guardado en Supabase
 // ✅ CORREGIDO: Tabla = docente / DNI como NÚMERO
async function loginDocente(dni) {
  console.log("🔍 BUSCANDO DNI:", dni, "tipo:", typeof dni)
  
  // Limpiamos y convertimos a NÚMERO
  const dniBuscar = Number(String(dni).trim())
  console.log("🔍 DNI LIMPIO (NÚMERO):", dniBuscar)

  const { data: docentes, error } = await supabase
    .from('docente')  // 👈 TABLA CORREGIDA: era 'teachers'
    .select('id, dni, nombre, apellido')
    .eq('dni', dniBuscar)  // 👈 AHORA SÍ: buscamos como NÚMERO
    .limit(1)

  console.log("📄 RESULTADO:", docentes, "ERROR:", error)

  if (error || !docentes || docentes.length === 0) {
    console.log("❌ DNI no encontrado:", dniBuscar)
    return { error: { message: 'DNI no encontrado en el sistema' } }
  }

  const docente = docentes[0]
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

  const esRector    = perfil?.rol === 'rector'
  const esDocente   = perfil?.rol === 'docente'

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