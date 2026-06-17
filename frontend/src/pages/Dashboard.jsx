import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function Dashboard() {
  const { user } = useAuth()
  const [quedadas, setQuedadas] = useState([])
  const [myReservations, setMyReservations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [qRes, rRes] = await Promise.all([
          api.get('/quedadas?status=open'),
          api.get('/reservations/my'),
        ])
        setQuedadas(qRes.data.quedadas?.slice(0, 3) || [])
        setMyReservations(rRes.data.reservations?.slice(0, 3) || [])
      } catch { /* silencioso */ }
      finally { setLoading(false) }
    }
    fetchData()
  }, [])

  const levelColors = {
    iniciacion: 'level-iniciacion',
    intermedio: 'level-intermedio',
    avanzado: 'level-avanzado',
    elite: 'level-elite',
  }

  if (loading) {
    return (
      <div className="pt-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="pt-24 pb-16 px-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-display text-3xl font-bold text-white">
          Hola, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        <p className="text-slate-400 mt-1">Aquí tienes un resumen de tu actividad</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { icon: '📈', label: 'ELO Rating', value: user?.elo_rating || 1000, sub: 'puntos', color: 'text-brand-400' },
          { icon: '🎾', label: 'Partidos jugados', value: user?.total_matches || 0, sub: 'en total', color: 'text-blue-400' },
          { icon: '🏆', label: 'Victorias', value: user?.total_wins || 0, sub: `${user?.total_matches > 0 ? Math.round((user.total_wins / user.total_matches) * 100) : 0}% win rate`, color: 'text-yellow-400' },
          { icon: '⭐', label: 'Nivel', value: user?.level, sub: 'actual', color: 'text-orange-400' },
        ].map(({ icon, label, value, sub, color }) => (
          <div key={label} className="card-hover">
            <div className="text-2xl mb-2">{icon}</div>
            <div className={`font-display font-black text-2xl ${color} capitalize`}>{value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{label}</div>
            <div className="text-xs text-slate-600 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Próximas quedadas */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Quedadas abiertas</h2>
            <Link to="/quedadas" className="btn-ghost text-sm">Ver todas →</Link>
          </div>
          <div className="space-y-3">
            {quedadas.length === 0 ? (
              <div className="card text-center py-8">
                <div className="text-3xl mb-2">🎾</div>
                <p className="text-slate-400 text-sm">No hay quedadas abiertas</p>
                <Link to="/quedadas" className="btn-primary mt-4 text-sm">Crear una quedada</Link>
              </div>
            ) : quedadas.map(q => (
              <Link key={q.id} to={`/quedadas/${q.id}`} className="block">
                <div className="glass border border-slate-700/30 rounded-xl p-4 hover:border-brand-500/30 transition-all duration-200 hover:bg-brand-500/5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-slate-200 text-sm">{q.title}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-slate-500">📅 {q.date}</span>
                        <span className="text-xs text-slate-500">🕐 {q.start_time?.slice(0,5)}</span>
                        <span className={`level-${q.level} capitalize`}>{q.level}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Jugadores</div>
                      <div className="font-bold text-brand-400">
                        {q.participants?.filter(p => p.status !== 'cancelled').length}/{q.max_players}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-brand-500 h-full rounded-full transition-all"
                      style={{
                        width: `${((q.participants?.filter(p => p.status !== 'cancelled').length || 0) / q.max_players) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Mis reservas */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Mis reservas</h2>
            <Link to="/reservas" className="btn-ghost text-sm">Ver calendario →</Link>
          </div>
          <div className="space-y-3">
            {myReservations.length === 0 ? (
              <div className="card text-center py-8">
                <div className="text-3xl mb-2">📅</div>
                <p className="text-slate-400 text-sm">No tienes reservas próximas</p>
                <Link to="/reservas" className="btn-primary mt-4 text-sm">Reservar pista</Link>
              </div>
            ) : myReservations.map(r => (
              <div key={r.id} className="glass border border-slate-700/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200 text-sm">{r.court?.name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(r.start_datetime).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' · '}
                      {new Date(r.start_datetime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      {' – '}
                      {new Date(r.end_datetime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className={r.status === 'active' ? 'badge-green' : 'badge-gray'}>
                    {r.status === 'active' ? 'Activa' : 'Completada'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { to: '/reservas', icon: '📅', label: 'Reservar pista', color: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20 hover:border-blue-500/40' },
          { to: '/quedadas', icon: '🎾', label: 'Unirse a quedada', color: 'from-brand-500/10 to-emerald-500/10 border-brand-500/20 hover:border-brand-500/40' },
          { to: '/ranking', icon: '📊', label: 'Ver ranking', color: 'from-yellow-500/10 to-orange-500/10 border-yellow-500/20 hover:border-yellow-500/40' },
          { to: '/torneos', icon: '🏆', label: 'Torneos', color: 'from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:border-purple-500/40' },
        ].map(({ to, icon, label, color }) => (
          <Link key={to} to={to}>
            <div className={`glass bg-gradient-to-br ${color} border rounded-2xl p-5 text-center hover:-translate-y-1 transition-all duration-200 cursor-pointer`}>
              <div className="text-3xl mb-2">{icon}</div>
              <div className="text-sm font-semibold text-slate-200">{label}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
