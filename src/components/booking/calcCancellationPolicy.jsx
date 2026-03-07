/**
 * calcCancellationPolicy
 *
 * Política:
 *   Renter  >5 días antes  → reembolso 100 %
 *   Renter  1-5 días antes → reembolso 80 %
 *   Renter  <1 día antes   → reembolso 50 %
 *   Owner   cualquier momento → reembolso 100 % al renter + fee €10 a Backline
 *   Admin   cualquier momento → reembolso 100 %, sin penalización
 *
 * @param {'renter'|'owner'|'admin'} cancelledBy
 * @param {string} startDateISO  — fecha inicio reserva 'yyyy-MM-dd'
 * @param {number} totalPaid     — total pagado por el renter (€)
 * @returns {{ refundPct, refundAmount, cancellationFee, label, description }}
 */
export function calcCancellationPolicy(cancelledBy, startDateISO, totalPaid) {
  const now       = new Date();
  const start     = new Date(startDateISO);
  const daysUntil = (start - now) / (1000 * 60 * 60 * 24);

  if (cancelledBy === 'admin') {
    return {
      refundPct:       100,
      refundAmount:    totalPaid,
      cancellationFee: 0,
      label:           'Cancelación por admin',
      description:     'Reembolso completo. Sin penalización.',
    };
  }

  if (cancelledBy === 'owner') {
    return {
      refundPct:       100,
      refundAmount:    totalPaid,
      cancellationFee: 10,
      label:           'Cancelación por arrendador',
      description:     'Reembolso completo al arrendatario. Se aplica un fee de €10 a Backline Go.',
    };
  }

  // Renter
  if (daysUntil > 5) {
    return {
      refundPct:       100,
      refundAmount:    totalPaid,
      cancellationFee: 0,
      label:           'Cancelación anticipada',
      description:     'Más de 5 días antes. Reembolso completo.',
    };
  }
  if (daysUntil >= 1) {
    const refundAmount = totalPaid * 0.8;
    return {
      refundPct:       80,
      refundAmount,
      cancellationFee: 0,
      label:           'Cancelación con penalización parcial',
      description:     `Entre 1 y 5 días antes. Reembolso del 80% (€${refundAmount.toFixed(2)}).`,
    };
  }
  // < 1 day
  const refundAmount = totalPaid * 0.5;
  return {
    refundPct:       50,
    refundAmount,
    cancellationFee: 0,
    label:           'Cancelación tardía',
    description:     `Menos de 24h antes. Reembolso del 50% (€${refundAmount.toFixed(2)}).`,
  };
}