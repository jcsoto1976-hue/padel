const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PushSubscription = sequelize.define('PushSubscription', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  endpoint: { type: DataTypes.TEXT, allowNull: false },
  keys_p256dh: { type: DataTypes.STRING, allowNull: false },
  keys_auth: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: 'push_subscriptions',
});

module.exports = PushSubscription;
