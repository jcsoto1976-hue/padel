import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function TorneoDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [torneo, setTorneo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [partner, setPartner] = useState('')
  const [player1Phone, setPlayer1Phone] = useState('')
  const [pairName, setPairName] = useState('')
  const [courts, setCourts] = useState([])

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

  const fetchTorneo = async () => {
    try {
      const { data } = await api.get(`/tournaments/${id}`)
      setTorneo(data.tournament)
    } catch { toast.error('Error al cargar el torneo') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchTorneo()
    api.get('/courts')
      .then(({ data }) => setCourts(data.courts || []))
      .catch(() => {})
  }, [id])

  // ─── Inscribir pareja (formato clásico) ─────────────────────────────────
  const handleRegisterPair = async (e) => {
    e.preventDefault()
    const isAdmin = user?.role === 'admin'
    try {
      const payload = {
        player2_id: partner,
        pair_name: pairName,
      }
      if (isAdmin) {
        payload.player1_id = player1Phone
      }
      await api.post(`/tournaments/${id}/pairs`, payload)
      toast.success('¡Pareja inscrita! 🎾')
      setPartner('')
      setPlayer1Phone('')
      setPairName('')
      fetchTorneo()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al inscribir pareja')
    }
  }

  // ─── Inscribir jugador individual (formato americano) ───────────────────
  const handleRegisterPlayer = async (e) => {
    e.preventDefault()
    try {
      const payload = { player1_id: player1Phone }
      await api.post(`/tournaments/${id}/pairs`, payload)
      toast.success('¡Jugador inscrito! 🎾')
      setPlayer1Phone('')
      fetchTorneo()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al inscribir jugador')
    }
  }

  // ─── Auto-inscribirse (jugador no admin en americano) ───────────────────
  const handleSelfRegister = async () => {
    try {
      await api.post(`/tournaments/${id}/pairs`, { player1_id: user.id })
      toast.success('¡Te has inscrito! 🎾')
      fetchTorneo()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al inscribirse')
    }
  }

  const handleGenerateBracket = async () => {
    const isAmericano = torneo?.format === 'americano'
    const confirmMsg = isAmericano
      ? '¿Generar los emparejamientos del torneo americano? Las parejas se mezclarán cada ronda.'
      : '¿Generar el cuadro del torneo?'
    if (!confirm(confirmMsg)) return
    try {
      await api.post(`/tournaments/${id}/generate`)
      toast.success(isAmericano ? '¡Emparejamientos generados!' : '¡Cuadro generado!')
      fetchTorneo()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al generar cuadro')
    }
  }

  const handleUpdateStatus = async (newStatus) => {
    try {
      await api.put(`/tournaments/${id}/status`, { status: newStatus })
      toast.success('¡Inscripciones abiertas! 🟢')
      fetchTorneo()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al abrir inscripciones')
    }
  }

  const handleDeleteTournament = async () => {
    if (!confirm('¿Seguro que quieres eliminar por completo este torneo?')) return
    try {
      await api.delete(`/tournaments/${id}`)
      toast.success('Torneo eliminado')
      window.location.href = '/torneos'
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar torneo')
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

  const isAmericano = torneo.format === 'americano'
  const isAdmin = user?.role === 'admin'

  // ─── Standings para formato americano (individual) ──────────────────────
  const getAmericanoLeaderboard = () => {
    const leaderboardMap = {}
    // Inicializar todos los inscritos
    ;(torneo.pairs || []).forEach(p => {
      leaderboardMap[p.player1_id] = {
        user_id: p.player1_id,
        name: p.player1?.name || p.pair_name,
        elo: p.player1?.elo_rating || 0,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        gamesWon: 0,
        gamesLost: 0,
      }
    })

    // Sumar estadísticas de partidos confirmados
    ;(torneo.americanoMatches || []).forEach(m => {
      if (m.status === 'confirmed' && m.result) {
        const resObj = m.result
        const scoreA = resObj.score_a ? resObj.score_a.split('-').map(Number) : [0, 0]
        const scoreB = resObj.score_b ? resObj.score_b.split('-').map(Number) : [0, 0]
        const gamesA = scoreA.reduce((sum, val) => sum + (isNaN(val) ? 0 : val), 0)
        const gamesB = scoreB.reduce((sum, val) => sum + (isNaN(val) ? 0 : val), 0)

        const players = [m.player_a1_id, m.player_a2_id, m.player_b1_id, m.player_b2_id]
        players.forEach(pid => {
          if (leaderboardMap[pid]) {
            leaderboardMap[pid].matchesPlayed += 1
            const isTeamA = pid === m.player_a1_id || pid === m.player_a2_id
            const won = (isTeamA && resObj.winner_team === 'A') || (!isTeamA && resObj.winner_team === 'B')

            if (won) leaderboardMap[pid].wins += 1
            else if (resObj.winner_team !== 'draw') leaderboardMap[pid].losses += 1

            if (isTeamA) {
              leaderboardMap[pid].gamesWon += gamesA
              leaderboardMap[pid].gamesLost += gamesB
            } else {
              leaderboardMap[pid].gamesWon += gamesB
              leaderboardMap[pid].gamesLost += gamesA
            }
          }
        })
      }
    })

    return Object.values(leaderboardMap).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      const diffA = a.gamesWon - a.gamesLost
      const diffB = b.gamesWon - b.gamesLost
      if (diffB !== diffA) return diffB - diffA
      return b.elo - a.elo
    })
  }

  // ─── Standings para formato clásico (por parejas) ───────────────────────
  const sortedPairs = [...(torneo.pairs || [])].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.losses - b.losses;
  });

  const userPairIndex = sortedPairs.findIndex(p => p.player1_id === user?.id || p.player2_id === user?.id);
  const userPairRank = userPairIndex >= 0 ? userPairIndex + 1 : null;

  // Agrupar partidos clásicos por ronda
  const matchesByRound = (torneo.matches || []).reduce((acc, m) => {
    if (!acc[m.round]) acc[m.round] = []
    acc[m.round].push(m)
    return acc
  }, {})

  // Agrupar partidos americano por ronda
  const americanoByRound = (torneo.americanoMatches || []).reduce((acc, m) => {
    if (!acc[m.round_number]) acc[m.round_number] = []
    acc[m.round_number].push(m)
    return acc
  }, {})

  // Para americano: verificar si el usuario ya está inscrito
  const isUserRegistered = isAmericano
    ? (torneo.pairs || []).some(p => p.player1_id === user?.id)
    : (torneo.pairs || []).some(p => p.player1_id === user?.id || p.player2_id === user?.id)

  const americanoLeaderboard = isAmericano ? getAmericanoLeaderboard() : []
  const userAmericanoRank = isAmericano
    ? americanoLeaderboard.findIndex(p => p.user_id === user?.id) + 1
    : null

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
              <span>📋 {torneo.format === 'americano' ? 'Americano (parejas no fijas)' : torneo.format === 'americano_fijo' ? 'Americano (Parejas fijas)' : torneo.format?.replace(/_/g, ' ')}</span>
              {isAmericano ? (
                <span>👥 {torneo.pairs?.length}/{torneo.max_pairs} jugadores</span>
              ) : (
                <span>👥 {torneo.pairs?.length}/{torneo.max_pairs} parejas ({torneo.max_pairs * 2} jugadores)</span>
              )}
              <span className={`gender-${torneo.gender_restriction} text-xs px-2 py-0.5 rounded-full font-semibold border capitalize ${
                torneo.gender_restriction === 'mixto'
                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                  : torneo.gender_restriction === 'hombres'
                  ? 'bg-blue-950/40 text-blue-400 border-blue-900/50'
                  : 'bg-pink-950/40 text-pink-400 border-pink-900/50'
              }`}>
                {torneo.gender_restriction === 'mixto' ? 'Mixto ⚤' : torneo.gender_restriction === 'hombres' ? 'Hombres ♂' : 'Mujeres ♀'}
              </span>
              <span className={`level-${torneo.level} capitalize`}>{levelLabels[torneo.level] || torneo.level}</span>
              {torneo.selected_courts && torneo.selected_courts.length > 0 && (
                <span>🏟️ Pistas: {
                  torneo.selected_courts.map(cid => {
                    const c = courts.find(court => court.id === cid);
                    return c ? c.name : 'Pista';
                  }).join(', ')
                }</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-fit">
            {torneo.status !== 'draft' && (
              <Link to={`/torneos/${id}/monitor`} className="btn-primary bg-slate-800 hover:bg-slate-700 border-slate-700/50 text-white text-sm flex items-center gap-1">
                📺 Monitor Público
              </Link>
            )}
            {isAdmin && torneo.status === 'draft' && (
              <button onClick={() => handleUpdateStatus('open')} className="btn-primary bg-emerald-600 hover:bg-emerald-500 border-emerald-700/50">
                🟢 Abrir inscripciones
              </button>
            )}
            {isAdmin && torneo.status === 'open' && (
              <button onClick={handleGenerateBracket} className="btn-primary">
                🎲 {isAmericano || torneo.format === 'americano_fijo' ? 'Generar emparejamientos' : 'Generar cuadro'}
              </button>
            )}
            {isAdmin && (torneo.status === 'open' || torneo.status === 'draft') && (
              <button
                onClick={handleDeleteTournament}
                className="btn-danger text-sm border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400"
              >
                🗑️ Eliminar torneo
              </button>
            )}
          </div>
        </div>

        {torneo.prize_info && (
          <div className="mt-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
            <div className="text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-1">🏆 Premios</div>
            <pre className="text-yellow-300 text-sm whitespace-pre-wrap font-sans">{torneo.prize_info}</pre>
          </div>
        )}

        {/* Banner de posición del usuario */}
        {!isAmericano && userPairRank && (torneo.status === 'in_progress' || torneo.status === 'completed') && (
          <div className="mt-4 bg-brand-500/10 border border-brand-500/30 text-brand-400 rounded-xl p-3 text-center text-sm font-semibold">
            🎉 ¡Has quedado en el puesto #{userPairRank} de {sortedPairs.length} con tu pareja!
          </div>
        )}
        {isAmericano && userAmericanoRank > 0 && (torneo.status === 'in_progress' || torneo.status === 'completed') && (
          <div className="mt-4 bg-brand-500/10 border border-brand-500/30 text-brand-400 rounded-xl p-3 text-center text-sm font-semibold">
            🎉 ¡Estás en el puesto #{userAmericanoRank} de {americanoLeaderboard.length} jugadores!
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel lateral: Jugadores/Parejas */}
        <div className="lg:col-span-1">
          <div className="card">
            {isAmericano ? (
              <>
                {/* ─── Jugadores inscritos (Americano) ──────────────── */}
                <h2 className="font-semibold text-slate-200 mb-4">👥 Jugadores inscritos ({torneo.pairs?.length}/{torneo.max_pairs})</h2>
                <div className="space-y-3 mb-4">
                  {(torneo.pairs || []).map((p, i) => (
                    <div key={p.id} className={`flex items-center gap-3 p-2 rounded-xl hover:bg-slate-700/20 transition-colors ${p.player1_id === user?.id ? 'bg-brand-500/10 border border-brand-500/30' : ''}`}>
                      <span className="text-slate-500 text-sm font-mono w-5">#{i + 1}</span>
                      <div className="avatar w-8 h-8 text-sm">{p.player1?.name?.charAt(0) || '?'}</div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-200">{p.player1?.name || p.pair_name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">ELO {p.player1?.elo_rating || '—'}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botón de auto-inscripción (jugadores no admin) */}
                {torneo.status === 'open' && !isAdmin && user?.role !== 'jugador' && !isUserRegistered && (
                  <button onClick={handleSelfRegister} className="btn-primary w-full text-sm mb-4">
                    🎾 Inscribirme en el torneo
                  </button>
                )}

                {/* Inscripción manual por admin */}
                {torneo.status === 'open' && isAdmin && (torneo.pairs?.length || 0) < torneo.max_pairs && (
                  <form onSubmit={handleRegisterPlayer} className="space-y-3 pt-4 border-t border-slate-700/30">
                    <div className="text-sm font-semibold text-slate-300">Inscribir jugador</div>
                    <input
                      className="input text-sm"
                      placeholder="Teléfono del jugador"
                      value={player1Phone}
                      onChange={e => setPlayer1Phone(e.target.value)}
                      required
                    />
                    <button type="submit" className="btn-primary w-full text-sm">Inscribir jugador</button>
                  </form>
                )}
              </>
            ) : (
              <>
                {/* ─── Parejas inscritas (Clásico) ─────────────────── */}
                <h2 className="font-semibold text-slate-200 mb-4">👥 Standings / Parejas ({torneo.pairs?.length}/{torneo.max_pairs})</h2>
                <div className="space-y-3 mb-4">
                  {sortedPairs.map((p, i) => (
                    <div key={p.id} className={`flex items-center gap-3 p-2 rounded-xl hover:bg-slate-700/20 transition-colors ${p.player1_id === user?.id || p.player2_id === user?.id ? 'bg-brand-500/10 border border-brand-500/30' : ''}`}>
                      <span className="text-slate-500 text-sm font-mono w-5">#{i + 1}</span>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-200">
                          {p.pair_name || `${p.player1?.name} / ${p.player2?.name}`}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {p.player1?.name} & {p.player2?.name}
                        </div>
                        {(p.wins > 0 || p.losses > 0 || p.points > 0) && (
                          <div className="text-xs text-brand-400 font-medium mt-0.5">
                            {p.wins}V – {p.losses}D · {p.points} pts
                          </div>
                        )}
                      </div>
                      {p.is_eliminated && <span className="badge badge-red text-xs">Eliminada</span>}
                    </div>
                  ))}
                </div>

                {/* Inscribir pareja (clásico) */}
                {torneo.status === 'open' && user?.role !== 'jugador' && (
                  <form onSubmit={handleRegisterPair} className="space-y-3 pt-4 border-t border-slate-700/30">
                    <div className="text-sm font-semibold text-slate-300">Inscribir pareja</div>
                    {isAdmin ? (
                      <>
                        <input
                          className="input text-sm"
                          placeholder="Jugador 1 (Teléfono)"
                          value={player1Phone}
                          onChange={e => setPlayer1Phone(e.target.value)}
                          required
                        />
                        <input
                          className="input text-sm"
                          placeholder="Jugador 2 (Teléfono)"
                          value={partner}
                          onChange={e => setPartner(e.target.value)}
                          required
                        />
                      </>
                    ) : (
                      <input
                        className="input text-sm"
                        placeholder="Teléfono del compañero"
                        value={partner}
                        onChange={e => setPartner(e.target.value)}
                        required
                      />
                    )}
                    <input
                      className="input text-sm"
                      placeholder="Nombre de la pareja (opcional)"
                      value={pairName}
                      onChange={e => setPairName(e.target.value)}
                    />
                    <button type="submit" className="btn-primary w-full text-sm">Inscribirse</button>
                  </form>
                )}
              </>
            )}
          </div>

          {/* ─── Clasificación individual (Americano) ──────────────────── */}
          {isAmericano && (torneo.status === 'in_progress' || torneo.status === 'completed') && americanoLeaderboard.length > 0 && (
            <div className="card mt-6 border border-slate-700/50">
              <h2 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">🏆 Clasificación Individual</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-slate-400">
                      <th className="py-2 pr-2">Pos</th>
                      <th className="py-2">Jugador</th>
                      <th className="py-2 text-center">PG</th>
                      <th className="py-2 text-center">DG</th>
                      <th className="py-2 text-right">ELO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {americanoLeaderboard.map((item, idx) => (
                      <tr
                        key={item.user_id}
                        className={`border-b border-slate-700/30 last:border-0 ${item.user_id === user?.id ? 'bg-brand-500/10 text-brand-400 font-bold' : 'text-slate-300'}`}
                      >
                        <td className="py-2 pr-2 font-mono">#{idx + 1}</td>
                        <td className="py-2 truncate max-w-[100px]">{item.name}</td>
                        <td className="py-2 text-center font-semibold">{item.wins}</td>
                        <td className={`py-2 text-center font-mono ${item.gamesWon - item.gamesLost > 0 ? 'text-green-400' : item.gamesWon - item.gamesLost < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                          {item.gamesWon - item.gamesLost > 0 ? `+${item.gamesWon - item.gamesLost}` : item.gamesWon - item.gamesLost}
                        </td>
                        <td className="py-2 text-right font-mono text-slate-400">{item.elo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ─── Partidos / Cuadro ──────────────────────────────────────── */}
        <div className="lg:col-span-2">
          {isAmericano ? (
            /* ─── Partidos Americano ────────────────────────────────── */
            Object.keys(americanoByRound).length > 0 ? (
              <div className="space-y-5">
                <h2 className="font-display text-xl font-bold text-white">🎾 Emparejamientos Americano</h2>
                {Object.entries(americanoByRound)
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
                            <span>🏟️ {m.court?.name || `Cancha ${m.court_number}`}</span>
                            <span className={`badge ${m.status === 'confirmed' ? 'badge-green' : m.status === 'result_reported' ? 'badge-yellow' : 'badge-gray'}`}>
                              {m.status === 'confirmed' ? '✅ Confirmado' : m.status === 'result_reported' ? '⏳ Pendiente' : '⏰ Por jugar'}
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
                              {m.result && m.result.score_a && (
                                <div className="text-sm font-bold text-brand-400 mt-1">{m.result.score_a}</div>
                              )}
                            </div>

                            <div className="text-slate-500 font-bold text-sm">VS</div>

                            {/* Equipo B */}
                            <div className="flex-1 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <div className="avatar w-6 h-6 text-xs bg-red-500/20 text-red-300">{m.playerB1?.name?.charAt(0)}</div>
                                <div className="avatar w-6 h-6 text-xs bg-red-500/20 text-red-300">{m.playerB2?.name?.charAt(0)}</div>
                              </div>
                              <div className="text-xs font-semibold text-slate-300">{m.playerB1?.name}</div>
                              <div className="text-xs text-slate-500">{m.playerB2?.name}</div>
                              {m.result && m.result.score_b && (
                                <div className="text-sm font-bold text-brand-400 mt-1">{m.result.score_b}</div>
                              )}
                            </div>
                          </div>

                          {m.result?.winner_team && (
                            <div className="text-xs text-brand-400 font-semibold mt-2 text-center">
                              🏆 Ganador: Equipo {m.result.winner_team}
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
                <h3 className="font-display text-xl font-bold text-slate-300 mb-2">Emparejamientos no generados</h3>
                <p className="text-slate-400 text-sm">
                  {isAdmin
                    ? `Cuando todos los jugadores estén inscritos (${torneo.pairs?.length || 0}/${torneo.max_pairs}), genera los emparejamientos`
                    : 'El administrador generará los emparejamientos cuando estén todos los jugadores'
                  }
                </p>
              </div>
            )
          ) : (
            /* ─── Cuadro clásico ───────────────────────────────────── */
            Object.keys(matchesByRound).length > 0 ? (
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
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                            <span>🏟️ {m.court?.name || `Cancha ${m.court_id ? 'Asignada' : 'No asignada'}`}</span>
                            <span className={`badge ${m.status === 'completed' ? 'badge-green' : 'badge-gray'}`}>
                              {m.status === 'completed' ? '✅ Finalizado' : '⏰ Por jugar'}
                            </span>
                          </div>
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
                  {isAdmin
                    ? 'Cuando todas las parejas estén inscritas, genera el cuadro'
                    : 'El administrador generará el cuadro cuando estén todas las parejas'
                  }
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
