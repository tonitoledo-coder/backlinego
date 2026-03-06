/**
 * calcBookingPrice(equipment, startDate, endDate)
 *
 * Calcula el precio final de una reserva aplicando, en orden:
 *   1. precio_base  = price_per_day × días
 *   2. multiplicadores (acumulables, se multiplican entre sí)
 *      - weekend: sábados y domingos dentro del rango
 *      - summer:  días de junio, julio o agosto dentro del rango
 *   3. descuento por volumen: el tramo más alto aplicable
 *
 * Devuelve un objeto con el desglose completo.
 *
 * @param {object} equipment  - entidad Equipment de Base44
 * @param {Date}   startDate
 * @param {Date}   endDate
 * @returns {{
 *   days: number,
 *   basePrice: number,
 *   weekendMultiplier: number,
 *   summerMultiplier: number,
 *   combinedMultiplier: number,
 *   priceAfterMultipliers: number,
 *   discountPct: number,
 *   discountAmount: number,
 *   finalPrice: number,
 *   insuranceFee: number,
 *   totalPrice: number,
 *   hasModifiers: boolean
 * }}
 */

import { differenceInDays, eachDayOfInterval, getMonth, getDay } from 'date-fns';

const INSURANCE_RATE = 0.08;

export function calcBookingPrice(equipment, startDate, endDate) {
  const days = differenceInDays(endDate, startDate) + 1;
  const pricePerDay = equipment.price_per_day || 0;
  const basePrice = days * pricePerDay;

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
      const hasSummer = range.some(d => [5, 6, 7].includes(getMonth(d))); // jun=5 jul=6 ago=7
      if (hasSummer) summerMultiplier = parseFloat(cfg.summer.val) || 1;
    }
  }

  const combinedMultiplier    = weekendMultiplier * summerMultiplier;
  const priceAfterMultipliers = basePrice * combinedMultiplier;

  // --- Descuento por volumen (tramo más alto aplicable) ---
  const tiers = cfg.tiers || [];
  const applicableTier = tiers
    .filter(t => days >= parseInt(t.minDays || 0))
    .sort((a, b) => parseInt(b.minDays) - parseInt(a.minDays))[0];

  const discountPct    = applicableTier ? parseFloat(applicableTier.pct) : 0;
  const discountAmount = priceAfterMultipliers * (discountPct / 100);
  const finalPrice     = priceAfterMultipliers - discountAmount;

  const insuranceFee = finalPrice * INSURANCE_RATE;
  const totalPrice   = finalPrice + insuranceFee;

  const hasModifiers =
    weekendMultiplier > 1 || summerMultiplier > 1 || discountPct > 0;

  return {
    days,
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