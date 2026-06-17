/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PADEL CLUB — Seeder de datos de ejemplo
 * Crea: 1 admin, 19 jugadores, 5 pistas, horarios, 3 quedadas, 1 torneo
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Uso: node seeders/seed.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Court, Schedule, Quedada, QuedadaParticipant, Tournament, TournamentPair, Product, CashTransaction } = require('../src/models');
const { generar_emparejamientos_dobles, ejemplosAlgoritmo } = require('../src/services/matchmaking');

const LEVELS = ['iniciacion', 'intermedio', 'avanzado', 'elite'];

const PLAYERS_DATA = [
  // Admin
  { name: 'Admin Club', phone: 'admin', role: 'admin', level: '3ra_A', gender: 'H' },
  // Iniciación (4)
  { name: 'Lucía García', phone: '600000001', level: '6ta_B', elo_rating: 850, gender: 'M' },
  { name: 'Marcos López', phone: '600000002', level: '6ta_B', elo_rating: 820, gender: 'H' },
  { name: 'Sara Martín', phone: '600000003', level: '6ta_B', elo_rating: 880, gender: 'M' },
  { name: 'Pablo Ruiz', phone: '600000004', level: '6ta_B', elo_rating: 790, gender: 'H' },
  // Intermedio (8)
  { name: 'Ana Torres', phone: '600000005', level: '5ta_B', elo_rating: 1050, gender: 'M' },
  { name: 'Carlos Díaz', phone: '600000006', level: '5ta_B', elo_rating: 1100, gender: 'H' },
  { name: 'Elena Sánchez', phone: '600000007', level: '5ta_B', elo_rating: 980, gender: 'M' },
  { name: 'Javier Pérez', phone: '600000008', level: '5ta_B', elo_rating: 1070, gender: 'H' },
  { name: 'Marta Fernández', phone: '600000009', level: '5ta_B', elo_rating: 1020, gender: 'M' },
  { name: 'Rubén Castro', phone: '600000010', level: '5ta_B', elo_rating: 1090, gender: 'H' },
  { name: 'Isabel Moreno', phone: '600000011', level: '5ta_B', elo_rating: 960, gender: 'M' },
  { name: 'Diego Jiménez', phone: '600000012', level: '5ta_B', elo_rating: 1030, gender: 'H' },
  // Avanzado (6)
  { name: 'Laura Herrera', phone: '600000013', level: '4ta_B', elo_rating: 1250, gender: 'M' },
  { name: 'Sergio Núñez', phone: '600000014', level: '4ta_B', elo_rating: 1300, gender: 'H' },
  { name: 'Carmen Álvarez', phone: '600000015', level: '4ta_B', elo_rating: 1180, gender: 'M' },
  { name: 'Alejandro Romero', phone: '600000016', level: '4ta_B', elo_rating: 1220, gender: 'H' },
  { name: 'Natalia Medina', phone: '600000017', level: '4ta_B', elo_rating: 1150, gender: 'M' },
  { name: 'Roberto Iglesias', phone: '600000018', level: '4ta_B', elo_rating: 1280, gender: 'H' },
  // Élite (2)
  { name: 'Valentina Cruz', phone: '600000019', level: '3ra_B', elo_rating: 1450, gender: 'M' },
  { name: 'Francisco Vargas', phone: '600000020', level: '3ra_A', elo_rating: 1500, gender: 'H' },
];

