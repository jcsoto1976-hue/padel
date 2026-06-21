import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import toast from 'react-hot-toast'
import AdminCash from './AdminCash'
import AdminSeasons from './AdminSeasons'

// ─── Vista principal admin ────────────────────────────────────────────────────
function AdminOverview() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: 'Padel1234!',
    role: 'jugador',
    level: '6ta_B',
    elo_rating: 1000,
    gender: 'H'
  })

  const levelLabels = {
    '6ta_A': '6ª A',
    '6ta_B': '6ª B',
    '5ta_A': '5ª A',
    '5ta_B': '5ª B',
    '4ta_A': '4ª A',
    '4ta_B': '4ª B',
    '3ra_A': '3ª A',
    '3ra_B': '3ª B',
    'mixto': 'Mixto'
  }

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

  const handleUserSubmit = async (e) => {
    e.preventDefault()
    if (!/^\d{10}$/.test(form.phone)) {
      toast.error('El teléfono debe tener exactamente 10 números')
      return
    }
    setSubmitting(true)
    try {
      const { data } = await api.post('/admin/users', form)
      setUsers(prev => [data.user, ...prev])
      toast.success('¡Usuario creado con éxito! 👥')
      setShowModal(false)
      setForm({
        name: '',
        phone: '',
        password: 'Padel1234!',
        role: 'jugador',
        level: '6ta_B',
        elo_rating: 1000,
        gender: 'H'
      })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear usuario')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="section-title mb-1">Gestión de Usuarios</h2>
          <p className="section-subtitle">Administra los roles y permisos de los jugadores</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-1.5 text-sm"
        >
          ➕ Crear Nuevo Usuario
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
      ) : (
        <div className="table-wrapper animate-fade-in">
          <table className="table">
            <thead>
              <tr>
                <th>Jugador</th>
                <th>Teléfono</th>
                <th>Nivel</th>
                <th>ELO</th>
                <th>Partidos</th>
                <th>Rol</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-800/10">
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="avatar w-8 h-8 text-xs">{u.name.charAt(0)}</div>
                      <span className="font-semibold text-sm text-slate-200">{u.name}</span>
                    </div>
                  </td>
                  <td className="text-slate-400 text-sm">{u.phone}</td>
                  <td><span className={`level-${u.level} text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-800 text-slate-300 border border-slate-700`}>{levelLabels[u.level] || u.level}</span></td>
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

      {/* Modal Crear Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative animate-scale-in">
            <h3 className="text-lg font-bold text-white mb-4">➕ Registrar Nuevo Usuario</h3>
            
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div>
                <label className="label text-xs">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  className="input text-sm"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="label text-xs">Teléfono / Usuario de Acceso</label>
                <input
                  type="tel"
                  required
                  pattern="\d{10}" maxLength={10} minLength={10}
                  className="input"
                  placeholder="Ej: 0991234567"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                />
              </div>

              <div>
                <label className="label text-xs">Contraseña de Acceso</label>
                <input
                  type="text"
                  required
                  placeholder="••••••••"
                  className="input text-sm"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs">Rol</label>
                  <select
                    className="input text-sm"
                    value={form.role}
                    onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  >
                    <option value="jugador">Jugador</option>
                    <option value="entrenador">Entrenador</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Nivel inicial</label>
                  <select
                    className="input text-sm"
                    value={form.level}
                    onChange={e => setForm(p => ({ ...p, level: e.target.value }))}
                  >
                    <option value="6ta_B">6ª B</option>
                    <option value="6ta_A">6ª A</option>
                    <option value="5ta_B">5ª B</option>
                    <option value="5ta_A">5ª A</option>
                    <option value="4ta_B">4ª B</option>
                    <option value="4ta_A">4ª A</option>
                    <option value="3ra_B">3ª B</option>
                    <option value="3ra_A">3ª A</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs">Género</label>
                  <select
                    className="input text-sm"
                    value={form.gender}
                    onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}
                  >
                    <option value="H">Hombre ♂</option>
                    <option value="M">Mujer ♀</option>
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Puntaje ELO Inicial (Opcional)</label>
                  <input
                    type="number"
                    min="100"
                    max="3000"
                    className="input text-sm"
                    value={form.elo_rating}
                    onChange={e => setForm(p => ({ ...p, elo_rating: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl border border-slate-700 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold rounded-xl transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear Usuario'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Código QR de Acceso para Jugadores */}
      <div className="card border border-brand-500/20 bg-slate-900/40 mt-8 max-w-md mx-auto sm:mx-0">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">📱</span>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider">Código QR de Acceso</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Imprime este código y colócalo en tu club para que los jugadores se registren o inicien sesión al instante escaneándolo con su móvil.
        </p>
        <div className="flex flex-col items-center gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(window.location.origin + '/login')}`}
            alt="Código QR de Acceso"
            className="w-[180px] h-[180px] rounded-lg border border-slate-700 bg-white p-2"
          />
          <div className="text-center w-full">
            <div className="text-[11px] text-slate-400 font-mono select-all bg-slate-900/60 py-1.5 px-2.5 rounded-lg border border-slate-800/80 truncate mb-3">
              {window.location.origin + '/login'}
            </div>
            <button 
              onClick={() => {
                const printWindow = window.open('', '_blank');
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>Imprimir QR de Acceso - PADEL Club</title>
                      <style>
                        body { font-family: sans-serif; text-align: center; padding: 50px; background-color: #ffffff; color: #000000; }
                        h1 { font-size: 32px; margin-bottom: 5px; color: #10b981; }
                        p { font-size: 18px; color: #555555; margin-bottom: 40px; }
                        img { width: 320px; border: 2px solid #eaeaea; padding: 15px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                        .url { margin-top: 30px; font-family: monospace; font-size: 20px; color: #222222; font-weight: bold; }
                        .footer { margin-top: 50px; font-size: 12px; color: #999; }
                      </style>
                    </head>
                    <body onload="window.print(); window.close();">
                      <h1>🎾 PADEL CLUB 🎾</h1>
                      <p>Escanea este código QR para reservar pistas, registrar resultados y ver clasificaciones.</p>
                      <img src="https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(window.location.origin + '/login')}" />
                      <div class="url">${window.location.origin + '/login'}</div>
                      <div class="footer">Generado automáticamente por el Sistema de Gestión Deportiva Padel Club</div>
                    </body>
                  </html>
                `);
                printWindow.document.close();
              }}
              className="btn-outline text-xs w-full py-2 flex items-center justify-center gap-1.5"
            >
              🖨️ Imprimir Cartel QR
            </button>
          </div>
        </div>
      </div>
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
    { to: '/admin/caja', label: '💰 Caja y Arqueo' },
    { to: '/admin/temporadas', label: '🏆 Temporadas' },
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
        <Route path="caja" element={<AdminCash />} />
        <Route path="temporadas" element={<AdminSeasons />} />
      </Routes>
    </div>
  )
}
