/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PADEL CLUB — Script de Reinicio Limpio de Base de Datos
 * Elimina todas las tablas y las crea vacías.
 * Crea únicamente el usuario Administrador Inicial para poder acceder.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Uso: node reset-db.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Court, Schedule } = require('./src/models');

async function reset() {
  try {
    await sequelize.authenticate();
    console.log(`✅ Conectado a base de datos (${sequelize.getDialect()})\n`);

    console.log('🧹 Eliminando y recreando estructura de base de datos vacía...');
    // force: true elimina todas las tablas existentes y las crea según los modelos
    await sequelize.sync({ force: true });
    console.log('   ✓ Tablas recreadas exitosamente.');

    console.log('\n👥 Creando usuario Administrador Inicial...');
    const adminPasswordHash = await bcrypt.hash('admin', 12);
    const admin = await User.create({
      name: 'Administrador Club',
      phone: 'admin',
      role: 'admin',
      password_hash: adminPasswordHash,
      level: '3ra_A',
      gender: 'H',
      elo_rating: 1000,
      elo_tournament: 1000,
    });
    console.log(`   ✓ Administrador creado con éxito.`);
    console.log(`     - Usuario (Teléfono): admin`);
    console.log(`     - Contraseña:         admin`);

    console.log('\n🏟️ Creando pistas físicas por defecto...');
    const courts = await Court.bulkCreate([
      { name: 'Pista 1 — Central', surface: 'cristal', is_indoor: true, description: 'Pista central con graderío' },
      { name: 'Pista 2 — Cristal Norte', surface: 'cristal', is_indoor: false, description: 'Pista exterior de cristal' },
      { name: 'Pista 3 — Cristal Sur', surface: 'cristal', is_indoor: false, description: 'Pista exterior de cristal' },
      { name: 'Pista 4 — Césped A', surface: 'cesped_artificial', is_indoor: false, description: 'Pista de césped artificial' },
      { name: 'Pista 5 — Césped B', surface: 'cesped_artificial', is_indoor: false, description: 'Pista de césped artificial' },
    ]);
    console.log(`   ✓ ${courts.length} pistas creadas`);

    console.log('\n⏰ Configurando horarios por defecto (8:00-22:00, L-D)...');
    const scheduleData = [];
    for (const court of courts) {
      for (let day = 0; day <= 6; day++) {
        scheduleData.push({
          court_id: court.id,
          day_of_week: day,
          open_time: '08:00:00',
          close_time: '22:00:00',
          slot_duration_minutes: 60,
        });
      }
    }
    await Schedule.bulkCreate(scheduleData);
    console.log(`   ✓ Horarios de pista configurados`);

    console.log('\n' + '═'.repeat(70));
    console.log('✅ Base de datos reiniciada con éxito (Vacía y lista para usar)');
    console.log('═'.repeat(70) + '\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error al reiniciar base de datos:', err);
    process.exit(1);
  }
}

reset();
