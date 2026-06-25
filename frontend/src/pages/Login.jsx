import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ phone: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.phone, form.password)
      toast.success('¡Bienvenido de vuelta!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16">
      <div className="w-full max-w-md animate-fade-in">
        {/* Card */}
        <div className="card border border-slate-700/50 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg shadow-brand-500/30">
              🎾
            </div>
            <h1 className="font-display text-2xl font-bold text-white">Bienvenido</h1>
            <p className="text-slate-400 text-sm mt-1">Accede a tu cuenta del club</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="phone" className="label">Teléfono</label>
              <input
                id="phone"
                name="phone"
                type="text"
                value={form.phone}
                onChange={handleChange}
                placeholder="Teléfono o usuario"
                className="input"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="input"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Iniciando sesión...
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>



          <p className="text-center text-sm text-slate-400 mt-6">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-semibold">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
