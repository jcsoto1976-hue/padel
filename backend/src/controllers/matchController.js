const { Match, MatchResult, User, EloHistory, PairsHistory, RivalsHistory, Season } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { calcularEloDobles } = require('../services/elo');

/**
 * POST /api/matches/:id/result — Reportar resultado
 */
exports.reportResult = asyncHandler(async (req, res) => {
  const { score_a, score_b, winner_team } = req.body;
  const match = await Match.findByPk(req.params.id);

  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

  const players = [match.player_a1_id, match.player_a2_id, match.player_b1_id, match.player_b2_id];
  if (!players.includes(req.user.id) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo los participantes pueden reportar el resultado' });
  }
  if (!['A', 'B', 'draw'].includes(winner_team)) {
    return res.status(400).json({ error: 'winner_team debe ser A, B o draw' });
  }

  const existing = await MatchResult.findOne({ where: { match_id: match.id } });
  if (existing) return res.status(409).json({ error: 'El resultado ya fue reportado' });

  const result = await MatchResult.create({
    match_id: match.id,
    score_a,
    score_b,
    winner_team,
    reported_by_id: req.user.id,
  });

  await match.update({ status: 'result_reported', reported_by_id: req.user.id });

  res.json({ message: 'Resultado reportado. Pendiente de confirmación por el equipo contrario.', result });
});

/**
 * POST /api/matches/:id/confirm — Confirmar resultado (oponente)
 */
exports.confirmResult = asyncHandler(async (req, res) => {
  const match = await Match.findByPk(req.params.id);
  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

  const result = await MatchResult.findOne({ where: { match_id: match.id } });
  if (!result) return res.status(404).json({ error: 'No hay resultado reportado para este partido' });
  if (result.elo_processed) return res.status(400).json({ error: 'El resultado ya fue confirmado' });

  // Verificar que el confirmador es del equipo contrario al que reportó
  const teamA = [match.player_a1_id, match.player_a2_id];
  const teamB = [match.player_b1_id, match.player_b2_id];
  const reporterInA = teamA.includes(result.reported_by_id);
  const confirmingTeam = reporterInA ? teamB : teamA;

  if (!confirmingTeam.includes(req.user.id) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo el equipo contrario puede confirmar el resultado' });
  }

  // Obtener datos ELO de los jugadores
  const allPlayers = await User.findAll({
    where: { id: [...teamA, ...teamB] },
    attributes: ['id', 'elo_rating', 'total_matches', 'total_wins', 'role'],
  });

  const getPlayer = (id) => {
    const p = allPlayers.find(u => u.id === id);
    return { id: p.id, elo: p.elo_rating, total_matches: p.total_matches };
  };

  const isTournament = match.match_type === 'torneo';
  const eloChanges = calcularEloDobles(
    { player1: getPlayer(match.player_a1_id), player2: getPlayer(match.player_a2_id) },
    { player1: getPlayer(match.player_b1_id), player2: getPlayer(match.player_b2_id) },
    result.winner_team,
    isTournament
  );

  // Aplicar cambios de ELO
  const activeSeason = await Season.findOne({ where: { is_active: true } });
  const seasonId = match.season_id || (activeSeason ? activeSeason.id : null);

  for (const change of eloChanges) {
    const user = allPlayers.find(u => u.id === change.id);
    
    // Las quedadas no alteran el ELO, solo partidos jugados/ganados
    const newEloRating = match.match_type === 'quedada' ? user.elo_rating : change.elo_after;

    await user.update({
      elo_rating: newEloRating,
      total_matches: user.total_matches + 1,
      total_wins: change.result === 'win' ? user.total_wins + 1 : user.total_wins,
    });

    if (match.match_type !== 'quedada') {
      await EloHistory.create({
        user_id: change.id,
        match_id: match.id,
        match_type: match.match_type,
        elo_before: change.elo_before,
        elo_after: change.elo_after,
        elo_change: change.elo_change,
        result: change.result,
        season_id: seasonId,
      });
    }
  }

  await result.update({ confirmed_by_id: req.user.id, confirmed_at: new Date(), elo_processed: true });
  await match.update({ status: 'confirmed' });

  res.json({
    message: 'Resultado confirmado. ELO actualizado.',
    elo_changes: eloChanges,
  });
});

