import React from 'react'

export default function TrialExpired() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16 pb-12 bg-slate-950">
      <div className="w-full max-w-md text-center p-8 bg-slate-900/80 border border-slate-700/50 rounded-2xl shadow-2xl animate-fade-in backdrop-blur-md">
        <div className="text-6xl mb-4 animate-pulse">⏳</div>
        <h1 className="font-display text-2xl font-bold text-white mb-2">Periodo de Prueba Expirado</h1>
        <p className="text-slate-400 text-sm mb-6">
          Los 30 días de prueba gratuita para este club han concluido.
        </p>
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 text-left space-y-3 mb-6">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">¿Cómo activar tu licencia?</div>
          <p className="text-xs text-slate-500">
            Para continuar administrando el club (calendario de reservas, cobros de caja/TPV, torneos y rankings ELO), por favor contacta con soporte para activar tu plan comercial:
          </p>
          <div className="text-xs text-brand-400 font-bold">
            📧 soporte@tuclubdepadel.com
          </div>
          <div className="text-xs text-slate-400">
            📞 +593 99 999 9999 (Soporte Ecuador)
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('padel_token')
            window.location.href = '/login'
          }}
          className="btn-outline w-full py-2.5 text-xs font-bold"
        >
          Volver a Iniciar Sesión
        </button>
      </div>
    </div>
  )
}
