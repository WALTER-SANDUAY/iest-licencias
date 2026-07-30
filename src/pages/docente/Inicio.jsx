import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../context/AuthContext'

export default function Inicio() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [teacher, setTeacher] = useState(null)
  const [saldos, setSaldos] = useState([])
  const [ultimas, setUltimas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    // Obtener teacher del usuario
    const { data: t } = await supabase
      .from('teachers')
      .select('id, carrera, curso_division, users(nombre, apellido)')
      .eq('user_id', user.id)
      .single()

    setTeacher(t)

    if (t) {
      // Saldos
      const { data: s } = await supabase
        .from('teacher_license_balance')
        .select('dias_disponibles, dias_usados, license_types(nombre, articulo)')
        .eq('teacher_id', t.id)

      setSaldos(s || [])

      // Últimas solicitudes
      const { data: u } = await supabase
        .from('license_requests')
        .select('id, estado, fecha_desde, fecha_hasta, dias_solicitados, license_types(nombre)')
        .eq('teacher_id', t.id)
        .order('created_at', { ascending: false })
        .limit(3)

      setUltimas(u || [])
    }

    setLoading(false)
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
        <h1>Mis Licencias</h1>
        <p>{teacher?.users?.nombre} {teacher?.users?.apellido} · {teacher?.carrera}</p>
      </div>

      {/* Saldos */}
      {saldos.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-icon">📋</div>
            <p>El rector aún no asignó saldos de licencia</p>
          </div>
        </div>
      ) : (
        saldos.map((s, i) => {
          const porcentaje = s.dias_disponibles > 0
            ? Math.round(((s.dias_disponibles - s.dias_usados) / s.dias_disponibles) * 100)
            : 0
          const restantes = s.dias_disponibles - s.dias_usados
          return (
            <div key={i} className="lic-card">
              <div className="lic-icon">📋</div>
              <div className="lic-info">
                <div className="lic-name">{s.license_types?.nombre}</div>
                <div className="lic-sub">{s.license_types?.articulo}</div>
                <div className="balance-bar">
                  <div className="balance-fill" style={{ width: `${porcentaje}%` }} />
                </div>
              </div>
              <div className="lic-days">
                <div className="lic-days-num">{restantes}</div>
                <div className="lic-days-label">días disp.</div>
              </div>
            </div>
          )
        })
      )}

      {/* Últimas solicitudes */}
      <div className="card">
        <div className="card-header">
          <h2>Últimas solicitudes</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/docente/historial')}>
            Ver todas
          </button>
        </div>
        {ultimas.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📝</div>
            <p>No tenés solicitudes aún</p>
          </div>
        ) : (
          ultimas.map(s => (
            <div key={s.id} className="list-row">
              <div className="list-row-info">
                <div className="list-row-title">{s.license_types?.nombre}</div>
                <div className="list-row-sub">{s.fecha_desde} → {s.fecha_hasta} · {s.dias_solicitados} días</div>
              </div>
              {tagEstado(s.estado)}
            </div>
          ))
        )}
      </div>

      <button className="btn btn-primary btn-block" onClick={() => navigate('/docente/pedir')}>
        + Pedir licencia
      </button>
    </div>
  )
}