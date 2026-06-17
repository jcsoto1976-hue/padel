const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CashTransaction = sequelize.define('CashTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.ENUM('income_court', 'income_product', 'expense'),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  payment_method: {
    type: DataTypes.ENUM('cash', 'card', 'transfer'),
    allowNull: false,
    defaultValue: 'cash',
  },
  reservation_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'reservations',
      key: 'id',
    },
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'products',
      key: 'id',
    },
  },
  product_quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1 },
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'cash_transactions',
  indexes: [
    { fields: ['date'] },
    { fields: ['type'] },
    { fields: ['reservation_id'] },
    { fields: ['product_id'] },
  ],
});

module.exports = CashTransaction;
