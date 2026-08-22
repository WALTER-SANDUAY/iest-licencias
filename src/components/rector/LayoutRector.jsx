import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LayoutDashboard, ClipboardList, Users, FileText, GraduationCap, LogOut } from 'lucide-react'
import logo from '/icons/logo.jpg'

export default function LayoutRector() {
  const { logout } = useAuth()
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
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
          <LogOut size={18} />
        </button>
      </div>

      <main className="main">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        <NavLink to="/rector" end className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={22} />
          <span>Panel</span>
        </NavLink>
        <NavLink to="/rector/solicitudes" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
          <ClipboardList size={22} />
          <span>Solicitudes</span>
        </NavLink>
        <NavLink to="/rector/docentes" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
          <Users size={22} />
          <span>Docentes</span>
        </NavLink>
        <NavLink to="/rector/licencias" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
          <FileText size={22} />
          <span>Licencias</span>
        </NavLink>
        <NavLink to="/rector/carreras" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
          <GraduationCap size={22} />
          <span>Carreras</span>
        </NavLink>
      </nav>
    </>
  )
}