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
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  // Season filtering states
  const [seasons, setSeasons] = useState([])
  const [selectedSeasonId, setSelectedSeasonId] = useState('')

  // H2H states
  const [playersList, setPlayersList] = useState([])
  const [comparePlayerId, setComparePlayerId] = useState('')
  const [h2hData, setH2HData] = useState(null)
  const [loadingH2H, setLoadingH2H] = useState(false)

  // Fetch seasons on mount/change
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const { data } = await api.get('/seasons')
        const fetchedSeasons = data.seasons || []
        setSeasons(fetchedSeasons)
        const active = fetchedSeasons.find(s => s.is_active)
        if (active) {
          setSelectedSeasonId(active.id)
        }
      } catch { /* silencioso */ }
    }
    fetchSeasons()
  }, [])

  // Fetch players list for H2H dropdown
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const { data } = await api.get('/ranking?limit=200')
        setPlayersList(data.players || [])
      } catch { /* silencioso */ }
    }
    fetchPlayers()
  }, [])

  // Fetch profile stats with selected season
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      try {
        const url = selectedSeasonId 
          ? `/ranking/players/${id}/stats?season_id=${selectedSeasonId}`
          : `/ranking/players/${id}/stats`
        const { data } = await api.get(url)
        setProfile(data.user)
        setStats(data.stats)
        setEloHistory(data.elo_history?.map((e, i) => ({
          partida: i + 1,
          elo: e.elo_after,
          cambio: e.elo_change,
          resultado: e.result,
        })) || [])
        setMatches(data.matches || [])
      } catch { /* silencioso */ }
      finally { setLoading(false) }
    }
    fetchProfile()
  }, [id, selectedSeasonId])

  // Fetch H2H comparison
  useEffect(() => {
    if (!comparePlayerId) {
      setH2HData(null)
      return
    }
    const fetchH2H = async () => {
      setLoadingH2H(true)
      try {
        const { data } = await api.get(`/ranking/h2h/${id}/${comparePlayerId}`)
        setH2HData(data)
      } catch { /* silencioso */ }
      finally { setLoadingH2H(false) }
    }
    fetchH2H()
  }, [id, comparePlayerId])

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
      {/* Header Filtro Temporada */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60">
        <div>
          <h2 className="text-slate-200 text-sm font-semibold uppercase tracking-wider">Rendimiento y Estadísticas</h2>
          <p className="text-xs text-slate-500 mt-0.5">Filtra el rendimiento del jugador por período</p>
        </div>
        <select
          value={selectedSeasonId}
          onChange={(e) => setSelectedSeasonId(e.target.value)}
          className="input text-xs bg-slate-800 border-slate-700 text-slate-200 max-w-[200px]"
        >
          <option value="">🌍 Histórico Completo</option>
          {seasons.map(s => (
            <option key={s.id} value={s.id}>
              📅 {s.name} {s.is_active ? '(Activa)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Header perfil */}
      <div className="card border border-slate-700/50 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="avatar w-20 h-20 text-2xl">{profile.name.charAt(0)}</div>
          <div className="flex-1">
            <h1 className="font-display text-3xl font-black text-white">{profile.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className={`gender-${profile.gender || 'H'} text-xs px-2 py-0.5 rounded-full font-semibold border ${
                (profile.gender || 'H') === 'H'
                  ? 'bg-blue-950/40 text-blue-400 border-blue-900/50'
                  : 'bg-pink-950/40 text-pink-400 border-pink-900/50'
              }`}>
                {(profile.gender || 'H') === 'H' ? 'Hombre ♂' : 'Mujer ♀'}
              </span>
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

      {/* Stats Principales */}
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

      {/* Racha y Rendimiento de Canchas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Racha Actual */}
        <div className="card text-center bg-slate-900/20 flex flex-col justify-center py-6">
          <div className="text-3xl mb-2">
            {stats?.current_streak_type === 'wins' ? '🔥' : '❄️'}
          </div>
          <div className={`font-display font-black text-2xl ${stats?.current_streak_type === 'wins' ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats?.current_streak || 0} {stats?.current_streak_type === 'wins' ? 'Victorias' : 'Derrotas'}
          </div>
          <div className="text-xs text-slate-400 mt-1">Racha Actual</div>
        </div>

        {/* Racha Máxima */}
        <div className="card text-center bg-slate-900/20 flex flex-col justify-center py-6">
          <div className="text-3xl mb-2">🏆</div>
          <div className="font-display font-black text-2xl text-amber-400">
            {stats?.max_win_streak || 0} Victorias
          </div>
          <div className="text-xs text-slate-400 mt-1">Racha Máxima</div>
        </div>

        {/* Canchas */}
        <div className="card bg-slate-900/20 text-left">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">🏟️ Eficiencia en Canchas</h4>
          <div className="space-y-2 max-h-[110px] overflow-y-auto pr-1">
            {stats?.court_efficiency?.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">Sin datos de pistas.</p>
            ) : (
              stats?.court_efficiency?.map(c => {
                const pct = c.played > 0 ? Math.round((c.won / c.played) * 100) : 0
                return (
                  <div key={c.name} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-300 font-medium truncate max-w-[120px]">{c.name}</span>
                      <span className="text-slate-400 font-bold">{c.won}/{c.played} ({pct}%)</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
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
          <h3 className="font-semibold text-brand-300 mb-4 text-sm uppercase tracking-wider">Puntuaciones ELO</h3>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-4xl font-display font-black gradient-text">{profile.elo_rating}</div>
              <div className="text-slate-400 text-xs mt-0.5">ELO de quedadas</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-display font-bold text-orange-400">{profile.elo_tournament}</div>
              <div className="text-slate-400 text-xs mt-0.5">ELO de torneos</div>
            </div>
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
          <p className="text-slate-400 text-sm">Aún no hay historial de partidos en esta temporada.</p>
        </div>
      )}

      {/* Comparador Head-to-Head (H2H) */}
      <div className="card mt-6">
        <h3 className="font-semibold text-slate-300 mb-4 text-sm uppercase tracking-wider">⚔️ Comparador Cara a Cara (Head-to-Head)</h3>
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
          <label htmlFor="compare-player" className="text-xs text-slate-400 font-semibold sm:w-28">Comparar con:</label>
          <select
            id="compare-player"
            value={comparePlayerId}
            onChange={(e) => setComparePlayerId(e.target.value)}
            className="input text-sm bg-slate-800 border-slate-700 text-slate-200 flex-1"
          >
            <option value="">-- Selecciona un jugador para comparar --</option>
            {playersList.filter(p => p.id !== id).map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.elo_rating} ELO)</option>
            ))}
          </select>
        </div>

        {loadingH2H && (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          </div>
        )}

        {h2hData && !loadingH2H && (
          <div className="space-y-6 animate-fade-in p-4 bg-slate-900/10 rounded-2xl border border-slate-800/40">
            {/* Cabecera comparativa */}
            <div className="grid grid-cols-3 items-center gap-4 text-center">
              <div className="space-y-1">
                <div className="avatar w-12 h-12 text-sm mx-auto bg-brand-500/20 text-brand-300 font-black border border-brand-500/30">{profile.name.charAt(0)}</div>
                <div className="font-bold text-xs text-slate-200 truncate">{profile.name}</div>
                <div className="text-xs text-brand-400 font-bold">{h2hData.player1.elo_rating} ELO</div>
              </div>
              <div className="text-xl font-black text-slate-600">VS</div>
              <div className="space-y-1">
                <div className="avatar w-12 h-12 text-sm mx-auto bg-orange-500/20 text-orange-300 font-black border border-orange-500/30">{h2hData.player2.name.charAt(0)}</div>
                <div className="font-bold text-xs text-slate-200 truncate">{h2hData.player2.name}</div>
                <div className="text-xs text-orange-400 font-bold">{h2hData.player2.elo_rating} ELO</div>
              </div>
            </div>

            {/* Estadísticas comparadas */}
            <div className="space-y-4 pt-4 border-t border-slate-850">
              <div className="bg-slate-950/20 p-3 rounded-xl border border-slate-900/40">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Partidos como compañeros</span>
                  <span className="text-slate-200 font-semibold">{h2hData.comparison.together.played}</span>
                </div>
                {h2hData.comparison.together.played > 0 && (
                  <div className="flex justify-between text-xs text-emerald-400/85">
                    <span>Victorias en conjunto</span>
                    <span>{h2hData.comparison.together.won} ({Math.round((h2hData.comparison.together.won / h2hData.comparison.together.played) * 100)}%)</span>
                  </div>
                )}
              </div>

              <div className="bg-slate-950/20 p-3 rounded-xl border border-slate-900/40">
                <div className="flex justify-between text-xs mb-3">
                  <span className="text-slate-400">Partidos jugados en contra</span>
                  <span className="text-slate-200 font-semibold">{h2hData.comparison.against.played}</span>
                </div>
                {h2hData.comparison.against.played > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-24 truncate">{profile.name}</span>
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden flex">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(h2hData.comparison.against.p1Wins / h2hData.comparison.against.played) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-300 font-bold w-12 text-right">{h2hData.comparison.against.p1Wins} PG</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-24 truncate">{h2hData.player2.name}</span>
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden flex">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(h2hData.comparison.against.p2Wins / h2hData.comparison.against.played) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-300 font-bold w-12 text-right">{h2hData.comparison.against.p2Wins} PG</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 text-center py-1">No se han registrado partidos oficiales en contra.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Historial de Partidos */}
      <div className="card mt-6">
        <h3 className="font-semibold text-slate-300 mb-6 text-sm uppercase tracking-wider">🎾 Historial de Partidos (Últimos 20)</h3>
        <div className="space-y-4">
          {matches.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No hay partidos registrados para este jugador.</p>
          ) : (
            matches.map(m => {
              const displayScoreA = m.result?.score_a || '—'
              const displayScoreB = m.result?.score_b || '—'
              
              const isTeamA = m.player_a1_id === id || m.player_a2_id === id
              const won = m.result && (
                (isTeamA && m.result.winner_team === 'A') || 
                (!isTeamA && m.result.winner_team === 'B')
              )
              const draw = m.result?.winner_team === 'draw'

              return (
                <div key={m.id} className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex-1 text-center sm:text-left min-w-0">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                      <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {m.match_type === 'torneo' ? '🏆 Torneo' : m.match_type === 'quedada' ? '🎾 Quedada' : '🤝 Amistoso'}
                      </span>
                      {m.result && (
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          draw 
                            ? 'bg-slate-800 text-slate-400' 
                            : won 
                              ? 'bg-green-500/15 text-green-400 border border-green-500/25' 
                              : 'bg-red-500/15 text-red-400 border border-red-500/25'
                        }`}>
                          {draw ? 'Empate' : won ? 'Victoria' : 'Derrota'}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-xs text-slate-300 font-semibold space-y-1">
                      <div className="truncate">
                        <span className="text-slate-500 mr-1">Equipo A:</span> {m.playerA1?.name} & {m.playerA2?.name}
                      </div>
                      <div className="truncate">
                        <span className="text-slate-500 mr-1">Equipo B:</span> {m.playerB1?.name} & {m.playerB2?.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="font-mono text-lg font-black text-slate-100 px-4 py-2 bg-slate-950 rounded-xl border border-slate-800">
                      {displayScoreA} <span className="text-slate-600 font-normal">:</span> {displayScoreB}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
