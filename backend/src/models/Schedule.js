const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Schedule = sequelize.define('Schedule', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  court_id: { type: DataTypes.UUID, allowNull: false },
  day_of_week: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '0=Domingo, 1=Lunes ... 6=Sábado',
  },
  open_time: { type: DataTypes.TIME, allowNull: false, defaultValue: '08:00:00' },
  close_time: { type: DataTypes.TIME, allowNull: false, defaultValue: '22:00:00' },
  slot_duration_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 60,
    comment: '60 o 90 minutos',
  },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'schedules' });

module.exports = Schedule;
