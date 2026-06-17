const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { len: [2, 100] },
  },

  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('admin', 'entrenador', 'jugador'),
    defaultValue: 'jugador',
  },
  level: {
    type: DataTypes.ENUM('6ta_A', '6ta_B', '5ta_A', '5ta_B', '4ta_A', '4ta_B', '3ra_A', '3ra_B'),
    defaultValue: '6ta_B',
  },
  gender: {
    type: DataTypes.ENUM('H', 'M'),
    defaultValue: 'H',
    allowNull: false,
  },
  elo_rating: {
    type: DataTypes.INTEGER,
    defaultValue: 1000,
  },
  elo_tournament: {
    type: DataTypes.INTEGER,
    defaultValue: 1000,
  },
  avatar_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [3, 20],
    },
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  total_matches: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  total_wins: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'users',
  indexes: [
    { unique: true, fields: ['phone'] },
    { fields: ['level'] },
    { fields: ['elo_rating'] },
  ],
});

module.exports = User;
