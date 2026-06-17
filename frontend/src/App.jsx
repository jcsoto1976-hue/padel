import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Reservas from './pages/Reservas'
import Quedadas from './pages/Quedadas'
import QuedadaDetail from './pages/QuedadaDetail'
import Ranking from './pages/Ranking'
import Profile from './pages/Profile'
import Torneos from './pages/Torneos'
import TorneoDetail from './pages/TorneoDetail'
import AdminPanel from './pages/admin/AdminPanel'

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* Públicas */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protegidas */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/reservas" element={<Reservas />} />
              <Route path="/quedadas" element={<Quedadas />} />
              <Route path="/quedadas/:id" element={<QuedadaDetail />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/perfil/:id" element={<Profile />} />
              <Route path="/torneos" element={<Torneos />} />
              <Route path="/torneos/:id" element={<TorneoDetail />} />
            </Route>

            {/* Admin */}
            <Route element={<ProtectedRoute requiredRole="admin" />}>
              <Route path="/admin/*" element={<AdminPanel />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  )
}
