require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const paymentRoutes = require('./routes/payment');

const app = express();
const PORT = process.env.PORT || 4004;

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));

// Webhook de Stripe necesita raw body
app.use('/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

app.use('/payment', paymentRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'payment-service',
    provider: process.env.PAYMENT_PROVIDER || 'stripe',
  });
});

app.use((err, req, res, next) => {
  console.error('[Payment] Error:', err.message);
  res.status(err.status || 500).json({ error: err.message });
});

app.listen(PORT, () => console.log(`[Payment] Servicio corriendo en puerto ${PORT} | Proveedor: ${process.env.PAYMENT_PROVIDER || 'stripe'}`));

module.exports = app;
