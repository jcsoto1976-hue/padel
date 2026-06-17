import { useEffect, useState } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminSeasons() {
  const [seasons, setSeasons] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', is_active: false })
  const [submitting, setSubmitting] = useState(false)

  const fetchSeasons = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/seasons')
      setSeasons(data.seasons || [])
    } catch {
      toast.error('Error al cargar las temporadas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSeasons()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/seasons', form)
      toast.success('¡Temporada creada! 🏆')
      setForm({ name: '', start_date: '', end_date: '', is_active: false })
      fetchSeasons()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear la temporada')
    } finally {
      setSubmitting(false)
    }
  }

  const handleActivate = async (id) => {
    try {
      await api.put(`/seasons/${id}/activate`)
      toast.success('Temporada activa actualizada')
      fetchSeasons()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al activar temporada')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Seguro que quieres eliminar esta temporada?')) return
    try {
      await api.delete(`/seasons/${id}`)
      toast.success('Temporada eliminada')
      fetchSeasons()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar')
    }
  }

  return (
    <div className="animate-fade-in">
      <h2 className="section-title mb-1">Gestión de Temporadas</h2>
      <p className="section-subtitle mb-6">Configura y activa las etapas o temporadas de liga del club</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario Crear */}
        <div className="lg:col-span-1">
          <div className="card border border-brand-500/20">
            <h3 className="font-semibold text-brand-300 mb-4">+ Nueva Temporada / Etapa</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label text-xs">Nombre *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Primera Etapa 2026"
                  className="input text-sm"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs">Fecha Inicio *</label>
                  <input
                    type="date"
                    required
                    className="input text-sm"
                    value={form.start_date}
                    onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label text-xs">Fecha Fin (Opcional)</label>
                  <input
                    type="date"
                    className="input text-sm"
                    value={form.end_date}
                    onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                  className="accent-brand-500 w-4 h-4"
                />
                <label htmlFor="is_active" className="text-xs text-slate-300">Activar inmediatamente</label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-2.5 text-sm"
              >
                {submitting ? 'Creando...' : 'Crear Temporada'}
              </button>
            </form>
          </div>
        </div>

        {/* Listado */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            [1, 2].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)
          ) : seasons.length === 0 ? (
            <div className="card text-center py-12 text-slate-400">
              No hay temporadas registradas. Crea una para empezar.
            </div>
          ) : (
            seasons.map(s => (
              <div key={s.id} className={`card border transition-all ${s.is_active ? 'border-brand-500 bg-brand-500/5' : 'border-slate-800'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-200 text-lg flex items-center gap-2">
                      {s.name}
                      {s.is_active && <span className="badge badge-green text-xs">Activa 🟢</span>}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      📅 {new Date(s.start_date).toLocaleDateString('es-ES')} 
                      {s.end_date ? ` al ${new Date(s.end_date).toLocaleDateString('es-ES')}` : ' (En curso)'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!s.is_active && (
                      <button
                        onClick={() => handleActivate(s.id)}
                        className="btn-primary text-xs py-1.5 px-3 bg-brand-500/20 hover:bg-brand-500 text-brand-400 hover:text-slate-950 border border-brand-500/30"
                      >
                        Activar
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-red-400 hover:text-red-300 text-sm p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Eliminar temporada"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
