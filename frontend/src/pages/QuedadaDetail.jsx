import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function QuedadaDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [quedada, setQuedada] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const fetchQuedada = async () => {
    try {
      const { data } = await api.get(`/quedadas/${id}`)
      setQuedada(data.quedada)
    } catch { toast.error('Error al cargar la quedada') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchQuedada() }, [id])

  const handleGenerate = async () => {
    if (!confirm('¿Generar los emparejamientos? Esto organizará los partidos de la jornada.')) return
    setGenerating(true)
    try {
      const { data } = await api.post(`/quedadas/${id}/generate`)
      toast.success(`✅ ${data.matches_creados} partidos generados en ${data.resultado.resumen.total_rondas} rondas`)
      if (data.resultado.advertencias.length > 0) {
        data.resultado.advertencias.forEach(a => toast(a, { icon: '⚠️' }))
      }
      fetchQuedada()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al generar emparejamientos')
    } finally {
      setGenerating(false)
    }
  }

  const handleLeave = async () => {
    if (!confirm('¿Salir de la quedada?')) return
    try {
      await api.delete(`/quedadas/${id}/leave`)
      toast.success('Has salido de la quedada')
      fetchQuedada()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al salir')
    }
  }

  if (loading) {
    return (
      <div className="pt-24 px-6 max-w-5xl mx-auto">
        <div className="skeleton h-48 rounded-2xl mb-6" />
        <div className="grid grid-cols-2 gap-4">
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-32 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!quedada) return (
    <div className="pt-24 px-6 max-w-5xl mx-auto text-center">
      <div className="text-5xl mb-4">❌</div>
      <h2 className="font-display text-2xl text-slate-300">Quedada no encontrada</h2>
    </div>
  )

  const activeParts = quedada.participants?.filter(p => p.status !== 'cancelled') || []
  const isJoined = activeParts.some(p => p.user_id === user?.id)
  const isCreator = quedada.creator_id === user?.id
  const isAdmin = user?.role === 'admin'

  // Agrupar partidos por ronda
  const matchesByRound = (quedada.matches || []).reduce((acc, m) => {
    if (!acc[m.round_number]) acc[m.round_number] = []
    acc[m.round_number].push(m)
    return acc
  }, {})

  return (
    <div className="pt-24 pb-16 px-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="card mb-6 border border-slate-700/50">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`level-${quedada.level} capitalize`}>{quedada.level}</span>
              <span className={`status-${quedada.status} capitalize`}>{quedada.status}</span>
              {quedada.track_global_history && (
                <span className="badge badge-blue">Sin repetir histórico</span>
              )}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-white">{quedada.title}</h1>
            {quedada.description && (
              <p className="text-slate-400 text-sm mt-2">{quedada.description}</p>
            )}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-400">
              <span>📅 {new Date(quedada.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span>🕐 {quedada.start_time?.slice(0,5)}</span>
              <span>🏟️ {quedada.num_courts} canchas</span>
              <span>👥 {activeParts.length}/{quedada.max_players} jugadores</span>
              <span>🎾 Organizador: {quedada.creator?.name}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 min-w-fit">
            {(isCreator || isAdmin) && quedada.status !== 'generated' && activeParts.length >= 8 && (
              <button onClick={handleGenerate} disabled={generating} className="btn-primary">
                {generating ? '⏳ Generando...' : '🎲 Generar emparejamientos'}
              </button>
            )}
            {isJoined && quedada.status === 'open' && (
              <button onClick={handleLeave} className="btn-danger text-sm">Abandonar quedada</button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Participantes */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="font-semibold text-slate-200 mb-4">👥 Participantes ({activeParts.length}/{quedada.max_players})</h2>
            <div className="space-y-2">
              {activeParts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 py-2 border-b border-slate-700/30 last:border-0">
                  <div className="w-6 text-slate-500 text-sm font-mono">{i + 1}</div>
                  <div className="avatar w-8 h-8 text-sm">{p.user?.name?.charAt(0) || '?'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-200 truncate">{p.user?.name}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`level-${p.user?.level} text-[10px]`}>{p.user?.level}</span>
                      <span className="text-xs text-slate-500">ELO {p.user?.elo_rating}</span>
                    </div>
                  </div>
                  {quedada.creator_id === p.user_id && (
                    <span className="text-xs text-yellow-400">👑</span>
                  )}
                </div>
              ))}

              {activeParts.length < quedada.max_players && (
                <div className="text-center py-4 text-sm text-slate-500">
                  {quedada.max_players - activeParts.length} plazas disponibles
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Partidos/Rondas */}
        <div className="lg:col-span-2">
          {quedada.status === 'generated' || Object.keys(matchesByRound).length > 0 ? (
            <div className="space-y-5">
              <h2 className="font-display text-xl font-bold text-white">🎾 Emparejamientos</h2>
              {Object.entries(matchesByRound)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([round, matches]) => (
                <div key={round} className="card border border-slate-700/30">
                  <h3 className="font-bold text-brand-400 mb-4 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-sm">{round}</span>
                    Ronda {round}
                    <span className="text-slate-500 text-xs font-normal">({matches.length} partido{matches.length > 1 ? 's' : ''})</span>
                  </h3>
                  <div className="space-y-3">
                    {matches.map(m => (
                      <div key={m.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/20">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                          <span>🏟️ Cancha {m.court_number}</span>
                          <span className={`badge ${m.status === 'confirmed' ? 'badge-green' : m.status === 'result_reported' ? 'badge-yellow' : 'badge-gray'}`}>
                            {m.status === 'confirmed' ? '✅ Confirmado' : m.status === 'result_reported' ? '⏳ Pendiente' : '⏰ Pendiente'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          {/* Equipo A */}
                          <div className="flex-1 text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <div className="avatar w-6 h-6 text-xs bg-blue-500/20 text-blue-300">{m.playerA1?.name?.charAt(0)}</div>
                              <div className="avatar w-6 h-6 text-xs bg-blue-500/20 text-blue-300">{m.playerA2?.name?.charAt(0)}</div>
                            </div>
                            <div className="text-xs font-semibold text-slate-300">{m.playerA1?.name}</div>
                            <div className="text-xs text-slate-500">{m.playerA2?.name}</div>
                          </div>

                          {/* VS */}
                          <div className="text-slate-500 font-bold text-sm">VS</div>

                          {/* Equipo B */}
                          <div className="flex-1 text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <div className="avatar w-6 h-6 text-xs bg-red-500/20 text-red-300">{m.playerB1?.name?.charAt(0)}</div>
                              <div className="avatar w-6 h-6 text-xs bg-red-500/20 text-red-300">{m.playerB2?.name?.charAt(0)}</div>
                            </div>
                            <div className="text-xs font-semibold text-slate-300">{m.playerB1?.name}</div>
                            <div className="text-xs text-slate-500">{m.playerB2?.name}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-16 border border-dashed border-slate-700/50">
              <div className="text-5xl mb-4">🎲</div>
              <h3 className="font-display text-xl font-bold text-slate-300 mb-2">Sin emparejamientos aún</h3>
              <p className="text-slate-400 text-sm mb-6">
                {activeParts.length < 8
                  ? `Faltan ${8 - activeParts.length} jugadores para poder generar emparejamientos`
                  : (isCreator || isAdmin)
                    ? 'Haz clic en "Generar emparejamientos" cuando estés listo'
                    : 'El organizador generará los emparejamientos pronto'
                }
              </p>
              {(isCreator || isAdmin) && activeParts.length >= 8 && (
                <button onClick={handleGenerate} disabled={generating} className="btn-primary">
                  🎲 Generar emparejamientos
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
