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
  const [form, setForm] = useState({
    license_type_id: '',
    fecha_desde: '',
    fecha_hasta: '',
    motivo: ''
  })
  const [diasSolicitados, setDiasSolicitados] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  // Cálculo automático de días
  useEffect(() => {
    if (form.fecha_desde && form.fecha_hasta) {
      const desde = new Date(form.fecha_desde)
      const hasta = new Date(form.fecha_hasta)
      if (desde > hasta) {
        setDiasSolicitados(0)
        return
      }
      const diff = Math.ceil((hasta - desde) / (1000 * 60 * 60 * 24)) + 1
      setDiasSolicitados(diff > 0 ? diff : 0)
    } else {
      setDiasSolicitados(0)
    }
  }, [form.fecha_desde, form.fecha_hasta])

 async function cargarDatos() {
  try {
    setError('')
    setAviso('')

    const userId = user?.id
    console.log('🔍 Buscando docente con user_id:', userId)

    // 🔹 Busca EXACTAMENTE tu código que YA EXISTE
    let { data: t, error: teacherError } = await supabase
      .from('teachers')
      .select('carrera, curso_division')
      .eq('user_id', userId) // TU CÓDIGO EXACTO
      .maybeSingle()

    if (teacherError) throw teacherError

    if (!t) {
      setError('⚠️ No se encontró tu ficha. El código es correcto pero falta permiso.')
      console.log('❌ No se encontró')
      return
    }

    console.log('✅ DOCENTE ENCONTRADO:', t)
    setTeacher(t)

    // 🔹 Cargar tipos de licencia
    const { data: tiposData, error: tiposError } = await supabase
      .from('license_types')
      .select('id, nombre, articulo, categoria_id, license_categories(nombre)')
      .eq('activo', true)
      .order('categoria_id')

    if (tiposError) throw tiposError
    setTipos(tiposData || [])

  } catch (err) {
    console.error('❌ Error:', err)
    setError('Ocurrió un problema: ' + err.message)
  } finally {
    setLoading(false)
  }
}
  async function enviar(e) {
    e.preventDefault()
    setError('')

    if (!form.license_type_id) return setError('Seleccioná un tipo de licencia')
    if (!form.fecha_desde || !form.fecha_hasta) return setError('Completá ambas fechas')
    if (new Date(form.fecha_desde) > new Date(form.fecha_hasta)) {
      return setError('La fecha de inicio no puede ser posterior a la de fin')
    }
    if (diasSolicitados <= 0) return setError('El período solicitado no es válido')
    if (!form.motivo.trim()) return setError('Escribí el motivo de la licencia')

    setEnviando(true)

    try {
      const tipoSeleccionado = tipos.find(t => t.id === Number(form.license_type_id))
      if (!tipoSeleccionado) throw new Error('Tipo de licencia no válido')

      // 🔹 Buscamos tu registro para obtener el ID
      const { data: docenteCompleto } = await supabase
  .from('teachers')
  .select('*')
  .eq('id', 'c64e4443-b6f6-4829-8db5-d0409d036941')
  .single()

      if (!docenteCompleto) throw new Error('No se encontró tu registro de docente')
// Buscamos el campo que SÍ existe en tu tabla
const teacherId = docenteCompleto.teacher_id || docenteCompleto.id
if (!teacherId) {
  console.log('📋 Datos del docente:', docenteCompleto)
  throw new Error('No se pudo identificar tu registro. Revisá la consola.')
}
      // 1. Guardar solicitud
      .insert({
  teacher_id: teacherId,  // ✅ SIN comillas, solo la palabra teacherId
  license_type_id: Number(form.license_type_id),
  fecha_desde: form.fecha_desde,
  fecha_hasta: form.fecha_hasta,
  dias_solicitados: diasSolicitados,
  motivo: form.motivo.trim(),
  estado: 'pendiente'
})
        .select()
        .single()

      if (insertError) throw insertError

      // 2. Generar PDF
      const pdfBytes = await generarAvisoPDF({
        docente: {
          nombre: teacher?.users?.nombre || '',
          apellido: teacher?.users?.apellido || '',
          dni: teacher?.users?.dni || 'Sin DNI',
          carrera: teacher?.carrera || 'Docente',
          curso_division: teacher?.curso_division || ''
        },
        licencia: {
          nombre: tipoSeleccionado.nombre,
          articulo: tipoSeleccionado.articulo || '',
          categoria: tipoSeleccionado.license_categories?.nombre || 'Sin categoría'
        },
        solicitud: {
          ...solicitud,
          created_at: new Date().toISOString()
        }
      })

      // 3. Subir PDF
      const path = `avisos/${solicitud.id}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('licencias-pdf')
        .upload(path, pdfBytes, { contentType: 'application/pdf', upsert: true })

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('licencias-pdf').getPublicUrl(path)
        await supabase.from('license_requests').update({ aviso_pdf_url: urlData.publicUrl }).eq('id', solicitud.id)
      }

      // 4. Descargar y redirigir
      descargarPDF(pdfBytes, `aviso-licencia-${solicitud.id.slice(0, 8)}.pdf`)
      navigate('/docente/historial', { state: { mensaje: '✅ Licencia enviada correctamente' } })

    } catch (err) {
      console.error('❌ Error al enviar:', err)
      setError(err.message || 'No se pudo enviar la solicitud')
    } finally {
      setEnviando(false)
    }
  }

  if (loading) return <div className="loading">⏳ Preparando todo...</div>
  if (error) return <div style={{ padding: 20, color: 'red' }}>❌ {error}</div>

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
        <p>Completá los datos para generar el aviso de licencia</p>
      </div>

      {aviso && <div className="alert info">{aviso}</div>}
      {error && <div className="alert danger">⚠️ {error}</div>}

      <div className="card card-body">
        <form onSubmit={enviando} noValidate>
          <div className="form-group">
            <label>Tipo de licencia *</label>
            <select
              value={form.license_type_id}
              onChange={e => setForm({ ...form, license_type_id: e.target.value })}
              required
            >
              <option value="">— Seleccioná un tipo —</option>
              {Object.entries(porCategoria).map(([cat, lista]) => (
                <optgroup key={cat} label={cat}>
                  {lista.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} {t.articulo ? `(Art. ${t.articulo})` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Fecha Desde *</label>
              <input
                type="date"
                value={form.fecha_desde}
                onChange={e => setForm({ ...form, fecha_desde: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Fecha Hasta *</label>
              <input
                type="date"
                value={form.fecha_hasta}
                onChange={e => setForm({ ...form, fecha_hasta: e.target.value })}
                required
              />
            </div>
          </div>

          {diasSolicitados > 0 && (
            <div className="alert primary" style={{ textAlign: 'center' }}>
              📅 <strong>{diasSolicitados} día{diasSolicitados !== 1 ? 's' : ''}</strong> solicitados
            </div>
          )}

          <div className="form-group">
            <label>Motivo / Observación</label>
            <textarea
              value={form.motivo}
              onChange={e => setForm({ ...form, motivo: e.target.value })}
              placeholder="Describí brevemente el motivo..."
              rows="4"
              required
            />
          </div>

          <div className="alert warning">
            📋 Al enviar se generará automáticamente la nota de aviso en PDF.
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={enviando}
          >
            {enviando ? '⏳ Enviando...' : '✅ Enviar aviso'}
          </button>
        </form>
      </div>
    </div>
  )
}