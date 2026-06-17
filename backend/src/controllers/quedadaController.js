const { Op } = require('sequelize');
const {
  Quedada, QuedadaParticipant, Match, MatchResult, PairsHistory, RivalsHistory, User, Court, Season
} = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { generar_emparejamientos_dobles, pairKey } = require('../services/matchmaking');

/**
 * GET /api/quedadas — Listar quedadas públicas
 */
exports.getQuedadas = asyncHandler(async (req, res) => {
  const { status, level, date } = req.query;
  const where = {};
  if (status) where.status = status;
  if (level) where.level = level;
  if (date) where.date = date;

  const quedadas = await Quedada.findAll({
    where,
    include: [
      { model: User, as: 'creator', attributes: ['id', 'name', 'level'] },
      {
        model: QuedadaParticipant, as: 'participants',
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'level', 'elo_rating', 'avatar_url'] }],
      },
    ],
    order: [['date', 'ASC'], ['start_time', 'ASC']],
  });

  res.json({ quedadas });
});

/**
 * GET /api/quedadas/:id
 */
exports.getQuedada = asyncHandler(async (req, res) => {
  const quedada = await Quedada.findByPk(req.params.id, {
    include: [
      { model: User, as: 'creator', attributes: ['id', 'name'] },
      {
        model: QuedadaParticipant, as: 'participants',
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'level', 'elo_rating', 'avatar_url'] }],
      },
      {
        model: Match, as: 'matches',
        include: [
          { model: User, as: 'playerA1', attributes: ['id', 'name'] },
          { model: User, as: 'playerA2', attributes: ['id', 'name'] },
          { model: User, as: 'playerB1', attributes: ['id', 'name'] },
          { model: User, as: 'playerB2', attributes: ['id', 'name'] },
          { model: MatchResult, as: 'result' },
          { model: Court, as: 'court', attributes: ['id', 'name'] },
        ],
      },
    ],
  });

  if (!quedada) return res.status(404).json({ error: 'Quedada no encontrada' });
  res.json({ quedada });
});

/**
 * POST /api/quedadas — Crear quedada
 */
exports.createQuedada = asyncHandler(async (req, res) => {
  const { title, description, level, date, start_time, selected_courts, max_players, track_global_history, gender_restriction } = req.body;

  if (!title || !date || !start_time || !max_players) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  if (!selected_courts || !Array.isArray(selected_courts) || selected_courts.length === 0) {
    return res.status(400).json({ error: 'Debes seleccionar al menos una cancha para la quedada' });
  }

  const num_courts = selected_courts.length;

  if (max_players % 4 !== 0 || max_players < 8 || max_players > 20) {
    return res.status(400).json({ error: 'max_players debe ser múltiplo de 4, entre 8 y 20' });
  }
  if (num_courts < 2 || num_courts > 5) {
    return res.status(400).json({ error: 'El número de canchas seleccionadas debe estar entre 2 y 5' });
  }

  const quedada = await Quedada.create({
    creator_id: req.user.id,
    title, description, level, date, start_time,
    num_courts: parseInt(num_courts),
    max_players: parseInt(max_players),
    selected_courts,
    track_global_history: !!track_global_history,
    gender_restriction: gender_restriction || 'mixto',
  });

  // Inscribir al creador automáticamente
  await QuedadaParticipant.create({ quedada_id: quedada.id, user_id: req.user.id });

  res.status(201).json({ message: 'Quedada creada', quedada });
});

/**
 * POST /api/quedadas/:id/join — Inscribirse
 */
