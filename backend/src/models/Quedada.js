const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Quedada = sequelize.define('Quedada', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  creator_id: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING(120), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  level: {
    type: DataTypes.ENUM('6ta_A', '6ta_B', '5ta_A', '5ta_B', '4ta_A', '4ta_B', '3ra_A', '3ra_B', 'mixto'),
    defaultValue: 'mixto',
  },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  start_time: { type: DataTypes.TIME, allowNull: false },
  num_courts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 2, max: 5 },
  },
  max_players: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 8, max: 20 },
    comment: 'Múltiplo de 4: 8, 12, 16 o 20',
  },
  status: {
    type: DataTypes.ENUM('open', 'full', 'generated', 'completed', 'cancelled'),
    defaultValue: 'open',
  },
  track_global_history: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Si true, evita repeticiones entre días para jugadores recurrentes',
  },
  gender_restriction: {
    type: DataTypes.ENUM('mixto', 'hombres', 'mujeres'),
    defaultValue: 'mixto',
    allowNull: false,
  },
  selected_courts: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  generated_rounds: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'JSON con la estructura de rondas generadas por el algoritmo',
  },
}, {
  tableName: 'quedadas',
  indexes: [
    { fields: ['date'] },
    { fields: ['status'] },
    { fields: ['level'] },
  ],
});

module.exports = Quedada;
