const Stripe = require('stripe');
const { Reservation, CashTransaction } = require('../models');

const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
const stripe = new Stripe(stripeKey);

exports.createCheckoutSession = async (req, res) => {
  const { type, id } = req.body;

  try {
    let name = 'Pago Club de Pádel';
    let amount = 0;
    
    if (type === 'reservation') {
      const resv = await Reservation.findByPk(id);
      if (!resv) return res.status(404).json({ error: 'Reserva no encontrada' });
      name = `Reserva de Pista (Duración: ${resv.duration_minutes} min)`;
      amount = Math.round((resv.duration_minutes / 60) * 20 * 100); // $20/hr
    } else if (type === 'tournament') {
      name = 'Inscripción Torneo';
      amount = 3000; // $30
    } else {
      return res.status(400).json({ error: 'Tipo de pago no soportado' });
    }

    if (stripeKey === 'sk_test_mock') {
      // Create mock transaction immediately
      await CashTransaction.create({
        type: type === 'reservation' ? 'income_court' : 'income_product',
        amount: amount / 100,
        description: `Pago online (Mock): ${name}`,
        payment_method: 'card',
        reservation_id: type === 'reservation' ? id : null,
        date: new Date().toISOString().split('T')[0],
      });

      return res.json({
        id: 'cs_test_' + Math.random().toString(36).substring(7),
        url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reservas?payment_success=true&reservation_id=${id}`
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reservas?payment_success=true&reservation_id=${id}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reservas?payment_cancel=true`,
      metadata: { type, id },
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('Error al crear checkout session:', error);
    res.status(500).json({ error: 'Error al procesar el pago' });
  }
};

exports.stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      event = req.body;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { type, id } = session.metadata;

      if (type === 'reservation') {
        const resv = await Reservation.findByPk(id);
        if (resv) {
          // Check if transaction already exists
          const existing = await CashTransaction.findOne({ where: { reservation_id: id } });
          if (!existing) {
            await CashTransaction.create({
              type: 'income_court',
              amount: (resv.duration_minutes / 60) * 20,
              description: `Pago cancha online: Reserva ${resv.id}`,
              payment_method: 'card',
              reservation_id: resv.id,
              date: new Date().toISOString().split('T')[0],
            });
          }
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
};