exports.joinQuedada = asyncHandler(async (req, res) => {
  const quedada = await Quedada.findByPk(req.params.id, {
    include: [{ model: QuedadaParticipant, as: 'participants', include: [{ model: User, as: 'user' }] }],
  });

  if (!quedada) return res.status(404).json({ error: 'Quedada no encontrada' });
  if (!['open'].includes(quedada.status)) {
    return res.status(400).json({ error: 'La quedada no está abierta para inscripciones' });
  }

  const userGender = req.user.gender || 'H';
  if (quedada.gender_restriction === 'hombres' && userGender !== 'H') {
    return res.status(400).json({ error: 'Esta quedada es exclusiva para hombres' });
  }
  if (quedada.gender_restriction === 'mujeres' && userGender !== 'M') {
    return res.status(400).json({ error: 'Esta quedada es exclusiva para mujeres' });
  }

  const activeParts = quedada.participants.filter(p => p.status !== 'cancelled');
  if (activeParts.length >= quedada.max_players) {
    return res.status(400).json({ error: 'La quedada está completa' });
  }

  if (quedada.gender_restriction === 'mixto') {
    const sameGenderCount = activeParts.filter(p => p.user?.gender === userGender).length;
    if (sameGenderCount >= quedada.max_players / 2) {
      return res.status(400).json({ error: 'Cupo completo para jugadores de tu género en esta quedada mixta' });
    }
  }

  const already = activeParts.find(p => p.user_id === req.user.id);
  if (already) return res.status(409).json({ error: 'Ya estás inscrito en esta quedada' });

  await QuedadaParticipant.create({ quedada_id: quedada.id, user_id: req.user.id });

  // Actualizar estado si está completa
  if (activeParts.length + 1 >= quedada.max_players) {
    await quedada.update({ status: 'full' });
  }

  res.json({ message: 'Inscripción realizada correctamente' });
});

/**
 * DELETE /api/quedadas/:id/leave — Abandonar quedada
 */
exports.leaveQuedada = asyncHandler(async (req, res) => {
  const part = await QuedadaParticipant.findOne({
    where: { quedada_id: req.params.id, user_id: req.user.id },
  });

  if (!part) return res.status(404).json({ error: 'No estás inscrito en esta quedada' });
  await part.update({ status: 'cancelled' });

  const quedada = await Quedada.findByPk(req.params.id);
  if (quedada.status === 'full') await quedada.update({ status: 'open' });

  res.json({ message: 'Has salido de la quedada' });
});

/**
 * POST /api/quedadas/:id/generate — Generar emparejamientos
 */
