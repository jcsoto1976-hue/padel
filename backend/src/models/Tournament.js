const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Tournament = sequelize.define('Tournament', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  format: {
    type: DataTypes.ENUM('eliminacion_directa', 'liguilla', 'combinado', 'americano', 'americano_fijo'),
    defaultValue: 'eliminacion_directa',
  },
  level: {
    type: DataTypes.ENUM('6ta_A', '6ta_B', '5ta_A', '5ta_B', '4ta_A', '4ta_B', '3ra_A', '3ra_B', 'mixto'),
    defaultValue: 'mixto',
  },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: true },
  max_pairs: { type: DataTypes.INTEGER, defaultValue: 8 },
  status: {
    type: DataTypes.ENUM('draft', 'open', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'draft',
  },
  winner_pair_id: { type: DataTypes.UUID, allowNull: true },
  season_id: { type: DataTypes.UUID, allowNull: true },
  created_by_id: { type: DataTypes.UUID, allowNull: false },
  prize_info: { type: DataTypes.TEXT, allowNull: true },
  gender_restriction: {
    type: DataTypes.ENUM('mixto', 'hombres', 'mujeres'),
    defaultValue: 'mixto',
    allowNull: false,
  },
  selected_courts: { type: DataTypes.JSON, allowNull: true },
  round_timer_status: {
    type: DataTypes.ENUM('stopped', 'running', 'paused'),
    defaultValue: 'stopped',
  },
  round_timer_started_at: { type: DataTypes.DATE, allowNull: true },
  round_timer_duration: { type: DataTypes.INTEGER, defaultValue: 900 },
  round_timer_remaining: { type: DataTypes.INTEGER, defaultValue: 900 },
}, { tableName: 'tournaments' });

module.exports = Tournament;
