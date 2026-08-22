import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import logo from '/icons/logo.jpg'

export default function LayoutRector() {
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
        <NavLink to="/rector" end className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
          <span className="bnav-icon">📊</span>Panel
        </NavLink>
        <NavLink to="/rector/solicitudes" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
          <span className="bnav-icon">📋</span>Solicitudes
        </NavLink>
        <NavLink to="/rector/docentes" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
          <span className="bnav-icon">👨‍🏫</span>Docentes
        </NavLink>
        <NavLink to="/rector/licencias" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
          <span className="bnav-icon">📁</span>Licencias
        </NavLink>
      </nav>
    </>
  )
}
