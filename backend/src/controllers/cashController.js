const { Op } = require('sequelize');
const { Product, CashTransaction, Reservation, Court, User, CashClosing, sequelize } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Helper to check if cash register for a specific date is closed
 */
const checkIsClosed = async (dateStr) => {
  const closing = await CashClosing.findOne({ where: { date: dateStr } });
  return !!closing;
};

/**
 * GET /api/cash/products
 */
exports.getProducts = asyncHandler(async (req, res) => {
  const products = await Product.findAll({ order: [['name', 'ASC']] });
  res.json({ products });
});

/**
 * POST /api/cash/products
 */
exports.createProduct = asyncHandler(async (req, res) => {
  const { name, price, stock } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: 'El nombre y el precio son obligatorios' });
  }

  const numericPrice = parseFloat(price);
  const numericStock = parseInt(stock) || 0;

  if (isNaN(numericPrice) || numericPrice < 0) {
    return res.status(400).json({ error: 'El precio debe ser un número mayor o igual a 0' });
  }
  if (isNaN(numericStock) || numericStock < 0) {
    return res.status(400).json({ error: 'El stock debe ser un número entero mayor o igual a 0' });
  }

  // Verificar si ya existe un producto con el mismo nombre
  const existing = await Product.findOne({ where: { name } });
  if (existing) {
    return res.status(400).json({ error: 'Ya existe un producto con ese nombre' });
  }

  const product = await Product.create({
    name,
    price: numericPrice,
    stock: numericStock,
  });

  res.status(201).json({ message: 'Producto creado correctamente', product });
});

/**
 * POST /api/cash/products/:id/restock
 */
exports.restockProduct = asyncHandler(async (req, res) => {
  const { quantity, record_expense, payment_method } = req.body;
  const qty = parseInt(quantity);

  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Cantidad a reabastecer inválida' });
  }

  const today = new Date().toISOString().split('T')[0];
  if (record_expense) {
    const isClosed = await checkIsClosed(today);
    if (isClosed) {
      return res.status(400).json({ error: 'No se puede registrar el egreso de reabastecimiento porque la caja de hoy está cerrada.' });
    }
  }

  const product = await Product.findByPk(req.params.id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

  // Transacción atómica
  await sequelize.transaction(async (t) => {
    await product.update({ stock: product.stock + qty }, { transaction: t });

    // Si el administrador quiere registrar esto como un egreso de caja
    if (record_expense) {
      const costPerUnit = product.price * 0.5; // Costo estimado de compra = 50% del precio de venta
      const totalCost = costPerUnit * qty;
      await CashTransaction.create({
        type: 'expense',
        amount: totalCost,
        description: `Reabastecimiento de ${qty} uds de ${product.name}`,
        payment_method: payment_method || 'cash',
        product_id: product.id,
        date: today,
      }, { transaction: t });
    }
  });

  res.json({ message: `Stock de ${product.name} actualizado a ${product.stock + qty} unidades`, product });
});

/**
 * GET /api/cash/transactions?date=YYYY-MM-DD
 */
exports.getTransactions = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  const transactions = await CashTransaction.findAll({
    where: { date: targetDate },
    include: [
      { model: Product, as: 'product', attributes: ['id', 'name', 'price'] },
      { model: Reservation, as: 'reservation', include: [
        { model: Court, as: 'court', attributes: ['id', 'name'] },
        { model: User, as: 'user', attributes: ['id', 'name'] }
      ]}
    ],
    order: [['created_at', 'DESC']],
  });

  res.json({ date: targetDate, transactions });
});

/**
 * POST /api/cash/transactions
 */
exports.createTransaction = asyncHandler(async (req, res) => {
  const { type, amount, description, payment_method, items } = req.body;

  if (!type || !['income_product', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'Tipo de transacción inválido' });
  }

  const today = new Date().toISOString().split('T')[0];
  const isClosed = await checkIsClosed(today);
  if (isClosed) {
    return res.status(400).json({ error: 'La caja de hoy ya está cerrada y no se admiten más transacciones.' });
  }

  if (type === 'income_product') {
    // Venta de productos en TPV
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Se requiere una lista de productos para realizar la venta' });
    }

    const createdTransactions = [];

    await sequelize.transaction(async (t) => {
      let totalSaleAmount = 0;

      for (const item of items) {
        const product = await Product.findByPk(item.id, { transaction: t });
        if (!product) throw new Error(`Producto con ID ${item.id} no encontrado`);

        const qty = parseInt(item.quantity);
        if (isNaN(qty) || qty <= 0) throw new Error(`Cantidad inválida para ${product.name}`);

        if (product.stock < qty) {
          throw new Error(`Stock insuficiente para ${product.name} (Disponible: ${product.stock}, Solicitado: ${qty})`);
        }

        // Restar stock
        await product.update({ stock: product.stock - qty }, { transaction: t });

        const itemTotal = product.price * qty;
        totalSaleAmount += itemTotal;

        const trans = await CashTransaction.create({
          type: 'income_product',
          amount: itemTotal,
          description: `Venta TPV: ${qty}x ${product.name}`,
          payment_method: payment_method || 'cash',
          product_id: product.id,
          product_quantity: qty,
          date: today,
        }, { transaction: t });

        createdTransactions.push(trans);
      }
    });

    return res.status(201).json({ message: 'Venta registrada con éxito', transactions: createdTransactions });
  } else {
    // Registro de egreso manual
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Monto de egreso debe ser mayor a 0' });
    }
    if (!description) {
      return res.status(400).json({ error: 'El concepto o descripción es obligatorio para un egreso' });
    }

    const transaction = await CashTransaction.create({
      type: 'expense',
      amount: numericAmount,
      description,
      payment_method: payment_method || 'cash',
      date: today,
    });

    return res.status(201).json({ message: 'Egreso registrado con éxito', transaction });
  }
});

