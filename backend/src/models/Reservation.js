const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Reservation = sequelize.define('Reservation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  court_id: { type: DataTypes.UUID, allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: false },
  start_datetime: { type: DataTypes.DATE, allowNull: false },
  end_datetime: { type: DataTypes.DATE, allowNull: false },
  duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { isIn: [[60, 90, 120]] },
  },
  status: {
    type: DataTypes.ENUM('active', 'cancelled', 'completed'),
    defaultValue: 'active',
  },
  cancelled_at: { type: DataTypes.DATE, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  is_public: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  public_level: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
}, {
  tableName: 'reservations',
  indexes: [
    { fields: ['court_id', 'start_datetime'] },
    { fields: ['user_id'] },
  ],
});

module.exports = Reservation;
