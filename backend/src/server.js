require('dotenv').config();
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
