const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TournamentMatch = sequelize.define('TournamentMatch', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tournament_id: { type: DataTypes.UUID, allowNull: false },
  pair_a_id: { type: DataTypes.UUID, allowNull: true },
  pair_b_id: { type: DataTypes.UUID, allowNull: true },
  round: { type: DataTypes.INTEGER, allowNull: false },
  match_number: { type: DataTypes.INTEGER, allowNull: false },
  group_name: { type: DataTypes.STRING(10), allowNull: true, comment: 'Para liguilla: Grupo A, B...' },
  score_a: { type: DataTypes.STRING(50), allowNull: true },
  score_b: { type: DataTypes.STRING(50), allowNull: true },
  winner_pair_id: { type: DataTypes.UUID, allowNull: true },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'walkover'),
    defaultValue: 'pending',
  },
  scheduled_at: { type: DataTypes.DATE, allowNull: true },
  court_id: { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'tournament_matches',
  indexes: [
    { fields: ['tournament_id', 'round'] },
  ],
});

module.exports = TournamentMatch;
