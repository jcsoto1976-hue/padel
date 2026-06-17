const webpush = require('web-push');
const { PushSubscription } = require('../models');

let publicKey = process.env.VAPID_PUBLIC_KEY;
let privateKey = process.env.VAPID_PRIVATE_KEY;

if (!publicKey || !privateKey) {
  const keys = webpush.generateVAPIDKeys();
  publicKey = keys.publicKey;
  privateKey = keys.privateKey;
  console.log('\n--- TEMPORARY VAPID KEYS FOR PUSH NOTIFICATIONS ---');
  console.log('VAPID_PUBLIC_KEY:', publicKey);
  console.log('VAPID_PRIVATE_KEY:', privateKey);
  console.log('---------------------------------------------------\n');
}

webpush.setVapidDetails(
  'mailto:info@padelclub.com',
  publicKey,
  privateKey
);

exports.getVapidPublicKey = (req, res) => {
  res.json({ publicKey });
};

exports.subscribe = async (req, res) => {
  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Suscripción inválida' });
  }

  try {
    const existing = await PushSubscription.findOne({ where: { endpoint: subscription.endpoint } });
    if (existing) {
      await existing.update({
        user_id: req.user.id,
        keys_p256dh: subscription.keys?.p256dh || '',
        keys_auth: subscription.keys?.auth || '',
      });
    } else {
      await PushSubscription.create({
        user_id: req.user.id,
        endpoint: subscription.endpoint,
        keys_p256dh: subscription.keys?.p256dh || '',
        keys_auth: subscription.keys?.auth || '',
      });
    }
    res.status(201).json({ message: 'Suscrito con éxito' });
  } catch (error) {
    console.error('Error al suscribir push:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.sendPushToUser = async (userId, payload) => {
  try {
    const subscriptions = await PushSubscription.findAll({ where: { user_id: userId } });
    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth,
        }
      };
      
      try {
        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await sub.destroy();
        } else {
          console.error(`Error sending push to sub ${sub.id}:`, err);
        }
      }
    }
  } catch (error) {
    console.error(`Error finding/sending push to user ${userId}:`, error);
  }
};
