import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

const FORMAT_LABELS = {
  eliminacion_directa: 'Eliminación directa',
  liguilla: 'Liguilla',
  combinado: 'Combinado',
}

const STATUS_LABELS = {
  draft: '📝 Borrador',
  open: '🟢 Inscripciones abiertas',
  in_progress: '🔵 En curso',
  completed: '✅ Finalizado',
  cancelled: '❌ Cancelado',
}

export default function Torneos() {
  const { user } = useAuth()
  const [torneos, setTorneos] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTorneos = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/tournaments')
      setTorneos(data.tournaments || [])
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchTorneos() }, [])

  if (loading) {
    return (
      <div className="pt-24 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3].map(i => <div key={i} className="skeleton h-56 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="pt-24 pb-16 px-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="section-title text-3xl">🏆 Torneos y Campeonatos</h1>
          <p className="section-subtitle">Compite en formato dobles con parejas registradas</p>
        </div>
        {user?.role === 'admin' && (
          <Link to="/admin/torneos/nuevo" className="btn-primary">+ Crear torneo</Link>
        )}
      </div>

      {torneos.length === 0 ? (
        <div className="card text-center py-20">
          <div className="text-5xl mb-4">🏆</div>
          <h3 className="font-display text-2xl font-bold text-slate-300 mb-3">Sin torneos por ahora</h3>
          <p className="text-slate-400">Los administradores crearán los próximos campeonatos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {torneos.map(t => {
            const totalPairs = t.pairs?.length || 0

            return (
              <Link key={t.id} to={`/torneos/${t.id}`}>
                <div className="card-hover overflow-hidden">
                  {/* Cabecera color */}
                  <div className="h-2 bg-gradient-to-r from-brand-500 to-emerald-500 -mx-6 -mt-6 mb-5" />

                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs text-slate-500">{STATUS_LABELS[t.status]}</span>
                    <span className={`level-${t.level} capitalize`}>{t.level}</span>
                  </div>

                  <h3 className="font-display font-bold text-lg text-white mb-1 hover:text-brand-300 transition-colors">
                    {t.name}
                  </h3>

                  {t.description && (
                    <p className="text-slate-400 text-xs mb-3 line-clamp-2">{t.description}</p>
                  )}

                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>📋</span>
                      <span>{FORMAT_LABELS[t.format]}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>📅</span>
                      <span>{new Date(t.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>👥</span>
                      <span>{totalPairs}/{t.max_pairs} parejas inscritas</span>
                    </div>
                  </div>

                  {t.prize_info && (
                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 text-xs text-yellow-300 mb-3">
                      🏆 {t.prize_info.split('\n')[0]}
                    </div>
                  )}

                  <div className="bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-brand-500 h-full rounded-full"
                      style={{ width: `${(totalPairs / t.max_pairs) * 100}%` }}
                    />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
