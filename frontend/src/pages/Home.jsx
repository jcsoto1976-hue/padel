import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const STATS = [
  { value: '30 Días', label: 'Prueba gratuita sin tarjeta', icon: '⏳' },
  { value: 'Supabase', label: 'Base de datos en la nube', icon: '⚡' },
  { value: 'TPV Caja', label: 'Inventario y cobros integrados', icon: '💰' },
  { value: 'ELO Padel', label: 'Estadísticas y H2H interactivo', icon: '📈' },
]

const FEATURES = [
  {
    icon: '💰',
    title: 'Control de Caja y TPV',
    desc: 'Lleva el registro de las ventas de cafetería, reposición de inventario y arqueo de caja diario con sumarios automatizados.',
    gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    border: 'border-emerald-500/20',
    tag: 'Finanzas'
  },
  {
    icon: '🔄',
    title: 'Torneos Clásicos y Americanos',
    desc: 'Algoritmo inteligente para generar emparejamientos de dobles (con opción mixta estricta) y cronómetro de ronda táctil.',
    gradient: 'from-brand-500/10 via-brand-500/5 to-transparent',
    border: 'border-brand-500/20',
    tag: 'Competición'
  },
  {
    icon: '📊',
    title: 'Ranking ELO & H2H',
    desc: 'Los jugadores suben y bajan de nivel tras cada partido. Perfiles con rachas de victorias y comparador cara a cara interactivo.',
    gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
    border: 'border-blue-500/20',
    tag: 'Gamificación'
  },
  {
    icon: '📱',
    title: 'Acceso QR y PWA Móvil',
    desc: 'Imprime el cartel QR oficial en un clic para tu recepción. Los jugadores instalan la app PWA en sus móviles al instante.',
    gradient: 'from-purple-500/10 via-purple-500/5 to-transparent',
    border: 'border-purple-500/20',
    tag: 'Onboarding'
  },
]

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="relative overflow-hidden bg-slate-950 min-h-screen">
      {/* Fondos degradados decorativos de alta gama */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[650px] h-[650px] bg-brand-500/10 rounded-full blur-[130px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[40%] left-[-15%] w-[550px] h-[550px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute bottom-[-10%] right-[20%] w-[450px] h-[450px] bg-emerald-500/5 rounded-full blur-[110px]" />
      </div>

      {/* ─── Hero Section ─────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-brand-500/30 text-brand-400 text-xs font-semibold mb-8 animate-fade-in shadow-lg shadow-brand-950/20">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
            Software de Gestión Deportiva Premium & Gamificación
          </div>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight tracking-tight max-w-5xl mx-auto animate-fade-in">
            Lleva tu club de pádel al <span className="bg-gradient-to-r from-brand-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">siguiente nivel</span>
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed animate-fade-in">
            Una suite completa integrada con base de datos Supabase. Gestiona reservas, controla la caja de cobros, y fomenta la competitividad con rankings ELO, torneos automáticos y Head-to-Head.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in">
            {user ? (
              <Link to="/dashboard" className="btn-primary text-base px-8 py-4 glow min-w-[200px]">
                Ir al Panel Principal →
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary text-base px-8 py-4 glow min-w-[200px]">
                  Probar 30 Días Gratis →
                </Link>
                <Link to="/login" className="btn-outline text-base px-8 py-4 min-w-[200px]">
                  Iniciar Sesión
                </Link>
              </>
            )}
          </div>

          {/* ─── Mockup interactivo de la App (Aesthetic UI) ────────────────── */}
          <div className="relative mt-20 mx-auto max-w-5xl animate-fade-in bg-slate-900/60 p-2 sm:p-4 rounded-3xl border border-slate-800/80 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-800/80 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/60" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <span className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="font-mono bg-slate-950/60 px-3 py-1 rounded-md border border-slate-900">
                https://clubpadel.app/admin/dashboard
              </div>
              <div className="text-right select-none">💻 Vista Premium</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 text-left">
              {/* Mockup Panel Izquierdo: ELO Rankings */}
              <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">🏆 Top Clasificación ELO</h4>
                  <span className="text-[10px] text-brand-400 bg-brand-950/30 px-2 py-0.5 rounded font-mono">Activo</span>
                </div>
                <div className="space-y-2.5">
                  {[
                    { rank: '🥇', name: 'Francisco Vargas', elo: 1500, level: '3ra_A' },
                    { rank: '🥈', name: 'Valentina Cruz', elo: 1450, level: '3ra_B' },
                    { rank: '🥉', name: 'Laura Herrera', elo: 1280, level: '4ta_B' }
                  ].map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-900/40 rounded-xl border border-slate-850 text-xs">
                      <div className="flex items-center gap-2">
                        <span>{p.rank}</span>
                        <span className="font-semibold text-slate-200">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-brand-400 font-bold font-mono">{p.elo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mockup Panel Central: Grilla de Reservas y Horarios */}
              <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">📅 Grilla de Reservas</h4>
                  <span className="text-[10px] text-brand-400 bg-brand-950/30 px-2 py-0.5 rounded font-mono">En tiempo real</span>
                </div>
                <div className="space-y-2">
                  {[
                    { time: '08:00 - 09:30', title: 'Reserva Privada', status: 'Ocupado', statusColor: 'text-slate-500 bg-slate-950/40 border-slate-900/20', btnText: 'Completo 🔒', btnClass: 'bg-slate-900/60 text-slate-500 cursor-not-allowed border-slate-800' },
                    { time: '09:30 - 11:00', title: 'Abierto ELO 3ra', status: '3/4 unidos', statusColor: 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30', btnText: 'Unirse 🎾', btnClass: 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-md shadow-emerald-950/50' },
                    { time: '11:00 - 12:30', title: 'Turno Disponible', status: 'Libre', statusColor: 'text-brand-400 bg-brand-950/20 border-brand-900/30', btnText: 'Reservar', btnClass: 'border border-brand-500/50 text-brand-400 hover:bg-brand-500/10' },
                    { time: '12:30 - 14:00', title: 'Turno Disponible', status: 'Libre', statusColor: 'text-brand-400 bg-brand-950/20 border-brand-900/30', btnText: 'Reservar', btnClass: 'border border-brand-500/50 text-brand-400 hover:bg-brand-500/10' }
                  ].map((slot, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-900/50 rounded-xl border border-slate-850/80 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-2 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-brand-400 font-semibold text-[10px]">{slot.time}</span>
                          <span className={`text-[9px] px-1.5 py-0.25 rounded border font-semibold ${slot.statusColor}`}>{slot.status}</span>
                        </div>
                        <div className="font-medium text-slate-200 text-[11px] mt-0.5">{slot.title}</div>
                      </div>
                      <button className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all active:scale-95 ${slot.btnClass}`}>
                        {slot.btnText}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mockup Panel Derecho: TPV Cafetería & Control de Caja */}
              <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">💰 TPV & Balance de Caja</h4>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Abierta
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-850/80 text-center">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Caja Hoy</div>
                    <div className="text-2xl font-black text-white font-mono mt-1">$342.50</div>
                    <div className="flex justify-center gap-4 mt-2 text-[10px] text-slate-400 border-t border-slate-900 pt-2 font-mono">
                      <div>💵 cash: $120.00</div>
                      <div>💳 card: $222.50</div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Últimas Ventas</div>
                    {[
                      { item: '🥤 2x Gatorade', price: '$4.00', time: 'hace 5 min' },
                      { item: '🎾 1x Bote Bolas Head', price: '$6.50', time: 'hace 12 min' },
                      { item: '☕ 1x Café + Tostado', price: '$3.50', time: 'hace 20 min' }
                    ].map((sale, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] p-1.5 bg-slate-900/20 rounded-lg border border-slate-850">
                        <div className="text-slate-300">
                          <span>{sale.item}</span>
                          <span className="text-[9px] text-slate-500 ml-2">({sale.time})</span>
                        </div>
                        <span className="font-bold text-slate-200 font-mono">{sale.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats Section ────────────────────────────────────────── */}
      <section className="py-16 px-6 border-y border-slate-900 bg-slate-950/50">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(({ value, label, icon }) => (
            <div key={label} className="text-center p-4 rounded-2xl hover:bg-slate-900/20 transition-all duration-300">
              <div className="text-3xl mb-2">{icon}</div>
              <div className="font-display font-black text-3xl text-white">{value}</div>
              <div className="text-xs text-slate-500 mt-1 max-w-[150px] mx-auto leading-relaxed">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features Section ─────────────────────────────────────── */}
      <section className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-black text-white mb-3">
              Gestión Integral para Clubs
            </h2>
            <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Equipado con herramientas automatizadas de control financiero y automatización de torneos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map(({ icon, title, desc, gradient, border, tag }) => (
              <div
                key={title}
                className={`card bg-gradient-to-br ${gradient} border ${border} hover:border-brand-500/40 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl shadow-slate-950/50 relative overflow-hidden`}
              >
                <div className="absolute top-4 right-4 text-[9px] uppercase tracking-wider font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
                  {tag}
                </div>
                <div className="text-4xl mb-4">{icon}</div>
                <h3 className="font-display text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Beneficios del Software ─────────────────────────────── */}
      <section className="py-20 px-6 border-t border-slate-900 bg-slate-900/10">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl font-black text-white mb-6">
                Diseñado para maximizar la rentabilidad de tu club
              </h2>
              <div className="space-y-5">
                {[
                  { title: 'Evita canchas vacías', text: 'Los jugadores pueden crear o unirse a "partidos abiertos" de su nivel para completar el cuórum de 4 personas automáticamente.' },
                  { title: 'Cero fugas de caja', text: 'Cada alquiler de palas, bote de bolas o consumible de cafetería se registra en el TPV, conciliando con el arqueo al final del día.' },
                  { title: 'Fidelización de jugadores', text: 'Los usuarios juegan más partidos oficiales para subir su puntuación ELO, defender sus rachas y ganar rivalidades directas.' }
                ].map((b, idx) => (
                  <div key={idx} className="flex gap-3 text-left">
                    <span className="text-brand-400 text-lg">✓</span>
                    <div>
                      <h4 className="font-bold text-slate-200 text-sm">{b.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{b.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Visual poster mockup */}
            <div className="p-8 bg-gradient-to-br from-slate-900/60 to-slate-950/80 border border-slate-800 rounded-3xl text-center space-y-4 shadow-xl">
              <div className="w-12 h-12 rounded-full bg-brand-500/15 flex items-center justify-center text-brand-400 mx-auto text-xl font-bold">
                📱
              </div>
              <h3 className="font-bold text-white text-lg">¿Listo para el lanzamiento?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Descarga el cartel QR de acceso desde el panel de administración, imprímelo y pégalo en la entrada del club para el autoregistro rápido de los jugadores.
              </p>
              <div className="pt-2">
                <span className="text-[10px] text-slate-500 bg-slate-950 border border-slate-900/80 px-3 py-1.5 rounded-full font-mono">
                  Soporta instalación PWA en iOS y Android
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Call to Action (CTA) ────────────────────────────────── */}
      {!user && (
        <section className="py-24 px-6 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="glass border border-brand-500/30 rounded-3xl p-10 sm:p-14 shadow-2xl relative overflow-hidden">
              {/* Backlight effect */}
              <div className="absolute inset-0 bg-brand-500/5 rounded-3xl filter blur-xl pointer-events-none" />
              <h2 className="font-display text-3xl sm:text-4xl font-black text-white mb-4 relative z-10">
                Digitaliza tu club hoy mismo 🎾
              </h2>
              <p className="text-slate-400 mb-8 text-base sm:text-lg max-w-xl mx-auto leading-relaxed relative z-10">
                Regístrate ahora y disfruta del sistema completo con **30 días de prueba gratuita** sin compromiso.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center relative z-10">
                <Link to="/register" className="btn-primary text-base px-8 py-4 glow min-w-[200px]">
                  Comenzar Prueba Gratis →
                </Link>
                <Link to="/login" className="btn-outline text-base px-8 py-4 min-w-[200px]">
                  Iniciar Sesión
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
