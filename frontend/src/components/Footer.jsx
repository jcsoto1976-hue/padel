import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center">
                <span>🎾</span>
              </div>
              <span className="font-display font-bold text-lg text-white">
                PADEL<span className="text-brand-400">Club</span>
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Tu plataforma de gestión integral para el club de pádel. Reservas, quedadas, ranking y torneos en un solo lugar.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Plataforma</h3>
            <ul className="space-y-2">
              {[
                { to: '/reservas', label: 'Reservar pista' },
                { to: '/quedadas', label: 'Quedadas' },
                { to: '/ranking', label: 'Ranking ELO' },
                { to: '/torneos', label: 'Torneos' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-slate-400 hover:text-brand-400 text-sm transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Horarios</h3>
            <ul className="space-y-1 text-slate-400 text-sm">
              <li>Lunes – Viernes: 08:00 – 22:00</li>
              <li>Sábado: 08:00 – 22:00</li>
              <li>Domingo: 09:00 – 20:00</li>
            </ul>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse-slow" />
              <span className="text-brand-400 text-sm font-medium">Reservas en tiempo real</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} PADEL Club Manager. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span>Hecho con</span>
            <span className="text-red-400">❤️</span>
            <span>para jugadores de pádel</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
