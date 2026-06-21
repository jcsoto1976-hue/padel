import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const LEVELS = [
  { value: '6ta_B', label: '6ª B', desc: 'Categoría Inicial B' },
  { value: '6ta_A', label: '6ª A', desc: 'Categoría Inicial A' },
  { value: '5ta_B', label: '5ª B', desc: 'Categoría Quinta B' },
  { value: '5ta_A', label: '5ª A', desc: 'Categoría Quinta A' },
  { value: '4ta_B', label: '4ª B', desc: 'Categoría Cuarta B' },
  { value: '4ta_A', label: '4ª A', desc: 'Categoría Cuarta A' },
  { value: '3ra_B', label: '3ª B', desc: 'Categoría Tercera B' },
  { value: '3ra_A', label: '3ª A', desc: 'Categoría Tercera A' },
]

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', level: '6ta_B', phone: '', gender: '',
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!/^\d{10}$/.test(form.phone)) {
      toast.error('El teléfono debe tener exactamente 10 números')
      return
    }
    if (!form.gender) {
      toast.error('Por favor, selecciona tu género ♂/♀')
      return
    }
    setLoading(true)
    try {
      await register({ name: form.name, password: form.phone, level: form.level, phone: form.phone, gender: form.gender })
      toast.success('¡Cuenta creada! Bienvenido al club 🎾')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16 pb-12">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="card border border-slate-700/50 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg shadow-brand-500/30">
              🎾
            </div>
            <h1 className="font-display text-2xl font-bold text-white">Únete al club</h1>
            <p className="text-slate-400 text-sm mt-1">Crea tu cuenta de jugador gratis</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="label">Nombre completo</label>
                <input id="name" name="name" type="text" value={form.name} onChange={handleChange}
                  placeholder="Tu nombre" className="input" required />
              </div>
              <div>
                <label htmlFor="phone" className="label">Teléfono</label>
                <input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} 
                  pattern="\d{10}" maxLength={10} minLength={10}
                  className="input" placeholder="Ej: 0991234567" required />
              </div>
            </div>

            {/* Selector de género */}
            <div>
              <label className="label">Género</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, gender: 'H' }))}
                  className={`p-3 rounded-xl border text-center font-semibold transition-all duration-200 ${
                    form.gender === 'H'
                      ? 'border-brand-500/60 bg-brand-500/10 text-white'
                      : 'border-slate-700/50 hover:border-slate-600 text-slate-400'
                  }`}
                >
                  Hombre ♂
                </button>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, gender: 'M' }))}
                  className={`p-3 rounded-xl border text-center font-semibold transition-all duration-200 ${
                    form.gender === 'M'
                      ? 'border-brand-500/60 bg-brand-500/10 text-white'
                      : 'border-slate-700/50 hover:border-slate-600 text-slate-400'
                  }`}
                >
                  Mujer ♀
                </button>
              </div>
            </div>

            {/* Selector de nivel */}
            <div>
              <label className="label">Tu nivel de juego</label>
              <div className="grid grid-cols-2 gap-2">
                {LEVELS.map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, level: value }))}
                    className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                      form.level === value
                        ? 'border-brand-500/60 bg-brand-500/10 text-white'
                        : 'border-slate-700/50 hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    <div className={`text-xs font-bold mb-0.5 level-${value}`}>{label}</div>
                    <div className="text-xs text-slate-500">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creando cuenta...
                </span>
              ) : (
                'Crear cuenta gratis →'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-semibold">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
