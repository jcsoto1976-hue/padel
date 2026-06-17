import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',  icon: '🏠' },
  { to: '/reservas',   label: 'Reservas',   icon: '📅' },
  { to: '/quedadas',   label: 'Quedadas',   icon: '🎾' },
  { to: '/ranking',    label: 'Ranking',    icon: '🏆' },
  { to: '/torneos',    label: 'Torneos',    icon: '🥇' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
    setMenuOpen(false)
  }

  const isActive = (to) => location.pathname.startsWith(to)

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass border-b border-white/5 shadow-xl' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:scale-110 transition-transform">
              <span className="text-base">🎾</span>
            </div>
            <span className="font-display font-bold text-lg text-white hidden sm:block">
              PADEL<span className="text-brand-400">Club</span>
            </span>
          </Link>

          {/* Nav links — desktop */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(({ to, label, icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(to)
                      ? 'bg-brand-500/15 text-brand-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <span className="text-base">{icon}</span>
                  {label}
                </Link>
              ))}
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive('/admin')
                      ? 'bg-purple-500/15 text-purple-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <span>⚙️</span> Admin
                </Link>
              )}
            </div>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to={`/perfil/${user.id}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="avatar w-7 h-7 text-xs text-[11px]">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-semibold text-slate-200 leading-none group-hover:text-white">
                      {user.name.split(' ')[0]}
                    </div>
                    <div className="text-[10px] text-brand-400 font-medium capitalize mt-0.5">{user.role}</div>
                  </div>
                </Link>
                <button onClick={handleLogout} className="btn-ghost text-sm px-3 py-1.5 hidden sm:flex">
                  Salir
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-ghost text-sm px-4 py-2">Entrar</Link>
                <Link to="/register" className="btn-primary text-sm px-4 py-2">Registrarse</Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            {user && (
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {menuOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  }
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && user && (
        <div className="md:hidden glass border-t border-white/5 px-4 py-4 space-y-1 animate-fade-in">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                isActive(to) ? 'bg-brand-500/15 text-brand-400' : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <span>{icon}</span> {label}
            </Link>
          ))}
          {user.role === 'admin' && (
            <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5">
              <span>⚙️</span> Admin
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 mt-2"
          >
            <span>🚪</span> Cerrar sesión
          </button>
        </div>
      )}
    </nav>
  )
}
