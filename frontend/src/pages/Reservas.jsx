import { useState, useEffect, useCallback } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '../context/AuthContext'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import api from '../services/api'
import toast from 'react-hot-toast'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { es },
})

const MESSAGES = {
  today: 'Hoy',
  previous: '← Anterior',
  next: 'Siguiente →',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Agenda',
  noEventsInRange: 'No hay reservas en este período',
}

export default function Reservas() {
  const { user } = useAuth()
  const [courts, setCourts] = useState([])
  const [events, setEvents] = useState([])
  const [selectedCourt, setSelectedCourt] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [duration, setDuration] = useState(60)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [reserverName, setReserverName] = useState('')

  // Estados del cobro y detalles de reserva
  const [selectedEventDetails, setSelectedEventDetails] = useState(null)
  const [showPayForm, setShowPayForm] = useState(false)
  const [payAmount, setPayAmount] = useState(30)
  const [payMethod, setPayMethod] = useState('cash')
  const [payLoading, setPayLoading] = useState(false)
  const [todayClosed, setTodayClosed] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [publicLevel, setPublicLevel] = useState('mixto')

  // Cargar pistas
  useEffect(() => {
    api.get('/courts').then(({ data }) => {
      setCourts(data.courts)
      if (data.courts.length) setSelectedCourt(data.courts[0].id)
    })

    // Check Stripe checkout redirect query parameters
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment_success') === 'true') {
      toast.success('💳 ¡Pago online confirmado y pista reservada! 🎾')
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (params.get('payment_cancel') === 'true') {
      toast.error('❌ El pago online fue cancelado.')
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  // Cargar estado de cierre de caja
  useEffect(() => {
    if (user?.role === 'admin') {
      const today = new Date().toISOString().split('T')[0]
      api.get(`/cash/summary?date=${today}`)
        .then(({ data }) => {
          setTodayClosed(data.isClosed)
        })
        .catch(() => { /* ignore */ })
    }
  }, [user])

  // Cargar reservas al cambiar pista o fecha
  const loadReservations = useCallback(async () => {
    if (!selectedCourt) return
    setLoading(true)
    try {
      const dates = [-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7].map(d => {
        const dt = new Date(currentDate)
        dt.setDate(dt.getDate() + d)
        return format(dt, 'yyyy-MM-dd')
      })

      const allEvents = []
      for (const d of dates) {
        const { data } = await api.get(`/reservations?courtId=${selectedCourt}&date=${d}`)
        data.reservations.forEach(r => {
          allEvents.push({
            id: r.id,
            title: `${r.court?.name || 'Pista'} — ${r.notes || r.user?.name || 'Reservado'} ${
              r.status === 'completed' ? ' (Pagado)' : ''
            }`,
            start: new Date(r.start_datetime),
            end: new Date(r.end_datetime),
            resource: r,
          })
        })
      }
      setEvents(allEvents)
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [selectedCourt, currentDate])

  useEffect(() => { loadReservations() }, [loadReservations])

  const handleSelectSlot = ({ start }) => {
    // Solo permitir slots futuros
    if (start < new Date()) {
      toast.error('No puedes reservar en el pasado')
      return
    }
    setSelectedSlot(start)
  }

  const handleConfirmReservation = async () => {
    if (!selectedSlot || !selectedCourt) return
    setSubmitting(true)
    try {
      const { data } = await api.post('/reservations', {
        court_id: selectedCourt,
        start_datetime: selectedSlot.toISOString(),
        duration_minutes: duration,
        notes: reserverName,
        is_recurring: isRecurring,
        is_public: isPublic,
        public_level: publicLevel
      })

      toast.success(isRecurring ? '¡Reservas recurrentes creadas! 🎾' : '¡Pista reservada correctamente! 🎾')

      if (!isRecurring && data.reservation) {
        if (confirm('¿Deseas pagar la cancha online con tarjeta de crédito/débito ahora mismo?')) {
          const payRes = await api.post('/payments/create-session', {
            type: 'reservation',
            id: data.reservation.id
          })
          if (payRes.data.url) {
            window.location.href = payRes.data.url
            return
          }
        }
      }

      setSelectedSlot(null)
      setReserverName('')
      setIsRecurring(false)
      setIsPublic(false)
      loadReservations()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al reservar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelReservation = async (reservationId) => {
    try {
      await api.delete(`/reservations/${reservationId}`)
      toast.success('Reserva cancelada')
      loadReservations()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cancelar')
    }
  }

  // Cerrar/Cobrar Cancha
  const handleClosePayment = async (e) => {
    e.preventDefault()
    if (!selectedEventDetails) return
    setPayLoading(true)
    try {
      await api.post(`/cash/reservations/${selectedEventDetails.id}/close`, {
        amount: payAmount,
        payment_method: payMethod,
      })
      toast.success('¡Pago de pista registrado!')
      setSelectedEventDetails(null)
      setShowPayForm(false)
      loadReservations()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar pago')
    } finally {
      setPayLoading(false)
    }
  }

  const handleSelectEvent = (event) => {
    if (user?.role === 'admin') {
      setSelectedEventDetails(event.resource)
      // Ajustar tarifa sugerida según duración: $20/hr
      const mins = event.resource.duration_minutes || 60
      setPayAmount((mins / 60) * 20.00)
      setPayMethod('cash')
      setShowPayForm(false)

      // Re-fetch today's cash closing status to be up-to-date
      const today = new Date().toISOString().split('T')[0]
      api.get(`/cash/summary?date=${today}`)
        .then(({ data }) => {
          setTodayClosed(data.isClosed)
        })
        .catch(() => { /* ignore */ })
    } else {
      if (confirm(`¿Cancelar tu reserva?`)) {
        handleCancelReservation(event.id)
      }
    }
  }

  const eventPropGetter = (event) => {
    const isCompleted = event.resource?.status === 'completed'
    let style = {
      borderRadius: '8px',
      opacity: 0.9,
      color: 'white',
      border: '0px',
      display: 'block',
    }

    if (isCompleted) {
      style.backgroundColor = '#15803d' // Verde más oscuro para reservas pagadas
      style.border = '1px solid #16a34a'
    } else {
      style.backgroundColor = '#2563eb' // Azul para reservas activas pendientes de pago
      style.border = '1px solid #3b82f6'
    }

    return { style }
  }

  const courtSelected = courts.find(c => c.id === selectedCourt)

  return (
    <div className="pt-24 pb-16 px-6 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="section-title text-3xl">📅 Reservar Pista</h1>
        <p className="section-subtitle">Selecciona una pista y haz clic en el horario deseado</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Selector de pista */}
          <div className="card">
            <h3 className="font-semibold text-slate-200 mb-3 text-sm">Seleccionar pista</h3>
            <div className="space-y-2">
              {courts.map(court => (
                <button
                  key={court.id}
                  onClick={() => setSelectedCourt(court.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                    selectedCourt === court.id
                      ? 'border-brand-500/60 bg-brand-500/10'
                      : 'border-slate-700/40 hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-200">{court.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500 capitalize">{court.surface}</span>
                    <span className="text-xs text-slate-500">{court.is_indoor ? '🏠 Indoor' : '☀️ Exterior'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Duración */}
          <div className="card">
            <h3 className="font-semibold text-slate-200 mb-3 text-sm">Duración</h3>
            <div className="grid grid-cols-3 gap-2">
              {[60, 90, 120].map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    duration === d
                      ? 'border-brand-500/60 bg-brand-500/10 text-brand-300'
                      : 'border-slate-700/40 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {d === 60 ? '1h' : d === 90 ? '1h 30m' : '2h'}
                </button>
              ))}
            </div>
          </div>

          {/* Slot seleccionado */}
          {selectedSlot && (
            <div className="card border border-brand-500/30 bg-brand-500/5 animate-slide-right">
              <h3 className="font-semibold text-brand-300 mb-3 text-sm">✅ Horario seleccionado</h3>
              <div className="text-sm text-slate-300 mb-1">
                📅 {format(selectedSlot, "EEEE, d 'de' MMMM", { locale: es })}
              </div>
              <div className="text-sm text-slate-300 mb-1">
                🕐 {format(selectedSlot, 'HH:mm')} — {format(new Date(selectedSlot.getTime() + duration * 60000), 'HH:mm')}
              </div>
              <div className="text-sm text-slate-300 mb-3">
                🏟️ {courtSelected?.name}
              </div>

              <div className="mb-4">
                <label className="label text-xs">Nombre de quien reserva</label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={reserverName}
                  onChange={e => setReserverName(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="mb-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={isRecurring}
                  onChange={e => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 accent-brand-500"
                />
                <label htmlFor="isRecurring" className="text-xs text-slate-300 cursor-pointer select-none">
                  🔁 Repetir semanalmente (3 meses)
                </label>
              </div>

              <div className="mb-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={e => setIsPublic(e.target.checked)}
                  className="w-4 h-4 accent-brand-500"
                />
                <label htmlFor="isPublic" className="text-xs text-slate-300 cursor-pointer select-none">
                  🤝 Hacer partido público (Abierto)
                </label>
              </div>

              {isPublic && (
                <div className="mb-4 animate-scale-up">
                  <label className="label text-xs">Nivel sugerido para unirse</label>
                  <select
                    value={publicLevel}
                    onChange={e => setPublicLevel(e.target.value)}
                    className="input text-xs"
                  >
                    <option value="mixto">Cualquier nivel / Mixto</option>
                    <option value="6ta_B">6ª B</option>
                    <option value="6ta_A">6ª A</option>
                    <option value="5ta_B">5ª B</option>
                    <option value="5ta_A">5ª A</option>
                    <option value="4ta_B">4ª B</option>
                    <option value="4ta_A">4ª A</option>
                    <option value="3ra_B">3ª B</option>
                    <option value="3ra_A">3ª A</option>
                  </select>
                </div>
              )}

              <button
                onClick={handleConfirmReservation}
                disabled={submitting}
                className="btn-primary w-full"
              >
                {submitting ? 'Reservando...' : 'Confirmar reserva'}
              </button>
              <button onClick={() => { setSelectedSlot(null); setReserverName(''); }} className="btn-ghost w-full mt-2 text-sm">
                Cancelar
              </button>
            </div>
          )}

          {/* Info */}
          <div className="card bg-slate-800/30">
            <div className="text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span>Pendientes de pago</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-700" />
                <span>Cobrados / Completados</span>
              </div>
              <p className="text-slate-500 mt-2">
                Haz clic sobre las reservas para abrirlas y registrar el cobro diario o cancelar.
              </p>
            </div>
          </div>
        </div>

        {/* Calendario */}
        <div className="lg:col-span-3">
          <div className="card p-0 overflow-hidden" style={{ height: '600px' }}>
            {loading && (
              <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-10 rounded-2xl">
                <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
              </div>
            )}
            <div className="p-4 h-full">
              <Calendar
                localizer={localizer}
                events={events}
                onSelectSlot={handleSelectSlot}
                onNavigate={setCurrentDate}
                selectable
                defaultView="week"
                views={['month', 'week', 'day']}
                step={30}
                timeslots={2}
                min={new Date(2024, 0, 1, 8, 0)}
                max={new Date(2024, 0, 1, 22, 0)}
                messages={MESSAGES}
                culture="es"
                style={{ height: '100%' }}
                popup
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventPropGetter}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal Detalles / Cobro Reserva */}
      {selectedEventDetails && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card w-full max-w-md border border-slate-700/50">
            <h3 className="font-bold text-lg text-white mb-2 flex justify-between items-center">
              <span>Detalles de Reserva</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                selectedEventDetails.status === 'completed'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}>
                {selectedEventDetails.status === 'completed' ? 'Pagada / Cerrada' : 'Pendiente de Pago'}
              </span>
            </h3>

            <div className="space-y-3 mt-4 text-sm text-slate-300">
              <div>
                <strong className="text-slate-400">Pista:</strong> {selectedEventDetails.court?.name}
              </div>
              <div>
                <strong className="text-slate-400">Nombre Reserva:</strong> {selectedEventDetails.notes || selectedEventDetails.user?.name}
              </div>
              <div>
                <strong className="text-slate-400">Fecha / Hora:</strong> {new Date(selectedEventDetails.start_datetime).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                <div className="text-xs text-slate-500 mt-1 font-mono">
                  🕐 {new Date(selectedEventDetails.start_datetime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} — {new Date(selectedEventDetails.end_datetime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} ({selectedEventDetails.duration_minutes} min)
                </div>
              </div>

              {selectedEventDetails.status === 'completed' && selectedEventDetails.payment && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 space-y-1">
                  <div className="text-xs font-semibold text-green-400 uppercase tracking-wider">💳 Detalle de Cobro</div>
                  <div className="text-sm font-bold text-white">Importe: $ {parseFloat(selectedEventDetails.payment.amount).toFixed(2)}</div>
                  <div className="text-xs text-slate-400">Método de pago: <span className="uppercase font-mono font-bold text-slate-300">{selectedEventDetails.payment.payment_method}</span></div>
                </div>
              )}
            </div>

            {/* Sub-formulario Cobrar */}
            {selectedEventDetails.status === 'active' && showPayForm && (
              <form onSubmit={handleClosePayment} className="mt-4 pt-4 border-t border-slate-700/30 space-y-4 animate-scale-up">
                <h4 className="text-xs font-bold text-brand-300 uppercase tracking-wider">Cerrar y Cobrar Cancha</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Monto Final ($)</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={payAmount}
                      onChange={e => setPayAmount(parseFloat(e.target.value))}
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Método de Pago</label>
                    <select
                      value={payMethod}
                      onChange={e => setPayMethod(e.target.value)}
                      className="input text-xs"
                    >
                      <option value="cash">💵 Efectivo (Cash)</option>
                      <option value="card">💳 Tarjeta (Card)</option>
                      <option value="transfer">🏦 Transferencia</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button type="submit" disabled={payLoading} className="btn-primary w-full text-xs">
                    {payLoading ? 'Registrando...' : 'Confirmar Cobro y Completar'}
                  </button>
                  <button type="button" onClick={() => setShowPayForm(false)} className="btn-secondary w-full text-xs">
                    Atrás
                  </button>
                </div>
              </form>
            )}

            {/* Botones de acción principales */}
            {(!showPayForm || selectedEventDetails.status !== 'active') && (
              <div className="flex flex-col gap-2 mt-6">
                {selectedEventDetails.status === 'active' && (
                  <>
                    {todayClosed ? (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-center text-xs font-semibold">
                        🔒 La caja de hoy está cerrada. No se pueden registrar más pagos.
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowPayForm(true)}
                        className="btn-primary w-full text-sm"
                      >
                        💰 Registrar Pago / Cerrar Cancha
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(`¿Seguro que quieres cancelar esta reserva?`)) {
                          handleCancelReservation(selectedEventDetails.id)
                          setSelectedEventDetails(null)
                        }
                      }}
                      className="btn-danger w-full text-sm border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400"
                    >
                      ❌ Cancelar Reserva
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedEventDetails(null)}
                  className="btn-secondary w-full text-sm"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
