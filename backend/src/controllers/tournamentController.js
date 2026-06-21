const { Tournament, TournamentPair, TournamentMatch, User, EloHistory, Match, MatchResult, Court, Season } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { calcularEloDobles } = require('../services/elo');
const { generar_emparejamientos_dobles, generar_emparejamientos_fijos } = require('../services/matchmaking');

/**
 * GET /api/tournaments
 */
exports.getTournaments = asyncHandler(async (req, res) => {
  const tournaments = await Tournament.findAll({
    include: [
      { model: TournamentPair, as: 'pairs', include: [
        { model: User, as: 'player1', attributes: ['id', 'name', 'level'] },
        { model: User, as: 'player2', attributes: ['id', 'name', 'level'] },
      ]},
    ],
    order: [['start_date', 'DESC']],
  });
  res.json({ tournaments });
});

/**
 * GET /api/tournaments/:id
 */
exports.getTournament = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findByPk(req.params.id, {
    include: [
      { model: TournamentPair, as: 'pairs', include: [
        { model: User, as: 'player1', attributes: ['id', 'name', 'elo_rating', 'avatar_url'] },
        { model: User, as: 'player2', attributes: ['id', 'name', 'elo_rating', 'avatar_url'] },
      ]},
      { model: TournamentMatch, as: 'matches', include: [
        { model: TournamentPair, as: 'pairA', include: [
          { model: User, as: 'player1', attributes: ['id', 'name'] },
          { model: User, as: 'player2', attributes: ['id', 'name'] },
        ]},
        { model: TournamentPair, as: 'pairB', include: [
          { model: User, as: 'player1', attributes: ['id', 'name'] },
          { model: User, as: 'player2', attributes: ['id', 'name'] },
        ]},
        { model: Court, as: 'court', attributes: ['id', 'name'] },
      ]},
    ],
  });

  if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });

  // Si es americano, cargar partidos individuales desde la tabla matches
  if (tournament.format === 'americano') {
    const individualMatches = await Match.findAll({
      where: { tournament_id: tournament.id },
      include: [
        { model: User, as: 'playerA1', attributes: ['id', 'name', 'elo_rating'] },
        { model: User, as: 'playerA2', attributes: ['id', 'name', 'elo_rating'] },
        { model: User, as: 'playerB1', attributes: ['id', 'name', 'elo_rating'] },
        { model: User, as: 'playerB2', attributes: ['id', 'name', 'elo_rating'] },
        { model: MatchResult, as: 'result' },
        { model: Court, as: 'court', attributes: ['id', 'name'] },
      ],
      order: [['round_number', 'ASC'], ['court_number', 'ASC']],
    });
    const tournamentJson = tournament.toJSON();
    tournamentJson.americanoMatches = individualMatches;
    return res.json({ tournament: tournamentJson });
  }

  res.json({ tournament });
});

/**
 * POST /api/tournaments — Crear torneo (admin)
 */
exports.createTournament = asyncHandler(async (req, res) => {
  const { name, description, format, level, start_date, end_date, prize_info, selected_courts, gender_restriction } = req.body;

  if (!name || !format || !start_date) {
    return res.status(400).json({ error: 'name, format y start_date son obligatorios' });
  }

  if (!selected_courts || !Array.isArray(selected_courts) || selected_courts.length === 0) {
    return res.status(400).json({ error: 'Debes seleccionar al menos una cancha para el torneo' });
  }

  const calculatedMaxPairs = format === 'americano' ? selected_courts.length * 4 : selected_courts.length * 2;

  const activeSeason = await Season.findOne({ where: { is_active: true } });
  const seasonId = activeSeason ? activeSeason.id : null;

  const tournament = await Tournament.create({
    name,
    description,
    format,
    level,
    start_date,
    end_date,
    max_pairs: calculatedMaxPairs,
    prize_info,
    selected_courts,
    gender_restriction: gender_restriction || 'mixto',
    season_id: seasonId,
    created_by_id: req.user.id,
    status: 'open',
  });

  res.status(201).json({ message: 'Torneo creado', tournament });
});

