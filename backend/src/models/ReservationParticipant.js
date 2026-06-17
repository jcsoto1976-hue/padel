const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReservationParticipant = sequelize.define('ReservationParticipant', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  reservation_id: { type: DataTypes.UUID, allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'joined' },
}, {
  tableName: 'reservation_participants',
  indexes: [
    { fields: ['reservation_id'] },
    { fields: ['user_id'] },
    { unique: true, fields: ['reservation_id', 'user_id'] }
  ]
});

module.exports = ReservationParticipant;
