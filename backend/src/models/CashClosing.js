const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CashClosing = sequelize.define('CashClosing', {
  date: {
    type: DataTypes.DATEONLY,
    primaryKey: true,
    allowNull: false,
  },
  closed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  closed_by_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  court_income: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  product_income: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  expenses: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  net_balance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  cash_total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  card_total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  transfer_total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
}, {
  tableName: 'cash_closings',
});

module.exports = CashClosing;