/**
 * GET /api/matches/:id
 */
exports.getMatch = asyncHandler(async (req, res) => {
  const match = await Match.findByPk(req.params.id, {
    include: [
      { model: User, as: 'playerA1', attributes: ['id', 'name', 'elo_rating'] },
      { model: User, as: 'playerA2', attributes: ['id', 'name', 'elo_rating'] },
      { model: User, as: 'playerB1', attributes: ['id', 'name', 'elo_rating'] },
      { model: User, as: 'playerB2', attributes: ['id', 'name', 'elo_rating'] },
    ],
  });

  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

  const result = await MatchResult.findOne({ where: { match_id: match.id } });
  res.json({ match, result });
});

/**
 * POST /api/matches/:id/result-direct — Registrar y confirmar marcador directamente (admin)
 */
exports.setResultDirect = asyncHandler(async (req, res) => {
  const { score_a, score_b, winner_team } = req.body;
  const match = await Match.findByPk(req.params.id);

  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

  if (!['A', 'B', 'draw'].includes(winner_team)) {
    return res.status(400).json({ error: 'winner_team debe ser A, B o draw' });
  }

  let result = await MatchResult.findOne({ where: { match_id: match.id } });
  if (result && result.elo_processed) {
    return res.status(400).json({ error: 'El resultado ya fue procesado y no puede modificarse' });
  }

  if (result) {
    await result.update({
      score_a,
      score_b,
      winner_team,
      reported_by_id: req.user.id,
      confirmed_by_id: req.user.id,
      confirmed_at: new Date(),
      elo_processed: true
    });
  } else {
    result = await MatchResult.create({
      match_id: match.id,
      score_a,
      score_b,
      winner_team,
      reported_by_id: req.user.id,
      confirmed_by_id: req.user.id,
      confirmed_at: new Date(),
      elo_processed: true
    });
  }

  const teamA = [match.player_a1_id, match.player_a2_id];
  const teamB = [match.player_b1_id, match.player_b2_id];

  const allPlayers = await User.findAll({
    where: { id: [...teamA, ...teamB] },
    attributes: ['id', 'elo_rating', 'total_matches', 'total_wins', 'role'],
  });

  const getPlayer = (id) => {
    const p = allPlayers.find(u => u.id === id);
    return { id: p.id, elo: p.elo_rating, total_matches: p.total_matches };
  };

  const isTournament = match.match_type === 'torneo';
  const eloChanges = calcularEloDobles(
    { player1: getPlayer(match.player_a1_id), player2: getPlayer(match.player_a2_id) },
    { player1: getPlayer(match.player_b1_id), player2: getPlayer(match.player_b2_id) },
    result.winner_team,
    isTournament
  );

  const activeSeason = await Season.findOne({ where: { is_active: true } });
  const seasonId = match.season_id || (activeSeason ? activeSeason.id : null);

  for (const change of eloChanges) {
    const user = allPlayers.find(u => u.id === change.id);
    const newEloRating = match.match_type === 'quedada' ? user.elo_rating : change.elo_after;

    await user.update({
      elo_rating: newEloRating,
      total_matches: user.total_matches + 1,
      total_wins: change.result === 'win' ? user.total_wins + 1 : user.total_wins,
    });

    if (match.match_type !== 'quedada') {
      await EloHistory.create({
        user_id: change.id,
        match_id: match.id,
        match_type: match.match_type,
        elo_before: change.elo_before,
        elo_after: change.elo_after,
        elo_change: change.elo_change,
        result: change.result,
        season_id: seasonId,
      });
    }
  }

  await match.update({ status: 'confirmed' });

  res.json({ message: 'Resultado registrado y confirmado directamente', result, elo_changes: eloChanges });
});