/**
 * PUT /api/tournaments/:id/status — Actualizar estado del torneo (admin)
 */
exports.updateTournamentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status || !['draft', 'open', 'in_progress', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Estado de torneo inválido' });
  }

  const tournament = await Tournament.findByPk(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });

  await tournament.update({ status });
  res.json({ message: `Estado del torneo actualizado a ${status}`, tournament });
});

/**
 * POST /api/tournaments/:id/pairs — Inscribir pareja o jugador individual (americano)
 */
exports.registerPair = asyncHandler(async (req, res) => {
  const { player1_id, player2_id, pair_name } = req.body;

  const tournament = await Tournament.findByPk(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });
  if (tournament.status !== 'open') return res.status(400).json({ error: 'El torneo no está abierto' });

  const count = await TournamentPair.count({ where: { tournament_id: tournament.id } });
  if (count >= tournament.max_pairs) return res.status(400).json({ error: 'El torneo está completo' });

  const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

  // ─── Formato Americano: inscripción individual ────────────────────────
  if (tournament.format === 'americano') {
    const playerInput = player1_id || player2_id;
    if (!playerInput) {
      return res.status(400).json({ error: 'Debes proporcionar el teléfono o ID del jugador' });
    }

    let resolvedPlayerId = playerInput;
    if (!isUuid(playerInput)) {
      const found = await User.findOne({ where: { phone: playerInput } });
      if (!found) return res.status(404).json({ error: 'No se encontró ningún jugador con ese teléfono' });
      resolvedPlayerId = found.id;
    }

    // Verificar que no esté ya inscrito
    const already = await TournamentPair.findOne({
      where: { tournament_id: tournament.id, player1_id: resolvedPlayerId },
    });
    if (already) return res.status(409).json({ error: 'El jugador ya está inscrito en este torneo' });

    const playerUser = await User.findByPk(resolvedPlayerId);
    if (!playerUser) {
      return res.status(404).json({ error: 'No se encontró el jugador' });
    }

    const userGender = playerUser.gender || 'H';
    if (tournament.gender_restriction === 'hombres' && userGender !== 'H') {
      return res.status(400).json({ error: 'Este torneo es exclusivo para hombres' });
    }
    if (tournament.gender_restriction === 'mujeres' && userGender !== 'M') {
      return res.status(400).json({ error: 'Este torneo es exclusivo para mujeres' });
    }

    if (tournament.gender_restriction === 'mixto') {
      const existingPairs = await TournamentPair.findAll({
        where: { tournament_id: tournament.id },
        include: [{ model: User, as: 'player1' }]
      });
      const sameGenderCount = existingPairs.filter(p => p.player1?.gender === userGender).length;
      if (sameGenderCount >= tournament.max_pairs / 2) {
        return res.status(400).json({ error: 'Cupo completo para jugadores de tu género en este torneo mixto' });
      }
    }

    const entry = await TournamentPair.create({
      tournament_id: tournament.id,
      player1_id: resolvedPlayerId,
      player2_id: resolvedPlayerId,
      pair_name: pair_name || playerUser?.name || 'Jugador',
    });

    return res.status(201).json({ message: 'Jugador inscrito', pair: entry });
  }

  // ─── Formato clásico: inscripción de pareja ───────────────────────────
  let resolvedPlayer1 = player1_id || req.user.id;
  let resolvedPlayer2 = player2_id;

  if (player1_id && !isUuid(player1_id)) {
    const p1 = await User.findOne({ where: { phone: player1_id } });
    if (!p1) return res.status(404).json({ error: 'No se encontró el Jugador 1 con ese teléfono' });
    resolvedPlayer1 = p1.id;
  }

  if (player2_id && !isUuid(player2_id)) {
    const p2 = await User.findOne({ where: { phone: player2_id } });
    if (!p2) return res.status(404).json({ error: 'No se encontró el Jugador 2 con ese teléfono' });
    resolvedPlayer2 = p2.id;
  }

  const p1User = await User.findByPk(resolvedPlayer1);
  const p2User = await User.findByPk(resolvedPlayer2);
  if (!p1User || !p2User) {
    return res.status(400).json({ error: 'Los jugadores de la pareja no son válidos' });
  }

  const g1 = p1User.gender || 'H';
  const g2 = p2User.gender || 'H';

  if (tournament.gender_restriction === 'hombres' && (g1 !== 'H' || g2 !== 'H')) {
    return res.status(400).json({ error: 'Este torneo es exclusivo para parejas masculinas' });
  }
  if (tournament.gender_restriction === 'mujeres' && (g1 !== 'M' || g2 !== 'M')) {
    return res.status(400).json({ error: 'Este torneo es exclusivo para parejas femeninas' });
  }
  if (tournament.gender_restriction === 'mixto' && g1 === g2) {
    return res.status(400).json({ error: 'Este torneo es mixto y requiere una pareja compuesta por un hombre y una mujer' });
  }

  const pair = await TournamentPair.create({
    tournament_id: tournament.id,
    player1_id: resolvedPlayer1,
    player2_id: resolvedPlayer2,
    pair_name,
  });

  res.status(201).json({ message: 'Pareja inscrita', pair });
});

