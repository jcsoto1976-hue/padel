import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function TorneoMonitor() {
  const { id } = useParams()
  const { user } = useAuth()
  const [torneo, setTorneo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [courts, setCourts] = useState([])
  
  // Estados para el cronómetro
  const [timeLeft, setTimeLeft] = useState(900) // 15 minutos en segundos
  const [activeRound, setActiveRound] = useState(1)
  const [durationInput, setDurationInput] = useState(15) // en minutos
  const timerIntervalRef = useRef(null)
  const pollIntervalRef = useRef(null)
  const hasBuzzedRef = useRef(false) // Prevenir bucle de bocina

  // Estado para el modal de marcador
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [scoreA, setScoreA] = useState(0)
  const [scoreB, setScoreB] = useState(0)
  const [submittingScore, setSubmittingScore] = useState(false)

  // ─── Web Audio API Buzzer (Bocina Sintética) ─────────────────────────────
  const playBuzzer = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sawtooth'; 
      oscillator.frequency.setValueAtTime(115, audioCtx.currentTime); // bocina baja
      
      // Modulación rugosa (vibrato de bocina)
      const modulator = audioCtx.createOscillator();
      const modulatorGain = audioCtx.createGain();
      modulator.frequency.setValueAtTime(45, audioCtx.currentTime);
      modulatorGain.gain.setValueAtTime(40, audioCtx.currentTime);
      
      modulator.connect(modulatorGain.gain);
      modulatorGain.connect(oscillator.frequency);
      
      gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.8);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      modulator.start();
      
      setTimeout(() => {
        oscillator.stop();
        modulator.stop();
        audioCtx.close();
      }, 1800);
    } catch (err) {
      console.error('Web Audio error:', err);
    }
  };

  // ─── Carga de datos ──────────────────────────────────────────────────────
  const fetchData = async (silent = false) => {
    try {
      const { data } = await api.get(`/tournaments/${id}`)
      setTorneo(data.tournament)
      
      // Establecer ronda activa inicial si no está establecida
      const isAmer = data.tournament.format === 'americano'
      const matches = isAmer ? (data.tournament.americanoMatches || []) : (data.tournament.matches || [])
      
      if (matches.length > 0 && !silent) {
        // Encontrar la ronda más alta que tenga partidos pendientes
        const pendingMatches = matches.filter(m => m.status !== 'confirmed')
        if (pendingMatches.length > 0) {
          const minRound = Math.min(...pendingMatches.map(m => isAmer ? m.round_number : m.round))
          setActiveRound(minRound)
        } else {
          const maxRound = Math.max(...matches.map(m => isAmer ? m.round_number : m.round))
          setActiveRound(maxRound)
        }
      }
    } catch {
      if (!silent) toast.error('Error al cargar datos del torneo')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    api.get('/courts')
      .then(({ data }) => setCourts(data.courts || []))
      .catch(() => {})

    // Polling cada 5 segundos para mantener sincronizados múltiples monitores/relojes
    pollIntervalRef.current = setInterval(() => {
      fetchData(true)
    }, 5000)

    return () => {
      clearInterval(pollIntervalRef.current)
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [id])

  // ─── Lógica del reloj local sincronizado ─────────────────────────────────
  useEffect(() => {
    if (!torneo) return

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)

    const calculateTime = () => {
      const { round_timer_status, round_timer_started_at, round_timer_duration, round_timer_remaining } = torneo
      
      if (round_timer_status === 'running') {
        const elapsed = Math.floor((new Date() - new Date(round_timer_started_at)) / 1000)
        let left = round_timer_remaining - elapsed
        if (left <= 0) {
          left = 0
          if (!hasBuzzedRef.current) {
            playBuzzer()
            hasBuzzedRef.current = true
            toast('📢 ¡Tiempo de juego finalizado!', { icon: '🔔', duration: 4000 })
          }
        } else {
          hasBuzzedRef.current = false // resetear bocina si el tiempo es positivo
        }
        setTimeLeft(left)
      } else if (round_timer_status === 'paused') {
        setTimeLeft(round_timer_remaining)
        hasBuzzedRef.current = false
      } else {
        // stopped
        setTimeLeft(round_timer_duration)
        hasBuzzedRef.current = false
      }
    }

    // Calcular inmediatamente y luego en intervalo
    calculateTime()
    timerIntervalRef.current = setInterval(calculateTime, 1000)

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [torneo])

  // ─── Controles del temporizador (admin) ──────────────────────────────────
  const handleStartTimer = async () => {
    try {
      const endpoint = torneo.round_timer_status === 'paused' ? 'resume' : 'start'
      const { data } = await api.post(`/tournaments/${id}/timer/${endpoint}`)
      setTorneo(data.tournament)
      toast.success(endpoint === 'resume' ? 'Reloj reanudado' : 'Reloj iniciado')
    } catch {
      toast.error('Error al iniciar el cronómetro')
    }
  }

  const handlePauseTimer = async () => {
    try {
      const { data } = await api.post(`/tournaments/${id}/timer/pause`)
      setTorneo(data.tournament)
      toast.success('Reloj pausado')
    } catch {
      toast.error('Error al pausar el cronómetro')
    }
  }

  const handleResetTimer = async () => {
    if (!confirm('¿Reiniciar el tiempo de ronda al valor inicial?')) return
    try {
      const { data } = await api.post(`/tournaments/${id}/timer/stop`)
      setTorneo(data.tournament)
      toast.success('Cronómetro reiniciado')
    } catch {
      toast.error('Error al reiniciar el cronómetro')
    }
  }

  const handleUpdateDuration = async (e) => {
    e.preventDefault()
    const secs = durationInput * 60
    try {
      const { data } = await api.put(`/tournaments/${id}/timer/duration`, { duration: secs })
      setTorneo(data.tournament)
      toast.success(`Tiempo ajustado a ${durationInput} minutos`)
    } catch {
      toast.error('Error al actualizar la duración')
    }
  }

  // ─── Modal de Marcador Táctil ───────────────────────────────────────────
  const openScoringModal = (match) => {
    setSelectedMatch(match)
    
    // Si ya tiene marcador reportado o cargado, precargarlo
    const res = match.result
    if (res) {
      setScoreA(parseInt(res.score_a) || 0)
      setScoreB(parseInt(res.score_b) || 0)
    } else if (match.score_a || match.score_b) {
      setScoreA(parseInt(match.score_a) || 0)
      setScoreB(parseInt(match.score_b) || 0)
    } else {
      setScoreA(0)
      setScoreB(0)
    }
  }

  const handleSaveScore = async () => {
    if (!selectedMatch) return
    setSubmittingScore(true)
    try {
      const isAmer = torneo.format === 'americano'
      const matchId = selectedMatch.id
      
      const payload = {
        score_a: String(scoreA),
        score_b: String(scoreB),
        winner_team: scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'draw'
      }

      // Si el torneo es americano, los partidos están en la tabla general `matches`
      if (isAmer) {
        // Al ser monitor de club, si es admin usamos la confirmación directa. Si no, reportamos resultado estándar
        if (user?.role === 'admin') {
          await api.post(`/matches/${matchId}/result-direct`, payload)
        } else {
          await api.post(`/matches/${matchId}/result`, payload)
        }
      } else {
        // Torneo clásico
        // En los clásicos del tournamentController se usa 'winner_pair_id' en lugar de team A/B
        const winnerPairId = scoreA > scoreB 
          ? selectedMatch.pair_a_id 
          : scoreB > scoreA 
            ? selectedMatch.pair_b_id 
            : null
        
        await api.put(`/tournaments/${id}/matches/${matchId}/result`, {
          score_a: String(scoreA),
          score_b: String(scoreB),
          winner_pair_id: winnerPairId
        })
      }

      toast.success('¡Marcador guardado con éxito! 🎾')
      setSelectedMatch(null)
      fetchData(true)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar el marcador')
    } finally {
      setSubmittingScore(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
    </div>
  )

  if (!torneo) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
      <h2 className="text-2xl font-bold">Torneo no encontrado</h2>
      <Link to="/torneos" className="btn-primary mt-4">Volver a Torneos</Link>
    </div>
  )

  const isAmericano = torneo.format === 'americano'
  const allMatches = isAmericano ? (torneo.americanoMatches || []) : (torneo.matches || [])
  
  // Agrupar las rondas disponibles
  const rounds = Array.from(new Set(allMatches.map(m => isAmericano ? m.round_number : m.round))).sort((a, b) => a - b)
  
  // Partidos de la ronda seleccionada
  const roundMatches = allMatches.filter(m => (isAmericano ? m.round_number : m.round) === activeRound)
  
  // Formatear tiempo en MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const isAdmin = user?.role === 'admin'
  const isTimeCritical = timeLeft < 120 && torneo.round_timer_status === 'running' // menos de 2 min

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-24">
      {/* Top Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Link to={`/tournaments/${id}`} className="text-slate-400 hover:text-white transition-colors">
            ⬅️ Detalle
          </Link>
          <div className="h-5 w-px bg-slate-800" />
          <div>
            <h1 className="font-display text-xl md:text-2xl font-black text-white flex items-center gap-2">
              🏆 {torneo.name}
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                {isAmericano ? 'Americano' : torneo.format === 'americano_fijo' ? 'Americano Fijo' : 'Clásico'}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Monitor Oficial de Resultados en Tiempo Real</p>
          </div>
        </div>

        {/* Selector de Rondas */}
        <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {rounds.map(r => (
            <button
              key={r}
              onClick={() => setActiveRound(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeRound === r ? 'bg-brand-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Ronda {r}
            </button>
          ))}
          {rounds.length === 0 && (
            <div className="text-xs text-slate-500 px-3 py-1.5">No hay rondas creadas</div>
          )}
        </div>
      </header>

      {/* Main Scoreboard / Timer Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 flex flex-col gap-6">
        
        {/* Giant Timer Widget */}
        <div className="card bg-slate-900 border border-slate-800/80 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center py-8">
          <div className="absolute top-3 left-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            ⏱️ Cronómetro de Juego (Ronda {activeRound})
          </div>
          
          <div className={`font-mono text-8xl md:text-9xl font-black tracking-widest leading-none my-2 transition-all duration-300 ${
            isTimeCritical 
              ? 'text-rose-500 animate-pulse drop-shadow-[0_0_20px_rgba(244,63,94,0.4)]' 
              : 'text-brand-400 drop-shadow-[0_0_20px_rgba(163,230,53,0.3)]'
          }`}>
            {formatTime(timeLeft)}
          </div>

          <div className="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-2 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              torneo.round_timer_status === 'running' 
                ? 'bg-green-500 animate-ping' 
                : torneo.round_timer_status === 'paused' 
                  ? 'bg-yellow-500' 
                  : 'bg-slate-500'
            }`} />
            Estado: {
              torneo.round_timer_status === 'running' 
                ? 'En Juego' 
                : torneo.round_timer_status === 'paused' 
                  ? 'Pausado' 
                  : 'Detenido'
            }
          </div>
        </div>

        {/* Partidos de la Ronda */}
        <div>
          <h2 className="font-display text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
            🎾 Partidos en Pistas (Ronda {activeRound})
          </h2>
          
          {roundMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roundMatches.map(m => {
                const isConfirmed = m.status === 'confirmed'
                const hasScore = m.result || m.score_a || m.score_b
                const displayScoreA = m.result?.score_a || m.score_a || '0'
                const displayScoreB = m.result?.score_b || m.score_b || '0'

                // Buscar nombre de pista
                const courtId = m.court_id
                const courtObj = courts.find(c => c.id === courtId)
                const courtName = courtObj ? courtObj.name : `Pista ${m.court_number || ''}`

                // Para torneos clásicos
                const nameA = m.pairA?.pair_name || (m.pairA?.player1?.name ? `${m.pairA.player1.name} / ${m.pairA.player2?.name}` : 'TBD')
                const nameB = m.pairB?.pair_name || (m.pairB?.player1?.name ? `${m.pairB.player1.name} / ${m.pairB.player2?.name}` : 'TBD')

                // Para americano
                const playerA1 = m.playerA1?.name || 'TBD'
                const playerA2 = m.playerA2?.name || 'TBD'
                const playerB1 = m.playerB1?.name || 'TBD'
                const playerB2 = m.playerB2?.name || 'TBD'

                return (
                  <div
                    key={m.id}
                    className={`card bg-slate-900 border transition-all relative group overflow-hidden ${
                      isConfirmed 
                        ? 'border-emerald-500/20 bg-emerald-950/5' 
                        : 'border-slate-800 hover:border-slate-700/80 hover:shadow-lg hover:shadow-brand-500/5'
                    }`}
                  >
                    {/* Court Header */}
                    <div className="flex justify-between items-center border-b border-slate-800/60 pb-3 mb-4">
                      <span className="text-xs font-bold text-brand-400 bg-brand-500/5 px-2.5 py-1 rounded-lg border border-brand-500/10">
                        🏟️ {courtName}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isConfirmed 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : m.status === 'result_reported'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                            : 'bg-sky-500/10 text-sky-400 border border-sky-500/10'
                      }`}>
                        {isConfirmed ? 'Finalizado' : m.status === 'result_reported' ? 'Pendiente' : 'En Juego'}
                      </span>
                    </div>

                    {/* Teams and Score layout */}
                    <div className="flex items-center justify-between gap-2 min-h-[90px]">
                      {/* Team A */}
                      <div className="flex-1 text-center pr-2">
                        {isAmericano ? (
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-slate-200 truncate">{playerA1}</div>
                            <div className="text-xs font-bold text-slate-200 truncate">{playerA2}</div>
                          </div>
                        ) : (
                          <div className="text-xs font-bold text-slate-200 line-clamp-2 leading-tight">{nameA}</div>
                        )}
                      </div>

                      {/* Score display */}
                      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-950/80 rounded-xl border border-slate-800 font-mono text-xl font-black">
                        <span className={isConfirmed && Number(displayScoreA) > Number(displayScoreB) ? 'text-brand-400' : 'text-slate-300'}>
                          {displayScoreA}
                        </span>
                        <span className="text-slate-600 text-sm">:</span>
                        <span className={isConfirmed && Number(displayScoreB) > Number(displayScoreA) ? 'text-brand-400' : 'text-slate-300'}>
                          {displayScoreB}
                        </span>
                      </div>

                      {/* Team B */}
                      <div className="flex-1 text-center pl-2">
                        {isAmericano ? (
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-slate-200 truncate">{playerB1}</div>
                            <div className="text-xs font-bold text-slate-200 truncate">{playerB2}</div>
                          </div>
                        ) : (
                          <div className="text-xs font-bold text-slate-200 line-clamp-2 leading-tight">{nameB}</div>
                        )}
                      </div>
                    </div>

                    {/* Touch Area or Button to Score */}
                    {user?.role !== 'jugador' && (
                      <div className="mt-4 pt-3 border-t border-slate-800/40">
                        <button
                          onClick={() => openScoringModal(m)}
                          className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            isConfirmed
                              ? 'bg-slate-800/30 text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
                              : 'bg-brand-500 text-slate-950 hover:bg-brand-400 font-black shadow-md shadow-brand-500/10'
                          }`}
                        >
                          📊 {isConfirmed ? 'Editar Marcador' : 'Ingresar Marcador'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="card text-center py-16 border border-dashed border-slate-800">
              <div className="text-4xl mb-3">⏰</div>
              <h3 className="text-base font-bold text-slate-300">No hay partidos en esta ronda</h3>
              <p className="text-xs text-slate-500 mt-1">El administrador debe generar o configurar los partidos del torneo.</p>
            </div>
          )}
        </div>
      </main>

      {/* Floating Timer Admin Controls Panel (Only Admin) */}
      {isAdmin && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-[0_-10px_25px_rgba(0,0,0,0.5)] z-40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">⚙️ Controles Reloj:</span>
            
            {torneo.round_timer_status !== 'running' ? (
              <button
                onClick={handleStartTimer}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-md shadow-green-600/10 transition-all"
              >
                ▶️ Iniciar / Reanudar
              </button>
            ) : (
              <button
                onClick={handlePauseTimer}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-md shadow-amber-600/10 transition-all"
              >
                ⏸️ Pausar
              </button>
            )}

            <button
              onClick={handleResetTimer}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1 border border-slate-700 transition-all"
            >
              🔄 Reiniciar
            </button>
          </div>

          {/* Formulario ajustar duración */}
          <form onSubmit={handleUpdateDuration} className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Duración:</span>
            <input
              type="number"
              min="1"
              max="180"
              value={durationInput}
              onChange={e => setDurationInput(e.target.value)}
              className="input py-1.5 px-3 text-xs w-16 text-center font-bold"
              required
            />
            <span className="text-xs text-slate-400">min</span>
            <button
              type="submit"
              className="px-3.5 py-2 bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-extrabold rounded-xl transition-all"
            >
              Ajustar
            </button>
          </form>
        </div>
      )}

      {/* Touchscreen-Friendly Score Entry Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl animate-scale-in">
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-display text-lg font-bold text-white">Ingresar Marcador de Pista</h3>
                <p className="text-xs text-slate-400 mt-1">Ajusta los juegos ganados por cada equipo</p>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-slate-400 hover:text-white text-xl font-bold bg-slate-800/50 hover:bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center transition-all"
              >
                ✕
              </button>
            </div>

            {/* Score Grid Táctil */}
            <div className="space-y-6">
              
              {/* Equipo A Row */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">Equipo A</div>
                  {isAmericano ? (
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-slate-200 truncate">{selectedMatch.playerA1?.name}</div>
                      <div className="text-sm font-bold text-slate-200 truncate">{selectedMatch.playerA2?.name}</div>
                    </div>
                  ) : (
                    <div className="text-sm font-bold text-slate-200 truncate">
                      {selectedMatch.pairA?.pair_name || `${selectedMatch.pairA?.player1?.name} / ${selectedMatch.pairA?.player2?.name}`}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setScoreA(prev => Math.max(0, prev - 1))}
                    className="w-12 h-12 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xl font-bold rounded-xl flex items-center justify-center transition-all border border-slate-700"
                  >
                    －
                  </button>
                  <span className="w-12 text-center text-3xl font-black font-mono text-white">
                    {scoreA}
                  </span>
                  <button
                    type="button"
                    onClick={() => setScoreA(prev => prev + 1)}
                    className="w-12 h-12 bg-brand-500 hover:bg-brand-400 text-slate-950 active:scale-95 text-xl font-black rounded-xl flex items-center justify-center transition-all"
                  >
                    ＋
                  </button>
                </div>
              </div>

              {/* VS Divider */}
              <div className="text-center font-bold text-slate-600 text-sm tracking-wider uppercase">VS</div>

              {/* Equipo B Row */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">Equipo B</div>
                  {isAmericano ? (
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-slate-200 truncate">{selectedMatch.playerB1?.name}</div>
                      <div className="text-sm font-bold text-slate-200 truncate">{selectedMatch.playerB2?.name}</div>
                    </div>
                  ) : (
                    <div className="text-sm font-bold text-slate-200 truncate">
                      {selectedMatch.pairB?.pair_name || `${selectedMatch.pairB?.player1?.name} / ${selectedMatch.pairB?.player2?.name}`}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setScoreB(prev => Math.max(0, prev - 1))}
                    className="w-12 h-12 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xl font-bold rounded-xl flex items-center justify-center transition-all border border-slate-700"
                  >
                    －
                  </button>
                  <span className="w-12 text-center text-3xl font-black font-mono text-white">
                    {scoreB}
                  </span>
                  <button
                    type="button"
                    onClick={() => setScoreB(prev => prev + 1)}
                    className="w-12 h-12 bg-brand-500 hover:bg-brand-400 text-slate-950 active:scale-95 text-xl font-black rounded-xl flex items-center justify-center transition-all"
                  >
                    ＋
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedMatch(null)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all border border-slate-700 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={submittingScore}
                onClick={handleSaveScore}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-extrabold rounded-2xl transition-all shadow-lg shadow-green-600/10 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingScore ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  '💾 Confirmar Marcador'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