exports.generateMatches = asyncHandler(async (req, res) => {
  const quedada = await Quedada.findByPk(req.params.id, {
    include: [{ model: QuedadaParticipant, as: 'participants', include: [{ model: User, as: 'user' }] }],
  });

  if (!quedada) return res.status(404).json({ error: 'Quedada no encontrada' });

  if (req.user.id !== quedada.creator_id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo el creador o admin puede generar emparejamientos' });
  }

  const activeParts = quedada.participants.filter(p => p.status !== 'cancelled');
  if (activeParts.length < 8) {
    return res.status(400).json({ error: 'Se necesitan al menos 8 jugadores para generar emparejamientos' });
  }
  if (activeParts.length % 4 !== 0) {
    return res.status(400).json({ error: 'El número de jugadores debe ser múltiplo de 4' });
  }

  // Construir histórico si track_global_history está activado
  let historico = { parejas: [], rivales: [] };
  if (quedada.track_global_history) {
    const paresDb = await PairsHistory.findAll({ where: { quedada_id: quedada.id } });
    const rivalesDb = await RivalsHistory.findAll({ where: { quedada_id: quedada.id } });
    historico.parejas = paresDb.map(p => pairKey(p.player1_id, p.player2_id));
    historico.rivales = rivalesDb.map(r => pairKey(r.player1_id, r.player2_id));
  }

  const genderMap = {};
  activeParts.forEach(p => {
    genderMap[p.user_id] = p.user?.gender || 'H';
  });
  const esMixto = quedada.gender_restriction === 'mixto';

  const jugadorIds = activeParts.map(p => p.user_id);
  const resultado = generar_emparejamientos_dobles(jugadorIds, quedada.num_courts, historico, genderMap, esMixto);

  // Buscar temporada activa
  const activeSeason = await Season.findOne({ where: { is_active: true } });
  const seasonId = activeSeason ? activeSeason.id : null;

  // Persistir los partidos en la BD
  const matchesCreated = [];
  for (const ronda of resultado.rondas) {
    for (const partido of ronda.partidos) {
      const courtId = quedada.selected_courts && quedada.selected_courts[partido.cancha - 1]
        ? quedada.selected_courts[partido.cancha - 1]
        : null;

      const match = await Match.create({
        quedada_id: quedada.id,
        match_type: 'quedada',
        season_id: seasonId,
        round_number: ronda.numero,
        court_number: partido.cancha,
        court_id: courtId,
        player_a1_id: partido.equipoA[0],
        player_a2_id: partido.equipoA[1],
        player_b1_id: partido.equipoB[0],
        player_b2_id: partido.equipoB[1],
      });
      matchesCreated.push(match);

      // Registrar en histórico de parejas
      await PairsHistory.findOrCreate({
        where: {
          player1_id: [partido.equipoA[0], partido.equipoA[1]].sort()[0],
          player2_id: [partido.equipoA[0], partido.equipoA[1]].sort()[1],
          match_id: match.id,
        },
        defaults: { quedada_id: quedada.id },
      });
      await PairsHistory.findOrCreate({
        where: {
          player1_id: [partido.equipoB[0], partido.equipoB[1]].sort()[0],
          player2_id: [partido.equipoB[0], partido.equipoB[1]].sort()[1],
          match_id: match.id,
        },
        defaults: { quedada_id: quedada.id },
      });

      // Registrar en histórico de rivales (cruz: A1-B1, A1-B2, A2-B1, A2-B2)
      const cruces = [
        [partido.equipoA[0], partido.equipoB[0]],
        [partido.equipoA[0], partido.equipoB[1]],
        [partido.equipoA[1], partido.equipoB[0]],
        [partido.equipoA[1], partido.equipoB[1]],
      ];
      for (const [p1, p2] of cruces) {
        await RivalsHistory.findOrCreate({
          where: {
            player1_id: [p1, p2].sort()[0],
            player2_id: [p1, p2].sort()[1],
            match_id: match.id,
          },
          defaults: { quedada_id: quedada.id },
        });
      }
    }
  }

  await quedada.update({ status: 'generated', generated_rounds: resultado.rondas });

  res.json({
    message: 'Emparejamientos generados correctamente',
    resultado,
    matches_creados: matchesCreated.length,
  });
});

/**
 * PUT /api/quedadas/:id/matches/:matchId — Reasignar partido manualmente
 */
exports.reassignMatch = asyncHandler(async (req, res) => {
  const { player_a1_id, player_a2_id, player_b1_id, player_b2_id } = req.body;

  const match = await Match.findOne({
    where: { id: req.params.matchId, quedada_id: req.params.id },
  });

  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

  // Verificar posibles repeticiones
  const warnings = [];
  const pairs = await PairsHistory.findAll({
    where: { quedada_id: req.params.id },
  });
  const pairKeys = new Set(pairs.map(p => pairKey(p.player1_id, p.player2_id)));

  if (pairKeys.has(pairKey(player_a1_id, player_a2_id))) {
    warnings.push(`⚠️ La pareja ${player_a1_id}+${player_a2_id} ya jugó junta en esta quedada`);
  }
  if (pairKeys.has(pairKey(player_b1_id, player_b2_id))) {
    warnings.push(`⚠️ La pareja ${player_b1_id}+${player_b2_id} ya jugó junta en esta quedada`);
  }

  await match.update({ player_a1_id, player_a2_id, player_b1_id, player_b2_id });

  res.json({ message: 'Partido reasignado', match, advertencias: warnings });
});

/**
 * DELETE /api/quedadas/:id — Borrar quedada
 */