/**
 * POST /api/tournaments/:id/generate — Generar cuadro de partidos
 */
exports.generateBracket = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findByPk(req.params.id, {
    include: [{ model: TournamentPair, as: 'pairs', include: [{ model: User, as: 'player1' }] }],
  });

  if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });

  const pairs = tournament.pairs;

  // ─── Formato Americano: usar algoritmo de emparejamientos ─────────────
  if (tournament.format === 'americano') {
    // Cada entrada en pairs es un jugador individual (player1_id === player2_id)
    const playerIds = pairs.map(p => p.player1_id);

    if (playerIds.length < 4) {
      return res.status(400).json({ error: 'Se necesitan al menos 4 jugadores para generar emparejamientos' });
    }
    if (playerIds.length % 4 !== 0) {
      return res.status(400).json({ error: `El número de jugadores (${playerIds.length}) debe ser múltiplo de 4. Faltan ${4 - (playerIds.length % 4)} jugador(es).` });
    }

    const genderMap = {};
    pairs.forEach(p => {
      genderMap[p.player1_id] = p.player1?.gender || 'H';
    });
    const esMixto = tournament.gender_restriction === 'mixto';

    const numCourts = tournament.selected_courts ? tournament.selected_courts.length : Math.floor(playerIds.length / 4);
    const resultado = generar_emparejamientos_dobles(playerIds, numCourts, {}, genderMap, esMixto);

    // Persistir partidos en la tabla matches
    const matchesCreated = [];
    for (const ronda of resultado.rondas) {
      for (const partido of ronda.partidos) {
        // Asignar pista real si existe en selected_courts
        const courtId = tournament.selected_courts && tournament.selected_courts[partido.cancha - 1]
          ? tournament.selected_courts[partido.cancha - 1]
          : null;

        const match = await Match.create({
          tournament_id: tournament.id,
          match_type: 'torneo',
          season_id: tournament.season_id,
          round_number: ronda.numero,
          court_number: partido.cancha,
          court_id: courtId,
          player_a1_id: partido.equipoA[0],
          player_a2_id: partido.equipoA[1],
          player_b1_id: partido.equipoB[0],
          player_b2_id: partido.equipoB[1],
        });
        matchesCreated.push(match);
      }
    }

    await tournament.update({ status: 'in_progress' });

    return res.json({
      message: 'Emparejamientos americano generados',
      matches_created: matchesCreated.length,
      resultado,
    });
  }

  // ─── Formato Americano Fijo: Round Robin por parejas ──────────────────
  if (tournament.format === 'americano_fijo') {
    if (pairs.length < 2) return res.status(400).json({ error: 'Se necesitan al menos 2 parejas' });

    const numCourts = tournament.selected_courts ? tournament.selected_courts.length : Math.floor(pairs.length / 2);
    const rondasResult = generar_emparejamientos_fijos(pairs, numCourts);

    for (const ronda of rondasResult) {
      for (const partido of ronda.partidos) {
        const courtId = tournament.selected_courts && tournament.selected_courts[partido.cancha - 1]
          ? tournament.selected_courts[partido.cancha - 1]
          : null;

        const m = await TournamentMatch.create({
          tournament_id: tournament.id,
          pair_a_id: partido.pairA.id,
          pair_b_id: partido.pairB.id,
          round: ronda.numero,
          match_number: partido.cancha,
          court_id: courtId,
        });
        matches.push(m);
      }
    }

    await tournament.update({ status: 'in_progress' });

    return res.json({
      message: 'Cuadro americano fijo generado',
      matches_created: matches.length,
      matches,
    });
  }

  // ─── Formatos clásicos ────────────────────────────────────────────────
  if (pairs.length < 2) return res.status(400).json({ error: 'Se necesitan al menos 2 parejas' });

  const matches = [];

  if (tournament.format === 'eliminacion_directa') {
    const shuffled = [...pairs].sort(() => Math.random() - 0.5);
    let round = 1;
    let current = shuffled;

    while (current.length >= 2) {
      const roundMatches = [];
      for (let i = 0; i < current.length; i += 2) {
        if (current[i] && current[i + 1]) {
          const courtId = tournament.selected_courts && tournament.selected_courts.length > 0
            ? tournament.selected_courts[(Math.floor(i / 2)) % tournament.selected_courts.length]
            : null;

          const m = await TournamentMatch.create({
            tournament_id: tournament.id,
            pair_a_id: current[i].id,
            pair_b_id: current[i + 1].id,
            round,
            match_number: Math.floor(i / 2) + 1,
            court_id: courtId,
          });
          roundMatches.push(m);
        }
      }
      matches.push(...roundMatches);
      break;
    }
  } else if (tournament.format === 'liguilla') {
    let matchNum = 1;
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const courtId = tournament.selected_courts && tournament.selected_courts.length > 0
          ? tournament.selected_courts[(matchNum - 1) % tournament.selected_courts.length]
          : null;

        const m = await TournamentMatch.create({
          tournament_id: tournament.id,
          pair_a_id: pairs[i].id,
          pair_b_id: pairs[j].id,
          round: 1,
          match_number: matchNum++,
          group_name: 'Grupo A',
          court_id: courtId,
        });
        matches.push(m);
      }
    }
  }

  await tournament.update({ status: 'in_progress' });

  res.json({ message: 'Cuadro generado', matches_created: matches.length, matches });
});

