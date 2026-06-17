const { Op } = require('sequelize');
const { Reservation, Court, User, Schedule, CashTransaction, sequelize } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

const CANCEL_HOURS = 2;

/**
 * GET /api/reservations?courtId=&date=YYYY-MM-DD
 */
exports.getAvailability = asyncHandler(async (req, res) => {
  const { courtId, date } = req.query;

  if (!date) return res.status(400).json({ error: 'El parámetro date es obligatorio' });

  const where = { status: { [Op.in]: ['active', 'completed'] } };
  if (courtId) where.court_id = courtId;

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);
  where.start_datetime = { [Op.between]: [dayStart, dayEnd] };

  const reservations = await Reservation.findAll({
    where,
    include: [
      { model: Court, as: 'court', attributes: ['id', 'name', 'surface', 'is_indoor'] },
      { model: User, as: 'user', attributes: ['id', 'name'] },
      { model: CashTransaction, as: 'payment', required: false, attributes: ['id', 'amount', 'payment_method', 'description'] }
    ],
    order: [['start_datetime', 'ASC']],
  });

  res.json({ reservations });
});

/**
 * GET /api/reservations/my — Reservas del usuario autenticado
 */
exports.getMyReservations = asyncHandler(async (req, res) => {
  const reservations = await Reservation.findAll({
    where: { user_id: req.user.id },
    include: [{ model: Court, as: 'court' }],
    order: [['start_datetime', 'DESC']],
  });
  res.json({ reservations });
});

/**
 * POST /api/reservations — Crear reserva
 */
exports.createReservation = asyncHandler(async (req, res) => {
  const { court_id, start_datetime, duration_minutes, notes, is_recurring, is_public, public_level } = req.body;

  if (!court_id || !start_datetime || !duration_minutes) {
    return res.status(400).json({ error: 'court_id, start_datetime y duration_minutes son obligatorios' });
  }
  if (![60, 90, 120].includes(parseInt(duration_minutes))) {
    return res.status(400).json({ error: 'La duración debe ser de 60, 90 o 120 minutos' });
  }

  const court = await Court.findByPk(court_id);
  if (!court || !court.is_active) {
    return res.status(404).json({ error: 'Pista no encontrada o inactiva' });
  }

  const start = new Date(start_datetime);
  const end = new Date(start.getTime() + duration_minutes * 60000);

  // Generar ocurrencias (semanal por 3 meses si is_recurring es true)
  const occurrences = [];
  if (is_recurring) {
    const maxDate = new Date(start);
    maxDate.setMonth(maxDate.getMonth() + 3); // 3 meses en el futuro

    let currentStart = new Date(start);
    let currentEnd = new Date(end);

    while (currentStart <= maxDate) {
      occurrences.push({
        start: new Date(currentStart),
        end: new Date(currentEnd)
      });
      currentStart.setDate(currentStart.getDate() + 7);
      currentEnd.setDate(currentEnd.getDate() + 7);
    }
  } else {
    occurrences.push({ start, end });
  }

  // Verificar disponibilidad para todas las ocurrencias
  const conflictConditions = occurrences.map(occ => ({
    [Op.or]: [
      { start_datetime: { [Op.between]: [occ.start, occ.end] } },
      { end_datetime: { [Op.between]: [occ.start, occ.end] } },
      {
        start_datetime: { [Op.lte]: occ.start },
        end_datetime: { [Op.gte]: occ.end },
      },
    ]
  }));

  const conflicts = await Reservation.findAll({
    where: {
      court_id,
      status: { [Op.in]: ['active', 'completed'] },
      [Op.or]: conflictConditions
    }
  });

  if (conflicts.length > 0) {
    const datesList = conflicts.map(c => {
      const dt = new Date(c.start_datetime);
      return dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    });
    return res.status(409).json({
      error: `Conflicto detectado. Los siguientes horarios ya están ocupados: ${datesList.join(', ')}`
    });
  }

  const createdReservations = [];
  await sequelize.transaction(async (t) => {
    for (const occ of occurrences) {
      const r = await Reservation.create({
        court_id,
        user_id: req.user.id,
        start_datetime: occ.start,
        end_datetime: occ.end,
        duration_minutes: parseInt(duration_minutes),
        notes,
        is_public: !!is_public,
        public_level: is_public ? public_level : null
      }, { transaction: t });

      if (is_public) {
        const { ReservationParticipant } = require('../models');
        await ReservationParticipant.create({
          reservation_id: r.id,
          user_id: req.user.id,
          status: 'joined'
        }, { transaction: t });
      }
      createdReservations.push(r);
    }
  });

  if (is_recurring) {
    res.status(201).json({
      message: `Se crearon ${createdReservations.length} reservas recurrentes correctamente`,
      reservations: createdReservations
    });
  } else {
    res.status(201).json({
      message: 'Reserva creada correctamente',
      reservation: createdReservations[0]
    });
  }
});

