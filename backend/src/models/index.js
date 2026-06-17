const sequelize = require('../config/database');

const User = require('./User');
const Court = require('./Court');
const Schedule = require('./Schedule');
const Reservation = require('./Reservation');
const Quedada = require('./Quedada');
const QuedadaParticipant = require('./QuedadaParticipant');
const Match = require('./Match');
const MatchResult = require('./MatchResult');
const PairsHistory = require('./PairsHistory');
const RivalsHistory = require('./RivalsHistory');
const Tournament = require('./Tournament');
const TournamentPair = require('./TournamentPair');
const TournamentMatch = require('./TournamentMatch');
const EloHistory = require('./EloHistory');
const Product = require('./Product');
const CashTransaction = require('./CashTransaction');
const CashClosing = require('./CashClosing');
const Season = require('./Season');
const PushSubscription = require('./PushSubscription');
const ReservationParticipant = require('./ReservationParticipant');

// ─── Asociaciones ────────────────────────────────────────────────────────────

// User ↔ CashClosing
User.hasMany(CashClosing, { foreignKey: 'closed_by_id', as: 'cashClosings' });
CashClosing.belongsTo(User, { foreignKey: 'closed_by_id', as: 'closedBy' });

// Reservation ↔ CashTransaction
Reservation.hasOne(CashTransaction, { foreignKey: 'reservation_id', as: 'payment' });
CashTransaction.belongsTo(Reservation, { foreignKey: 'reservation_id', as: 'reservation' });

// Product ↔ CashTransaction
Product.hasMany(CashTransaction, { foreignKey: 'product_id', as: 'sales' });
CashTransaction.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Court ↔ Schedule
Court.hasMany(Schedule, { foreignKey: 'court_id', as: 'schedules' });
Schedule.belongsTo(Court, { foreignKey: 'court_id', as: 'court' });

// Court ↔ Reservation
Court.hasMany(Reservation, { foreignKey: 'court_id', as: 'reservations' });
Reservation.belongsTo(Court, { foreignKey: 'court_id', as: 'court' });

// User ↔ Reservation
User.hasMany(Reservation, { foreignKey: 'user_id', as: 'reservations' });
Reservation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User ↔ Quedada (creador)
User.hasMany(Quedada, { foreignKey: 'creator_id', as: 'createdQuedadas' });
Quedada.belongsTo(User, { foreignKey: 'creator_id', as: 'creator' });

// Quedada ↔ QuedadaParticipant
Quedada.hasMany(QuedadaParticipant, { foreignKey: 'quedada_id', as: 'participants' });
QuedadaParticipant.belongsTo(Quedada, { foreignKey: 'quedada_id', as: 'quedada' });

// User ↔ QuedadaParticipant
User.hasMany(QuedadaParticipant, { foreignKey: 'user_id', as: 'quedadaParticipations' });
QuedadaParticipant.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Quedada ↔ Match
Quedada.hasMany(Match, { foreignKey: 'quedada_id', as: 'matches' });
Match.belongsTo(Quedada, { foreignKey: 'quedada_id', as: 'quedada' });

// Court ↔ Match
Court.hasMany(Match, { foreignKey: 'court_id', as: 'matches' });
Match.belongsTo(Court, { foreignKey: 'court_id', as: 'court' });

// Court ↔ TournamentMatch
Court.hasMany(TournamentMatch, { foreignKey: 'court_id', as: 'tournamentMatches' });
TournamentMatch.belongsTo(Court, { foreignKey: 'court_id', as: 'court' });

// Match ↔ players (team A & B via simple fields)
User.hasMany(Match, { foreignKey: 'player_a1_id', as: 'matchesA1' });
User.hasMany(Match, { foreignKey: 'player_a2_id', as: 'matchesA2' });
User.hasMany(Match, { foreignKey: 'player_b1_id', as: 'matchesB1' });
User.hasMany(Match, { foreignKey: 'player_b2_id', as: 'matchesB2' });
Match.belongsTo(User, { foreignKey: 'player_a1_id', as: 'playerA1' });
Match.belongsTo(User, { foreignKey: 'player_a2_id', as: 'playerA2' });
Match.belongsTo(User, { foreignKey: 'player_b1_id', as: 'playerB1' });
Match.belongsTo(User, { foreignKey: 'player_b2_id', as: 'playerB2' });

