import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const LEVELS = [
  { value: 'iniciacion', label: 'Iniciación', desc: 'Aprendo a jugar' },
  { value: 'intermedio', label: 'Intermedio', desc: 'Juego regularmente' },
  { value: 'avanzado', label: 'Avanzado', desc: 'Compito en torneos' },
  { value: 'elite', label: 'Élite', desc: 'Alto nivel competitivo' },
]

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '', level: 'intermedio', phone: '',
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (form.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setLoading(true)
    try {
      await register({ name: form.name, email: form.email, password: form.password, level: form.level, phone: form.phone })
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
                <label htmlFor="phone" className="label">Teléfono <span className="text-slate-500">(opcional)</span></label>
                <input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange}
                  placeholder="+34 600 000 000" className="input" />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="label">Email</label>
              <input id="reg-email" name="email" type="email" value={form.email} onChange={handleChange}
                placeholder="tu@email.com" className="input" required autoComplete="email" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-password" className="label">Contraseña</label>
                <input id="reg-password" name="password" type="password" value={form.password} onChange={handleChange}
                  placeholder="Mínimo 8 caracteres" className="input" required autoComplete="new-password" />
              </div>
              <div>
                <label htmlFor="confirm" className="label">Confirmar contraseña</label>
                <input id="confirm" name="confirm" type="password" value={form.confirm} onChange={handleChange}
                  placeholder="Repite la contraseña" className="input" required />
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
