const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TournamentPair = sequelize.define('TournamentPair', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tournament_id: { type: DataTypes.UUID, allowNull: false },
  player1_id: { type: DataTypes.UUID, allowNull: false },
  player2_id: { type: DataTypes.UUID, allowNull: false },
  pair_name: { type: DataTypes.STRING(80), allowNull: true },
  seed: { type: DataTypes.INTEGER, allowNull: true },
  points: { type: DataTypes.INTEGER, defaultValue: 0 },
  wins: { type: DataTypes.INTEGER, defaultValue: 0 },
  losses: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_eliminated: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'tournament_pairs',
  indexes: [{ unique: true, fields: ['tournament_id', 'player1_id', 'player2_id'] }],
});

module.exports = TournamentPair;
