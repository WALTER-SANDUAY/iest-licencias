import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'

export default function TiposLicencia() {
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '', articulo: '', categoria_id: '', dias_totales: '' })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    const { data } = await supabase
      .from('license_categories')
      .select(`id, nombre, license_types ( id, nombre, articulo, dias_totales, activo )`)
      .order('id')
    setCategorias(data || [])
    setLoading(false)
  }

  function abrirNuevo() {
    setEditando(null)
    setForm({ nombre: '', descripcion: '', articulo: '', categoria_id: '', dias_totales: '' })
    setModalOpen(true)
  }

  function abrirEditar(tipo) {
    setEditando(tipo)
    setForm({
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || '',
      articulo: tipo.articulo,
      categoria_id: tipo.categoria_id || '',
      dias_totales: tipo.dias_totales || ''
    })
    setModalOpen(true)
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)

    const datos = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      articulo: form.articulo,
      categoria_id: parseInt(form.categoria_id),
      dias_totales: form.dias_totales ? parseInt(form.dias_totales) : null
    }

    if (editando) {
      await supabase.from('license_types').update(datos).eq('id', editando.id)
    } else {
      await supabase.from('license_types').insert(datos)
    }

    setGuardando(false)
    setModalOpen(false)
    cargarDatos()
  }

  async function toggleActivo(tipo) {
    await supabase.from('license_types').update({ activo: !tipo.activo }).eq('id', tipo.id)
    cargarDatos()
  }

  if (loading) return <div className="loading">⏳ Cargando...</div>

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h1>Tipos de Licencia</h1>
          <p>Según Boletín Oficial de Catamarca</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={abrirNuevo}>+ Nueva</button>
      </div>

      {categorias.map(cat => (
        <div key={cat.id} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--color-muted)', marginBottom: 8 }}>
            {cat.nombre}
          </div>
          <div className="card">
            {cat.license_types?.map(tipo => (
              <div key={tipo.id} className="list-row">
                <div className="list-row-info">
                  <div className="list-row-title" style={{ opacity: tipo.activo ? 1 : .4 }}>
                    {tipo.nombre}
                  </div>
                  <div className="list-row-sub">
                    {tipo.articulo} {tipo.dias_totales ? `· ${tipo.dias_totales} días` : '· Días a definir'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(tipo)}>Editar</button>
                  <button
                    className={`btn btn-sm ${tipo.activo ? 'btn-ghost' : 'btn-primary'}`}
                    onClick={() => toggleActivo(tipo)}
                  >
                    {tipo.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {modalOpen && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-header">
              <h2>{editando ? 'Editar Licencia' : 'Nueva Licencia'}</h2>
              <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={guardar}>
              <div className="form-group">
                <label>Nombre</label>
                <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Artículo</label>
                <input value={form.articulo} onChange={e => setForm({...form, articulo: e.target.value})} placeholder="Ej: Art. 27" required />
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <select value={form.categoria_id} onChange={e => setForm({...form, categoria_id: e.target.value})} required>
                  <option value="">— Seleccioná —</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Días totales (opcional)</label>
                <input type="number" value={form.dias_totales} onChange={e => setForm({...form, dias_totales: e.target.value})} placeholder="Dejar vacío si varía" />
              </div>
              <div className="form-group">
                <label>Descripción (opcional)</label>
                <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} />
              </div>
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
    </div>
  )
}