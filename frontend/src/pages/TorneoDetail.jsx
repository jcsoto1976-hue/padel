import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function TorneoDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [torneo, setTorneo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [partner, setPartner] = useState('')
  const [pairName, setPairName] = useState('')

  const fetchTorneo = async () => {
    try {
      const { data } = await api.get(`/tournaments/${id}`)
      setTorneo(data.tournament)
    } catch { toast.error('Error al cargar el torneo') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchTorneo() }, [id])

  const handleRegisterPair = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/tournaments/${id}/pairs`, {
        player2_id: partner,
        pair_name: pairName,
      })
      toast.success('¡Pareja inscrita! 🎾')
      setPartner('')
      setPairName('')
      fetchTorneo()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al inscribir pareja')
    }
  }

  const handleGenerateBracket = async () => {
    if (!confirm('¿Generar el cuadro del torneo?')) return
    try {
      await api.post(`/tournaments/${id}/generate`)
      toast.success('¡Cuadro generado!')
      fetchTorneo()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al generar cuadro')
    }
  }

  if (loading) return (
    <div className="pt-24 px-6 max-w-5xl mx-auto">
      <div className="skeleton h-48 rounded-2xl mb-6" />
    </div>
  )

  if (!torneo) return (
    <div className="pt-24 px-6 max-w-5xl mx-auto text-center">
      <div className="text-5xl mb-4">❌</div>
      <h2 className="font-display text-2xl text-slate-300">Torneo no encontrado</h2>
    </div>
  )

  const matchesByRound = (torneo.matches || []).reduce((acc, m) => {
    if (!acc[m.round]) acc[m.round] = []
    acc[m.round].push(m)
    return acc
  }, {})

  return (
    <div className="pt-24 pb-16 px-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="card border border-slate-700/50 mb-6">
        <div className="h-1 bg-gradient-to-r from-brand-500 to-yellow-500 -mx-6 -mt-6 mb-6 rounded-t-2xl" />
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-black text-white">{torneo.name}</h1>
            {torneo.description && <p className="text-slate-400 text-sm mt-2">{torneo.description}</p>}
            <div className="flex flex-wrap gap-3 mt-3 text-sm text-slate-400">
              <span>📅 {new Date(torneo.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span>📋 {torneo.format?.replace(/_/g, ' ')}</span>
              <span>👥 {torneo.pairs?.length}/{torneo.max_pairs} parejas</span>
              <span className={`level-${torneo.level} capitalize`}>{torneo.level}</span>
            </div>
          </div>
          {user?.role === 'admin' && torneo.status === 'open' && (
            <button onClick={handleGenerateBracket} className="btn-primary min-w-fit">
              🎲 Generar cuadro
            </button>
          )}
        </div>

        {torneo.prize_info && (
          <div className="mt-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
            <div className="text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-1">🏆 Premios</div>
            <pre className="text-yellow-300 text-sm whitespace-pre-wrap font-sans">{torneo.prize_info}</pre>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parejas inscritas */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="font-semibold text-slate-200 mb-4">👥 Parejas inscritas ({torneo.pairs?.length}/{torneo.max_pairs})</h2>
            <div className="space-y-3 mb-4">
              {torneo.pairs?.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-700/20 transition-colors">
                  <span className="text-slate-500 text-sm font-mono w-5">{i + 1}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-200">
                      {p.pair_name || `${p.player1?.name} / ${p.player2?.name}`}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {p.player1?.name} & {p.player2?.name}
                    </div>
                    {(p.wins > 0 || p.losses > 0) && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {p.wins}V – {p.losses}D · {p.points} pts
                      </div>
                    )}
                  </div>
                  {p.is_eliminated && <span className="badge badge-red text-xs">Eliminada</span>}
                </div>
              ))}
            </div>

            {/* Inscribir pareja */}
            {torneo.status === 'open' && (
              <form onSubmit={handleRegisterPair} className="space-y-3 pt-4 border-t border-slate-700/30">
                <div className="text-sm font-semibold text-slate-300">Inscribir pareja</div>
                <input
                  className="input text-sm"
                  placeholder="ID o email del compañero"
                  value={partner}
                  onChange={e => setPartner(e.target.value)}
                  required
                />
                <input
                  className="input text-sm"
                  placeholder="Nombre de la pareja (opcional)"
                  value={pairName}
                  onChange={e => setPairName(e.target.value)}
                />
                <button type="submit" className="btn-primary w-full text-sm">Inscribirse</button>
              </form>
            )}
          </div>
        </div>

        {/* Cuadro de partidos */}
        <div className="lg:col-span-2">
          {Object.keys(matchesByRound).length > 0 ? (
            <div className="space-y-5">
              <h2 className="font-display text-xl font-bold text-white">🎾 Cuadro de partidos</h2>
              {Object.entries(matchesByRound)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([round, matches]) => (
                <div key={round} className="card border border-slate-700/30">
                  <h3 className="font-bold text-brand-400 mb-4">
                    Ronda {round}
                    {parseInt(round) === Math.max(...Object.keys(matchesByRound).map(Number)) && (
                      <span className="ml-2 badge badge-yellow">Final</span>
                    )}
                  </h3>
                  <div className="space-y-3">
                    {matches.map(m => (
                      <div key={m.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/20">
                        <div className="flex items-center gap-3">
                          {/* Pareja A */}
                          <div className={`flex-1 p-3 rounded-xl ${m.winner_pair_id === m.pair_a_id ? 'bg-brand-500/10 border border-brand-500/30' : 'bg-slate-700/30'}`}>
                            <div className="text-sm font-semibold text-slate-200">
                              {m.pairA?.pair_name || `${m.pairA?.player1?.name} / ${m.pairA?.player2?.name}` || 'TBD'}
                            </div>
                            {m.score_a && <div className="text-xs text-brand-400 font-bold mt-1">{m.score_a}</div>}
                          </div>

                          <div className="text-slate-500 text-xs font-bold">VS</div>

                          {/* Pareja B */}
                          <div className={`flex-1 p-3 rounded-xl ${m.winner_pair_id === m.pair_b_id ? 'bg-brand-500/10 border border-brand-500/30' : 'bg-slate-700/30'}`}>
                            <div className="text-sm font-semibold text-slate-200">
                              {m.pairB?.pair_name || `${m.pairB?.player1?.name} / ${m.pairB?.player2?.name}` || 'TBD'}
                            </div>
                            {m.score_b && <div className="text-xs text-brand-400 font-bold mt-1">{m.score_b}</div>}
                          </div>
                        </div>

                        {m.winner_pair_id && (
                          <div className="text-xs text-brand-400 font-semibold mt-2 text-center">
                            🏆 Ganador confirmado
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-16 border border-dashed border-slate-700/50">
              <div className="text-5xl mb-4">🎲</div>
              <h3 className="font-display text-xl font-bold text-slate-300 mb-2">Cuadro no generado</h3>
              <p className="text-slate-400 text-sm">
                {user?.role === 'admin'
                  ? 'Cuando todas las parejas estén inscritas, genera el cuadro'
                  : 'El administrador generará el cuadro cuando estén todas las parejas'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
