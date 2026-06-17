const { Season } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getSeasons = asyncHandler(async (req, res) => {
  const seasons = await Season.findAll({ order: [['start_date', 'DESC']] });
  res.json({ seasons });
});

exports.createSeason = asyncHandler(async (req, res) => {
  const { name, start_date, end_date, is_active } = req.body;

  if (!name || !start_date) {
    return res.status(400).json({ error: 'Nombre y fecha de inicio son obligatorios' });
  }

  if (is_active) {
    await Season.update({ is_active: false }, { where: {} });
  }

  const season = await Season.create({ name, start_date, end_date, is_active: !!is_active });
  res.status(201).json({ message: 'Temporada creada con éxito', season });
});

exports.activateSeason = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const season = await Season.findByPk(id);
  if (!season) return res.status(404).json({ error: 'Temporada no encontrada' });

  await Season.update({ is_active: false }, { where: {} });
  await season.update({ is_active: true });

  res.json({ message: 'Temporada activada', season });
});

exports.deleteSeason = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const season = await Season.findByPk(id);
  if (!season) return res.status(404).json({ error: 'Temporada no encontrada' });

  await season.destroy();
  res.json({ message: 'Temporada eliminada correctamente' });
});
