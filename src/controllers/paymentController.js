/**
 * Payment Controller — Strategy Pattern para múltiples pasarelas de pago.
 * Soporta: Stripe, MercadoPago y Sandbox (modo demo sin credenciales reales).
 */
const { randomUUID, randomInt } = require('crypto');

// ── Adaptador Sandbox (modo demo) ─────────────────────────────────────────────
class SandboxAdapter {
  async createPaymentIntent({ amount, orderId, description }) {
    // Simula una respuesta exitosa sin llamar a APIs externas
    const paymentId = `sandbox_pi_${Date.now()}_${randomInt(1000, 9999)}`;
    return {
      provider: 'sandbox',
      paymentId,
      clientSecret: `${paymentId}_secret_demo`,
      status: 'succeeded',
      amount: Math.round(amount),
      currency: 'clp',
      orderId,
      description: description || 'Pago simulado SmartLogix',
      message: 'Pago procesado en modo SANDBOX (sin cargo real)',
    };
  }

  async getPaymentStatus(paymentId) {
    return { paymentId, status: 'succeeded', provider: 'sandbox', amount: 0 };
  }

  async refund(paymentId, amount) {
    return { paymentId, refundId: `sandbox_re_${Date.now()}`, status: 'succeeded', provider: 'sandbox', amount };
  }

  verifyWebhook() { return { type: 'sandbox.event', data: {} }; }
}

// ── Adaptador Stripe ──────────────────────────────────────────────────────────
class StripeAdapter {
  constructor() {
    const Stripe = require('stripe');
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_REPLACE_ME') {
      throw new Error('STRIPE_SECRET_KEY no está configurada. Usa PAYMENT_PROVIDER=sandbox para modo demo.');
    }
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  async createPaymentIntent({ amount, currency = 'clp', orderId, description }) {
    const intent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency,
      metadata: { orderId, description },
    });
    return {
      provider: 'stripe',
      paymentId: intent.id,
      clientSecret: intent.client_secret,
      status: intent.status,
      amount: intent.amount,
      currency: intent.currency,
    };
  }

  async getPaymentStatus(paymentId) {
    const intent = await this.stripe.paymentIntents.retrieve(paymentId);
    return { paymentId, status: intent.status, amount: intent.amount };
  }

  async refund(paymentId, amount) {
    const refund = await this.stripe.refunds.create({ payment_intent: paymentId, amount });
    return { refundId: refund.id, status: refund.status };
  }

  verifyWebhook(payload, sig) {
    return this.stripe.webhooks.constructEvent(
      payload, sig, process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  }
}

// ── Adaptador MercadoPago ─────────────────────────────────────────────────────
class MercadoPagoAdapter {
  constructor() {
    const { MercadoPagoConfig, Preference } = require('mercadopago');
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN === 'TEST-REPLACE_ME') {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN no está configurado. Usa PAYMENT_PROVIDER=sandbox para modo demo.');
    }
    this.client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
    this.Preference = Preference;
  }

  async createPaymentIntent({ amount, orderId, description, items = [] }) {
    const preference = new this.Preference(this.client);
    const body = {
      items: items.length > 0
        ? items.map(i => ({ id: i.productId, title: i.productName, quantity: i.quantity, unit_price: i.unitPrice, currency_id: 'CLP' }))
        : [{ id: orderId, title: description || 'Pedido SmartLogix', quantity: 1, unit_price: amount, currency_id: 'CLP' }],
      external_reference: orderId,
      back_urls: {
        success: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success`,
        failure: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failure`,
        pending: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/pending`,
      },
      auto_return: 'approved',
    };
    const result = await preference.create({ body });
    return {
      provider: 'mercadopago',
      paymentId: result.id,
      checkoutUrl: result.init_point,
      sandboxUrl: result.sandbox_init_point,
      status: 'created',
    };
  }

  async getPaymentStatus(paymentId) {
    return { paymentId, status: 'pending', provider: 'mercadopago' };
  }

  async refund(paymentId) {
    return { paymentId, status: 'refunded', provider: 'mercadopago' };
  }
}

// ── Factory de pasarela (Strategy Pattern) ───────────────────────────────────
function getPaymentProvider() {
  const provider = (process.env.PAYMENT_PROVIDER || 'sandbox').toLowerCase();
  if (provider === 'mercadopago') return new MercadoPagoAdapter();
  if (provider === 'stripe') return new StripeAdapter();
  return new SandboxAdapter(); // modo por defecto: sandbox
}

// ── Controller ────────────────────────────────────────────────────────────────
class PaymentController {
  // POST /payment/create-intent
  async createIntent(req, res, next) {
    try {
      const { amount, orderId, description, items, currency } = req.body;
      if (!amount || !orderId) return res.status(400).json({ error: 'amount y orderId son requeridos' });

      const provider = getPaymentProvider();
      const result = await provider.createPaymentIntent({ amount, orderId, description, items, currency });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      console.error('[Payment] Error al crear intent:', err.message);
      next(err);
    }
  }

  // GET /payment/:paymentId/status
  async getStatus(req, res, next) {
    try {
      const provider = getPaymentProvider();
      const result = await provider.getPaymentStatus(req.params.paymentId);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  // POST /payment/:paymentId/refund
  async refund(req, res, next) {
    try {
      const { amount } = req.body;
      const provider = getPaymentProvider();
      const result = await provider.refund(req.params.paymentId, amount);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  // POST /payment/webhook — eventos de Stripe
  async stripeWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    try {
      const adapter = new StripeAdapter();
      const event = adapter.verifyWebhook(req.body, sig);
      console.log('[Payment] Webhook event:', event.type);
      if (event.type === 'payment_intent.succeeded') {
        const intent = event.data.object;
        console.log('[Payment] Pago exitoso:', intent.id, 'Orden:', intent.metadata.orderId);
      }
      res.json({ received: true });
    } catch (err) {
      console.error('[Payment] Webhook error:', err.message);
      res.status(400).json({ error: err.message });
    }
  }

  // POST /payment/mercadopago/webhook
  async mercadoPagoWebhook(req, res) {
    const { type, data } = req.body;
    console.log('[Payment] MP Webhook:', type, data);
    res.sendStatus(200);
  }
}

module.exports = new PaymentController();