/**
 * DELETE /api/reservations/:id — Cancelar reserva
 */
exports.cancelReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findByPk(req.params.id);

  if (!reservation) return res.status(404).json({ error: 'Reserva no encontrada' });
  if (reservation.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'No tienes permiso para cancelar esta reserva' });
  }
  if (reservation.status !== 'active') {
    return res.status(400).json({ error: 'La reserva ya está cancelada o completada' });
  }

  const now = new Date();
  const diff = (new Date(reservation.start_datetime) - now) / 3600000; // horas
  if (diff < CANCEL_HOURS && req.user.role !== 'admin') {
    return res.status(400).json({
      error: `Las reservas deben cancelarse con al menos ${CANCEL_HOURS} horas de antelación`,
    });
  }

  await reservation.update({ status: 'cancelled', cancelled_at: now });
  res.json({ message: 'Reserva cancelada correctamente' });
});

/**
 * GET /api/reservations/open — Obtener partidos abiertos
 */
exports.getOpenReservations = asyncHandler(async (req, res) => {
  const { ReservationParticipant } = require('../models');
  const reservations = await Reservation.findAll({
    where: {
      is_public: true,
      status: 'active',
      start_datetime: { [Op.gt]: new Date() }
    },
    include: [
      { model: Court, as: 'court', attributes: ['id', 'name', 'surface', 'is_indoor'] },
      { model: User, as: 'user', attributes: ['id', 'name', 'level', 'gender'] },
      {
        model: ReservationParticipant,
        as: 'participants',
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'level', 'gender'] }]
      }
    ],
    order: [['start_datetime', 'ASC']]
  });
  res.json({ reservations });
});

/**
 * POST /api/reservations/:id/join — Unirse a partido abierto
 */
exports.joinOpenReservation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { ReservationParticipant } = require('../models');

  const reservation = await Reservation.findByPk(id, {
    where: { is_public: true, status: 'active' }
  });

  if (!reservation) {
    return res.status(404).json({ error: 'Partido abierto no encontrado o inactivo' });
  }

  const activeParticipantsCount = await ReservationParticipant.count({
    where: { reservation_id: id, status: 'joined' }
  });

  if (activeParticipantsCount >= 4) {
    return res.status(400).json({ error: 'El partido ya está completo (máximo 4 jugadores)' });
  }

  const existing = await ReservationParticipant.findOne({
    where: { reservation_id: id, user_id: req.user.id }
  });

  if (existing) {
    if (existing.status === 'joined') {
      return res.status(400).json({ error: 'Ya estás inscrito en este partido' });
    }
    await existing.update({ status: 'joined' });
  } else {
    await ReservationParticipant.create({
      reservation_id: id,
      user_id: req.user.id,
      status: 'joined'
    });
  }

  res.json({ message: 'Te has unido al partido abierto exitosamente' });
});

/**
 * DELETE /api/reservations/:id/leave — Salir de partido abierto
 */
exports.leaveOpenReservation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { ReservationParticipant } = require('../models');

  const participant = await ReservationParticipant.findOne({
    where: { reservation_id: id, user_id: req.user.id, status: 'joined' }
  });

  if (!participant) {
    return res.status(400).json({ error: 'No estás inscrito en este partido' });
  }

  const reservation = await Reservation.findByPk(id);
  if (reservation && reservation.user_id === req.user.id) {
    return res.status(400).json({ error: 'El creador de la reserva no puede salir, cancela la reserva en su lugar' });
  }

  await participant.destroy();
  res.json({ message: 'Has salido del partido abierto' });
});
