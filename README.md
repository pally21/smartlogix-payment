# Payment Service

Descripción: Proveedor de pagos (Stripe/MercadoPago). Maneja intents, webhooks y reembolsos.

Instalación y ejecución:

```bash
cd payment-service
npm install
npm run dev
npm start
```

Pruebas y cobertura:

```bash
npm test -- --coverage
# Reporte: coverage/lcov-report y reports/coverage/payment-service-coverage.pdf
```

Webhooks: `POST /webhook` y `POST /mercadopago/webhook`.
# SmartLogix Payment Service

Microservicio de pagos de SmartLogix. Integra Stripe y MercadoPago para procesar intenciones de pago, consultar estados y gestionar reembolsos.

## Tecnologías

- Node.js 20
- Express 4
- Stripe SDK 14
- MercadoPago SDK 2
- Helmet / Morgan / CORS

## Requisitos previos

- Node.js 18 o superior
- Credenciales de Stripe (modo test)
- Credenciales de MercadoPago (modo sandbox)

## Instalación

```bash
npm install
```

## Variables de entorno

Crear archivo `.env`:

```env
PORT=4004
STRIPE_SECRET_KEY=sk_test_...
MERCADOPAGO_ACCESS_TOKEN=TEST-...
```

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm start` | Inicia el servidor |
| `npm run dev` | Inicia con nodemon |
| `npm test` | Ejecuta tests con cobertura |

## Ejecución con Docker

```bash
docker build -t smartlogix-payment .
docker run -p 4004:4004 --env-file .env smartlogix-payment
```

## Endpoints disponibles

Base URL: `http://localhost:4004`

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/payment/create-intent` | Crear intención de pago |
| GET | `/payment/:paymentId/status` | Consultar estado del pago |
| POST | `/payment/:paymentId/refund` | Solicitar reembolso |
| GET | `/health` | Health check |

### Ejemplo: Crear intención de pago

```json
POST /payment/create-intent
{
  "amount": 12990,
  "currency": "clp",
  "orderId": "uuid-pedido",
  "provider": "stripe"
}
```

### Proveedores soportados

| Provider | Descripción |
|---|---|
| `stripe` | Pago con tarjeta vía Stripe |
| `mercadopago` | Pago vía MercadoPago |

## Estructura del proyecto

```
payment-service/
├── src/
│   ├── controllers/
│   ├── routes/
│   └── index.js
├── package.json
└── Dockerfile
```
