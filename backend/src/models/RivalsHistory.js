const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RivalsHistory = sequelize.define('RivalsHistory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  player1_id: { type: DataTypes.UUID, allowNull: false },
  player2_id: { type: DataTypes.UUID, allowNull: false },
  match_id: { type: DataTypes.UUID, allowNull: false },
  quedada_id: { type: DataTypes.UUID, allowNull: true },
  times_faced: { type: DataTypes.INTEGER, defaultValue: 1 },
}, {
  tableName: 'rivals_history',
  indexes: [
    { fields: ['player1_id', 'player2_id'] },
    { fields: ['quedada_id'] },
  ],
});

module.exports = RivalsHistory;
