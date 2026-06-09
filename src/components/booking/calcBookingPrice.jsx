/**
 * calcBookingPrice(equipment, startDate, endDate, deliverySlot, returnSlot)
 *
 * Calcula el precio final de una reserva por horas exactas:
 *   totalHours = díasNaturales × 24 + (returnSlot - deliverySlot)
 *   days       = totalHours / 24  (puede ser decimal)
 *
 * Ejemplo: 16jun 10h → 17jun 10h = 24h = 1 día → 180 €
 *          16jun 10h → 17jun 13h = 27h = 1.125 días → 202.50 €
 *
 * Aplica en orden:
 *   1. basePrice  = pricePerDay × days
 *   2. multiplicadores acumulables (weekend, summer)
 *   3. descuento por volumen (tramo más alto aplicable, sobre días enteros)
 *
 * @param {object} equipment
 * @param {Date}   startDate
 * @param {Date}   endDate
 * @param {number} deliverySlot  hora de entrega (0-23), default 0
 * @param {number} returnSlot    hora de devolución (0-23), default 0
 */
import { differenceInDays, eachDayOfInterval, getMonth, getDay } from 'date-fns';

const INSURANCE_RATE = 0.08;

export function calcBookingPrice(equipment, startDate, endDate, deliverySlot = 0, returnSlot = 0) {
  const calendarDays = differenceInDays(endDate, startDate);
  const totalHours   = calendarDays * 24 + (returnSlot - deliverySlot);
  const days         = totalHours / 24; // decimal: 27h → 1.125

  const pricePerDay = equipment.price_per_day || 0;
  const basePrice   = days * pricePerDay;

  const cfg = equipment.pricing_config || {};

  // --- Multiplicadores (acumulables) ---
  let weekendMultiplier = 1;
  let summerMultiplier  = 1;

  if (days > 0 && startDate && endDate) {
    const range = eachDayOfInterval({ start: startDate, end: endDate });

    if (cfg.weekend?.on) {
      const hasWeekend = range.some(d => getDay(d) === 0 || getDay(d) === 6);
      if (hasWeekend) weekendMultiplier = parseFloat(cfg.weekend.val) || 1;
    }

    if (cfg.summer?.on) {
      const hasSummer = range.some(d => [5, 6, 7].includes(getMonth(d)));
      if (hasSummer) summerMultiplier = parseFloat(cfg.summer.val) || 1;
    }
  }

  const combinedMultiplier    = weekendMultiplier * summerMultiplier;
  const priceAfterMultipliers = basePrice * combinedMultiplier;

  // --- Descuento por volumen (basado en días enteros) ---
  const wholeDays = Math.floor(days);
  const tiers = cfg.tiers || [];
  const applicableTier = tiers
    .filter(t => wholeDays >= parseInt(t.minDays || 0))
    .sort((a, b) => parseInt(b.minDays) - parseInt(a.minDays))[0];

  const discountPct    = applicableTier ? parseFloat(applicableTier.pct) : 0;
  const discountAmount = priceAfterMultipliers * (discountPct / 100);
  const finalPrice     = priceAfterMultipliers - discountAmount;

  const insuranceFee = finalPrice * INSURANCE_RATE;
  const totalPrice   = finalPrice + insuranceFee;

  const hasModifiers = weekendMultiplier > 1 || summerMultiplier > 1 || discountPct > 0;

  return {
    days,
    totalHours,
    basePrice,
    weekendMultiplier,
    summerMultiplier,
    combinedMultiplier,
    priceAfterMultipliers,
    discountPct,
    discountAmount,
    finalPrice,
    insuranceFee,
    totalPrice,
    hasModifiers,
  };
}
