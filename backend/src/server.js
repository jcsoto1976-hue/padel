require('dotenv').config();
const dns = require('dns');

// Sobrescribir dns.lookup globalmente para forzar IPv4 y evitar errores de red en Render
const originalLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  const opts = Object.assign({}, typeof options === 'object' ? options : { family: options }, { family: 4 });
  return originalLookup(hostname, opts, callback);
};

const app = require('./app');

const PORT = process.env.PORT || 4000;

const { sequelize } = require('./models');

sequelize
  .authenticate()
  .then(() => {
    console.log(`✅ Conexión a base de datos (${sequelize.getDialect()}) establecida correctamente.`);
    return sequelize.sync({ alter: false });
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor PADEL corriendo en http://localhost:${PORT}`);
      console.log(`📚 Swagger docs: http://localhost:${PORT}/api/docs`);
    });
  })
  .catch((err) => {
    console.error('❌ Error al conectar con la base de datos:', err);
    process.exit(1);
  });