exports.deleteQuedada = asyncHandler(async (req, res) => {
  const quedada = await Quedada.findByPk(req.params.id);
  if (!quedada) return res.status(404).json({ error: 'Quedada no encontrada' });

  if (req.user.id !== quedada.creator_id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo el creador o admin puede borrar la quedada' });
  }

  await quedada.destroy();
  res.json({ message: 'Quedada eliminada correctamente' });
});

/**
 * POST /api/quedadas/:id/participants — Añadir participante manualmente por teléfono o ID
 */
exports.addParticipant = asyncHandler(async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id (teléfono o ID) es obligatorio' });

  const quedada = await Quedada.findByPk(req.params.id, {
    include: [{ model: QuedadaParticipant, as: 'participants', include: [{ model: User, as: 'user' }] }],
  });

  if (!quedada) return res.status(404).json({ error: 'Quedada no encontrada' });

  if (req.user.id !== quedada.creator_id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo el creador o admin puede añadir participantes' });
  }

  if (quedada.status !== 'open') {
    return res.status(400).json({ error: 'La quedada no está abierta para inscripciones' });
  }

  let resolvedUserId = user_id;
  let targetUser = null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user_id);
  if (isUuid) {
    targetUser = await User.findByPk(user_id);
  } else {
    targetUser = await User.findOne({ where: { phone: user_id } });
  }

  if (!targetUser) {
    return res.status(404).json({ error: 'No se encontró ningún jugador con ese número de teléfono' });
  }
  resolvedUserId = targetUser.id;

  const userGender = targetUser.gender || 'H';
  if (quedada.gender_restriction === 'hombres' && userGender !== 'H') {
    return res.status(400).json({ error: 'Esta quedada es exclusiva para hombres' });
  }
  if (quedada.gender_restriction === 'mujeres' && userGender !== 'M') {
    return res.status(400).json({ error: 'Esta quedada es exclusiva para mujeres' });
  }

  const activeParts = quedada.participants.filter(p => p.status !== 'cancelled');
  if (activeParts.length >= quedada.max_players) {
    return res.status(400).json({ error: 'La quedada está completa' });
  }

  if (quedada.gender_restriction === 'mixto') {
    const sameGenderCount = activeParts.filter(p => p.user?.gender === userGender).length;
    if (sameGenderCount >= quedada.max_players / 2) {
      return res.status(400).json({ error: 'Cupo completo para jugadores de ese género en esta quedada mixta' });
    }
  }

  const already = activeParts.find(p => p.user_id === resolvedUserId);
  if (already) return res.status(409).json({ error: 'El jugador ya está inscrito en la quedada' });

  const existingPart = quedada.participants.find(p => p.user_id === resolvedUserId);
  if (existingPart) {
    await existingPart.update({ status: 'registered' });
  } else {
    await QuedadaParticipant.create({ quedada_id: quedada.id, user_id: resolvedUserId });
  }

  if (activeParts.length + 1 >= quedada.max_players) {
    await quedada.update({ status: 'full' });
  }

  res.status(201).json({ message: 'Jugador añadido correctamente' });
});

/**
 * DELETE /api/quedadas/:id/participants/:userId — Eliminar participante manualmente
 */
exports.removeParticipant = asyncHandler(async (req, res) => {
  const quedada = await Quedada.findByPk(req.params.id);
  if (!quedada) return res.status(404).json({ error: 'Quedada no encontrada' });

  if (req.user.id !== quedada.creator_id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo el creador o admin puede eliminar participantes' });
  }

  const part = await QuedadaParticipant.findOne({
    where: { quedada_id: req.params.id, user_id: req.params.userId },
  });

  if (!part) return res.status(404).json({ error: 'El jugador no está inscrito en esta quedada' });
  await part.update({ status: 'cancelled' });

  if (quedada.status === 'full') await quedada.update({ status: 'open' });

  res.json({ message: 'Jugador eliminado de la quedada' });
});
