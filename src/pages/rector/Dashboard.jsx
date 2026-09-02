import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../context/AuthContext'

export default function Dashboard() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ docentes: 0, pendientes: 0, confirmadas: 0, rechazadas: 0 })
  const [ultimas, setUltimas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    const [{ count: docentes }, { count: pendientes }, { count: confirmadas }, { count: rechazadas }] =
      await Promise.all([
        supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('license_requests').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
        supabase.from('license_requests').select('*', { count: 'exact', head: true }).eq('estado', 'confirmada'),
        supabase.from('license_requests').select('*', { count: 'exact', head: true }).eq('estado', 'rechazada'),
      ])

    setStats({ docentes, pendientes, confirmadas, rechazadas })

    const { data } = await supabase
      .from('license_requests')
      .select(`
        id, estado, fecha_desde, fecha_hasta, created_at,
        teachers ( users ( nombre, apellido ) ),
        license_types ( nombre, articulo )
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    setUltimas(data || [])
    setLoading(false)
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

  if (loading) return <div className="loading">⏳ Cargando...</div>

  return (
    <div>
      <div className="page-header">
        <h1>Panel General <span style={{ fontSize: '20px', opacity: 0.8, verticalAlign: 'middle' }}>🇦🇷</span></h1>
        <p>Bienvenido, {perfil?.nombre} — IEST Tinogasta</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-label">Docentes activos</div>
          <div className="stat-value">{stats.docentes}</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">Pendientes</div>
          <div className="stat-value">{stats.pendientes}</div>
          <div className="stat-sub">a revisar</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Confirmadas</div>
          <div className="stat-value">{stats.confirmadas}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">En revisión</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Últimas solicitudes</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/rector/solicitudes')}>
            Ver todas
          </button>
        </div>
        {ultimas.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📋</div>
            <p>No hay solicitudes aún</p>
          </div>
        ) : (
          ultimas.map(s => (
            <div key={s.id} className="list-row">
              <div className="list-row-info">
                <div className="list-row-title">
                  {s.teachers?.users?.apellido}, {s.teachers?.users?.nombre}
                </div>
                <div className="list-row-sub">
                  {s.license_types?.nombre} · {s.fecha_desde} → {s.fecha_hasta}
                </div>
              </div>
              {tagEstado(s.estado)}
            </div>
          ))
        )}
      </div>
    </div>
  )
}