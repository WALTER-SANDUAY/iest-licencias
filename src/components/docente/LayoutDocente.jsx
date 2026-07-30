import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import logo from '/icons/logo.jpg'

export default function LayoutDocente() {
  const { perfil, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-brand">
          <img src={logo} alt="IEST" />
          IEST <span>Licencias</span>
        </div>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Salir
        </button>
      </div>

      <main className="main">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        <NavLink to="/docente" end className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
          <span className="bnav-icon">🏠</span>Inicio
        </NavLink>
        <NavLink to="/docente/pedir" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
          <span className="bnav-icon">➕</span>Pedir
        </NavLink>
        <NavLink to="/docente/historial" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
          <span className="bnav-icon">📜</span>Historial
        </NavLink>
      </nav>
    </>
  )
}
