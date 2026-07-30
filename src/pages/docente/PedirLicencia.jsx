import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../context/AuthContext'
import { generarAvisoPDF, descargarPDF } from '../../services/pdf'

export default function PedirLicencia() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [teacher, setTeacher] = useState(null)
  const [tipos, setTipos] = useState([])
  const [form, setForm] = useState({ license_type_id: '', fecha_desde: '', fecha_hasta: '', motivo: '' })
  const [diasSolicitados, setDiasSolicitados] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargarDatos() }, [])

  useEffect(() => {
    if (form.fecha_desde && form.fecha_hasta) {
      const desde = new Date(form.fecha_desde)
      const hasta = new Date(form.fecha_hasta)
      const diff = Math.ceil((hasta - desde) / (1000 * 60 * 60 * 24)) + 1
      setDiasSolicitados(diff > 0 ? diff : 0)
    }
  }, [form.fecha_desde, form.fecha_hasta])

  async function cargarDatos() {
    const { data: t } = await supabase
      .from('teachers')
      .select('id, carrera, curso_division, users(nombre, apellido, dni)')
      .eq('user_id', user.id)
      .single()
    setTeacher(t)

    const { data: tiposData } = await supabase
      .from('license_types')
      .select('id, nombre, articulo, categoria_id, license_categories(nombre)')
      .eq('activo', true)
      .order('categoria_id')
    setTipos(tiposData || [])
    setLoading(false)
  }

  async function enviar(e) {
    e.preventDefault()
    if (diasSolicitados <= 0) { setError('Las fechas no son válidas'); return }
    setError('')
    setEnviando(true)

    // 1. Insertar solicitud
    const tipoSeleccionado = tipos.find(t => t.id === parseInt(form.license_type_id))

    const { data: solicitud, error: insertError } = await supabase
      .from('license_requests')
      .insert({
        teacher_id: teacher.id,
        license_type_id: parseInt(form.license_type_id),
        fecha_desde: form.fecha_desde,
        fecha_hasta: form.fecha_hasta,
        dias_solicitados: diasSolicitados,
        motivo: form.motivo,
        estado: 'pendiente'
      })
      .select()
      .single()

    if (insertError) { setError(insertError.message); setEnviando(false); return }

    // 2. Generar PDF del aviso
    const pdfBytes = await generarAvisoPDF({
      docente: {
        nombre: teacher.users.nombre,
        apellido: teacher.users.apellido,
        dni: teacher.users.dni,
        carrera: teacher.carrera,
        curso_division: teacher.curso_division
      },
      licencia: {
        nombre: tipoSeleccionado.nombre,
        articulo: tipoSeleccionado.articulo,
        categoria: tipoSeleccionado.license_categories?.nombre || ''
      },
      solicitud: {
        ...solicitud,
        created_at: new Date().toISOString()
      }
    })

    // 3. Subir PDF a Supabase Storage
    const path = `avisos/${solicitud.id}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('licencias-pdf')
      .upload(path, pdfBytes, { contentType: 'application/pdf', upsert: true })

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('licencias-pdf').getPublicUrl(path)
      await supabase.from('license_requests').update({ aviso_pdf_url: urlData.publicUrl }).eq('id', solicitud.id)
    }

    // 4. Descargar PDF en el dispositivo
    descargarPDF(pdfBytes, `aviso-licencia-${solicitud.id.slice(0,8)}.pdf`)

    setEnviando(false)
    navigate('/docente/historial')
  }

  if (loading) return <div className="loading">⏳ Cargando...</div>

  const porCategoria = tipos.reduce((acc, t) => {
    const cat = t.license_categories?.nombre || 'Otros'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(t)
    return acc
  }, {})

  return (
    <div>
      <div className="page-header">
        <h1>Pedir Licencia</h1>
        <p>Etapa 1 — Completá el aviso</p>
      </div>

      <div className="card card-body">
        <form onSubmit={enviar}>
          <div className="form-group">
            <label>Tipo de licencia</label>
            <select
              value={form.license_type_id}
              onChange={e => setForm({...form, license_type_id: e.target.value})}
              required
            >
              <option value="">— Seleccioná —</option>
              {Object.entries(porCategoria).map(([cat, tipos]) => (
                <optgroup key={cat} label={cat}>
                  {tipos.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} ({t.articulo})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Desde</label>
              <input
                type="date"
                value={form.fecha_desde}
                onChange={e => setForm({...form, fecha_desde: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Hasta</label>
              <input
                type="date"
                value={form.fecha_hasta}
                onChange={e => setForm({...form, fecha_hasta: e.target.value})}
                required
              />
            </div>
          </div>

          {diasSolicitados > 0 && (
            <div className="alert primary" style={{ textAlign: 'center' }}>
              📅 <strong>{diasSolicitados} días</strong> solicitados
            </div>
          )}

          <div className="form-group">
            <label>Motivo / Observación</label>
            <textarea
              value={form.motivo}
              onChange={e => setForm({...form, motivo: e.target.value})}
              placeholder="Describí brevemente el motivo..."
              required
            />
          </div>

          {error && <div className="alert danger">{error}</div>}

          <div className="alert warning">
            📋 Al enviar se generará automáticamente la nota de aviso en PDF. Luego deberás volver a cargar el justificativo.
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
            {enviando ? 'Generando PDF y enviando...' : 'Enviar aviso →'}
          </button>
        </form>
      </div>
    </div>
  )
}