/**
 * POST /api/cash/reservations/:id/close
 */
exports.closeReservationPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, payment_method, notes } = req.body;

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount < 0) {
    return res.status(400).json({ error: 'Monto de cobro inválido' });
  }

  const today = new Date().toISOString().split('T')[0];
  const isClosed = await checkIsClosed(today);
  if (isClosed) {
    return res.status(400).json({ error: 'No se puede cobrar la pista porque la caja de hoy ya está cerrada.' });
  }

  const reservation = await Reservation.findByPk(id, {
    include: [{ model: Court, as: 'court' }, { model: User, as: 'user' }]
  });

  if (!reservation) return res.status(404).json({ error: 'Reserva no encontrada' });
  if (reservation.status === 'completed') {
    return res.status(400).json({ error: 'Esta reserva ya ha sido cobrada y completada' });
  }
  if (reservation.status === 'cancelled') {
    return res.status(400).json({ error: 'No se puede cobrar una reserva cancelada' });
  }

  let transaction;
  await sequelize.transaction(async (t) => {
    // 1. Marcar reserva como completada
    const updatedNotes = notes ? `${reservation.notes || ''} (${notes})` : reservation.notes;
    await reservation.update({ status: 'completed', notes: updatedNotes }, { transaction: t });

    // 2. Crear transacción de caja
    transaction = await CashTransaction.create({
      type: 'income_court',
      amount: numericAmount,
      description: `Pago cancha: ${reservation.court?.name} (Reservado a: ${reservation.notes || reservation.user?.name})`,
      payment_method: payment_method || 'cash',
      reservation_id: reservation.id,
      date: today,
    }, { transaction: t });
  });

  res.json({ message: 'Pago de cancha registrado y reserva completada', reservation, transaction });
});

/**
 * GET /api/cash/summary?date=YYYY-MM-DD
 */
exports.getDailySummary = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  const [transactions, closingRecord] = await Promise.all([
    CashTransaction.findAll({ where: { date: targetDate } }),
    CashClosing.findOne({
      where: { date: targetDate },
      include: [{ model: User, as: 'closedBy', attributes: ['id', 'name'] }]
    }),
  ]);

  let courtIncome = 0;
  let productIncome = 0;
  let expenses = 0;

  let cashTotal = 0;
  let cardTotal = 0;
  let transferTotal = 0;

  transactions.forEach(t => {
    const amt = parseFloat(t.amount);
    
    // Sumar por concepto
    if (t.type === 'income_court') {
      courtIncome += amt;
    } else if (t.type === 'income_product') {
      productIncome += amt;
    } else if (t.type === 'expense') {
      expenses += amt;
    }

    // Sumar por método de pago (los egresos restan, los ingresos suman)
    const factor = t.type === 'expense' ? -1 : 1;
    if (t.payment_method === 'cash') {
      cashTotal += (amt * factor);
    } else if (t.payment_method === 'card') {
      cardTotal += (amt * factor);
    } else if (t.payment_method === 'transfer') {
      transferTotal += (amt * factor);
    }
  });

  const totalIncome = courtIncome + productIncome;
  const netBalance = totalIncome - expenses;

  res.json({
    date: targetDate,
    isClosed: !!closingRecord,
    closingInfo: closingRecord,
    summary: {
      courtIncome,
      productIncome,
      totalIncome,
      expenses,
      netBalance,
      methodBreakdown: {
        cash: cashTotal,
        card: cardTotal,
        transfer: transferTotal
      }
    }
  });
});

/**
 * POST /api/cash/close
 */
exports.closeCashRegister = asyncHandler(async (req, res) => {
  const { date } = req.body;
  const targetDate = date || new Date().toISOString().split('T')[0];

  // Verificar si ya está cerrada
  const existing = await CashClosing.findOne({ where: { date: targetDate } });
  if (existing) {
    return res.status(400).json({ error: 'La caja para este día ya se encuentra cerrada' });
  }

  // Obtener sumario acumulado para guardar los valores históricos bloqueados
  const transactions = await CashTransaction.findAll({ where: { date: targetDate } });

  let courtIncome = 0;
  let productIncome = 0;
  let expenses = 0;
  let cashTotal = 0;
  let cardTotal = 0;
  let transferTotal = 0;

  transactions.forEach(t => {
    const amt = parseFloat(t.amount);
    if (t.type === 'income_court') courtIncome += amt;
    else if (t.type === 'income_product') productIncome += amt;
    else if (t.type === 'expense') expenses += amt;

    const factor = t.type === 'expense' ? -1 : 1;
    if (t.payment_method === 'cash') cashTotal += (amt * factor);
    else if (t.payment_method === 'card') cardTotal += (amt * factor);
    else if (t.payment_method === 'transfer') transferTotal += (amt * factor);
  });

  const netBalance = (courtIncome + productIncome) - expenses;

  const closing = await CashClosing.create({
    date: targetDate,
    closed_by_id: req.user.id,
    court_income: courtIncome,
    product_income: productIncome,
    expenses,
    net_balance: netBalance,
    cash_total: cashTotal,
    card_total: cardTotal,
    transfer_total: transferTotal,
  });

  res.json({ message: `Cierre de caja para el día ${targetDate} completado con éxito. Puntos de venta bloqueados.`, closing });
});
