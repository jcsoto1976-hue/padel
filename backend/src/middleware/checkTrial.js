const { User } = require('../models');

module.exports = async (req, res, next) => {
  // Si la licencia está activa en .env o estamos en tests, saltar la verificación
  if (process.env.LICENCIA_ACTIVA === 'true' || process.env.NODE_ENV === 'test') {
    return next();
  }

  // Rutas exentas de la validación
  const exemptPaths = ['/api/auth/login', '/api/auth/me', '/api/auth/logout', '/api/docs'];
  if (exemptPaths.some(p => req.originalUrl.startsWith(p))) {
    return next();
  }

  try {
    // Buscar al primer administrador del sistema
    const firstAdmin = await User.findOne({
      where: { role: 'admin' },
      order: [['created_at', 'ASC']],
    });

    if (firstAdmin) {
      const createdTime = new Date(firstAdmin.created_at).getTime();
      const now = Date.now();
      const diffDays = (now - createdTime) / (1000 * 60 * 60 * 24);

      if (diffDays > 30) {
        return res.status(402).json({
          error: 'TRIAL_EXPIRED',
          message: 'Tu período de prueba de 30 días ha expirado. Por favor, contacta con soporte para activar tu licencia.',
        });
      }
    }
  } catch (err) {
    console.error('Error al verificar período de prueba:', err);
  }

  next();
};
