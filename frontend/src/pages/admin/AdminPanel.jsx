import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import toast from 'react-hot-toast'

// ─── Vista principal admin ────────────────────────────────────────────────────
function AdminOverview() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/users').then(({ data }) => {
      setUsers(data.users || [])
    }).finally(() => setLoading(false))
  }, [])

  const handleRoleChange = async (userId, role) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
      toast.success('Rol actualizado')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar rol')
    }
  }

  return (
    <div>
      <h2 className="section-title mb-1">Gestión de Usuarios</h2>
      <p className="section-subtitle mb-6">Administra los roles y permisos de los jugadores</p>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Jugador</th>
                <th>Email</th>
                <th>Nivel</th>
                <th>ELO</th>
                <th>Partidos</th>
                <th>Rol</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="avatar w-8 h-8 text-xs">{u.name.charAt(0)}</div>
                      <span className="font-semibold text-sm text-slate-200">{u.name}</span>
                    </div>
                  </td>
                  <td className="text-slate-400 text-sm">{u.email}</td>
                  <td><span className={`level-${u.level} capitalize`}>{u.level}</span></td>
                  <td className="font-bold text-brand-400">{u.elo_rating}</td>
                  <td className="text-slate-400 text-sm">{u.total_matches}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="jugador">Jugador</option>
                      <option value="entrenador">Entrenador</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span className={u.is_active ? 'badge-green' : 'badge-red'}>
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Gestión de pistas ────────────────────────────────────────────────────────
function AdminCourts() {
  const [courts, setCourts] = useState([])
  const [form, setForm] = useState({ name: '', surface: 'cristal', is_indoor: false, description: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/courts').then(({ data }) => setCourts(data.courts || [])).finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const { data } = await api.post('/courts', form)
      setCourts(prev => [...prev, data.court])
      setForm({ name: '', surface: 'cristal', is_indoor: false, description: '' })
      toast.success('Pista creada')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear pista')
    }
  }

  return (
    <div>
      <h2 className="section-title mb-1">Gestión de Pistas</h2>
      <p className="section-subtitle mb-6">Configura las pistas y horarios del club</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista */}
        <div className="space-y-3">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)
          ) : courts.map(c => (
            <div key={c.id} className="card border border-slate-700/30">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">{c.name}</div>
                  <div className="flex gap-2 mt-1">
                    <span className="badge badge-blue text-xs capitalize">{c.surface}</span>
                    <span className="badge badge-gray text-xs">{c.is_indoor ? '🏠 Indoor' : '☀️ Exterior'}</span>
                  </div>
                </div>
                <span className={c.is_active ? 'badge-green' : 'badge-red'}>
                  {c.is_active ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Formulario nueva pista */}
        <div className="card border border-brand-500/20">
          <h3 className="font-semibold text-brand-300 mb-4">+ Nueva pista</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Nombre</label>
              <input className="input" placeholder="Pista 6 — Cristal" required
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Superficie</label>
              <select className="input" value={form.surface} onChange={e => setForm(p => ({ ...p, surface: e.target.value }))}>
                <option value="cristal">Cristal</option>
                <option value="cesped_artificial">Césped artificial</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>
            <div>
              <label className="label">Descripción</label>
              <input className="input" placeholder="Descripción opcional"
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="indoor" checked={form.is_indoor}
                onChange={e => setForm(p => ({ ...p, is_indoor: e.target.checked }))}
                className="accent-brand-500" />
              <label htmlFor="indoor" className="text-sm text-slate-300">Pista interior (cubierta)</label>
            </div>
            <button type="submit" className="btn-primary w-full">Crear pista</button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Panel Admin principal ────────────────────────────────────────────────────
export default function AdminPanel() {
  const location = useLocation()
  const { user } = useAuth()

  const tabs = [
    { to: '/admin', label: '👥 Usuarios', exact: true },
    { to: '/admin/pistas', label: '🏟️ Pistas' },
  ]

  return (
    <div className="pt-24 pb-16 px-6 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">⚙️</span>
          <h1 className="font-display text-3xl font-black text-white">Panel de Administración</h1>
          <span className="badge badge-blue">Admin</span>
        </div>
        <p className="text-slate-400">Gestión completa del club de pádel</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-slate-700/50 pb-0">
        {tabs.map(({ to, label, exact }) => {
          const active = exact ? location.pathname === to : location.pathname.startsWith(to) && to !== '/admin'
          const isBase = to === '/admin' && location.pathname === '/admin'
          const isActive = isBase || (!exact && location.pathname.startsWith(to))

          return (
            <Link
              key={to}
              to={to}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                (to === '/admin' && location.pathname === '/admin') || (to !== '/admin' && location.pathname.startsWith(to))
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>

      <Routes>
        <Route index element={<AdminOverview />} />
        <Route path="pistas" element={<AdminCourts />} />
      </Routes>
    </div>
  )
}
