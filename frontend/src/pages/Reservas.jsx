import { useState, useEffect, useCallback } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
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
  const [courts, setCourts] = useState([])
  const [events, setEvents] = useState([])
  const [selectedCourt, setSelectedCourt] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [duration, setDuration] = useState(60)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())

  // Cargar pistas
  useEffect(() => {
    api.get('/courts').then(({ data }) => {
      setCourts(data.courts)
      if (data.courts.length) setSelectedCourt(data.courts[0].id)
    })
  }, [])

  // Cargar reservas al cambiar pista o fecha
  const loadReservations = useCallback(async () => {
    if (!selectedCourt) return
    setLoading(true)
    try {
      const date = format(currentDate, 'yyyy-MM-dd')
      // Cargar semana completa (±7 días)
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
            title: `${r.court?.name || 'Pista'} — ${r.user?.name || 'Reservado'}`,
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
      await api.post('/reservations', {
        court_id: selectedCourt,
        start_datetime: selectedSlot.toISOString(),
        duration_minutes: duration,
      })
      toast.success('¡Pista reservada correctamente! 🎾')
      setSelectedSlot(null)
      loadReservations()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al reservar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelReservation = async (reservationId) => {
    if (!confirm('¿Seguro que quieres cancelar esta reserva?')) return
    try {
      await api.delete(`/reservations/${reservationId}`)
      toast.success('Reserva cancelada')
      loadReservations()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cancelar')
    }
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
            <div className="grid grid-cols-2 gap-2">
              {[60, 90].map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    duration === d
                      ? 'border-brand-500/60 bg-brand-500/10 text-brand-300'
                      : 'border-slate-700/40 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {d === 60 ? '1h' : '1h 30m'}
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
              <div className="text-sm text-slate-300 mb-4">
                🏟️ {courtSelected?.name}
              </div>
              <button
                onClick={handleConfirmReservation}
                disabled={submitting}
                className="btn-primary w-full"
              >
                {submitting ? 'Reservando...' : 'Confirmar reserva'}
              </button>
              <button onClick={() => setSelectedSlot(null)} className="btn-ghost w-full mt-2 text-sm">
                Cancelar
              </button>
            </div>
          )}

          {/* Info */}
          <div className="card bg-slate-800/30">
            <div className="text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-brand-500" />
                <span>Reservas existentes</span>
              </div>
              <p className="text-slate-500 mt-2">
                Las cancelaciones deben realizarse con al menos <strong className="text-slate-400">2 horas</strong> de antelación.
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
                step={60}
                timeslots={1}
                min={new Date(2024, 0, 1, 8, 0)}
                max={new Date(2024, 0, 1, 22, 0)}
                messages={MESSAGES}
                culture="es"
                style={{ height: '100%' }}
                popup
                onSelectEvent={(event) => {
                  if (event.resource && confirm(`¿Cancelar reserva de ${event.resource.user?.name}?`)) {
                    handleCancelReservation(event.id)
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
