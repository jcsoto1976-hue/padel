import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

const LEVELS = ['mixto', '6ta_A', '6ta_B', '5ta_A', '5ta_B', '4ta_A', '4ta_B', '3ra_A', '3ra_B']
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

export default function Quedadas() {
  const { user } = useAuth()
  const [quedadas, setQuedadas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')
  const [showCreate, setShowCreate] = useState(false)
  const [courts, setCourts] = useState([])
  const [selectedCourts, setSelectedCourts] = useState([])
  const [form, setForm] = useState({
    title: '', description: '', level: 'mixto', date: '', start_time: '10:00',
    track_global_history: false, gender_restriction: 'mixto',
  })

  const fetchQuedadas = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/quedadas?status=${filter}`)
      setQuedadas(data.quedadas || [])
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchQuedadas() }, [filter])

  useEffect(() => {
    api.get('/courts')
      .then(({ data }) => setCourts(data.courts || []))
      .catch(() => toast.error('Error al cargar pistas'))
  }, [])

  const handleCourtToggle = (courtId) => {
    setSelectedCourts(prev =>
      prev.includes(courtId)
        ? prev.filter(id => id !== courtId)
        : [...prev, courtId]
    )
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (selectedCourts.length < 2 || selectedCourts.length > 5) {
      toast.error('Debes seleccionar entre 2 y 5 pistas para la quedada')
      return
    }
    try {
      await api.post('/quedadas', {
        ...form,
        selected_courts: selectedCourts,
        max_players: selectedCourts.length * 4
      })
      toast.success('¡Quedada creada! 🎾')
      setShowCreate(false)
      setForm({ title: '', description: '', level: 'mixto', date: '', start_time: '10:00', track_global_history: false, gender_restriction: 'mixto' })
      setSelectedCourts([])
      fetchQuedadas()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear quedada')
    }
  }

  const handleJoin = async (id) => {
    try {
      await api.post(`/quedadas/${id}/join`)
      toast.success('¡Inscrito en la quedada!')
      fetchQuedadas()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al inscribirse')
    }
  }

  const statusLabel = { open: '🟢 Abierta', full: '🟡 Completa', generated: '🔵 Emparejada', completed: '⚫ Completada' }

  return (
    <div className="pt-24 pb-16 px-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="section-title text-3xl">🎾 Quedadas</h1>
          <p className="section-subtitle">Únete a una quedada o crea la tuya con emparejamiento automático</p>
        </div>
        {user?.role !== 'jugador' && (
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
            + Nueva quedada
          </button>
        )}
      </div>

      {/* Formulario crear */}
      {showCreate && (
        <div className="card border border-brand-500/30 mb-8 animate-fade-in">
          <h2 className="font-display text-xl font-bold text-white mb-6">Crear nueva quedada</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Título *</label>
              <input
                className="input" required
                placeholder="Ej: Quedada Viernes tarde"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Fecha *</label>
              <input type="date" className="input" required
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Hora inicio *</label>
              <input type="time" className="input" required
                value={form.start_time}
                onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2">
              <div>
                <label className="label">Nivel</label>
                <select className="input" value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))}>
                  {LEVELS.map(l => <option key={l} value={l}>{levelLabels[l] || l}</option>)}
                </select>
              </div>
              <div>
                <label className="label">¿Es una quedada mixta o por género? *</label>
                <select className="input" value={form.gender_restriction} onChange={e => setForm(p => ({ ...p, gender_restriction: e.target.value }))}>
                  <option value="mixto">Sí, es Mixta (Parejas siempre Hombre + Mujer) ⚤</option>
                  <option value="hombres">No, Solo Hombres ♂</option>
                  <option value="mujeres">No, Solo Mujeres ♀</option>
                </select>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="label">Pistas Reservadas para la Quedada *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-800/40 p-4 rounded-xl border border-slate-700/30">
                {courts.map(court => (
                  <div key={court.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`court-${court.id}`}
                      checked={selectedCourts.includes(court.id)}
                      onChange={() => handleCourtToggle(court.id)}
                      className="w-4 h-4 accent-brand-500"
                    />
                    <label htmlFor={`court-${court.id}`} className="text-sm text-slate-300 cursor-pointer select-none">
                      {court.name} <span className="text-xs text-slate-500 font-normal">({court.is_indoor ? 'Indoor' : 'Exterior'})</span>
                    </label>
                  </div>
                ))}
              </div>
              {selectedCourts.length > 0 ? (
                <div className="text-xs text-brand-400 font-semibold mt-2">
                  📢 Al seleccionar {selectedCourts.length} {selectedCourts.length === 1 ? 'pista' : 'pistas'}, la quedada será para {selectedCourts.length * 4} jugadores.
                </div>
              ) : (
                <div className="text-xs text-slate-500 mt-2">
                  Debes seleccionar entre 2 y 5 pistas.
                </div>
              )}
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <input type="checkbox" id="track" checked={form.track_global_history}
                onChange={e => setForm(p => ({ ...p, track_global_history: e.target.checked }))}
                className="w-4 h-4 accent-brand-500"
              />
              <label htmlFor="track" className="text-sm text-slate-300 cursor-pointer">
                Evitar repeticiones entre sesiones (Algoritmo inteligente para jugadores recurrentes)
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="label">Descripción</label>
              <textarea className="input resize-none" rows={2} placeholder="Descripción opcional..."
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary">Crear quedada</button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['open', 'full', 'generated', 'completed'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filter === s ? 'bg-brand-500 text-white' : 'glass border border-slate-700/40 text-slate-400 hover:text-slate-200'
            }`}
          >
            {statusLabel[s]}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : quedadas.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">🎾</div>
          <h3 className="font-display text-xl font-bold text-slate-300 mb-2">No hay quedadas {filter === 'open' ? 'abiertas' : filter}</h3>
          <p className="text-slate-400 text-sm mb-6">¡Sé el primero en crear una!</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">Crear quedada</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {quedadas.map(q => {
            const activeParts = q.participants?.filter(p => p.status !== 'cancelled') || []
            const isJoined = activeParts.some(p => p.user_id === user?.id)
            const pct = (activeParts.length / q.max_players) * 100

            return (
              <div key={q.id} className="card-hover relative overflow-hidden">
                {/* Status badge */}
                <div className="absolute top-4 right-4">
                  <span className={`status-${q.status}`}>
                    {statusLabel[q.status] || q.status}
                  </span>
                </div>

                <Link to={`/quedadas/${q.id}`}>
                  <h3 className="font-display font-bold text-lg text-white pr-20 mb-3 hover:text-brand-300 transition-colors">
                    {q.title}
                  </h3>
                </Link>

                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span>📅</span>
                    <span>{new Date(q.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span>🕐</span>
                    <span>{q.start_time?.slice(0,5)}</span>
                    <span>·</span>
                    <span>🏟️ {q.num_courts} canchas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`level-${q.level}`}>{levelLabels[q.level] || q.level}</span>
                    <span className={`gender-${q.gender_restriction} text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                      q.gender_restriction === 'mixto'
                        ? 'bg-slate-800/80 text-slate-300 border-slate-700/60'
                        : q.gender_restriction === 'hombres'
                        ? 'bg-blue-950/40 text-blue-400 border-blue-900/50'
                        : 'bg-pink-950/40 text-pink-400 border-pink-900/50'
                    }`}>
                      {q.gender_restriction === 'mixto' ? 'Mixto ⚤' : q.gender_restriction === 'hombres' ? 'Hombres ♂' : 'Mujeres ♀'}
                    </span>
                    {q.track_global_history && (
                      <span className="badge badge-blue text-xs">Sin repetir</span>
                    )}
                  </div>
                </div>

                {/* Avatares de participantes */}
                <div className="flex items-center gap-1 mb-3">
                  {activeParts.slice(0, 8).map((p, i) => (
                    <div key={p.id} className="avatar w-7 h-7 text-xs border-2 border-slate-900" style={{ marginLeft: i > 0 ? '-6px' : 0 }}>
                      {p.user?.name?.charAt(0) || '?'}
                    </div>
                  ))}
                  {activeParts.length > 8 && (
                    <span className="text-xs text-slate-500 ml-2">+{activeParts.length - 8}</span>
                  )}
                </div>

                {/* Barra progreso */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{activeParts.length}/{q.max_players} jugadores</span>
                    <span>{Math.round(pct)}%</span>
                  </div>
                  <div className="bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all bg-brand-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Acción */}
                {q.status === 'open' && !isJoined && user?.role !== 'jugador' && (
                  <button onClick={() => handleJoin(q.id)} className="btn-primary w-full text-sm">
                    Unirse →
                  </button>
                )}
                {isJoined && (
                  <Link to={`/quedadas/${q.id}`} className="btn-outline w-full text-sm block text-center">
                    Ver detalles ✓
                  </Link>
                )}
                {((q.status === 'open' && !isJoined && user?.role === 'jugador') || (q.status !== 'open' && !isJoined)) && (
                  <Link to={`/quedadas/${q.id}`} className="btn-secondary w-full text-sm block text-center">
                    Ver detalles
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
