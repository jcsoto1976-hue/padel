const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PairsHistory = sequelize.define('PairsHistory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  player1_id: { type: DataTypes.UUID, allowNull: false },
  player2_id: { type: DataTypes.UUID, allowNull: false },
  match_id: { type: DataTypes.UUID, allowNull: false },
  quedada_id: { type: DataTypes.UUID, allowNull: true },
  times_together: { type: DataTypes.INTEGER, defaultValue: 1 },
}, {
  tableName: 'pairs_history',
  indexes: [
    { fields: ['player1_id', 'player2_id'] },
    { fields: ['quedada_id'] },
  ],
});

module.exports = PairsHistory;
