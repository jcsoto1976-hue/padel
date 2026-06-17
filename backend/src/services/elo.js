'use strict';

/**
 * Sistema de puntuación ELO adaptado a partidos de dobles de pádel.
 *
 * En dobles, se calcula el ELO de cada jugador individualmente
 * usando el ELO promedio del equipo rival como referencia.
 *
 * K-factor:
 *   - Jugadores con < 10 partidos: K = 40  (mayor volatilidad)
 *   - Jugadores con 10-30 partidos: K = 25
 *   - Jugadores con > 30 partidos: K = 16
 *
 * Torneos: K * 1.5 (más importante)
 */

const K_NOVATO = 40;
const K_MEDIO = 25;
const K_VETERANO = 16;
const TORNEO_MULTIPLIER = 1.5;

/**
 * Devuelve el K-factor según el número de partidos jugados
 */
function getKFactor(totalMatches, isTournament = false) {
  let k;
  if (totalMatches < 10) k = K_NOVATO;
  else if (totalMatches < 30) k = K_MEDIO;
  else k = K_VETERANO;
  return isTournament ? Math.round(k * TORNEO_MULTIPLIER) : k;
}

/**
 * Probabilidad esperada de ganar según ELO
 * @param {number} eloA - ELO del jugador A
 * @param {number} eloB - ELO del oponente B
 */
function expectedScore(eloA, eloB) {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

/**
 * Calcula los nuevos ELO para los 4 jugadores de un partido de dobles.
 *
 * @param {object} teamA - { player1: {id, elo, total_matches}, player2: {id, elo, total_matches} }
 * @param {object} teamB - { player1: {id, elo, total_matches}, player2: {id, elo, total_matches} }
 * @param {string} winner - 'A' | 'B' | 'draw'
 * @param {boolean} isTournament
 *
 * @returns {object[]} Array de 4 objetos { id, elo_before, elo_after, elo_change, result }
 */
function calcularEloDobles(teamA, teamB, winner, isTournament = false) {
  const eloA = (teamA.player1.elo + teamA.player2.elo) / 2;
  const eloB = (teamB.player1.elo + teamB.player2.elo) / 2;

  const expectedA = expectedScore(eloA, eloB);
  const expectedB = 1 - expectedA;

  let scoreA, scoreB;
  if (winner === 'A') { scoreA = 1; scoreB = 0; }
  else if (winner === 'B') { scoreA = 0; scoreB = 1; }
  else { scoreA = 0.5; scoreB = 0.5; }

  const calcChange = (player, expected, score) => {
    const k = getKFactor(player.total_matches, isTournament);
    return Math.round(k * (score - expected));
  };

  const players = [
    { ...teamA.player1, expected: expectedA, score: scoreA, result: winner === 'A' ? 'win' : winner === 'draw' ? 'draw' : 'loss' },
    { ...teamA.player2, expected: expectedA, score: scoreA, result: winner === 'A' ? 'win' : winner === 'draw' ? 'draw' : 'loss' },
    { ...teamB.player1, expected: expectedB, score: scoreB, result: winner === 'B' ? 'win' : winner === 'draw' ? 'draw' : 'loss' },
    { ...teamB.player2, expected: expectedB, score: scoreB, result: winner === 'B' ? 'win' : winner === 'draw' ? 'draw' : 'loss' },
  ];

  return players.map(p => {
    const change = calcChange(p, p.expected, p.score);
    const newElo = Math.max(100, p.elo + change); // ELO mínimo 100
    return {
      id: p.id,
      elo_before: p.elo,
      elo_after: newElo,
      elo_change: change,
      result: p.result,
    };
  });
}

module.exports = { calcularEloDobles, getKFactor, expectedScore };
