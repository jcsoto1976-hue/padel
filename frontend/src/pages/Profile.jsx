import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from '../services/api'

export default function Profile() {
  const { id } = useParams()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [eloHistory, setEloHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get(`/ranking/players/${id}/stats`)
        setProfile(data.user)
        setStats(data.stats)
        setEloHistory(data.elo_history?.map((e, i) => ({
          partida: i + 1,
          elo: e.elo_after,
          cambio: e.elo_change,
          resultado: e.result,
        })) || [])
      } catch { /* silencioso */ }
      finally { setLoading(false) }
    }
    fetchProfile()
  }, [id])

  const isMe = user?.id === id

  if (loading) {
    return (
      <div className="pt-24 px-6 max-w-4xl mx-auto">
        <div className="skeleton h-48 rounded-2xl mb-6" />
        <div className="grid grid-cols-3 gap-4"><div className="skeleton h-24 rounded-2xl" /><div className="skeleton h-24 rounded-2xl" /><div className="skeleton h-24 rounded-2xl" /></div>
      </div>
    )
  }

  if (!profile) return (
    <div className="pt-24 px-6 max-w-4xl mx-auto text-center">
      <div className="text-5xl mb-4">❌</div>
      <h2 className="font-display text-2xl text-slate-300">Jugador no encontrado</h2>
    </div>
  )

  const levelLabels = { iniciacion: 'Iniciación', intermedio: 'Intermedio', avanzado: 'Avanzado', elite: 'Élite' }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const d = payload[0].payload
      return (
        <div className="glass border border-slate-700/40 rounded-xl px-3 py-2 text-xs">
          <div className="text-slate-300">Partida {d.partida}</div>
          <div className="text-brand-400 font-bold">ELO: {d.elo}</div>
          <div className={d.cambio >= 0 ? 'text-green-400' : 'text-red-400'}>
            {d.cambio >= 0 ? '+' : ''}{d.cambio}
          </div>
          <div className="text-slate-400 capitalize">{d.resultado}</div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="pt-24 pb-16 px-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header perfil */}
      <div className="card border border-slate-700/50 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="avatar w-20 h-20 text-2xl">{profile.name.charAt(0)}</div>
          <div className="flex-1">
            <h1 className="font-display text-3xl font-black text-white">{profile.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className={`level-${profile.level} capitalize text-sm`}>{levelLabels[profile.level] || profile.level}</span>
              <span className="text-slate-500">·</span>
              <span className="text-brand-400 font-display font-black text-xl">{profile.elo_rating} ELO</span>
              {profile.role !== 'jugador' && (
                <span className="badge badge-blue capitalize">{profile.role}</span>
              )}
            </div>
            {profile.phone && (
              <div className="text-slate-500 text-sm mt-1">📞 {profile.phone}</div>
            )}
          </div>
          {isMe && (
            <div className="text-xs text-slate-500 text-right">
              <div>Miembro desde</div>
              <div className="text-slate-400">{new Date(profile.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Partidos', value: stats?.total_matches || 0, icon: '🎾', color: 'text-blue-400' },
          { label: 'Victorias', value: stats?.total_wins || 0, icon: '🏆', color: 'text-yellow-400' },
          { label: 'Win Rate', value: `${stats?.win_rate || 0}%`, icon: '📊', color: 'text-brand-400' },
          { label: 'ELO Torneo', value: profile.elo_tournament || 1000, icon: '🥇', color: 'text-orange-400' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="stat-card">
            <div className="text-2xl mb-1">{icon}</div>
            <div className={`font-display font-black text-2xl ${color}`}>{value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Stats adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="font-semibold text-slate-300 mb-4 text-sm uppercase tracking-wider">Diversidad de juego</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Compañeros distintos</span>
              <span className="font-bold text-brand-400">{stats?.unique_companions || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Rivales distintos</span>
              <span className="font-bold text-blue-400">{stats?.unique_rivals || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Nivel actual</span>
              <span className={`level-${profile.level} capitalize`}>{levelLabels[profile.level]}</span>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-brand-500/5 to-emerald-500/5 border border-brand-500/20">
          <h3 className="font-semibold text-brand-300 mb-4 text-sm uppercase tracking-wider">ELO actual</h3>
          <div className="text-5xl font-display font-black gradient-text mb-2">{profile.elo_rating}</div>
          <div className="text-slate-400 text-sm">Puntuación ELO de quedadas</div>
          <div className="mt-3">
            <div className="text-2xl font-display font-bold text-orange-400">{profile.elo_tournament}</div>
            <div className="text-slate-400 text-sm">ELO de torneos</div>
          </div>
        </div>
      </div>

      {/* Gráfica ELO */}
      {eloHistory.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-slate-300 mb-6 text-sm uppercase tracking-wider">Evolución ELO</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={eloHistory} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
              <XAxis dataKey="partida" tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: 'Partida', position: 'insideBottom', offset: -3, fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="elo"
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={{ fill: '#22c55e', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#4ade80' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {eloHistory.length === 0 && (
        <div className="card text-center py-10 border border-dashed border-slate-700/50">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-slate-400 text-sm">Aún no hay historial de partidos. ¡Empieza a jugar!</p>
        </div>
      )}
    </div>
  )
}
