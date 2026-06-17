const { Court, Schedule, User } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const bcrypt = require('bcryptjs');

/** GET /api/courts */
exports.getCourts = asyncHandler(async (req, res) => {
  const courts = await Court.findAll({
    where: { is_active: true },
    include: [{ model: Schedule, as: 'schedules' }],
  });
  res.json({ courts });
});

/** GET /api/courts/:id */
exports.getCourt = asyncHandler(async (req, res) => {
  const court = await Court.findByPk(req.params.id, {
    include: [{ model: Schedule, as: 'schedules' }],
  });
  if (!court) return res.status(404).json({ error: 'Pista no encontrada' });
  res.json({ court });
});

/** POST /api/courts — admin */
exports.createCourt = asyncHandler(async (req, res) => {
  const { name, surface, is_indoor, description, image_url } = req.body;
  const court = await Court.create({ name, surface, is_indoor, description, image_url });
  res.status(201).json({ message: 'Pista creada', court });
});

/** PUT /api/courts/:id — admin */
exports.updateCourt = asyncHandler(async (req, res) => {
  const court = await Court.findByPk(req.params.id);
  if (!court) return res.status(404).json({ error: 'Pista no encontrada' });
  await court.update(req.body);
  res.json({ message: 'Pista actualizada', court });
});

/** GET /api/admin/schedules/:courtId — admin */
exports.getSchedules = asyncHandler(async (req, res) => {
  const schedules = await Schedule.findAll({
    where: { court_id: req.params.courtId },
    order: [['day_of_week', 'ASC']],
  });
  res.json({ schedules });
});

/** PUT /api/admin/schedules/:courtId — admin */
exports.updateSchedules = asyncHandler(async (req, res) => {
  const { schedules } = req.body;
  await Schedule.destroy({ where: { court_id: req.params.courtId } });

  const created = await Schedule.bulkCreate(
    schedules.map(s => ({ ...s, court_id: req.params.courtId }))
  );
  res.json({ message: 'Horarios actualizados', schedules: created });
});

/** GET /api/admin/users — admin */
exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    attributes: { exclude: ['password_hash'] },
    order: [['created_at', 'DESC']],
  });
  res.json({ users });
});

/** POST /api/admin/users — admin */
exports.createUser = asyncHandler(async (req, res) => {
  const { name, phone, password, role, level, elo_rating, gender } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Nombre, teléfono y contraseña son obligatorios' });
  }

  const existing = await User.findOne({ where: { phone } });
  if (existing) {
    return res.status(409).json({ error: 'El teléfono ya está registrado' });
  }

  const password_hash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    phone,
    password_hash,
    role: role || 'jugador',
    level: level || '6ta_B',
    gender: gender || 'H',
    elo_rating: elo_rating ? parseInt(elo_rating) : 1000,
    elo_tournament: elo_rating ? parseInt(elo_rating) : 1000,
  });

  const { password_hash: _, ...userData } = user.toJSON();
  res.status(201).json({ message: 'Usuario creado exitosamente', user: userData });
});

/** PUT /api/admin/users/:id/role — admin */
exports.updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  await user.update({ role });
  res.json({ message: 'Rol actualizado', user });
});
