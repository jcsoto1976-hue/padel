const { Op, fn, col, literal } = require('sequelize');
const { User, EloHistory, PairsHistory, RivalsHistory, Match, MatchResult, Court, Season, Tournament, TournamentMatch, TournamentPair } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/ranking — Tabla de clasificación general (o por nivel)
 */
exports.getRanking = asyncHandler(async (req, res) => {
  const { level, limit = 50, offset = 0, season_id } = req.query;
  const where = { is_active: true, role: 'jugador' };
  
  if (req.user && req.user.role === 'jugador') {
    where.level = req.user.level;
  } else if (level) {
    where.level = level;
  }

  if (season_id) {
    // 1. Obtener todos los jugadores activos correspondientes a la categoría
    const players = await User.findAll({
      where,
      attributes: ['id', 'name', 'level', 'elo_rating', 'elo_tournament', 'total_matches', 'total_wins', 'avatar_url'],
    });

    // 2. Obtener partidos de la temporada en la tabla general de matches
    const seasonMatches = await Match.findAll({
      where: { season_id, status: 'confirmed' },
      include: [{ model: MatchResult, as: 'result' }],
    });

    // 3. Obtener partidos de torneos clásicos de la temporada
    const seasonTournaments = await Tournament.findAll({
      where: { season_id },
      attributes: ['id'],
    });
    const seasonTournamentIds = seasonTournaments.map(t => t.id);
    const seasonTournamentMatches = await TournamentMatch.findAll({
      where: {
        tournament_id: { [Op.in]: seasonTournamentIds },
        status: 'completed',
      },
    });

    // 4. Obtener historial ELO de la temporada
    const seasonEloHistories = await EloHistory.findAll({
      where: { season_id },
      order: [['created_at', 'ASC']],
    });

    // 5. Mapear parejas de torneos para conocer los IDs de jugadores correspondientes
    const pairs = await TournamentPair.findAll({
      where: { tournament_id: { [Op.in]: seasonTournamentIds } },
    });
    const pairMap = {};
    pairs.forEach(p => {
      pairMap[p.id] = [p.player1_id, p.player2_id];
    });

    // 6. Inicializar estadísticas de los jugadores
    const playerStats = {};
    players.forEach(p => {
      playerStats[p.id] = {
         total_matches: 0,
         total_wins: 0,
         elo: 1000,
      };
    });

    // 7. Procesar historial ELO de la temporada para calcular el ELO final
    seasonEloHistories.forEach(h => {
      if (playerStats[h.user_id]) {
        playerStats[h.user_id].elo = h.elo_after;
      }
    });

    // 8. Procesar partidos en la tabla general (quedadas, americano, amistosos)
    seasonMatches.forEach(m => {
      const pIds = [m.player_a1_id, m.player_a2_id, m.player_b1_id, m.player_b2_id];
      pIds.forEach(id => {
        if (playerStats[id]) {
          playerStats[id].total_matches++;
        }
      });

      if (m.result) {
        if (m.result.winner_team === 'A') {
          [m.player_a1_id, m.player_a2_id].forEach(id => {
            if (playerStats[id]) playerStats[id].total_wins++;
          });
        } else if (m.result.winner_team === 'B') {
          [m.player_b1_id, m.player_b2_id].forEach(id => {
            if (playerStats[id]) playerStats[id].total_wins++;
          });
        }
      }
    });

    // 9. Procesar partidos de torneos clásicos
    seasonTournamentMatches.forEach(m => {
      const playersA = pairMap[m.pair_a_id] || [];
      const playersB = pairMap[m.pair_b_id] || [];
      
      playersA.concat(playersB).forEach(id => {
        if (playerStats[id]) {
          playerStats[id].total_matches++;
        }
      });

      if (m.winner_pair_id) {
        const winnerPlayers = pairMap[m.winner_pair_id] || [];
        winnerPlayers.forEach(id => {
          if (playerStats[id]) {
            playerStats[id].total_wins++;
          }
        });
      }
    });

    // 10. Mapear y ordenar jugadores
    const mappedPlayers = players.map(p => {
      const stats = playerStats[p.id] || { total_matches: 0, total_wins: 0, elo: 1000 };
      return {
        id: p.id,
        name: p.name,
        level: p.level,
        elo_rating: stats.elo,
        elo_tournament: p.elo_tournament,
        total_matches: stats.total_matches,
        total_wins: stats.total_wins,
        avatar_url: p.avatar_url,
      };
    });

    mappedPlayers.sort((a, b) => b.elo_rating - a.elo_rating);

    const total = mappedPlayers.length;
    const paginated = mappedPlayers.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    return res.json({ players: paginated, total, page: Math.floor(offset / limit) + 1 });
  }

  // Comportamiento global por defecto
  const players = await User.findAll({
    where,
    attributes: ['id', 'name', 'level', 'elo_rating', 'elo_tournament', 'total_matches', 'total_wins', 'avatar_url'],
    order: [['elo_rating', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset),
  });

  const total = await User.count({ where });

  res.json({ players, total, page: Math.floor(offset / limit) + 1 });
});

/**
 * GET /api/ranking/players/:id/stats — Estadísticas individuales
 */
exports.getPlayerStats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { season_id } = req.query;

  const user = await User.findByPk(id, {
    attributes: { exclude: ['password_hash'] },
  });

  if (!user) return res.status(404).json({ error: 'Jugador no encontrado' });

  // Compañeros y rivales
  const compWhere1 = { player1_id: user.id };
  const compWhere2 = { player2_id: user.id };
  const rivalWhere1 = { player1_id: user.id };
  const rivalWhere2 = { player2_id: user.id };
  const eloHistoryWhere = { user_id: user.id };

  if (season_id) {
    const seasonMatchIds = (await Match.findAll({
      where: { season_id },
      attributes: ['id'],
    })).map(m => m.id);

    compWhere1.match_id = { [Op.in]: seasonMatchIds };
    compWhere2.match_id = { [Op.in]: seasonMatchIds };
    rivalWhere1.match_id = { [Op.in]: seasonMatchIds };
    rivalWhere2.match_id = { [Op.in]: seasonMatchIds };
    eloHistoryWhere.season_id = season_id;
  }

  // Compañeros distintos
  const companeros1 = await PairsHistory.count({
    where: compWhere1,
    distinct: true,
    col: 'player2_id',
  });
  const companeros2 = await PairsHistory.count({
    where: compWhere2,
    distinct: true,
    col: 'player1_id',
  });

  // Rivales distintos
  const rivales1 = await RivalsHistory.count({
    where: rivalWhere1,
    distinct: true,
    col: 'player2_id',
  });
  const rivales2 = await RivalsHistory.count({
    where: rivalWhere2,
    distinct: true,
    col: 'player1_id',
  });

  // Historial ELO
  const eloHistory = await EloHistory.findAll({
    where: eloHistoryWhere,
    order: [['created_at', 'ASC']],
    limit: 50,
  });

  // Query matches conditions
  const matchWhere = {
    [Op.or]: [
      { player_a1_id: user.id },
      { player_a2_id: user.id },
      { player_b1_id: user.id },
      { player_b2_id: user.id }
    ]
  };

  if (season_id) {
    matchWhere.season_id = season_id;
  }

  // Obtener los últimos 20 partidos del jugador
  const matches = await Match.findAll({
    where: matchWhere,
    include: [
      { model: User, as: 'playerA1', attributes: ['id', 'name'] },
      { model: User, as: 'playerA2', attributes: ['id', 'name'] },
      { model: User, as: 'playerB1', attributes: ['id', 'name'] },
      { model: User, as: 'playerB2', attributes: ['id', 'name'] },
      { model: Court, as: 'court', attributes: ['id', 'name'] },
      { model: MatchResult, as: 'result' }
    ],
    order: [['created_at', 'DESC']],
    limit: 20
  });

  // Streaks and court statistics based on all completed matches
  const completedMatchWhere = {
    status: 'confirmed',
    [Op.or]: [
      { player_a1_id: user.id },
      { player_a2_id: user.id },
      { player_b1_id: user.id },
      { player_b2_id: user.id }
    ]
  };
  if (season_id) {
    completedMatchWhere.season_id = season_id;
  }

  const allCompletedMatches = await Match.findAll({
    where: completedMatchWhere,
    include: [
      { model: MatchResult, as: 'result' },
      { model: Court, as: 'court', attributes: ['id', 'name'] }
    ],
    order: [['created_at', 'DESC']]
  });

  let currentStreak = 0;
  let currentStreakType = 'wins';
  let activeStreakCounted = false;
  let maxWinStreak = 0;
  let tempWinStreak = 0;

  // Max win streak (chronological order)
  const chronologicalMatches = [...allCompletedMatches].reverse();
  chronologicalMatches.forEach(m => {
    if (m.result) {
      const isTeamA = m.player_a1_id === user.id || m.player_a2_id === user.id;
      const won = (isTeamA && m.result.winner_team === 'A') || (!isTeamA && m.result.winner_team === 'B');
      if (won) {
        tempWinStreak++;
        if (tempWinStreak > maxWinStreak) maxWinStreak = tempWinStreak;
      } else {
        tempWinStreak = 0;
      }
    }
  });

  // Current streak (reverse chronological)
  allCompletedMatches.forEach((m, idx) => {
    if (m.result && !activeStreakCounted) {
      const isTeamA = m.player_a1_id === user.id || m.player_a2_id === user.id;
      const won = (isTeamA && m.result.winner_team === 'A') || (!isTeamA && m.result.winner_team === 'B');
      if (idx === 0) {
        currentStreakType = won ? 'wins' : 'losses';
        currentStreak = 1;
      } else {
        if ((won && currentStreakType === 'wins') || (!won && currentStreakType === 'losses')) {
          currentStreak++;
        } else {
          activeStreakCounted = true;
        }
      }
    }
  });

  // Court efficiency stats
  const courtStats = {};
  allCompletedMatches.forEach(m => {
    if (m.result && m.court_id) {
      const courtName = m.court?.name || `Pista ${m.court_number || ''}`;
      if (!courtStats[m.court_id]) {
        courtStats[m.court_id] = { name: courtName, played: 0, won: 0 };
      }
      courtStats[m.court_id].played++;
      const isTeamA = m.player_a1_id === user.id || m.player_a2_id === user.id;
      const won = (isTeamA && m.result.winner_team === 'A') || (!isTeamA && m.result.winner_team === 'B');
      if (won) {
        courtStats[m.court_id].won++;
      }
    }
  });

  // Calculate ELO values dynamically if season is specified
  let displayElo = user.elo_rating;
  let displayEloTournament = user.elo_tournament;
  if (season_id) {
    const latestEloHistory = await EloHistory.findOne({
      where: { user_id: user.id, season_id },
      order: [['created_at', 'DESC']],
    });
    displayElo = latestEloHistory ? latestEloHistory.elo_after : 1000;
    
    const latestTournamentEloHistory = await EloHistory.findOne({
      where: { user_id: user.id, season_id, match_type: 'torneo' },
      order: [['created_at', 'DESC']],
    });
    displayEloTournament = latestTournamentEloHistory ? latestTournamentEloHistory.elo_after : 1000;
  }

  const totalMatches = season_id ? allCompletedMatches.length : user.total_matches;
  const totalWins = season_id 
    ? allCompletedMatches.filter(m => {
        if (!m.result) return false;
        const isTeamA = m.player_a1_id === user.id || m.player_a2_id === user.id;
        return (isTeamA && m.result.winner_team === 'A') || (!isTeamA && m.result.winner_team === 'B');
      }).length
    : user.total_wins;

  const uniqueCompaneros = companeros1 + companeros2;
  const uniqueRivales = rivales1 + rivales2;

  // Modificar temporalmente el objeto user para la respuesta
  const userJson = user.toJSON();
  userJson.elo_rating = displayElo;
  userJson.elo_tournament = displayEloTournament;

  res.json({
    user: userJson,
    stats: {
      total_matches: totalMatches,
      total_wins: totalWins,
      win_rate: totalMatches > 0 ? ((totalWins / totalMatches) * 100).toFixed(1) : '0.0',
      unique_companions: uniqueCompaneros,
      unique_rivals: uniqueRivales,
      elo_rating: displayElo,
      elo_tournament: displayEloTournament,
      current_streak: currentStreak,
      current_streak_type: currentStreakType,
      max_win_streak: maxWinStreak,
      court_efficiency: Object.values(courtStats),
    },
    elo_history: eloHistory,
    matches: matches
  });
});

