import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../context/AuthContext'

export default function Historial() {
  const { user } = useAuth()
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [detalle, setDetalle] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    const { data: t } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (t) {
      const { data } = await supabase
        .from('license_requests')
        .select(`
          id, estado, fecha_desde, fecha_hasta, dias_solicitados,
          dias_confirmados, motivo, observacion_rector,
          aviso_pdf_url, pdf_final_url, created_at,
          license_types ( nombre, articulo )
        `)
        .eq('teacher_id', t.id)
        .order('created_at', { ascending: false })

      setSolicitudes(data || [])
    }
    setLoading(false)
  }

 async function subirJustificativo(solicitudId, archivo) {
    setSubiendo(true)
    setError('')

    // 1. Subir justificativo
    const ext = archivo.name.split('.').pop()
    const pathJustif = `justificativos/${solicitudId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('licencias-pdf')
      .upload(pathJustif, archivo, { upsert: true })

    if (uploadError) { setError(uploadError.message); setSubiendo(false); return }

    const { data: urlJustif } = supabase.storage.from('licencias-pdf').getPublicUrl(pathJustif)

    // 2. Obtener el aviso PDF desde Storage
    const { data: solicitudData } = await supabase
      .from('license_requests')
      .select('aviso_pdf_url')
      .eq('id', solicitudId)
      .single()

    let pdfFinalUrl = urlJustif.publicUrl

    if (solicitudData?.aviso_pdf_url) {
      try {
        // 3. Descargar aviso PDF
        const avisoRes  = await fetch(solicitudData.aviso_pdf_url)
        const avisoBytes = await avisoRes.arrayBuffer()

        // 4. Leer justificativo
        const justifBytes = await archivo.arrayBuffer()

        // 5. Fusionar
        const { fusionarPDFs } = await import('../../services/pdf')
        const pdfFinalBytes = await fusionarPDFs(avisoBytes, justifBytes)

        // 6. Subir PDF fusionado
        const pathFinal = `finales/${solicitudId}.pdf`
        await supabase.storage.from('licencias-pdf').upload(pathFinal, pdfFinalBytes, {
          contentType: 'application/pdf', upsert: true
        })

        const { data: urlFinal } = supabase.storage.from('licencias-pdf').getPublicUrl(pathFinal)
        pdfFinalUrl = urlFinal.publicUrl
      } catch (e) {
        console.error('Error fusionando PDFs:', e)
      }
    }

    // 7. Actualizar solicitud
    await supabase.from('license_requests').update({
      justificativo_pdf_url: urlJustif.publicUrl,
      pdf_final_url: pdfFinalUrl,
      estado: 'doc_cargada'
    }).eq('id', solicitudId)

    setSubiendo(false)
    setDetalle(null)
    cargarDatos()
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

  return (
    <div>
      <div className="page-header">
        <h1>Mi Historial</h1>
        <p>Todas tus solicitudes de licencia</p>
      </div>

      {solicitudes.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📜</div>
          <p>No tenés solicitudes aún</p>
        </div>
      ) : (
        solicitudes.map(s => (
          <div key={s.id} className="sol-card" onClick={() => setDetalle(s)} style={{ cursor: 'pointer' }}>
            <div className="sol-header">
              <div>
                <div className="sol-name">{s.license_types?.nombre}</div>
                <div className="sol-sub">{s.license_types?.articulo}</div>
              </div>
              {tagEstado(s.estado)}
            </div>
            <div className="sol-chips">
              <span className="sol-chip">📅 {s.fecha_desde} → {s.fecha_hasta}</span>
              <span className="sol-chip">{s.dias_solicitados} días solicitados</span>
              {s.dias_confirmados && <span className="sol-chip">✓ {s.dias_confirmados} confirmados</span>}
            </div>
            {s.estado === 'pendiente' && (
              <div className="alert warning" style={{ marginBottom: 0, marginTop: 8 }}>
                📎 Pendiente de justificativo — tocá para subir
              </div>
            )}
            {s.observacion_rector && (
              <div className="text-muted" style={{ marginTop: 6 }}>Obs: {s.observacion_rector}</div>
            )}
          </div>
        ))
      )}

      {/* Modal detalle / subir justificativo */}
      {detalle && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setDetalle(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-header">
              <h2>{detalle.license_types?.nombre}</h2>
              <button className="modal-close" onClick={() => setDetalle(null)}>✕</button>
            </div>

            <div className="info-row"><span className="info-label">Artículo</span><span className="info-value">{detalle.license_types?.articulo}</span></div>
            <div className="info-row"><span className="info-label">Período</span><span className="info-value">{detalle.fecha_desde} → {detalle.fecha_hasta}</span></div>
            <div className="info-row"><span className="info-label">Días solicitados</span><span className="info-value">{detalle.dias_solicitados}</span></div>
            {detalle.dias_confirmados && <div className="info-row"><span className="info-label">Días confirmados</span><span className="info-value">{detalle.dias_confirmados}</span></div>}
            <div className="info-row"><span className="info-label">Motivo</span><span className="info-value">{detalle.motivo}</span></div>
            <div className="info-row"><span className="info-label">Estado</span><span className="info-value">{tagEstado(detalle.estado)}</span></div>
            {detalle.observacion_rector && <div className="info-row"><span className="info-label">Obs. rector</span><span className="info-value">{detalle.observacion_rector}</span></div>}

            <div className="divider" />

            {/* Subir justificativo si está pendiente */}
            {detalle.estado === 'pendiente' && (
              <>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📎 Subir justificativo</p>
                <label className="upload-zone">
                  <input
                    type="file"
                    accept=".pdf"
                    style={{ display: 'none' }}
                    onChange={e => e.target.files[0] && subirJustificativo(detalle.id, e.target.files[0])}
                  />
                  <div className="upload-icon">📄</div>
                  <p>{subiendo ? 'Subiendo...' : 'Tocá para subir el PDF'}</p>
                  <span>Certificado médico, constancia, etc.</span>
                </label>
                {error && <div className="alert danger">{error}</div>}
              </>
            )}
             {/* Descargar aviso PDF */}
{detalle.aviso_pdf_url && (
  <a href={detalle.aviso_pdf_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-block" style={{ marginBottom: 8 }}>
    📄 Ver nota de aviso
  </a>
)}
            {/* Ver PDF final si está confirmada */}
            {detalle.pdf_final_url && (
              <a href={detalle.pdf_final_url} target="_blank" rel="noreferrer" className="btn btn-primary btn-block">
                📄 Descargar PDF final
              </a>
            )}

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDetalle(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}