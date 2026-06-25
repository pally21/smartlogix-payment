const router = require('express').Router();
const controller = require('../controllers/paymentController');

// Crear intención de pago (Stripe PaymentIntent / MercadoPago Preference)
router.post('/create-intent',           controller.createIntent.bind(controller));

// Consultar estado de un pago
router.get('/:paymentId/status',        controller.getStatus.bind(controller));

// Reembolso
router.post('/:paymentId/refund',       controller.refund.bind(controller));

// Webhooks (raw body ya configurado en index.js)
router.post('/webhook',                 controller.stripeWebhook.bind(controller));
router.post('/mercadopago/webhook',     controller.mercadoPagoWebhook.bind(controller));

module.exports = router;