/**
 * GET /api/ranking/h2h/:p1/:p2 — Comparación cara a cara (Head-to-Head)
 */
exports.getH2HStats = asyncHandler(async (req, res) => {
  const { p1, p2 } = req.params;

  const player1 = await User.findByPk(p1, { attributes: ['id', 'name', 'level', 'elo_rating', 'avatar_url'] });
  const player2 = await User.findByPk(p2, { attributes: ['id', 'name', 'level', 'elo_rating', 'avatar_url'] });

  if (!player1 || !player2) {
    return res.status(404).json({ error: 'Uno de los jugadores no fue encontrado' });
  }

  const sharedMatches = await Match.findAll({
    where: {
      status: 'confirmed',
      [Op.and]: [
        {
          [Op.or]: [
            { player_a1_id: p1 }, { player_a2_id: p1 }, { player_b1_id: p1 }, { player_b2_id: p1 }
          ]
        },
        {
          [Op.or]: [
            { player_a1_id: p2 }, { player_a2_id: p2 }, { player_b1_id: p2 }, { player_b2_id: p2 }
          ]
        }
      ]
    },
    include: [{ model: MatchResult, as: 'result' }]
  });

  let asPartners = 0;
  let wonAsPartners = 0;
  let asRivals = 0;
  let p1Wins = 0;
  let p2Wins = 0;

  sharedMatches.forEach(m => {
    if (m.result) {
      const p1Team = (m.player_a1_id === p1 || m.player_a2_id === p1) ? 'A' : 'B';
      const p2Team = (m.player_a1_id === p2 || m.player_a2_id === p2) ? 'A' : 'B';

      if (p1Team === p2Team) {
        asPartners++;
        if (m.result.winner_team === p1Team) {
          wonAsPartners++;
        }
      } else {
        asRivals++;
        if (m.result.winner_team === p1Team) {
          p1Wins++;
        } else if (m.result.winner_team === p2Team) {
          p2Wins++;
        }
      }
    }
  });

  res.json({
    player1,
    player2,
    comparison: {
      together: { played: asPartners, won: wonAsPartners },
      against: { played: asRivals, p1Wins, p2Wins }
    }
  });
});

/**
 * GET /api/ranking/algorithm-examples — Ejemplos del algoritmo de emparejamiento
 */
exports.getAlgorithmExamples = asyncHandler(async (req, res) => {
  const { getAlgorithmExamples } = require('../services/matchmaking');
  // fallback if needed
  res.json({ examples: [] });
});
