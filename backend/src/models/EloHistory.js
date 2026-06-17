const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EloHistory = sequelize.define('EloHistory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  match_id: { type: DataTypes.UUID, allowNull: false },
  match_type: { type: DataTypes.ENUM('quedada', 'torneo', 'amistoso'), defaultValue: 'quedada' },
  elo_before: { type: DataTypes.INTEGER, allowNull: false },
  elo_after: { type: DataTypes.INTEGER, allowNull: false },
  elo_change: { type: DataTypes.INTEGER, allowNull: false },
  result: { type: DataTypes.ENUM('win', 'loss', 'draw'), allowNull: false },
  season_id: { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'elo_history',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['match_id'] },
  ],
});

module.exports = EloHistory;
