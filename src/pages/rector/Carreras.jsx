import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'

export default function Carreras() {
  const [carreras, setCarreras] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalCarrera, setModalCarrera] = useState(false)
  const [modalCurso, setModalCurso] = useState(false)
  const [modalMateria, setModalMateria] = useState(false)
  const [carreraSeleccionada, setCarreraSeleccionada] = useState(null)
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null)
  const [editando, setEditando] = useState(null)
  const [formCarrera, setFormCarrera] = useState({ nombre: '', tipo: 'Tecnicatura' })
  const [formCurso, setFormCurso] = useState({ nombre: '' })
  const [formMateria, setFormMateria] = useState({ nombre: '' })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    const { data } = await supabase
      .from('carreras')
      .select(`
        id, nombre, tipo, activo,
        cursos (
          id, nombre, activo,
          materias ( id, nombre, activo )
        )
      `)
      .order('nombre')
    setCarreras(data || [])
    setLoading(false)
  }

  async function guardarCarrera(e) {
    e.preventDefault()
    setGuardando(true)
    if (editando) {
      await supabase.from('carreras').update({ nombre: formCarrera.nombre, tipo: formCarrera.tipo }).eq('id', editando.id)
    } else {
      await supabase.from('carreras').insert({ nombre: formCarrera.nombre, tipo: formCarrera.tipo })
    }
    setGuardando(false)
    setModalCarrera(false)
    setEditando(null)
    setFormCarrera({ nombre: '', tipo: 'Tecnicatura' })
    cargarDatos()
  }

  async function guardarCurso(e) {
    e.preventDefault()
    setGuardando(true)
    await supabase.from('cursos').insert({ nombre: formCurso.nombre, carrera_id: carreraSeleccionada.id })
    setGuardando(false)
    setModalCurso(false)
    setFormCurso({ nombre: '' })
    cargarDatos()
  }

  async function guardarMateria(e) {
    e.preventDefault()
    setGuardando(true)
    await supabase.from('materias').insert({ nombre: formMateria.nombre, curso_id: cursoSeleccionado.id })
    setGuardando(false)
    setModalMateria(false)
    setFormMateria({ nombre: '' })
    cargarDatos()
  }

  async function toggleActivo(tabla, id, valor) {
    await supabase.from(tabla).update({ activo: !valor }).eq('id', id)
    cargarDatos()
  }

  const tipoBadge = { Tecnicatura: 'info', Profesorado: 'warning', Grado: 'success' }

  if (loading) return <div className="loading">⏳ Cargando...</div>

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h1>Carreras y Cursos</h1>
          <p>Estructura académica del IEST</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditando(null); setFormCarrera({ nombre: '', tipo: 'Tecnicatura' }); setModalCarrera(true) }}>
          + Carrera
        </button>
      </div>

      {carreras.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🎓</div>
          <p>No hay carreras cargadas aún</p>
        </div>
      ) : (
        carreras.map(c => (
          <div key={c.id} style={{ marginBottom: 20 }}>
            <div className="card">
              <div className="card-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 style={{ fontSize: 14 }}>{c.nombre}</h2>
                    <span className={`tag ${tipoBadge[c.tipo] || 'info'}`}>{c.tipo}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                    {c.cursos?.length || 0} cursos
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditando(c); setFormCarrera({ nombre: c.nombre, tipo: c.tipo }); setModalCarrera(true) }}>
                    Editar
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => { setCarreraSeleccionada(c); setModalCurso(true) }}>
                    + Curso
                  </button>
                </div>
              </div>

              {/* Cursos y materias */}
              {c.cursos?.length === 0 ? (
                <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--color-muted)' }}>Sin cursos cargados</div>
              ) : (
                c.cursos?.map(curso => (
                  <div key={curso.id}>
                    {/* Fila del curso */}
                    <div className="list-row" style={{ background: '#FAFAFA' }}>
                      <div className="list-row-info">
                        <div className="list-row-title" style={{ opacity: curso.activo ? 1 : .4 }}>
                          📚 {curso.nombre}
                        </div>
                        <div className="list-row-sub">{curso.materias?.length || 0} materias</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setCursoSeleccionado(curso); setModalMateria(true) }}>
                          + Materia
                        </button>
                        <button className={`btn btn-sm ${curso.activo ? 'btn-ghost' : 'btn-primary'}`} onClick={() => toggleActivo('cursos', curso.id, curso.activo)}>
                          {curso.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </div>

                    {/* Materias del curso */}
                    {curso.materias?.map(m => (
                      <div key={m.id} className="list-row" style={{ paddingLeft: 32 }}>
                        <div className="list-row-info">
                          <div className="list-row-title" style={{ fontSize: 12, opacity: m.activo ? 1 : .4 }}>
                            · {m.nombre}
                          </div>
                        </div>
                        <button className={`btn btn-sm ${m.activo ? 'btn-ghost' : 'btn-primary'}`} onClick={() => toggleActivo('materias', m.id, m.activo)}>
                          {m.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        ))
      )}

      {/* Modal carrera */}
      {modalCarrera && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setModalCarrera(false)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-header">
              <h2>{editando ? 'Editar Carrera' : 'Nueva Carrera'}</h2>
              <button className="modal-close" onClick={() => setModalCarrera(false)}>✕</button>
            </div>
            <form onSubmit={guardarCarrera}>
              <div className="form-group">
                <label>Nombre</label>
                <input value={formCarrera.nombre} onChange={e => setFormCarrera({...formCarrera, nombre: e.target.value})} placeholder="Ej: Desarrollo de Software" required />
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select value={formCarrera.tipo} onChange={e => setFormCarrera({...formCarrera, tipo: e.target.value})}>
                  <option>Tecnicatura</option>
                  <option>Profesorado</option>
                  <option>Grado</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModalCarrera(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal curso */}
      {modalCurso && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setModalCurso(false)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-header">
              <h2>Nuevo Curso</h2>
              <button className="modal-close" onClick={() => setModalCurso(false)}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 14 }}>
              Carrera: <strong>{carreraSeleccionada?.nombre}</strong>
            </p>
            <form onSubmit={guardarCurso}>
              <div className="form-group">
                <label>Nombre del curso</label>
                <input value={formCurso.nombre} onChange={e => setFormCurso({ nombre: e.target.value })} placeholder="Ej: 1° Año A" required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModalCurso(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal materia */}
      {modalMateria && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setModalMateria(false)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-header">
              <h2>Nueva Materia</h2>
              <button className="modal-close" onClick={() => setModalMateria(false)}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 14 }}>
              Curso: <strong>{cursoSeleccionado?.nombre}</strong>
            </p>
            <form onSubmit={guardarMateria}>
              <div className="form-group">
                <label>Nombre de la materia</label>
                <input value={formMateria.nombre} onChange={e => setFormMateria({ nombre: e.target.value })} placeholder="Ej: Programación I" required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModalMateria(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}