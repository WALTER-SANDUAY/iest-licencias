import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/common/ProtectedRoute'

import Login from './pages/Login'

import LayoutRector from './components/rector/LayoutRector'
import Dashboard     from './pages/rector/Dashboard'
import Solicitudes   from './pages/rector/Solicitudes'
import Docentes      from './pages/rector/Docentes'
import TiposLicencia from './pages/rector/TiposLicencia'

import LayoutDocente  from './components/docente/LayoutDocente'
import Inicio         from './pages/docente/Inicio'
import PedirLicencia  from './pages/docente/PedirLicencia'
import Historial      from './pages/docente/Historial'

import './styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Rector */}
          <Route path="/rector" element={
            <ProtectedRoute rol="rector"><LayoutRector /></ProtectedRoute>
          }>
            <Route index        element={<Dashboard />} />
            <Route path="solicitudes" element={<Solicitudes />} />
            <Route path="docentes"    element={<Docentes />} />
            <Route path="licencias"   element={<TiposLicencia />} />
          </Route>

          {/* Docente */}
          <Route path="/docente" element={
            <ProtectedRoute rol="docente"><LayoutDocente /></ProtectedRoute>
          }>
            <Route index        element={<Inicio />} />
            <Route path="pedir"    element={<PedirLicencia />} />
            <Route path="historial" element={<Historial />} />
          </Route>

          {/* Redirect raíz */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
)
