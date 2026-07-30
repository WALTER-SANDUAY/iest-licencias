import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'

export default function Solicitudes() {
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [detalle, setDetalle] = useState(null)
  const [diasConfirmados, setDiasConfirmados] = useState('')
  const [observacion, setObservacion] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargarSolicitudes() }, [])

  async function cargarSolicitudes() {
    const { data } = await supabase
      .from('license_requests')
      .select(`
        id, estado, fecha_desde, fecha_hasta, dias_solicitados,
        dias_confirmados, motivo, observacion_rector,
        aviso_pdf_url, justificativo_pdf_url, pdf_final_url, created_at,
        teachers ( id, carrera, curso_division, users ( nombre, apellido, dni ) ),
        license_types ( nombre, articulo )
      `)
      .order('created_at', { ascending: false })

    setSolicitudes(data || [])
    setLoading(false)
  }

  async function cambiarEstado(id, estado, dias = null, obs = null) {
    setGuardando(true)
    const update = { estado }
    if (dias) update.dias_confirmados = parseInt(dias)
    if (obs)  update.observacion_rector = obs
    await supabase.from('license_requests').update(update).eq('id', id)
    setGuardando(false)
    setDetalle(null)
    cargarSolicitudes()
  }

  function tagEstado(estado) {
    const map = {
      pendiente:   { cls: 'warning', label: '⏳ Pendiente' },
      doc_cargada: { cls: 'info',    label: '📎 Doc. cargada' },
      confirmada:  { cls: 'success', label: '✓ Confirmada' },
      rechazada:   { cls: 'danger',  label: '✗ Rechazada' },
    }
    const t = map[estado] || { cls: 'warning', label: estado }
    return <span className={`tag ${t.cls}`}>{t.label}</span>
  }

  if (loading) return <div className="loading">⏳ Cargando...</div>

  const pendientes   = solicitudes.filter(s => s.estado === 'pendiente')
  const docCargadas  = solicitudes.filter(s => s.estado === 'doc_cargada')
  const resto        = solicitudes.filter(s => s.estado === 'confirmada' || s.estado === 'rechazada')

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
                  <div className="sol-sub">DNI {s.teachers?.users?.dni} · {s.teachers?.carrera}</div>
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
                  <div className="sol-sub">DNI {s.teachers?.users?.dni} · {s.teachers?.carrera}</div>
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
                  <div className="sol-sub">{s.license_types?.nombre} · {s.fecha_desde} → {s.fecha_hasta}</div>
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
            <div className="info-row"><span className="info-label">Período</span><span className="info-value">{detalle.fecha_desde} → {detalle.fecha_hasta}</span></div>
            <div className="info-row"><span className="info-label">Días solicitados</span><span className="info-value">{detalle.dias_solicitados}</span></div>
            <div className="info-row"><span className="info-label">Motivo</span><span className="info-value">{detalle.motivo || '—'}</span></div>
            <div className="info-row"><span className="info-label">Estado</span><span className="info-value">{tagEstado(detalle.estado)}</span></div>

            <div className="divider" />
             {/* Ver aviso PDF */}
{detalle.aviso_pdf_url && (
  <a href={detalle.aviso_pdf_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-block" style={{ marginBottom: 8 }}>
    📄 Ver nota de aviso
  </a>
)}

{/* Ver PDF final */}
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
              <textarea value={observacion} onChange={e => setObservacion(e.target.value)} placeholder="Motivo de rechazo o aclaración..." />
            </div>

            <div className="modal-footer">
              <button className="btn btn-danger" disabled={guardando} onClick={() => cambiarEstado(detalle.id, 'rechazada', null, observacion)}>
                ✗ Rechazar
              </button>
              <button className="btn btn-primary" disabled={guardando} onClick={() => cambiarEstado(detalle.id, 'confirmada', diasConfirmados, observacion)}>
                ✓ Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}