// Match ↔ MatchResult
Match.hasOne(MatchResult, { foreignKey: 'match_id', as: 'result' });
MatchResult.belongsTo(Match, { foreignKey: 'match_id', as: 'match' });

// PairsHistory
User.hasMany(PairsHistory, { foreignKey: 'player1_id', as: 'pairsAsPlayer1' });
User.hasMany(PairsHistory, { foreignKey: 'player2_id', as: 'pairsAsPlayer2' });

// RivalsHistory
User.hasMany(RivalsHistory, { foreignKey: 'player1_id', as: 'rivalsAsPlayer1' });
User.hasMany(RivalsHistory, { foreignKey: 'player2_id', as: 'rivalsAsPlayer2' });

// EloHistory
User.hasMany(EloHistory, { foreignKey: 'user_id', as: 'eloHistory' });
Match.hasMany(EloHistory, { foreignKey: 'match_id', as: 'eloChanges' });

// Tournament ↔ TournamentPair
Tournament.hasMany(TournamentPair, { foreignKey: 'tournament_id', as: 'pairs' });
TournamentPair.belongsTo(Tournament, { foreignKey: 'tournament_id', as: 'tournament' });

// Tournament ↔ Match (para formato americano)
Tournament.hasMany(Match, { foreignKey: 'tournament_id', as: 'individualMatches' });
Match.belongsTo(Tournament, { foreignKey: 'tournament_id', as: 'tournament' });

// TournamentPair players
User.hasMany(TournamentPair, { foreignKey: 'player1_id', as: 'tournamentPairsP1' });
User.hasMany(TournamentPair, { foreignKey: 'player2_id', as: 'tournamentPairsP2' });
TournamentPair.belongsTo(User, { foreignKey: 'player1_id', as: 'player1' });
TournamentPair.belongsTo(User, { foreignKey: 'player2_id', as: 'player2' });

// Tournament ↔ TournamentMatch
Tournament.hasMany(TournamentMatch, { foreignKey: 'tournament_id', as: 'matches' });
TournamentMatch.belongsTo(Tournament, { foreignKey: 'tournament_id', as: 'tournament' });
TournamentPair.hasMany(TournamentMatch, { foreignKey: 'pair_a_id', as: 'matchesAsA' });
TournamentPair.hasMany(TournamentMatch, { foreignKey: 'pair_b_id', as: 'matchesAsB' });
TournamentMatch.belongsTo(TournamentPair, { foreignKey: 'pair_a_id', as: 'pairA' });
TournamentMatch.belongsTo(TournamentPair, { foreignKey: 'pair_b_id', as: 'pairB' });

// Season associations
Season.hasMany(Match, { foreignKey: 'season_id', as: 'matches' });
Match.belongsTo(Season, { foreignKey: 'season_id', as: 'season' });
Season.hasMany(Tournament, { foreignKey: 'season_id', as: 'tournaments' });
Tournament.belongsTo(Season, { foreignKey: 'season_id', as: 'season' });
Season.hasMany(EloHistory, { foreignKey: 'season_id', as: 'eloHistories' });
EloHistory.belongsTo(Season, { foreignKey: 'season_id', as: 'season' });

// EloHistory reciprocal relations
EloHistory.belongsTo(Match, { foreignKey: 'match_id', as: 'match' });
EloHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// PushSubscription associations
User.hasMany(PushSubscription, { foreignKey: 'user_id', as: 'pushSubscriptions' });
PushSubscription.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ReservationParticipant associations
Reservation.hasMany(ReservationParticipant, { foreignKey: 'reservation_id', as: 'participants' });
ReservationParticipant.belongsTo(Reservation, { foreignKey: 'reservation_id', as: 'reservation' });
User.hasMany(ReservationParticipant, { foreignKey: 'user_id', as: 'reservationsJoined' });
ReservationParticipant.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User,
  Court,
  Schedule,
  Reservation,
  Quedada,
  QuedadaParticipant,
  Match,
  MatchResult,
  PairsHistory,
  RivalsHistory,
  Tournament,
  TournamentPair,
  TournamentMatch,
  EloHistory,
  Product,
  CashTransaction,
  CashClosing,
  Season,
  PushSubscription,
  ReservationParticipant,
};
