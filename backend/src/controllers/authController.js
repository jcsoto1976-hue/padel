const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

const generateToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role, phone: user.phone },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone, password]
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               password: { type: string, minLength: 8 }
 *               level: { type: string, enum: [iniciacion, intermedio, avanzado, elite] }
 */
exports.register = asyncHandler(async (req, res) => {
  const { name, phone, password, level, gender } = req.body;

  const registrationPassword = password || phone;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Nombre y teléfono son obligatorios' });
  }

  if (!/^\d{10}$/.test(phone)) {
    return res.status(400).json({ error: 'El teléfono debe tener exactamente 10 dígitos numéricos' });
  }
  if (registrationPassword.length < 3) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 3 caracteres' });
  }

  const existing = await User.findOne({ where: { phone } });
  if (existing) {
    return res.status(409).json({ error: 'El teléfono ya está registrado' });
  }

  const password_hash = await bcrypt.hash(registrationPassword, 12);
  const user = await User.create({
    name,
    phone,
    password_hash,
    level: level || 'iniciacion',
    gender: gender || 'H',
  });

  const token = generateToken(user);
  const { password_hash: _, ...userData } = user.toJSON();

  res.status(201).json({ message: 'Registro exitoso', token, user: userData });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     security: []
 */
exports.login = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ error: 'Teléfono y contraseña obligatorios' });
  }

  if (!/^\d{10}$/.test(phone)) {
    return res.status(400).json({ error: 'El teléfono debe tener exactamente 10 dígitos numéricos' });
  }

  const user = await User.findOne({ where: { phone } });
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = generateToken(user);
  const { password_hash: _, ...userData } = user.toJSON();

  res.json({ message: 'Login exitoso', token, user: userData });
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Auth]
 */
exports.me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Actualizar perfil propio
 *     tags: [Auth]
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, level, avatar_url, gender } = req.body;
  await req.user.update({ name, phone, level, avatar_url, gender });
  res.json({ message: 'Perfil actualizado', user: req.user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  const user = await User.findByPk(req.user.id);

  const valid = await bcrypt.compare(current_password, user.password_hash);
  if (!valid) return res.status(400).json({ error: 'Contraseña actual incorrecta' });
  if (!new_password || new_password.length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  }

  user.password_hash = await bcrypt.hash(new_password, 12);
  await user.save();
  res.json({ message: 'Contraseña cambiada correctamente' });
});
