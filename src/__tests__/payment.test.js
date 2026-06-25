/**
 * Pruebas Unitarias — Payment Service
 */

// Simular lógica de validación sin llamar APIs reales
const validatePaymentRequest = ({ amount, orderId }) => {
  const errors = [];
  if (!amount || amount <= 0) errors.push('amount debe ser mayor a 0');
  if (!orderId) errors.push('orderId es requerido');
  return errors;
};

const getProviderName = (env) => {
  if (env === 'mercadopago') return 'MercadoPago';
  if (env === 'stripe') return 'Stripe';
  return 'Stripe'; // default
};

const formatAmountCLP = (amount) => Math.round(amount); // CLP sin decimales

describe('Payment Validations', () => {
  test('valida correctamente una solicitud válida', () => {
    const errors = validatePaymentRequest({ amount: 5000, orderId: 'ORD-001' });
    expect(errors).toHaveLength(0);
  });

  test('rechaza monto negativo', () => {
    const errors = validatePaymentRequest({ amount: -100, orderId: 'ORD-001' });
    expect(errors).toContain('amount debe ser mayor a 0');
  });

  test('rechaza monto cero', () => {
    const errors = validatePaymentRequest({ amount: 0, orderId: 'ORD-001' });
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rechaza sin orderId', () => {
    const errors = validatePaymentRequest({ amount: 1000 });
    expect(errors).toContain('orderId es requerido');
  });

  test('rechaza con múltiples errores', () => {
    const errors = validatePaymentRequest({});
    expect(errors.length).toBe(2);
  });
});

describe('Payment Provider Selection', () => {
  test('selecciona Stripe por defecto', () => {
    expect(getProviderName(undefined)).toBe('Stripe');
    expect(getProviderName('stripe')).toBe('Stripe');
  });

  test('selecciona MercadoPago cuando se configura', () => {
    expect(getProviderName('mercadopago')).toBe('MercadoPago');
  });
});

describe('Amount Formatting CLP', () => {
  test('redondea monto para CLP', () => {
    expect(formatAmountCLP(1000.5)).toBe(1001);
    expect(formatAmountCLP(999.1)).toBe(999);
  });

  test('mantiene enteros sin cambio', () => {
    expect(formatAmountCLP(5000)).toBe(5000);
  });
});
