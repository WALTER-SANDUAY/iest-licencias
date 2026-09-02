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
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    license_type_id: '',
    fecha_desde: '',
    fecha_hasta: '',
    motivo: '',
    complejidad: 'normal'
  })
  const [diasSolicitados, setDiasSolicitados] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    try {
      setLoading(true)
      console.log('🔍 Buscando docente con user_id:', user?.id)

      // 👤 1. Traer datos del docente
      const { data: t, error: teacherError } = await supabase
        .from('teachers')
        .select('id, carrera, curso_division, users(nombre, apellido, dni)')
        .eq('user_id', user?.id)
        .limit(1)

      console.log('📋 Resultado docente:', t, 'Error:', teacherError)

      if (teacherError) {
        console.warn('⚠️ Error buscando docente:', teacherError)
      } else if (!t || t.length === 0) {
        console.warn('⚠️ No se encontró docente')
      } else {
        setTeacher(t[0])
        console.log('✅ Docente cargado:', t[0])
      }

      // 📋 2. Traer tipos de licencia
      const { data: tiposData, error: tiposError } = await supabase
        .from('license_types')
        .select('id, nombre, articulo, categoria_id, tiene_complejidad, license_categories(nombre)')
        .order('categoria_id')

      if (tiposError) throw tiposError
      setTipos(tiposData || [])
      console.log('✅ Tipos de licencia cargados:', tiposData?.length)

    } catch (err) {
      console.error('❌ Error general:', err)
      setError('No se pudieron cargar los datos: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ─── ⭐ CALCULAR DÍAS ───
  useEffect(() => {
    if (!form.fecha_desde || !form.fecha_hasta || !form.license_type_id) {
      setDiasSolicitados(0)
      return
    }

    const tipoSeleccionado = tipos.find(t => String(t.id) === String(form.license_type_id))

    if (tipoSeleccionado?.tiene_complejidad) {
      const reglas = { normal: 10, complicaciones: 15, multiple: 20 }
      setDiasSolicitados(reglas[form.complejidad] || 10)
    } else {
      const desde = new Date(form.fecha_desde)
      const hasta = new Date(form.fecha_hasta)
      if (hasta >= desde) {
        const diff = Math.ceil((hasta - desde) / (1000 * 60 * 60 * 24)) + 1
        setDiasSolicitados(diff)
      } else {
        setDiasSolicitados(0)
      }
    }
  }, [form.fecha_desde, form.fecha_hasta, form.license_type_id, form.complejidad, tipos])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.license_type_id || !form.fecha_desde || !form.fecha_hasta) {
      setError('Completá todos los campos obligatorios')
      return
    }
    if (diasSolicitados <= 0) {
      setError('La fecha de fin debe ser posterior a la de inicio')
      return
    }
    if (!teacher?.id) {
      setError('⚠️ No se encontraron tus datos. Pedí al Rector que te cargue como docente.')
      return
    }

    setEnviando(true)

    try {
      const tipoSeleccionado = tipos.find(t => String(t.id) === String(form.license_type_id))

      // 📄 Generar PDF
      const pdfBytes = await generarAvisoPDF({
        docente: {
          nombre: teacher.users?.nombre || 'Sin nombre',
          apellido: teacher.users?.apellido || 'Sin apellido',
          dni: teacher.users?.dni || '00000000',
          carrera: teacher.carrera || 'Sin carrera',
          curso_division: teacher.curso_division || 'Sin división'
        },
        licencia: {
          nombre: tipoSeleccionado?.nombre || 'Licencia',
          articulo: tipoSeleccionado?.articulo || '—',
          categoria: tipoSeleccionado?.license_categories?.nombre || 'Sin categoría'
        },
        solicitud: {
          fecha_desde: form.fecha_desde,
          fecha_hasta: form.fecha_hasta,
          dias_solicitados: diasSolicitados,
          motivo: form.motivo,
          created_at: new Date().toISOString()
        }
      })

      // 💾 Guardar solicitud en la base de datos
      const solicitud = {
        teacher_id: teacher.id,
        license_type_id: Number(form.license_type_id),
        fecha_desde: form.fecha_desde,
        fecha_hasta: form.fecha_hasta,
        dias_solicitados: diasSolicitados,
        motivo: form.motivo,
        estado: 'pendiente'
      }

      console.log('📤 Guardando solicitud:', solicitud)

      const { error: errorGuardar } = await supabase
        .from('license_requests')
        .insert([solicitud])

      if (errorGuardar) throw errorGuardar

      // ✅ ÉXITO
      descargarPDF(pdfBytes, `Aviso_Licencia_${form.fecha_desde}.pdf`)
      alert('✅ Licencia enviada correctamente. El Rector la revisará.')
      navigate('/docente')

    } catch (err) {
      console.error('❌ Error al enviar:', err)
      setError('Error: ' + (err?.message || 'Desconocido'))
    } finally {
      setEnviando(false)
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>⏳ Cargando...</div>

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: '0 auto' }}>
      <h2>Pedir Licencia</h2>
      <p>Completá los datos para generar el aviso de licencia</p>

      {error && <div style={{ background: '#ffebee', color: '#b71c1c', padding: 12, borderRadius: 6, marginBottom: 16 }}>{error}</div>}

      {!teacher && (
        <div style={{ background: '#fff3e0', padding: 12, borderRadius: 6, marginBottom: 16 }}>
          ⚠️ <strong>No se encontró tu registro de docente.</strong><br/>
          Pedí al Rector que te cargue en el sistema antes de pedir una licencia.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Tipo de Licencia *</label>
          <select
            value={form.license_type_id}
            onChange={e => setForm({ ...form, license_type_id: e.target.value })}
            required
            style={{ width: '100%', padding: 10, fontSize: 16 }}
          >
            <option value="">— Seleccioná un tipo —</option>
            {tipos.map(t => (
              <option key={t.id} value={t.id}>
                {t.nombre} {t.articulo ? `(Art. ${t.articulo})` : ''}
              </option>
            ))}
          </select>
        </div>

        {tipos.find(t => String(t.id) === String(form.license_type_id))?.tiene_complejidad && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Complejidad del nacimiento *</label>
            <select
              value={form.complejidad}
              onChange={e => setForm({ ...form, complejidad: e.target.value })}
              style={{ width: '100%', padding: 10, fontSize: 16 }}
            >
              <option value="normal">Sin complicaciones (10 días)</option>
              <option value="complicaciones">Con complicaciones (15 días)</option>
              <option value="multiple">Nacimiento múltiple (20 días)</option>
            </select>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Fecha Desde *</label>
            <input
              type="date"
              value={form.fecha_desde}
              onChange={e => setForm({ ...form, fecha_desde: e.target.value })}
              required
              style={{ width: '100%', padding: 10, fontSize: 16 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Fecha Hasta *</label>
            <input
              type="date"
              value={form.fecha_hasta}
              onChange={e => setForm({ ...form, fecha_hasta: e.target.value })}
              required
              style={{ width: '100%', padding: 10, fontSize: 16 }}
            />
          </div>
        </div>

        {diasSolicitados > 0 && (
          <div style={{ padding: 12, background: '#fff3e0', borderRadius: 6, margin: '12px 0', fontWeight: 'bold' }}>
            📅 {diasSolicitados} días solicitados
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Motivo / Observación</label>
          <textarea
            rows={4}
            placeholder="Describí brevemente el motivo..."
            value={form.motivo}
            onChange={e => setForm({ ...form, motivo: e.target.value })}
            style={{ width: '100%', padding: 10, fontSize: 16 }}
          />
        </div>

        <div style={{ background: '#e3f2fd', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
          💡 Al enviar se generará automáticamente la nota de aviso en PDF.
        </div>

        <button
          type="submit"
          disabled={enviando || diasSolicitados <= 0}
          style={{ width: '100%', padding: 12, fontSize: 16, backgroundColor: '#1565c0', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          {enviando ? 'Enviando...' : '📤 Enviar Solicitud'}
        </button>
      </form>
    </div>
  )
}