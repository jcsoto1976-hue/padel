import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const LEVELS = ['6ta_A', '6ta_B', '5ta_A', '5ta_B', '4ta_A', '4ta_B', '3ra_A', '3ra_B']
const LEVEL_LABELS = {
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

export default function Ranking() {
  const { user } = useAuth()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [tournaments, setTournaments] = useState([])
  const [selectedTournamentId, setSelectedTournamentId] = useState('')
  const [tournamentPairs, setTournamentPairs] = useState([])
  const [loadingTournament, setLoadingTournament] = useState(false)
  const [seasons, setSeasons] = useState([])
  const [selectedSeasonId, setSelectedSeasonId] = useState('')

  // Fetch general ranking
  useEffect(() => {
    if (selectedTournamentId) return // No cargar ranking general si hay torneo
    const fetchRanking = async () => {
      setLoading(true)
      try {
        const activeFilter = user?.role === 'jugador' ? user?.level : filter
        let url = '/ranking'
        const params = new URLSearchParams()
        if (activeFilter) params.append('level', activeFilter)
        if (selectedSeasonId) params.append('season_id', selectedSeasonId)
        if (params.toString()) {
          url += `?${params.toString()}`
        }
        const { data } = await api.get(url)
        setPlayers(data.players || [])
      } catch { /* silencioso */ }
      finally { setLoading(false) }
    }
    fetchRanking()
  }, [filter, selectedTournamentId, selectedSeasonId, user])

  // Fetch list of tournaments and seasons
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tournRes, seasRes] = await Promise.all([
          api.get('/tournaments'),
          api.get('/seasons')
        ])
        setTournaments(tournRes.data.tournaments || [])
        const fetchedSeasons = seasRes.data.seasons || []
        setSeasons(fetchedSeasons)
        const active = fetchedSeasons.find(s => s.is_active)
        if (active) {
          setSelectedSeasonId(active.id)
        }
      } catch { /* silencioso */ }
    }
    fetchData()
  }, [])

  // Fetch pairs of selected tournament
  useEffect(() => {
    if (!selectedTournamentId) {
      setTournamentPairs([])
      return
    }
    const fetchTournamentPairs = async () => {
      setLoadingTournament(true)
      try {
        const { data } = await api.get(`/tournaments/${selectedTournamentId}`)
        const sorted = [...(data.tournament.pairs || [])].sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points
          if (b.wins !== a.wins) return b.wins - a.wins
          return a.losses - b.losses
        })
        setTournamentPairs(sorted)
      } catch { /* silencioso */ }
      finally { setLoadingTournament(false) }
    }
    fetchTournamentPairs()
  }, [selectedTournamentId])

  const getRankIcon = (pos) => {
    if (pos === 0) return '🥇'
    if (pos === 1) return '🥈'
    if (pos === 2) return '🥉'
    return pos + 1
  }

  const getEloColor = (elo) => {
    if (elo >= 1400) return 'text-yellow-400'
    if (elo >= 1200) return 'text-orange-400'
    if (elo >= 1000) return 'text-brand-400'
    return 'text-slate-400'
  }

  const myPosition = players.findIndex(p => p.id === user?.id)

  return (
    <div className="pt-24 pb-16 px-6 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="section-title text-3xl">📊 Clasificaciones</h1>
          <p className="section-subtitle">Consulta el ranking general ELO o la tabla de posiciones por torneo</p>
        </div>
        
        {/* Selectores */}
        <div className="flex flex-col sm:flex-row gap-3 min-w-[240px]">
          {/* Selector de Clasificación */}
          <select
            value={selectedTournamentId}
            onChange={(e) => {
              setSelectedTournamentId(e.target.value)
              setFilter('') // Limpiar filtro de nivel al cambiar a torneo
            }}
            className="input text-sm bg-slate-800 border-slate-700 text-slate-200"
          >
            <option value="">📊 Ranking General ELO</option>
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>
                🏆 Torneo: {t.name}
              </option>
            ))}
          </select>

          {/* Selector de Temporada */}
          {!selectedTournamentId && (
            <select
              value={selectedSeasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              className="input text-sm bg-slate-800 border-slate-700 text-slate-200 min-w-[160px]"
            >
              <option value="">🌍 Histórico Completo</option>
              {seasons.map(s => (
                <option key={s.id} value={s.id}>
                  📅 {s.name} {s.is_active ? '(Activa)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {selectedTournamentId ? (
        /* Standings del Torneo Seleccionado */
        <div>
          <div className="mb-6">
            <h2 className="font-semibold text-slate-200 mb-1">
              🏆 Standings del Torneo
            </h2>
            <p className="text-xs text-slate-500">
              Parejas ordenadas por puntos obtenidos y partidos ganados en el torneo.
            </p>
          </div>

          {loadingTournament ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
            </div>
          ) : tournamentPairs.length === 0 ? (
            <div className="card text-center py-12 border border-dashed border-slate-700/50">
              <span className="text-4xl block mb-2">👥</span>
              <p className="text-slate-400 text-sm">No hay parejas inscritas en este torneo aún.</p>
            </div>
          ) : (
            <div className="table-wrapper border border-slate-700/50">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-12">#</th>
                    <th>Pareja</th>
                    <th>Jugadores</th>
                    <th className="text-right">PG</th>
                    <th className="text-right">PP</th>
                    <th className="text-right">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {tournamentPairs.map((p, i) => {
                    const isMe = p.player1_id === user?.id || p.player2_id === user?.id
                    return (
                      <tr key={p.id} className={isMe ? 'bg-brand-500/5 border-l-2 border-l-brand-500' : ''}>
                        <td className="text-center font-bold font-mono">
                          {i + 1}
                        </td>
                        <td>
                          <div className={`font-semibold text-sm ${isMe ? 'text-brand-300' : 'text-slate-200'}`}>
                            {p.pair_name || `${p.player1?.name} / ${p.player2?.name}`}
                            {isMe && <span className="text-xs text-brand-400 ml-1">(tú)</span>}
                          </div>
                        </td>
                        <td className="text-xs text-slate-400">
                          {p.player1?.name} & {p.player2?.name}
                        </td>
                        <td className="text-right text-slate-300 font-semibold">{p.wins}</td>
                        <td className="text-right text-slate-400">{p.losses}</td>
                        <td className="text-right font-display font-black text-brand-400 text-lg">
                          {p.points}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Ranking General ELO */
        <div>
          {/* Mi posición */}
          {myPosition >= 0 && (
            <div className="card border border-brand-500/30 bg-brand-500/5 mb-6 flex items-center gap-4">
              <div className="text-3xl font-display font-black text-brand-400">#{myPosition + 1}</div>
              <div className="flex-1">
                <div className="font-semibold text-white">Tu posición actual</div>
                <div className="text-sm text-slate-400">
                  ELO {user?.elo_rating} · {LEVEL_LABELS[user?.level] || user?.level}
                </div>
              </div>
              <Link to={`/perfil/${user?.id}`} className="btn-outline text-sm">Ver perfil</Link>
            </div>
          )}

          {/* Filtros de nivel */}
          {user?.role !== 'jugador' ? (
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setFilter('')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  !filter ? 'bg-brand-500 text-white' : 'glass border border-slate-700/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos
              </button>
              {LEVELS.map(level => (
                <button
                  key={level}
                  onClick={() => setFilter(level)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    filter === level ? 'bg-brand-500 text-white' : 'glass border border-slate-700/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {LEVEL_LABELS[level]}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="px-4 py-2 rounded-xl text-sm font-semibold bg-brand-500 text-white border border-brand-600">
                Categoría: {LEVEL_LABELS[user?.level] || user?.level}
              </span>
            </div>
          )}

          {/* Top 3 podio */}
          {!filter && players.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[1, 0, 2].map(pos => {
                const p = players[pos]
                if (!p) return <div key={pos} />
                return (
                  <Link key={p.id} to={`/perfil/${p.id}`}>
                    <div className={`card text-center transition-all hover:-translate-y-1 ${pos === 0 ? 'border border-yellow-500/30 bg-yellow-500/5' : ''}`}>
                      <div className="text-4xl mb-2">{getRankIcon(pos)}</div>
                      <div className="avatar w-12 h-12 text-base mx-auto mb-2">
                        {p.name.charAt(0)}
                      </div>
                      <div className="font-bold text-sm text-white truncate">{p.name}</div>
                      <div className={`font-display font-black text-2xl ${getEloColor(p.elo_rating)} mt-1`}>
                        {p.elo_rating}
                      </div>
                      <div className={`level-${p.level} mt-1 text-xs px-2 py-0.5 rounded-full inline-block font-semibold bg-slate-800 text-slate-300 border border-slate-700`}>
                        {LEVEL_LABELS[p.level] || p.level}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Tabla completa */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-12">#</th>
                    <th>Jugador</th>
                    <th>Nivel</th>
                    <th className="text-right">ELO</th>
                    <th className="text-right">Partidos</th>
                    <th className="text-right">Win %</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, i) => {
                    const isMe = p.id === user?.id
                    const winPct = p.total_matches > 0 ? Math.round((p.total_wins / p.total_matches) * 100) : 0
                    return (
                      <tr key={p.id} className={isMe ? 'bg-brand-500/5 border-l-2 border-l-brand-500' : ''}>
                        <td className="text-center font-bold">
                          {typeof getRankIcon(i) === 'string' ? (
                            <span className="text-lg">{getRankIcon(i)}</span>
                          ) : (
                            <span className="text-slate-400 font-mono text-sm">{i + 1}</span>
                          )}
                        </td>
                        <td>
                          <Link to={`/perfil/${p.id}`} className="flex items-center gap-3 group">
                            <div className="avatar w-9 h-9 text-sm">{p.name.charAt(0)}</div>
                            <div>
                              <div className={`font-semibold text-sm group-hover:text-brand-300 transition-colors ${isMe ? 'text-brand-300' : 'text-slate-200'}`}>
                                {p.name} {isMe && <span className="text-xs text-brand-400">(tú)</span>}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td>
                          <span className={`level-${p.level} text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-800 text-slate-300 border border-slate-700`}>
                            {LEVEL_LABELS[p.level] || p.level}
                          </span>
                        </td>
                        <td className={`text-right font-display font-black text-lg ${getEloColor(p.elo_rating)}`}>
                          {p.elo_rating}
                        </td>
                        <td className="text-right text-slate-400 text-sm">{p.total_matches}</td>
                        <td className="text-right">
                          <span className={`text-sm font-semibold ${winPct >= 50 ? 'text-brand-400' : 'text-slate-400'}`}>
                            {winPct}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
