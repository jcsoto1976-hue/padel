const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QuedadaParticipant = sequelize.define('QuedadaParticipant', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  quedada_id: { type: DataTypes.UUID, allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: false },
  registered_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  status: {
    type: DataTypes.ENUM('registered', 'confirmed', 'cancelled'),
    defaultValue: 'registered',
  },
}, {
  tableName: 'quedada_participants',
  indexes: [
    { unique: true, fields: ['quedada_id', 'user_id'] },
  ],
});

module.exports = QuedadaParticipant;
