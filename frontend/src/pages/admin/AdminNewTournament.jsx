import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminNewTournament() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    description: '',
    format: 'eliminacion_directa',
    level: '6ta_B',
    start_date: '',
    end_date: '',
    prize_info: '',
    gender_restriction: 'mixto',
  })
  const [loading, setLoading] = useState(false)
  const [courts, setCourts] = useState([])
  const [selectedCourts, setSelectedCourts] = useState([])

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

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedCourts.length === 0) {
      toast.error('Debes seleccionar al menos una pista para el torneo')
      return
    }
    setLoading(true)
    try {
      const payload = {
        name: form.name,
        description: form.description,
        format: form.format,
        level: form.level,
        start_date: form.start_date,
        end_date: form.end_date || null,
        prize_info: form.prize_info,
        selected_courts: selectedCourts,
        gender_restriction: form.gender_restriction,
      }
      const { data } = await api.post('/tournaments', payload)
      toast.success('¡Torneo creado con éxito! 🏆')
      // Redirigir al detalle del torneo
      navigate(`/torneos/${data.tournament.id}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear torneo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto pt-24 pb-16 px-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-black text-white">🏆 Crear Nuevo Torneo</h1>
        <p className="text-slate-400 text-sm mt-1">Configura las reglas y parámetros de la competición</p>
      </div>

      <div className="card border border-slate-700/50">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre del Torneo *</label>
            <input
              type="text"
              name="name"
              required
              placeholder="Ej: Open Otoño Club 2026"
              value={form.name}
              onChange={handleChange}
              className="input"
            />
          </div>

          <div>
            <label className="label">Descripción</label>
            <textarea
              name="description"
              rows={3}
              placeholder="Detalles sobre el formato del torneo, patrocinadores, etc."
              value={form.description}
              onChange={handleChange}
              className="input resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Formato de Juego *</label>
              <select
                name="format"
                value={form.format}
                onChange={handleChange}
                className="input"
              >
                <option value="eliminacion_directa">Eliminación Directa</option>
                <option value="liguilla">Liguilla (Todos contra todos)</option>
                <option value="americano">Americano (Parejas no fijas)</option>
              </select>
            </div>
            <div>
              <label className="label">Nivel de Categoría *</label>
              <select
                name="level"
                value={form.level}
                onChange={handleChange}
                className="input"
              >
                {Object.entries(levelLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">¿Es un torneo mixto o por género? *</label>
              <select
                name="gender_restriction"
                value={form.gender_restriction}
                onChange={handleChange}
                className="input"
              >
                <option value="mixto">Sí, es Mixto (Parejas siempre Hombre + Mujer) ⚤</option>
                <option value="hombres">No, Solo Hombres ♂</option>
                <option value="mujeres">No, Solo Mujeres ♀</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha Inicio *</label>
              <input
                type="date"
                name="start_date"
                required
                value={form.start_date}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="label">Fecha Fin (Opcional)</label>
              <input
                type="date"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Pistas Reservadas para el Torneo *</label>
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
            {selectedCourts.length > 0 && (
              <div className="text-xs text-brand-400 font-semibold mt-2">
                {form.format === 'americano'
                  ? `📢 Al seleccionar ${selectedCourts.length} ${selectedCourts.length === 1 ? 'cancha' : 'canchas'}, el torneo admitirá un máximo de ${selectedCourts.length * 4} jugadores (parejas no fijas, se mezclan cada ronda).`
                  : `📢 Al seleccionar ${selectedCourts.length} ${selectedCourts.length === 1 ? 'cancha' : 'canchas'}, el torneo admitirá un máximo de ${selectedCourts.length * 2} parejas (${selectedCourts.length * 4} jugadores).`
                }
              </div>
            )}
          </div>

          <div>
            <label className="label">Premios e Información de Recompensas</label>
            <textarea
              name="prize_info"
              rows={3}
              placeholder="Ej: 🏆 1er Puesto: Trofeo + Pala de carbono&#13;🥈 2do Puesto: Mochila de pádel"
              value={form.prize_info}
              onChange={handleChange}
              className="input resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? 'Creando torneo...' : 'Crear Torneo'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/torneos')}
              className="btn-secondary w-full py-3"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
