// ══════════════════════════════════════════════════════════
// PEDIR LICENCIA — Formulario para que el docente solicite permisos
// ══════════════════════════════════════════════════════════

// Importamos las herramientas que necesitamos
import { useEffect, useState } from 'react'          // Herramientas de React
import { useNavigate } from 'react-router-dom'       // Para cambiar de pantalla al terminar
import { supabase } from '../../services/supabase'   // Conexión con la base de datos
import { useAuth } from '../../context/AuthContext'   // Saber quién es el docente conectado
import { generarAvisoPDF, descargarPDF } from '../../services/pdf' // Para crear el PDF

// Componente PRINCIPAL: todo lo que se ve y hace en esta pantalla
export default function PedirLicencia() {

  // ─── DATOS DEL USUARIO CONECTADO ───
  const { user } = useAuth()                    // Quién está conectado ahora
  const navigate = useNavigate()                // Herramienta para ir a otra pantalla

  // ─── GUARDAR DATOS EN MEMORIA ───
  // Estos son "cajitas" donde guardamos información mientras funciona la pantalla
  const [teacher, setTeacher] = useState(null)               // Datos del docente
  const [tipos, setTipos] = useState([])                     // Tipos de licencia disponibles
  const [enviando, setEnviando] = useState(false)            // Si está enviando el formulario
  const [error, setError] = useState('')                     // Mensajes de error si algo falla
  const [loading, setLoading] = useState(true)               // Si está cargando datos

  // 📋 DATOS DEL FORMULARIO: lo que el docente va escribiendo
  const [form, setForm] = useState({
    license_type_id: '',    // → Qué tipo de licencia eligió
    fecha_desde: '',        // → Empieza cuándo
    fecha_hasta: '',        // → Termina cuándo
    motivo: '',             // → Por qué
    complejidad: ''         // ⭐ NUEVO: Solo para Paternidad: normal / complicaciones / múltiple
  })

  // 📅 Cantidad de días que se piden (se calcula automáticamente)
  const [diasSolicitados, setDiasSolicitados] = useState(0)


  // ─── AL INICIAR LA PANTALLA ───
  // Cuando se abre esta pantalla, cargamos los datos del docente y las licencias
  useEffect(() => {
    cargarDatos()  // Llamamos a la función que está más abajo
  }, [])           // Los "[]" significan: solo hacer esto UNA VEZ al abrir la pantalla


  // ─── ⭐ CALCULAR LOS DÍAS SEGÚN EL TIPO DE LICENCIA ───
  // Esta función se ejecuta cada vez que cambia algo en el formulario
  useEffect(() => {

    // 🔎 Buscamos qué tipo de licencia tiene seleccionada el docente
    const tipoSeleccionado = tipos.find(t => t.id === Number(form.license_type_id))

    // ✅ SI ES LICENCIA DE PATERNIDAD → usar días según la complejidad
    if (tipoSeleccionado?.tiene_complejidad) {
      // Reglas: según lo que eligió → cantidad de días
      const reglas = {
        normal: 10,          // Sin complicaciones → 10 días
        complicaciones: 15,  // Con complicaciones → 15 días
        multiple: 20         // Mellizos/trillizos → 20 días
      }
      // Tomar los días según la opción elegida, o 0 si nada elegido
      const dias = reglas[form.complejidad] || 0
      setDiasSolicitados(dias)
    }

    // ✅ SI ES CUALQUIER OTRA LICENCIA → calcular días entre fechas
    else if (form.fecha_desde && form.fecha_hasta) {
      const desde = new Date(form.fecha_desde)   // Convertir texto a fecha real
      const hasta = new Date(form.fecha_hasta)

      // Si la fecha de inicio es DESPUÉS de la de fin → error
      if (desde > hasta) {
        setDiasSolicitados(0)
        return
      }

      // Calcular la diferencia en días: convertir milisegundos a días
      const diferenciaEnMs = hasta - desde
      const diasTotales = Math.ceil(diferenciaEnMs / (1000 * 60 * 60 * 24)) + 1
      setDiasSolicitados(diasTotales > 0 ? diasTotales : 0)
    }
    else {
      // Si faltan fechas → mostrar 0 días
      setDiasSolicitados(0)
    }

  // ↩️ Recalcular automáticamente si cambia alguno de estos valores
  }, [form.license_type_id, form.fecha_desde, form.fecha_hasta, form.complejidad, tipos])


  // ─── CARGAR DATOS DESDE LA BASE DE DATOS ───
  // Trae la información del docente y los tipos de licencia al abrir la pantalla
  async function cargarDatos() {
    try {
      // 👤 1. Traer los datos del docente conectado
      const { data: t, error: teacherError } = await supabase
        .from('teachers')
        .select('id, carrera, curso_division, users(nombre, apellido, dni)')
        .eq('user_id', user.id)
        .single()

      if (teacherError) throw teacherError  // Si falla, avisar
      setTeacher(t)  // Guardar datos del docente

      // 📋 2. Traer TODOS los TIPOS DE LICENCIA (incluye la de Paternidad)
      // ⭐ IMPORTANTE: agregamos "tiene_complejidad" para reconocer Paternidad
      const { data: tiposData, error: tiposError } = await supabase
        .from('license_types')
        .select('id, nombre, articulo, categoria_id, tiene_complejidad, license_categories(nombre)')
        .eq('activo', true)           // Solo los que están disponibles
        .order('categoria_id')         // Ordenarlos por categoría

      if (tiposError) throw tiposError
      setTipos(tiposData || [])  // Guardar lista de licencias

      // 🧪 Mensaje en consola: confirmar que Paternidad está cargada
      const paternidadCargada = tiposData?.find(t => t.nombre?.toLowerCase().includes('paternidad'))
      if (paternidadCargada) {
        console.log('✅ Licencia de Paternidad cargada:', paternidadCargada)
      } else {
        console.warn('⚠️ No se encontró Licencia de Paternidad en la base')
      }

    } catch (err) {
      // ❌ Si algo falló al cargar
      setError('No se pudieron cargar los datos: ' + err.message)
    } finally {
      // ✅ Sea como sea, terminamos de cargar
      setLoading(false)
    }
  }


  // ─── ENVIAR EL FORMULARIO ───
  // Se ejecuta cuando el docente aprieta el botón "Enviar aviso"
  async function enviar(e) {
    e.preventDefault()  // Evitar que la página se recargue sola
    setError('')        // Borrar mensajes de error anteriores

    // ✅ VALIDACIONES: revisar que todo esté completo y correcto
    if (!form.license_type_id) return setError('Seleccioná un tipo de licencia')
    if (!form.fecha_desde || !form.fecha_hasta) return setError('Completá ambas fechas')
    if (new Date(form.fecha_desde) > new Date(form.fecha_hasta)) {
      return setError('La fecha de inicio no puede ser posterior a la de fin')
    }
    if (diasSolicitados <= 0) return setError('El período solicitado no es válido')
    if (!form.motivo.trim()) return setError('Escribí el motivo de la licencia')

    // ✅ Todo está bien → empezamos a enviar
    setEnviando(true)

    try {
      // 🔎 Saber qué licencia eligió
      const tipoSeleccionado = tipos.find(t => t.id === Number(form.license_type_id))
      if (!tipoSeleccionado) throw new Error('Tipo de licencia no válido')

      // 📝 PASO 1: Guardar la solicitud en la base de datos
      const { data: solicitud, error: insertError } = await supabase
        .from('license_requests')
        .insert({
          teacher_id: teacher.id,
          license_type_id: Number(form.license_type_id),
          fecha_desde: form.fecha_desde,
          fecha_hasta: form.fecha_hasta,
          dias_solicitados: diasSolicitados,
          motivo: form.motivo.trim(),
          complejidad: form.complejidad, // ⭐ Guardamos qué opción eligió en Paternidad
          estado: 'pendiente'
        })
        .select()
        .single()

      if (insertError) throw insertError

      // 📄 PASO 2: Crear el PDF con el aviso de licencia
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
          categoria: tipoSeleccionado.license_categories?.nombre || 'Sin categoría'
        },
        solicitud: {
          ...solicitud,
          created_at: new Date().toISOString()
        }
      })

      // ☁️ PASO 3: Subir el PDF a Supabase para guardarlo
      const path = `avisos/${solicitud.id}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('licencias-pdf')
        .upload(path, pdfBytes, { contentType: 'application/pdf', upsert: true })

      // 🔗 Si se subió bien, guardamos el enlace al PDF en la base
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('licencias-pdf').getPublicUrl(path)
        await supabase
          .from('license_requests')
          .update({ aviso_pdf_url: urlData.publicUrl })
          .eq('id', solicitud.id)
      }

      // 💾 PASO 4: Descargar el PDF y volver al historial
      descargarPDF(pdfBytes, `aviso-licencia-${solicitud.id.slice(0, 8)}.pdf`)
      navigate('/docente/historial', { state: { mensaje: '✅ Licencia enviada correctamente' } })

    } catch (err) {
      // ❌ Si algo falló al enviar
      setError(err.message || 'Ocurrió un error al enviar la solicitud')
    } finally {
      // ✅ Terminamos de enviar
      setEnviando(false)
    }
  }


  // ─── MIENTRAS CARGA TODO ───
  if (loading) return <div className="loading">⏳ Cargando datos...</div>


  // ─── AGRUPAR LICENCIAS POR CATEGORÍA ───
  // Organizamos las licencias para que aparezcan agrupadas en el menú
  const porCategoria = tipos.reduce((acc, t) => {
    const cat = t.license_categories?.nombre || 'Otros'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(t)
    return acc
  }, {})


  // ══════════════════════════════════════════
  // LO QUE SE VE EN LA PANTALLA (EL FORMULARIO)
  // ══════════════════════════════════════════
  return (
    <div>
      {/* 📌 Título de la pantalla */}
      <div className="page-header">
        <h1>Pedir Licencia</h1>
        <p>Completá los datos para generar el aviso de licencia</p>
      </div>

      {/* 📋 Tarjeta con el formulario */}
      <div className="card card-body">
        <form onSubmit={enviar} noValidate>

          {/* 🔽 MENÚ: Elegir tipo de licencia */}
          <div className="form-group">
            <label>Tipo de licencia</label>
            <select
              value={form.license_type_id}
              onChange={e => setForm({ ...form, license_type_id: e.target.value, complejidad: '' })}
              required
            >
              <option value="">— Seleccioná un tipo —</option>
              {/* Mostrar licencias agrupadas por categoría */}
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

          {/* 📅 FECHAS: Desde / Hasta */}
          <div className="form-row">
            <div className="form-group">
              <label>Fecha desde</label>
              <input
                type="date"
                value={form.fecha_desde}
                onChange={e => setForm({ ...form, fecha_desde: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Fecha hasta</label>
              <input
                type="date"
                value={form.fecha_hasta}
                onChange={e => setForm({ ...form, fecha_hasta: e.target.value })}
                required
              />
            </div>
          </div>

          {/* ⭐ SELECTOR DE COMPLEJIDAD: SOLO APARECE SI ES PATERNIDAD */}
          {tipos.find(t => t.id === Number(form.license_type_id))?.tiene_complejidad && (
            <div className="form-group">
              <label>Situación del nacimiento</label>
              <select
                value={form.complejidad}
                onChange={e => setForm({ ...form, complejidad: e.target.value })}
                required
              >
                <option value="">— Seleccioná situación —</option>
                <option value="normal">✅ Sin complicaciones → 10 días</option>
                <option value="complicaciones">⚠️ Con complicaciones / internación → 15 días</option>
                <option value="multiple">👶👶 Múltiple → 20 días</option>
              </select>
            </div>
          )}

          {/* 📅 MOSTRAR DÍAS CALCULADOS */}
          {diasSolicitados > 0 && (
            <div className="alert primary" style={{ textAlign: 'center' }}>
              📅 <strong>{diasSolicitados} día{diasSolicitados !== 1 ? 's' : ''}</strong> solicitados
            </div>
          )}

          {/* ✍️ MOTIVO */}
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

          {/* ⚠️ MENSAJES DE ERROR */}
          {error && <div className="alert danger">⚠️ {error}</div>}

          {/* 💡 AVISO */}
          <div className="alert warning">
            📋 Al enviar se generará automáticamente la nota de aviso en PDF con los datos correspondientes.
          </div>

          {/* ✅ BOTÓN ENVIAR */}
          <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
            {enviando ? '⏳ Enviando...' : '✅ Enviar aviso'}
          </button>
        </form>
      </div>
    </div>
  )
}