const COURTS_DATA = [
  { name: 'Pista 1 — Central', surface: 'cristal', is_indoor: true, description: 'Pista central con graderío' },
  { name: 'Pista 2 — Cristal Norte', surface: 'cristal', is_indoor: false, description: 'Pista exterior de cristal' },
  { name: 'Pista 3 — Cristal Sur', surface: 'cristal', is_indoor: false, description: 'Pista exterior de cristal' },
  { name: 'Pista 4 — Césped A', surface: 'cesped_artificial', is_indoor: false, description: 'Pista de césped artificial' },
  { name: 'Pista 5 — Césped B', surface: 'cesped_artificial', is_indoor: false, description: 'Pista de césped artificial' },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log(`✅ Conectado a base de datos (${sequelize.getDialect()})\n`);

    // Sync models (recrea las tablas limpias)
    console.log('🧹 Limpiando y sincronizando tablas...');
    await sequelize.sync({ force: true });

    // ─── Usuarios ─────────────────────────────────────────────────────────
    console.log('👥 Creando 20 jugadores...');
    const player_password_hash = await bcrypt.hash('Padel1234!', 12);
    const admin_password_hash = await bcrypt.hash('admin', 12);
    const users = await User.bulkCreate(
      PLAYERS_DATA.map(p => ({
        ...p,
        password_hash: p.role === 'admin' ? admin_password_hash : player_password_hash,
        elo_rating: p.elo_rating || 1000,
        elo_tournament: p.elo_rating || 1000,
      }))
    );
    console.log(`   ✓ ${users.length} usuarios creados`);
    console.log(`   Admin: admin / admin (¡cambiar en producción!)`);

    // ─── Pistas ───────────────────────────────────────────────────────────
    console.log('\n🏟️  Creando 5 pistas...');
    const courts = await Court.bulkCreate(COURTS_DATA);
    console.log(`   ✓ ${courts.length} pistas creadas`);

    // ─── Horarios (L-D, 8:00-22:00) ──────────────────────────────────────
    console.log('\n⏰ Configurando horarios (8:00-22:00, todos los días)...');
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
    console.log(`   ✓ ${scheduleData.length} franjas horarias configuradas`);

    // ─── Quedadas ─────────────────────────────────────────────────────────
    console.log('\n🎾 Creando quedadas de ejemplo...');
    const admin = users[0];
    const intermediosIds = users.filter(u => u.level === '5ta_B').map(u => u.id);
    const avanzadosIds = users.filter(u => u.level === '4ta_B').map(u => u.id);
    const allPlayerIds = users.filter(u => u.role !== 'admin').slice(0, 20).map(u => u.id);

    // Quedada 1: 2 canchas / 8 jugadores — 5ta B
    const q1 = await Quedada.create({
      creator_id: admin.id,
      title: 'Quedada 5ta B — Viernes tarde',
      level: '5ta_B',
      date: getDateOffset(3),
      start_time: '18:00:00',
      num_courts: 2,
      max_players: 8,
      status: 'full',
      gender_restriction: 'mixto',
    });
    const intermediosHombres = users.filter(u => u.level === '5ta_B' && u.gender === 'H').slice(0, 4);
    const intermediosMujeres = users.filter(u => u.level === '5ta_B' && u.gender === 'M').slice(0, 4);
    for (const uid of [...intermediosHombres, ...intermediosMujeres]) {
      await QuedadaParticipant.create({ quedada_id: q1.id, user_id: uid.id });
    }

    // Quedada 2: 3 canchas / 12 jugadores — Mixto
    const q2 = await Quedada.create({
      creator_id: admin.id,
      title: 'Gran Quedada Sábado — 12 jugadores',
      level: 'mixto',
      date: getDateOffset(5),
      start_time: '10:00:00',
      num_courts: 3,
      max_players: 12,
      status: 'open',
      gender_restriction: 'mixto',
    });
    for (const uid of allPlayerIds.slice(0, 6)) {
      await QuedadaParticipant.create({ quedada_id: q2.id, user_id: uid });
    }

    // Quedada 3: 5 canchas / 20 jugadores — Mixto (la más grande)
    const q3 = await Quedada.create({
      creator_id: admin.id,
      title: 'Jornada Completa — 20 Jugadores 5 Pistas',
      level: 'mixto',
      date: getDateOffset(7),
      start_time: '09:00:00',
      num_courts: 5,
      max_players: 20,
      status: 'open',
      track_global_history: true,
      gender_restriction: 'mixto',
    });
    for (const uid of allPlayerIds.slice(0, 8)) {
      await QuedadaParticipant.create({ quedada_id: q3.id, user_id: uid });
    }

    console.log('   ✓ 3 quedadas creadas');

    // ─── Torneo ───────────────────────────────────────────────────────────
    console.log('\n🏆 Creando torneo de ejemplo...');
    const torneo = await Tournament.create({
      name: 'I Torneo PADEL Club — Verano 2024',
      description: 'Primer torneo oficial del club en formato eliminación directa.',
      format: 'eliminacion_directa',
      level: '4ta_B',
      start_date: getDateOffset(14),
      end_date: getDateOffset(16),
      max_pairs: 8,
      status: 'open',
      created_by_id: admin.id,
      selected_courts: [courts[0].id, courts[1].id, courts[2].id, courts[3].id],
      prize_info: '1er puesto: Trofeo + raqueta premium\n2do puesto: Trofeo\n3er puesto: Bolas oficiales',
      gender_restriction: 'mixto',
    });

    // Inscribir 3 parejas de avanzados
    const avanzados = users.filter(u => u.level === '4ta_B');
    for (let i = 0; i < avanzados.length - 1; i += 2) {
      await TournamentPair.create({
        tournament_id: torneo.id,
        player1_id: avanzados[i].id,
        player2_id: avanzados[i + 1].id,
        pair_name: `${avanzados[i].name} / ${avanzados[i + 1].name}`,
      });
    }
    console.log('   ✓ Torneo clásico creado con 3 parejas inscritas');

    // ─── Torneo Americano ─────────────────────────────────────────────────
    console.log('\n🎾 Creando torneo americano de ejemplo...');
    const torneoAmericano = await Tournament.create({
      name: 'II Americano Nocturno — 3 Pistas',
      description: 'Torneo americano donde las parejas rotan cada ronda. ¡No importa con quién juegues, lo importante es ganar!',
      format: 'americano',
      level: 'mixto',
      start_date: getDateOffset(10),
      end_date: getDateOffset(10),
      max_pairs: 12, // 3 courts * 4 players
      status: 'open',
      created_by_id: admin.id,
      selected_courts: [courts[0].id, courts[1].id, courts[2].id],
      prize_info: '🏆 1er puesto: Vale de 50$ en tienda\n🥈 2do puesto: Pack de pelotas\n🥉 3er puesto: Camiseta del club',
      gender_restriction: 'mixto',
    });

    // Inscribir 8 jugadores individuales (4 hombres y 4 mujeres)
    const americanoHombres = users.filter(u => u.role !== 'admin' && u.gender === 'H').slice(0, 4);
    const americanoMujeres = users.filter(u => u.role !== 'admin' && u.gender === 'M').slice(0, 4);
    for (const player of [...americanoHombres, ...americanoMujeres]) {
      await TournamentPair.create({
        tournament_id: torneoAmericano.id,
        player1_id: player.id,
        player2_id: player.id,
        pair_name: player.name,
      });
    }
    console.log('   ✓ Torneo americano creado con 8/12 jugadores inscritos');

    // ─── Ejemplos del algoritmo ───────────────────────────────────────────
    console.log('\n📊 Ejemplos del algoritmo generar_emparejamientos_dobles:');
    console.log('═'.repeat(70));

    const ejemplos = ejemplosAlgoritmo();
    for (const ej of ejemplos) {
      console.log(`\n📌 ${ej.descripcion}`);
      console.log(`   Total rondas: ${ej.resumen.total_rondas}`);
      console.log(`   Total partidos: ${ej.resumen.total_partidos}`);
      console.log(`   Advertencias: ${ej.resumen.advertencias}`);

      for (const ronda of ej.rondas) {
        console.log(`\n   🔄 Ronda ${ronda.numero}:`);
        for (const p of ronda.partidos) {
          console.log(`      Cancha ${p.cancha}: [${p.equipoA.join(' & ')}] vs [${p.equipoB.join(' & ')}]`);
        }
      }

      if (ej.advertencias.length > 0) {
        console.log(`\n   ⚠️  Advertencias:`);
        ej.advertencias.forEach(a => console.log(`      ${a}`));
      }
    }

    // ─── Productos Cafetería ──────────────────────────────────────────────
    console.log('\n🥤 Creando catálogo de productos con stock...');
    const products = await Product.bulkCreate([
      { name: 'Coca-Cola', price: 2.00, stock: 50 },
      { name: 'Agua Mineral', price: 1.50, stock: 80 },
      { name: 'Cerveza Estrella', price: 2.50, stock: 40 },
      { name: 'Bote Pelotas Head', price: 5.00, stock: 20 },
    ]);
    console.log(`   ✓ ${products.length} productos creados`);

    // ─── Transacciones de Caja (Ayer y Hoy) ───────────────────────────────
    console.log('\n💰 Creando transacciones de caja de prueba...');
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Cargar algunos usuarios y canchas para asociar
    const dbCourts = await Court.findAll();
    const dbUsers = await User.findAll({ where: { role: 'jugador' } });

    // Cargar modelo Reservation
    const { Reservation } = require('../src/models');

    // Crear algunas reservas de ayer y hoy para cobros
    let r1 = await Reservation.create({
      court_id: dbCourts[0].id,
      user_id: dbUsers[0].id,
      start_datetime: new Date(`${yesterdayStr}T10:00:00Z`),
      end_datetime: new Date(`${yesterdayStr}T11:30:00Z`),
      duration_minutes: 90,
      status: 'completed',
      notes: 'Reserva Lucía García',
    });

    let r2 = await Reservation.create({
      court_id: dbCourts[1].id,
      user_id: dbUsers[1].id,
      start_datetime: new Date(`${todayStr}T09:00:00Z`),
      end_datetime: new Date(`${todayStr}T10:30:00Z`),
      duration_minutes: 90,
      status: 'completed',
      notes: 'Reserva Marcos López',
    });

    // Transacciones de prueba
    await CashTransaction.bulkCreate([
      // Ingresos Canchas
      {
        type: 'income_court',
        amount: 30.00,
        description: `Pago cancha: ${dbCourts[0].name} (Reservado a: Reserva Lucía García)`,
        payment_method: 'card',
        reservation_id: r1.id,
        date: yesterdayStr,
      },
      {
        type: 'income_court',
        amount: 30.00,
        description: `Pago cancha: ${dbCourts[1].name} (Reservado a: Reserva Marcos López)`,
        payment_method: 'cash',
        reservation_id: r2.id,
        date: todayStr,
      },
      // Ingresos Cafetería (POS)
      {
        type: 'income_product',
        amount: 4.00,
        description: 'Venta TPV: 2x Coca-Cola',
        payment_method: 'cash',
        product_id: products[0].id,
        product_quantity: 2,
        date: yesterdayStr,
      },
      {
        type: 'income_product',
        amount: 3.00,
        description: 'Venta TPV: 2x Agua Mineral',
        payment_method: 'cash',
        product_id: products[1].id,
        product_quantity: 2,
        date: todayStr,
      },
      {
        type: 'income_product',
        amount: 5.00,
        description: 'Venta TPV: 2x Cerveza Estrella',
        payment_method: 'card',
        product_id: products[2].id,
        product_quantity: 2,
        date: todayStr,
      },
      // Egresos (Gastos)
      {
        type: 'expense',
        amount: 12.50,
        description: 'Compra de vasos desechables',
        payment_method: 'cash',
        date: yesterdayStr,
      },
      {
        type: 'expense',
        amount: 15.00,
        description: 'Hielo para neveras cafetería',
        payment_method: 'cash',
        date: todayStr,
      },
    ]);
    console.log('   ✓ Transacciones de prueba creadas');

    console.log('\n' + '═'.repeat(70));
    console.log('✅ Seeder completado exitosamente\n');
    console.log('📋 Credenciales de acceso:');
    console.log('   Admin:    admin / admin');
    console.log('   Jugador:  600000001 / Padel1234!');
    console.log('   (La contraseña de administrador es admin y la de jugadores es Padel1234!)');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error en el seeder:', err);
    process.exit(1);
  }
}

function getDateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

seed();
