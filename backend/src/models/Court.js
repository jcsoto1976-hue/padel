const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Court = sequelize.define('Court', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(50), allowNull: false },
  surface: {
    type: DataTypes.ENUM('cristal', 'cesped_artificial', 'mixto'),
    defaultValue: 'cristal',
  },
  is_indoor: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  image_url: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'courts' });

module.exports = Court;
