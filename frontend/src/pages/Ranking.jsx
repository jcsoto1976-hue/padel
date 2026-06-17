import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const LEVELS = ['iniciacion', 'intermedio', 'avanzado', 'elite']
const LEVEL_LABELS = { iniciacion: 'Iniciación', intermedio: 'Intermedio', avanzado: 'Avanzado', elite: 'Élite' }

export default function Ranking() {
  const { user } = useAuth()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    const fetchRanking = async () => {
      setLoading(true)
      try {
        const url = filter ? `/ranking?level=${filter}` : '/ranking'
        const { data } = await api.get(url)
        setPlayers(data.players || [])
      } catch { /* silencioso */ }
      finally { setLoading(false) }
    }
    fetchRanking()
  }, [filter])

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
      <div className="mb-8">
        <h1 className="section-title text-3xl">📊 Ranking ELO</h1>
        <p className="section-subtitle">Clasificación actualizada tras cada partido confirmado</p>
      </div>

      {/* Mi posición */}
      {myPosition >= 0 && (
        <div className="card border border-brand-500/30 bg-brand-500/5 mb-6 flex items-center gap-4">
          <div className="text-3xl font-display font-black text-brand-400">#{myPosition + 1}</div>
          <div className="flex-1">
            <div className="font-semibold text-white">Tu posición actual</div>
            <div className="text-sm text-slate-400">ELO {user?.elo_rating} · {LEVEL_LABELS[user?.level] || user?.level}</div>
          </div>
          <Link to={`/perfil/${user?.id}`} className="btn-outline text-sm">Ver perfil</Link>
        </div>
      )}

      {/* Filtros de nivel */}
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
                  <div className={`level-${p.level} mt-1 capitalize`}>{p.level}</div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Tabla completa */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
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
                      <span className={`level-${p.level} capitalize`}>{p.level}</span>
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
  )
}
