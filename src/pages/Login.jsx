import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '/icons/logo.jpg'

export default function Login() {
  const { loginRector, loginDocente } = useAuth()
  const navigate = useNavigate()

  const [rol, setRol]           = useState('docente')
  const [dni, setDni]           = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    let result
    if (rol === 'docente') {
      result = await loginDocente(dni)
    } else {
      result = await loginRector(email, password)
    }

    setLoading(false)

    if (result.error) {
      setError(result.error.message)
    } else {
      navigate(rol === 'rector' ? '/rector' : '/docente')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 20px', background: 'var(--color-bg)' }}>
      
      {/* Logo y título */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <img src={logo} alt="IEST" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-primary)', marginBottom: 12 }} />
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>IEST Tinogasta</h1>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 3 }}>Sistema de Gestión de Licencias Docentes</p>
      </div>

      {/* Selector de rol */}
      <div style={{ display: 'flex', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 20 }}>
        <button
          onClick={() => setRol('docente')}
          style={{ flex: 1, padding: '10px', border: 'none', fontWeight: 700, fontSize: 13, background: rol === 'docente' ? 'var(--color-primary)' : '#fff', color: rol === 'docente' ? '#fff' : 'var(--color-text)', transition: 'all .15s' }}
        >👨‍🏫 Docente</button>
        <button
          onClick={() => setRol('rector')}
          style={{ flex: 1, padding: '10px', border: 'none', borderLeft: '1.5px solid var(--color-border)', fontWeight: 700, fontSize: 13, background: rol === 'rector' ? 'var(--color-primary)' : '#fff', color: rol === 'rector' ? '#fff' : 'var(--color-text)', transition: 'all .15s' }}
        >🏫 Rector</button>
      </div>

      <form onSubmit={handleSubmit}>
        {rol === 'docente' ? (
          <div className="form-group">
            <label>Tu DNI</label>
            <input type="text" placeholder="Ej: 28441001" value={dni} onChange={e => setDni(e.target.value)} required />
          </div>
        ) : (
          <>
            <div className="form-group">
              <label>Email</label>
              <input type="email" placeholder="rector@iest.edu.ar" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
          </>
        )}

        {error && <div className="alert danger" style={{ marginBottom: 14 }}>{error}</div>}

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar →'}
        </button>
      </form>
    </div>
  )
}
