import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'

export default function Docentes() {
  const [docentes, setDocentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [form, setForm] = useState({ nombre: '', apellido: '', dni: '', email: '', carrera: '', curso_division: '' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { cargarDocentes() }, [])

  async function cargarDocentes() {
    const { data } = await supabase
      .from('teachers')
      .select(`id, carrera, curso_division, activo, users ( nombre, apellido, dni, email )`)
      .eq('activo', true)
      .order('created_at', { ascending: false })
    setDocentes(data || [])
    setLoading(false)
  }

  async function guardarDocente(e) {
    e.preventDefault()
    setGuardando(true)
    setError('')

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: form.email,
      password: form.dni,
      email_confirm: true
    })

    if (authError) { setError(authError.message); setGuardando(false); return }

    // 2. Insertar en tabla users
    const { error: userError } = await supabase.from('users').insert({
      id: authData.user.id,
      dni: form.dni,
      nombre: form.nombre,
      apellido: form.apellido,
      email: form.email,
      rol: 'docente'
    })

    if (userError) { setError(userError.message); setGuardando(false); return }

    // 3. Insertar en tabla teachers
    const { error: teacherError } = await supabase.from('teachers').insert({
      user_id: authData.user.id,
      carrera: form.carrera,
      curso_division: form.curso_division
    })

    if (teacherError) { setError(teacherError.message); setGuardando(false); return }

    setGuardando(false)
    setModalOpen(false)
    setForm({ nombre: '', apellido: '', dni: '', email: '', carrera: '', curso_division: '' })
    cargarDocentes()
  }

  if (loading) return <div className="loading">⏳ Cargando...</div>

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h1>Docentes</h1>
          <p>Plantel activo del IEST</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>+ Nuevo</button>
      </div>

      <div className="card">
        {docentes.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">👨‍🏫</div>
            <p>No hay docentes cargados aún</p>
          </div>
        ) : (
          docentes.map(d => (
            <div key={d.id} className="list-row" onClick={() => setDetalle(d)} style={{ cursor: 'pointer' }}>
              <div className="avatar">
                {d.users?.nombre?.[0]}{d.users?.apellido?.[0]}
              </div>
              <div className="list-row-info">
                <div className="list-row-title">{d.users?.apellido}, {d.users?.nombre}</div>
                <div className="list-row-sub">{d.carrera} · {d.curso_division}</div>
              </div>
              <span style={{ color: 'var(--color-muted)', fontSize: 18 }}>›</span>
            </div>
          ))
        )}
      </div>

      {/* Modal nuevo docente */}
      {modalOpen && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-header">
              <h2>Nuevo Docente</h2>
              <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={guardarDocente}>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre</label>
                  <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Apellido</label>
                  <input value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})} required />
                </div>
              </div>
              <div className="form-group">
                <label>DNI</label>
                <input value={form.dni} onChange={e => setForm({...form, dni: e.target.value})} placeholder="Sin puntos" required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Carrera</label>
                <input value={form.carrera} onChange={e => setForm({...form, carrera: e.target.value})} placeholder="Ej: Desarrollo de Software" required />
              </div>
              <div className="form-group">
                <label>Curso / División</label>
                <input value={form.curso_division} onChange={e => setForm({...form, curso_division: e.target.value})} placeholder="Ej: 2°A" required />
              </div>
              {error && <div className="alert danger">{error}</div>}
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal detalle docente */}
      {detalle && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setDetalle(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-header">
              <h2>{detalle.users?.apellido}, {detalle.users?.nombre}</h2>
              <button className="modal-close" onClick={() => setDetalle(null)}>✕</button>
            </div>
            <div className="info-row"><span className="info-label">DNI</span><span className="info-value">{detalle.users?.dni}</span></div>
            <div className="info-row"><span className="info-label">Email</span><span className="info-value">{detalle.users?.email}</span></div>
            <div className="info-row"><span className="info-label">Carrera</span><span className="info-value">{detalle.carrera}</span></div>
            <div className="info-row"><span className="info-label">Curso</span><span className="info-value">{detalle.curso_division}</span></div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDetalle(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
