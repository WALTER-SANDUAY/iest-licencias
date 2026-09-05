import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
export default function Solicitudes() {
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detalle, setDetalle] = useState(null)
  const [diasConfirmados, setDiasConfirmados] = useState('')
  const [observacion, setObservacion] = useState('')
  const [guardando, setGuardando] = useState(false)
  useEffect(() => { cargarSolicitudes() }, [])
  async function cargarSolicitudes() {
    try {
      setLoading(true)
      setError('')
      const { data, error: err } = await supabase
        .from('license_requests')
        .select(`
          id, estado, fecha_desde, fecha_hasta, dias_solicitados,
          dias_confirmados, motivo, observacion_rector,
          aviso_pdf_url, justificativo_pdf_url, pdf_final_url, created_at,
          teachers ( carrera, curso_division, users ( nombre, apellido, dni ) ),
          license_types ( nombre, articulo )
        `)
        .order('created_at', { ascending: false })
      if (err) throw err
      setSolicitudes(data || [])
    } catch (err) {
      console.error('❌ Error cargando solicitudes:', err)
      setError('No se pudieron cargar las solicitudes: ' + err.message)
    } finally {
      setLoading(false)
    }
  }
  async function cambiarEstado(id, estado, dias = null, obs = null) {
    try {
      setGuardando(true)
      const update = { estado }
      if (dias) update.dias_confirmados = parseInt(dias)
      if (obs) update.observacion_rector = obs
      const { error: err } = await supabase
        .from('license_requests')
        .update(update)
        .eq('id', id)
      if (err) throw err
      setDetalle(null)
      await cargarSolicitudes()
      alert('✅ Cambio guardado correctamente')
    } catch (err) {
      console.error('❌ Error al guardar:', err)
      alert('❌ No se pudo guardar: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }
  // 🖨️ FUNCIÓN DE IMPRESIÓN AGREGADA
  function imprimirSolicitud(sol) {
    const docente = sol.teachers?.users || {}
    const tipo = sol.license_types || {}
    const ventana = window.open('', '_blank')
    ventana.document.write(`
      <html>
        <head>
          <title>Aviso de Licencia - ${docente.apellido}, ${docente.nombre}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; font-size: 14px; line-height: 1.5; }
            h2 { text-align: center; margin-bottom: 30px; }
            .fila { margin: 8px 0; }
            .etiqueta { font-weight: bold; display: inline-block; width: 150px; }
            .recuadro { border: 1px solid #ccc; padding: 15px; margin-top: 20px; border-radius: 6px; }
            .firma { margin-top: 60px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <h2>AVISO DE LICENCIA</h2>
          <div class="fila"><span class="etiqueta">Docente:</span> ${docente.apellido}, ${docente.nombre}</div>
          <div class="fila"><span class="etiqueta">DNI:</span> ${docente.dni || '—'}</div>
          <div class="fila"><span class="etiqueta">Carrera/División:</span> ${sol.teachers?.carrera || '—'} / ${sol.teachers?.curso_division || '—'}</div>
          <div class="fila"><span class="etiqueta">Tipo de Licencia:</span> ${tipo.nombre || '—'} ${tipo.articulo ? '(Art. ' + tipo.articulo + ')' : ''}</div>
          <div class="fila"><span class="etiqueta">Período:</span> ${sol.fecha_desde} al ${sol.fecha_hasta}</div>
          <div class="fila"><span class="etiqueta">Días solicitados:</span> ${sol.dias_solicitados}</div>
          ${diasConfirmados ? `<div class="fila"><span class="etiqueta">Días confirmados:</span> ${diasConfirmados}</div>` : ''}
          <div class="recuadro">
            <strong>Motivo:</strong><br>
            ${sol.motivo || 'Sin motivo declarado'}
          </div>
          ${observacion ? `<div class="recuadro"><strong>Observación del Rector:</strong><br>${observacion}</div>` : ''}
          <div class="firma">
            <div>_________________________<br>Firma Docente</div>
            <div>_________________________<br>Firma Rector/a</div>
          </div>
        </body>
      </html>
    `)
    ventana.document.close()
    ventana.focus()
    setTimeout(() => ventana.print(), 250)
  }
  function tagEstado(estado) {
    const map = {
      pendiente:   { cls: 'warning', label: '⏳ Pendiente' },
      doc_cargada: { cls: 'info',    label: '📎 Doc. cargada' },
      confirmada:  { cls: 'success', label: '✓ Confirmada' },
      rechazada:   { cls: 'warning', label: '🔄 En revisión' },
    }
    const t = map[estado] || { cls: 'warning', label: estado }
    return <span className={`tag ${t.cls}`}>{t.label}</span>
  }
  if (loading) return <div className="loading">⏳ Cargando solicitudes...</div>
  if (error) return <div style={{ padding: 20, color: 'red' }}>❌ {error}</div>
  const pendientes    = solicitudes.filter(s => s.estado === 'pendiente')
  const docCargadas   = solicitudes.filter(s => s.estado === 'doc_cargada')
  const resto         = solicitudes.filter(s => s.estado === 'confirmada' || s.estado === 'rechazada')
  return (
    <div>
      <div className="page-header">
        <h1>Solicitudes</h1>
        <p>{pendientes.length + docCargadas.length} requieren atención</p>
      </div>
      {pendientes.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--color-muted)', marginBottom: 8 }}>
            ⏳ Pendientes
          </div>
          {pendientes.map(s => (
            <div key={s.id} className="sol-card" onClick={() => { setDetalle(s); setDiasConfirmados(s.dias_solicitados); setObservacion('') }} style={{ cursor: 'pointer' }}>
              <div className="sol-header">
                <div>
                  <div className="sol-name">{s.teachers?.users?.apellido}, {s.teachers?.users?.nombre}</div>
                  <div className="sol-sub">
                    DNI {s.teachers?.users?.dni} · {s.teachers?.carrera} · {s.teachers?.curso_division || 'Sin división'}
                  </div>
                </div>
                {tagEstado(s.estado)}
              </div>
              <div className="sol-chips">
                <span className="sol-chip">{s.license_types?.nombre}</span>
                <span className="sol-chip">📅 {s.fecha_desde} → {s.fecha_hasta}</span>
                <span className="sol-chip">{s.dias_solicitados} días</span>
              </div>
            </div>
          ))}
        </>
      )}
      {docCargadas.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--color-muted)', marginBottom: 8, marginTop: 16 }}>
            📎 Con documentación cargada
          </div>
          {docCargadas.map(s => (
            <div key={s.id} className="sol-card" onClick={() => { setDetalle(s); setDiasConfirmados(s.dias_solicitados); setObservacion('') }} style={{ cursor: 'pointer' }}>
              <div className="sol-header">
                <div>
                  <div className="sol-name">{s.teachers?.users?.apellido}, {s.teachers?.users?.nombre}</div>
                  <div className="sol-sub">
                    DNI {s.teachers?.users?.dni} · {s.teachers?.carrera} · {s.teachers?.curso_division || 'Sin división'}
                  </div>
                </div>
                {tagEstado(s.estado)}
              </div>
              <div className="sol-chips">
                <span className="sol-chip">{s.license_types?.nombre}</span>
                <span className="sol-chip">📅 {s.fecha_desde} → {s.fecha_hasta}</span>
                <span className="sol-chip">{s.dias_solicitados} días</span>
              </div>
              {s.pdf_final_url && (
                <a href={s.pdf_final_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
                  📄 Ver PDF
                </a>
              )}
            </div>
          ))}
        </>
      )}
      {resto.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--color-muted)', marginBottom: 8, marginTop: 16 }}>
            Historial
          </div>
          {resto.map(s => (
            <div key={s.id} className="sol-card" onClick={() => { setDetalle(s); setDiasConfirmados(s.dias_solicitados); setObservacion('') }} style={{ cursor: 'pointer' }}>
              <div className="sol-header">
                <div>
                  <div className="sol-name">{s.teachers?.users?.apellido}, {s.teachers?.users?.nombre}</div>
                  <div className="sol-sub">
                    DNI {s.teachers?.users?.dni} · {s.teachers?.carrera} · {s.teachers?.curso_division || 'Sin división'} · {s.license_types?.nombre}
                  </div>
                </div>
                {tagEstado(s.estado)}
              </div>
              {s.dias_confirmados && <div className="text-muted">Días confirmados: <strong>{s.dias_confirmados}</strong></div>}
              {s.observacion_rector && <div className="text-muted">Obs: {s.observacion_rector}</div>}
            </div>
          ))}
        </>
      )}
      {solicitudes.length === 0 && (
        <div className="empty">
          <div className="empty-icon">📋</div>
          <p>No hay solicitudes aún</p>
        </div>
      )}
      {/* Modal detalle */}
      {detalle && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setDetalle(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-header">
              <h2>{detalle.teachers?.users?.apellido}, {detalle.teachers?.users?.nombre}</h2>
              <button className="modal-close" onClick={() => setDetalle(null)}>✕</button>
            </div>
            <div className="info-row"><span className="info-label">Tipo</span><span className="info-value">{detalle.license_types?.nombre}</span></div>
            <div className="info-row"><span className="info-label">Artículo</span><span className="info-value">{detalle.license_types?.articulo}</span></div>
            <div className="info-row"><span className="info-label">Docente</span><span className="info-value">{detalle.teachers?.users?.apellido}, {detalle.teachers?.users?.nombre}</span></div>
            <div className="info-row"><span className="info-label">Carrera / División</span><span className="info-value">{detalle.teachers?.carrera} — {detalle.teachers?.curso_division || 'Sin división'}</span></div>
            <div className="info-row"><span className="info-label">Período</span><span className="info-value">{detalle.fecha_desde} → {detalle.fecha_hasta}</span></div>
            <div className="info-row"><span className="info-label">Días solicitados</span><span className="info-value">{detalle.dias_solicitados}</span></div>
            <div className="info-row"><span className="info-label">Motivo</span><span className="info-value">{detalle.motivo || '—'}</span></div>
            <div className="info-row"><span className="info-label">Estado</span><span className="info-value">{tagEstado(detalle.estado)}</span></div>
            <div className="divider" />
            {detalle.aviso_pdf_url && (
              <a href={detalle.aviso_pdf_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-block" style={{ marginBottom: 8 }}>
                📄 Ver nota de aviso
              </a>
            )}
            {detalle.pdf_final_url && (
              <a href={detalle.pdf_final_url} target="_blank" rel="noreferrer" className="btn btn-primary btn-block" style={{ marginBottom: 8 }}>
                📄 Ver PDF completo
              </a>
            )}
            <div className="form-group">
              <label>Días a confirmar</label>
              <input type="number" value={diasConfirmados} onChange={e => setDiasConfirmados(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Observación (opcional)</label>
              <textarea value={observacion} onChange={e => setObservacion(e.target.value)} placeholder="Motivo de revisión o aclaración..." />
            </div>
            <div className="modal-footer">
              <button className="btn btn-warning" disabled={guardando} onClick={() => cambiarEstado(detalle.id, 'rechazada', null, observacion)}>
                🔄 En revisión
              </button>
              <button className="btn btn-primary" disabled={guardando} onClick={() => cambiarEstado(detalle.id, 'confirmada', diasConfirmados, observacion)}>
                ✓ Confirmar
              </button>
              <button
                onClick={() => imprimirSolicitud(detalle)}
                style={{ padding: '6px 10px', margin: '0 4px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                🖨️ Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}