/**
 * PUT /api/tournaments/:id/matches/:matchId/result — Resultado de torneo (clásico)
 */
exports.setMatchResult = asyncHandler(async (req, res) => {
  const { score_a, score_b, winner_pair_id } = req.body;

  const match = await TournamentMatch.findOne({
    where: { id: req.params.matchId, tournament_id: req.params.id },
    include: [
      { model: TournamentPair, as: 'pairA' },
      { model: TournamentPair, as: 'pairB' },
    ],
  });

  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

  await match.update({ score_a, score_b, winner_pair_id, status: 'completed' });

  const tournament = await Tournament.findByPk(req.params.id);
  const seasonId = tournament ? tournament.season_id : null;

  // Actualizar estadísticas de la pareja y calcular ELO
  if (winner_pair_id) {
    const loserId = match.pair_a_id === winner_pair_id ? match.pair_b_id : match.pair_a_id;
    await TournamentPair.increment('wins', { where: { id: winner_pair_id } });
    await TournamentPair.increment('points', { by: 3, where: { id: winner_pair_id } });
    await TournamentPair.increment('losses', { where: { id: loserId } });

    const playerIds = [match.pairA.player1_id, match.pairA.player2_id, match.pairB.player1_id, match.pairB.player2_id];
    const allPlayers = await User.findAll({ where: { id: playerIds } });

    const getPlayer = (id) => {
      const p = allPlayers.find(u => u.id === id);
      return { id: p.id, elo: p.elo_rating, total_matches: p.total_matches };
    };

    const teamA = { player1: getPlayer(match.pairA.player1_id), player2: getPlayer(match.pairA.player2_id) };
    const teamB = { player1: getPlayer(match.pairB.player1_id), player2: getPlayer(match.pairB.player2_id) };
    const winnerTeam = winner_pair_id === match.pair_a_id ? 'A' : 'B';

    const eloChanges = calcularEloDobles(teamA, teamB, winnerTeam, true);

    for (const change of eloChanges) {
      const user = allPlayers.find(u => u.id === change.id);
      await user.update({
        elo_rating: change.elo_after,
        total_matches: user.total_matches + 1,
        total_wins: change.result === 'win' ? user.total_wins + 1 : user.total_wins,
      });

      await EloHistory.create({
        user_id: change.id,
        match_id: match.id,
        match_type: 'torneo',
        elo_before: change.elo_before,
        elo_after: change.elo_after,
        elo_change: change.elo_change,
        result: change.result,
        season_id: seasonId,
      });
    }
  }

  res.json({ message: 'Resultado actualizado', match });
});

