import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const STATS = [
  { value: '20+', label: 'Jugadores activos', icon: '👥' },
  { value: '5', label: 'Pistas disponibles', icon: '🏟️' },
  { value: '500+', label: 'Partidos jugados', icon: '🎾' },
  { value: 'ELO', label: 'Sistema de ranking', icon: '📊' },
]

const FEATURES = [
  {
    icon: '📅',
    title: 'Reservas inteligentes',
    desc: 'Calendario interactivo con disponibilidad en tiempo real. Reserva en franjas de 1h o 1.5h con cancelación flexible.',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/20',
  },
  {
    icon: '🎾',
    title: 'Quedadas sin repetición',
    desc: 'Algoritmo avanzado que genera emparejamientos de dobles garantizando que no repitas compañero ni rival.',
    gradient: 'from-brand-500/20 to-emerald-500/20',
    border: 'border-brand-500/20',
  },
  {
    icon: '📈',
    title: 'Ranking ELO',
    desc: 'Tu nivel se actualiza automáticamente tras cada partido confirmado. Estadísticas detalladas por jugador.',
    gradient: 'from-orange-500/20 to-yellow-500/20',
    border: 'border-orange-500/20',
  },
  {
    icon: '🏆',
    title: 'Torneos y campeonatos',
    desc: 'Eliminación directa, liguilla o formato combinado. El cuadro se genera automáticamente con gestión de parejas.',
    gradient: 'from-purple-500/20 to-pink-500/20',
    border: 'border-purple-500/20',
  },
]

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-brand-500/20 text-brand-400 text-sm font-medium mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            Sistema de gestión profesional para clubs de pádel
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight animate-fade-in">
            Tu club de pádel,{' '}
            <span className="gradient-text">digitalizado</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in">
            Reservas en tiempo real, quedadas con emparejamiento inteligente, ranking ELO y torneos.
            Todo lo que necesitas para gestionar tu club en una sola plataforma.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            {user ? (
              <Link to="/dashboard" className="btn-primary text-base px-8 py-4 glow">
                Ir al Dashboard →
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary text-base px-8 py-4 glow">
                  Empezar gratis →
                </Link>
                <Link to="/login" className="btn-outline text-base px-8 py-4">
                  Iniciar sesión
                </Link>
              </>
            )}
          </div>

          {/* Cancha visual decorativa */}
          <div className="relative mt-20 mx-auto max-w-3xl animate-fade-in">
            <div className="glass border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <div className="court-lines bg-gradient-to-br from-brand-900/40 to-slate-900/80 p-8 aspect-video flex items-center justify-center">
                <div className="glass border border-white/10 rounded-2xl p-6 text-center max-w-xs">
                  <div className="text-5xl mb-3">🎾</div>
                  <div className="font-display font-bold text-2xl text-white">Pista 1 — Central</div>
                  <div className="badge-green mt-2">Disponible</div>
                  <div className="mt-4 text-sm text-slate-400">Cristal · Interior · 08:00 – 22:00</div>
                </div>
              </div>
            </div>
            {/* Floating cards */}
            <div className="absolute -top-4 -left-4 glass border border-brand-500/20 rounded-xl px-3 py-2 shadow-xl animate-float">
              <div className="text-xs text-slate-400">Ranking</div>
              <div className="font-bold text-brand-400 text-sm">#1 Francisco V.</div>
              <div className="text-xs text-slate-500">ELO 1500</div>
            </div>
            <div className="absolute -top-4 -right-4 glass border border-orange-500/20 rounded-xl px-3 py-2 shadow-xl animate-float" style={{ animationDelay: '2s' }}>
              <div className="text-xs text-slate-400">Próxima quedada</div>
              <div className="font-bold text-orange-400 text-sm">Viernes 18:00</div>
              <div className="text-xs text-slate-500">7/8 plazas</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats ───────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-y border-slate-800">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(({ value, label, icon }) => (
            <div key={label} className="text-center">
              <div className="text-3xl mb-1">{icon}</div>
              <div className="font-display font-black text-4xl gradient-text">{value}</div>
              <div className="text-sm text-slate-400 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl font-black text-white mb-3">
              Todo lo que tu club necesita
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Una plataforma completa diseñada para la gestión profesional de clubs de pádel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map(({ icon, title, desc, gradient, border }) => (
              <div
                key={title}
                className={`card-hover bg-gradient-to-br ${gradient} border ${border} rounded-2xl p-7`}
              >
                <div className="text-4xl mb-4">{icon}</div>
                <h3 className="font-display text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────── */}
      {!user && (
        <section className="py-24 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="glass border border-brand-500/20 rounded-3xl p-12 glow">
              <h2 className="font-display text-4xl font-black text-white mb-4">
                Únete al club 🎾
              </h2>
              <p className="text-slate-400 mb-8 text-lg">
                Regístrate gratis y empieza a reservar pistas, unirte a quedadas y subir en el ranking.
              </p>
              <Link to="/register" className="btn-primary text-lg px-10 py-4">
                Crear cuenta gratis →
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
