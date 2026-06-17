const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Match = sequelize.define('Match', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  quedada_id: { type: DataTypes.UUID, allowNull: true },
  tournament_id: { type: DataTypes.UUID, allowNull: true },
  court_id: { type: DataTypes.UUID, allowNull: true },
  season_id: { type: DataTypes.UUID, allowNull: true },
  match_type: {
    type: DataTypes.ENUM('quedada', 'torneo', 'amistoso'),
    defaultValue: 'quedada',
  },
  round_number: { type: DataTypes.INTEGER, defaultValue: 1 },
  court_number: { type: DataTypes.INTEGER, allowNull: true },
  player_a1_id: { type: DataTypes.UUID, allowNull: false },
  player_a2_id: { type: DataTypes.UUID, allowNull: false },
  player_b1_id: { type: DataTypes.UUID, allowNull: false },
  player_b2_id: { type: DataTypes.UUID, allowNull: false },
  scheduled_at: { type: DataTypes.DATE, allowNull: true },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'result_reported', 'confirmed', 'disputed'),
    defaultValue: 'pending',
  },
  reported_by_id: { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'matches',
  indexes: [
    { fields: ['quedada_id'] },
    { fields: ['tournament_id'] },
    { fields: ['status'] },
  ],
});

module.exports = Match;