/**
 * POST /api/tournaments/:id/timer/start — Iniciar cronómetro de ronda
 */
exports.startRoundTimer = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findByPk(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });

  await tournament.update({
    round_timer_status: 'running',
    round_timer_started_at: new Date(),
  });
  res.json({ message: 'Cronómetro iniciado', tournament });
});

/**
 * POST /api/tournaments/:id/timer/pause — Pausar cronómetro de ronda
 */
exports.pauseRoundTimer = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findByPk(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });

  if (tournament.round_timer_status === 'running') {
    const elapsed = Math.floor((new Date() - new Date(tournament.round_timer_started_at)) / 1000);
    let remaining = tournament.round_timer_remaining - elapsed;
    if (remaining < 0) remaining = 0;

    await tournament.update({
      round_timer_status: 'paused',
      round_timer_started_at: null,
      round_timer_remaining: remaining,
    });
  }
  res.json({ message: 'Cronómetro pausado', tournament });
});

/**
 * POST /api/tournaments/:id/timer/resume — Reanudar cronómetro de ronda
 */
exports.resumeRoundTimer = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findByPk(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });

  if (tournament.round_timer_status === 'paused') {
    await tournament.update({
      round_timer_status: 'running',
      round_timer_started_at: new Date(),
    });
  }
  res.json({ message: 'Cronómetro reanudado', tournament });
});

/**
 * POST /api/tournaments/:id/timer/stop — Detener / Resetear cronómetro de ronda
 */
exports.stopRoundTimer = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findByPk(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });

  await tournament.update({
    round_timer_status: 'stopped',
    round_timer_started_at: null,
    round_timer_remaining: tournament.round_timer_duration,
  });
  res.json({ message: 'Cronómetro reseteado', tournament });
});

/**
 * PUT /api/tournaments/:id/timer/duration — Cambiar duración del cronómetro
 */
exports.setRoundTimerDuration = asyncHandler(async (req, res) => {
  const { duration } = req.body;
  if (duration === undefined || isNaN(duration) || duration <= 0) {
    return res.status(400).json({ error: 'Duración inválida' });
  }

  const tournament = await Tournament.findByPk(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });

  const updates = { round_timer_duration: parseInt(duration) };
  if (tournament.round_timer_status === 'stopped') {
    updates.round_timer_remaining = parseInt(duration);
  }

  await tournament.update(updates);
  res.json({ message: 'Duración de ronda actualizada', tournament });
});
