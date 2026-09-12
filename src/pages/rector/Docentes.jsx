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
    nombre: '', apellido: '', dni: '',
    telefono: '', domicilio: '', cargo: 'Docente',
    horas_titulares: 0,           // ✅ NUEVO
    disponibilidad: 'Completa'    // ✅ NUEVO
  })

  const [asignaciones, setAsignaciones] = useState([
    { carrera_id: '', curso_id: '', materia: '' }
  ])

  useEffect(() => { cargarTodo() }, [])

  async function cargarTodo() {
    try {
      setLoading(true)
      setError('')

      const { data: doc } = await supabase.from('teachers').select('*').order('apellido', { ascending: true })
      setDocentes(doc || [])

      const { data: carr } = await supabase.from('carreras').select('*').order('nombre')
      setCarreras(carr || [])

    } catch (err) {
      setError('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  async function guardarDocente(e) {
    e.preventDefault()
    setGuardando(true)
    setError('')

    try {
      // 1. Crear usuario en auth
      const correo = `${form.dni}@iest.edu.ar`
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: correo,
        password: form.dni,
        email_confirm: true
      })

      if (authErr) throw authErr
      const newId = authData.user.id

      // 2. Guardar datos del docente
      const { data: teacher, error: insertErr } = await supabase.from('teachers').insert({
        user_id: newId,
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        dni: form.dni.trim(),
        telefono: form.telefono?.trim() || null,
        domicilio: form.domicilio?.trim() || null,
        cargo: form.cargo,
        horas_titulares: form.horas_titulares || 0,      // ✅ NUEVO
        disponibilidad: form.disponibilidad || 'Completa' // ✅ NUEVO
      }).select().single()

      if (insertErr) throw insertErr

      // 3. Guardar asignaciones (si hay)
      const asignacionesValidas = asignaciones.filter(a => a.carrera_id || a.materia)
      if (asignacionesValidas.length > 0) {
        const paraGuardar = asignacionesValidas.map(a => ({
          teacher_id: teacher.id,
          carrera_id: a.carrera_id || null,
          curso_division: a.curso_id?.trim() || null,
          materia: a.materia?.trim() || null
        }))
        await supabase.from('asignaciones').insert(paraGuardar)
      }

      // ✅ Limpiar formulario
      setForm({
        nombre: '', apellido: '', dni: '',
        telefono: '', domicilio: '', cargo: 'Docente',
        horas_titulares: 0,
        disponibilidad: 'Completa'
      })
      setAsignaciones([{ carrera_id: '', curso_id: '', materia: '' }])
      setModalOpen(false)
      cargarTodo()

    } catch (err) {
      console.error(err)
      setError(err.message || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  function agregarAsignacion() {
    setAsignaciones([...asignaciones, { carrera_id: '', curso_id: '', materia: '' }])
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Gestión de Docentes y Personal</h2>
        <button
          onClick={() => setModalOpen(true)}
          style={{ padding: '10px 20px', background: '#8B0000', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '15px' }}
        >
          + Nuevo Personal
        </button>
      </div>

      {error && <div style={{ color: 'red', padding: '10px', background: '#ffebee', borderRadius: '4px', marginBottom: '15px' }}>{error}</div>}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead style={{ background: '#f3f4f6' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Apellido y Nombre</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>DNI</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Cargo</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Horas</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Disponibilidad</th>
            </tr>
          </thead>
          <tbody>
            {docentes.map(d => (
              <tr key={d.id}>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{d.apellido}, {d.nombre}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{d.dni}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{d.cargo}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{d.horas_titulares || 0} hs</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{d.disponibilidad || 'Completa'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* MODAL — FORMULARIO */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '10px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Cargar Nuevo Personal</h3>

            <form onSubmit={guardarDocente}>
              <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label>Nombre</label>
                  <input
                    type="text" required
                    value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                    style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label>Apellido</label>
                  <input
                    type="text" required
                    value={form.apellido}
                    onChange={e => setForm({ ...form, apellido: e.target.value })}
                    style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label>DNI</label>
                  <input
                    type="text" required
                    value={form.dni}
                    onChange={e => setForm({ ...form, dni: e.target.value })}
                    style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label>Teléfono</label>
                  <input
                    type="text"
                    value={form.telefono}
                    onChange={e => setForm({ ...form, telefono: e.target.value })}
                    style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label>Domicilio</label>
                  <input
                    type="text"
                    value={form.domicilio}
                    onChange={e => setForm({ ...form, domicilio: e.target.value })}
                    style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label>Cargo / Función</label>
                  <select
                    value={form.cargo}
                    onChange={e => setForm({ ...form, cargo: e.target.value })}
                    style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    <option value="Docente">Docente</option>
                    <option value="Rector">Rector</option>
                    <option value="Secretario Académico">Secretario Académico</option>
                    <option value="Bedel">Bedel</option>
                    <option value="Personal de Maestranza">Personal de Maestranza</option>
                    <option value="Secretario Administrativo">Secretario Administrativo</option>
                    <option value="Coordinador de Carrera">Coordinador de Carrera</option>
                  </select>
                </div>

                {/* ✅ NUEVO: HORAS TITULARES */}
                <div>
                  <label>Horas Titulares</label>
                  <input
                    type="number" min="0" max="50"
                    value={form.horas_titulares || 0}
                    onChange={e => setForm({ ...form, horas_titulares: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                    placeholder="Ej: 20"
                  />
                </div>

                {/* ✅ NUEVO: DISPONIBILIDAD */}
                <div>
                  <label>Disponibilidad</label>
                  <select
                    value={form.disponibilidad || 'Completa'}
                    onChange={e => setForm({ ...form, disponibilidad: e.target.value })}
                    style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    <option value="Completa">Completa</option>
                    <option value="Parcial">Parcial</option>
                    <option value="Mañana">Turno Mañana</option>
                    <option value="Tarde">Turno Tarde</option>
                    <option value="Reducida">Reducida</option>
                  </select>
                </div>

                <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #eee' }} />

                <h4 style={{ margin: '5px 0 10px 0' }}>Asignación a Carrera / Materia (opcional)</h4>

                {asignaciones.map((a, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '12px' }}>Carrera</label>
                      <select
                        value={a.carrera_id}
                        onChange={e => {
                          const nueva = [...asignaciones]
                          nueva[idx].carrera_id = e.target.value
                          setAsignaciones(nueva)
                        }}
                        style={{ width: '100%', padding: '6px', marginTop: '2px', border: '1px solid #ccc', borderRadius: '4px' }}
                      >
                        <option value="">Seleccionar</option>
                        {carreras.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px' }}>Curso / División</label>
                      <input
                        type="text"
                        value={a.curso_id}
                        onChange={e => {
                          const nueva = [...asignaciones]
                          nueva[idx].curso_id = e.target.value
                          setAsignaciones(nueva)
                        }}
                        style={{ width: '100%', padding: '6px', marginTop: '2px', border: '1px solid #ccc', borderRadius: '4px' }}
                        placeholder="Ej: 1° 1ra"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px' }}>Materia</label>
                      <input
                        type="text"
                        value={a.materia}
                        onChange={e => {
                          const nueva = [...asignaciones]
                          nueva[idx].materia = e.target.value
                          setAsignaciones(nueva)
                        }}
                        style={{ width: '100%', padding: '6px', marginTop: '2px', border: '1px solid #ccc', borderRadius: '4px' }}
                        placeholder="Ej: Programación"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={agregarAsignacion}
                  style={{ padding: '6px 12px', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                >
                  + Agregar otra carrera/materia
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '10px 20px', background: '#e5e7eb', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  style={{ padding: '10px 20px', background: guardando ? '#999' : '#8B0000', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  {guardando ? 'Guardando...' : '✅ Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}