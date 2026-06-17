import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function OpenMatches() {
  const { user } = useAuth()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchOpenMatches = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/reservations/open')
      setMatches(data.reservations || [])
    } catch {
      toast.error('Error al cargar los partidos abiertos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOpenMatches()
  }, [])

  const handleJoin = async (id) => {
    try {
      await api.post(`/reservations/${id}/join`)
      toast.success('¡Te has unido al partido! 🎾')
      fetchOpenMatches()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al unirse')
    }
  }

  const handleLeave = async (id) => {
    try {
      await api.delete(`/reservations/${id}/leave`)
      toast.success('Has salido del partido')
      fetchOpenMatches()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al salir')
    }
  }

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

  return (
    <div className="pt-24 pb-16 px-6 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="section-title text-3xl">🎾 Partidos Abiertos</h1>
        <p className="section-subtitle">Únete a partidos organizados por otros socios y completa las canchas</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-56 rounded-2xl" />)}
        </div>
      ) : matches.length === 0 ? (
        <div className="card text-center py-20 border border-slate-800">
          <div className="text-6xl mb-4">🤝</div>
          <h3 className="font-display text-2xl font-bold text-slate-300 mb-3">No hay partidos abiertos por ahora</h3>
          <p className="text-slate-400 max-w-md mx-auto text-sm">
            Los socios o el administrador pueden marcar una reserva como pública para buscar contrincantes o compañeros.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {matches.map(m => {
            const activeParts = m.participants || []
            const isJoined = activeParts.some(p => p.user_id === user?.id)
            const isCreator = m.user_id === user?.id
            const pct = (activeParts.length / 4) * 100

            return (
              <div key={m.id} className="card-hover relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      🏟️ {m.court?.name}
                    </span>
                    <span className={`level-${m.public_level || 'mixto'} text-[10px] px-2 py-0.5 rounded-full font-semibold border`}>
                      Nivel: {levelLabels[m.public_level] || m.public_level || 'Cualquiera'}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-lg text-white mb-3">
                    Partido de {m.user?.name}
                  </h3>

                  <div className="space-y-1.5 mb-4 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      <span>
                        {new Date(m.start_datetime).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>🕐</span>
                      <span>
                        {new Date(m.start_datetime).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} ({m.duration_minutes} min)
                      </span>
                    </div>
                  </div>

                  {/* Participantes list */}
                  <div className="space-y-1.5 mb-4">
                    <div className="text-xs font-semibold text-slate-400">Jugadores inscritos:</div>
                    <div className="space-y-1">
                      {activeParts.map((p) => (
                        <div key={p.id} className="flex items-center justify-between bg-slate-800/40 px-2 py-1 rounded-lg border border-slate-700/20 text-xs text-slate-300">
                          <div className="flex items-center gap-2">
                            <div className="avatar w-5 h-5 text-[10px]">{p.user?.name?.charAt(0)}</div>
                            <span className="font-medium">{p.user?.name} {p.user_id === m.user_id && '👑'}</span>
                          </div>
                          <span className={`level-${p.user?.level} text-[9px] scale-90`}>{levelLabels[p.user?.level] || p.user?.level}</span>
                        </div>
                      ))}
                      {activeParts.length < 4 && (
                        <div className="text-[10px] text-slate-500 italic px-2 py-1">
                          Esperando {4 - activeParts.length} jugador(es) más...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>Cupo: {activeParts.length}/4</span>
                      <span>{Math.round(pct)}%</span>
                    </div>
                    <div className="bg-slate-800 rounded-full h-1 overflow-hidden">
                      <div className="bg-brand-500 h-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {isJoined ? (
                    isCreator ? (
                      <div className="text-[11px] text-center text-slate-500 italic bg-slate-800/30 p-2 rounded-xl border border-slate-700/20">
                        Eres el creador de la pista. Puedes cancelarla desde el calendario.
                      </div>
                    ) : (
                      <button onClick={() => handleLeave(m.id)} className="btn-danger w-full text-xs py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30">
                        Salir del partido
                      </button>
                    )
                  ) : activeParts.length < 4 ? (
                    <button onClick={() => handleJoin(m.id)} className="btn-primary w-full text-xs py-2">
                      Unirse al Partido →
                    </button>
                  ) : (
                    <button disabled className="btn-secondary w-full text-xs py-2 cursor-not-allowed">
                      Partido Completo ✓
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
