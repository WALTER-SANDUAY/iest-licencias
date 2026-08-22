import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'

export default function Docentes() {
  const [docentes, setDocentes] = useState([])
  const [carreras, setCarreras] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nombre: '', apellido: '', dni: '', email: '',
    telefono: '', domicilio: ''
  })

  // Asignaciones: array de { carrera_id, curso_id, materia }
  const [asignaciones, setAsignaciones] = useState([{ carrera_id: '', curso_id: '', materia: '' }])

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    const [{ data: docs }, { data: cars }] = await Promise.all([
      supabase.from('teachers').select(`
        id, carrera, curso_division, activo,
        users ( nombre, apellido, dni, email )
      `).eq('activo', true).order('created_at', { ascending: false }),
      supabase.from('carreras').select(`
        id, nombre, tipo,
        cursos ( id, nombre, materias ( id, nombre ) )
      `).eq('activo', true).order('nombre')
    ])
    setDocentes(docs || [])
    setCarreras(cars || [])
    setLoading(false)
  }

  function cursosDeCarrera(carrera_id) {
    return carreras.find(c => c.id === parseInt(carrera_id))?.cursos || []
  }

  function agregarAsignacion() {
    setAsignaciones([...asignaciones, { carrera_id: '', curso_id: '', materia: '' }])
  }

  function quitarAsignacion(i) {
    setAsignaciones(asignaciones.filter((_, idx) => idx !== i))
  }

  function updateAsignacion(i, campo, valor) {
    const nueva = [...asignaciones]
    nueva[i] = { ...nueva[i], [campo]: valor }
    if (campo === 'carrera_id') { nueva[i].curso_id = ''; nueva[i].materia = '' }
    if (campo === 'curso_id')   { nueva[i].materia = '' }
    setAsignaciones(nueva)
  }

  async function guardarDocente(e) {
    e.preventDefault()
    setGuardando(true)
    setError('')

    const email = `${form.dni}@iest.edu.ar`

    // 1. Crear en Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: form.dni,
      options: { data: { nombre: form.nombre, apellido: form.apellido } }
    })

    if (authError) { setError(authError.message); setGuardando(false); return }

    const userId = authData.user?.id
    if (!userId) { setError('Error al crear usuario'); setGuardando(false); return }

    // 2. Insertar en users
    await supabase.from('users').insert({
      id: userId, dni: form.dni,
      nombre: form.nombre, apellido: form.apellido,
      email, rol: 'docente'
    })

    // 3. Insertar en teachers
    const primeraAsig = asignaciones[0]
    const carreraNombre = carreras.find(c => c.id === parseInt(primeraAsig.carrera_id))?.nombre || ''
    const cursoNombre   = cursosDeCarrera(primeraAsig.carrera_id).find(c => c.id === parseInt(primeraAsig.curso_id))?.nombre || ''

    const { data: teacher } = await supabase.from('teachers').insert({
      user_id: userId,
      carrera: carreraNombre,
      curso_division: cursoNombre
    }).select().single()

    // 4. Insertar asignaciones múltiples
    if (teacher) {
      const rows = asignaciones
        .filter(a => a.carrera_id && a.curso_id)
        .map(a => ({
          teacher_id: teacher.id,
          carrera_id: parseInt(a.carrera_id),
          curso_id:   parseInt(a.curso_id),
          materia:    a.materia || null
        }))
      if (rows.length) await supabase.from('teacher_carreras').insert(rows)
    }

    setGuardando(false)
    setModalOpen(false)
    setForm({ nombre: '', apellido: '', dni: '', email: '', telefono: '', domicilio: '' })
    setAsignaciones([{ carrera_id: '', curso_id: '', materia: '' }])
    cargarDatos()
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
              <div className="avatar">{d.users?.nombre?.[0]}{d.users?.apellido?.[0]}</div>
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

              {/* Datos personales */}
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Datos personales</p>
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
                <label>Teléfono (opcional)</label>
                <input value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} placeholder="Ej: 3837000000" />
              </div>
              <div className="form-group">
                <label>Domicilio (opcional)</label>
                <input value={form.domicilio} onChange={e => setForm({...form, domicilio: e.target.value})} placeholder="Ej: Av. San Martín 123" />
              </div>

              <div className="divider" />

              {/* Asignaciones */}
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
                Carreras / Cursos / Materias
              </p>

              {asignaciones.map((a, i) => (
                <div key={i} style={{ background: 'var(--color-bg)', borderRadius: 8, padding: 12, marginBottom: 10, border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>Asignación {i + 1}</span>
                    {asignaciones.length > 1 && (
                      <button type="button" onClick={() => quitarAsignacion(i)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', fontSize: 12, cursor: 'pointer' }}>
                        Quitar
                      </button>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Carrera</label>
                    <select value={a.carrera_id} onChange={e => updateAsignacion(i, 'carrera_id', e.target.value)} required>
                      <option value="">— Seleccioná —</option>
                      {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.tipo})</option>)}
                    </select>
                  </div>
                  {a.carrera_id && (
                    <div className="form-group">
                      <label>Curso</label>
                      <select value={a.curso_id} onChange={e => updateAsignacion(i, 'curso_id', e.target.value)} required>
                        <option value="">— Seleccioná —</option>
                        {cursosDeCarrera(a.carrera_id).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                  )}
                  {a.curso_id && (
    <div className="form-group">
      <label>Materia (opcional)</label>
      <select value={a.materia} onChange={e => updateAsignacion(i, 'materia', e.target.value)}>
        <option value="">— Todas las materias del curso —</option>
        {cursosDeCarrera(a.carrera_id)
          .find(c => c.id === parseInt(a.curso_id))
          ?.materias?.map(m => (
            <option key={m.id} value={m.nombre}>{m.nombre}</option>
          ))
        }
      </select>       
    </div>
  )}
                </div>
              ))}

              <button type="button" className="btn btn-ghost btn-block" style={{ marginBottom: 14 }} onClick={agregarAsignacion}>
                + Agregar otra carrera / curso
              </button>

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

      {/* Modal detalle */}
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