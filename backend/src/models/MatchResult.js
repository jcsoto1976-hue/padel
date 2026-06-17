const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MatchResult = sequelize.define('MatchResult', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  match_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  score_a: {
    type: DataTypes.STRING(30),
    allowNull: true,
    comment: 'Ej: "6-3, 7-5"',
  },
  score_b: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  winner_team: {
    type: DataTypes.ENUM('A', 'B', 'draw'),
    allowNull: true,
  },
  reported_by_id: { type: DataTypes.UUID, allowNull: false },
  confirmed_by_id: { type: DataTypes.UUID, allowNull: true },
  confirmed_at: { type: DataTypes.DATE, allowNull: true },
  elo_processed: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'match_results' });

module.exports = MatchResult;
