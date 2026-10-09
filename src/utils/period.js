import { plural } from "./format";

export const PERIOD_UNITS = [
  { value: "seconds", label: "секунды", factor: 1 },
  { value: "minutes", label: "минуты", factor: 60 },
  { value: "hours", label: "часы", factor: 3600 },
  { value: "days", label: "дни", factor: 86400 },
];
// ← factor — сколько секунд в одной единице

/**
 * Секунды → самая крупная «ровная» единица.
 * 3600 → { amount: '1', unit: 'hours' }
 * 5400 → { amount: '90', unit: 'minutes' }   (1,5 часа — не ровно, берём минуты)
 */
export function splitPeriod(seconds) {
  if (!seconds || seconds <= 0) return { amount: "", unit: "minutes" };
  // ← периода нет — пустое поле, по умолчанию «минуты»
  for (let i = PERIOD_UNITS.length - 1; i >= 0; i--) {
    // ← идём от крупной к мелкой: дни → часы → минуты → секунды
    const { value, factor } = PERIOD_UNITS[i];
    if (seconds % factor === 0)
      return { amount: String(seconds / factor), unit: value };
    // ← делится нацело — нашли. % — остаток от деления
  }
  return { amount: String(seconds), unit: "seconds" };
}

// Число + единица → секунды: (1.5, 'hours') → 5400
export function toSeconds(amount, unit) {
  const factor = PERIOD_UNITS.find((u) => u.value === unit)?.factor ?? 1;
  return Math.round(Number(amount) * factor);
  // ← round: 0.1 минуты = 6 секунд, а не 6.000000001
}

// Для показа в таблице приложения: 3600 → '1 час', 86400*2 → '2 дня'
export function formatPeriod(seconds) {
  if (!seconds) return "—";
  const { amount, unit } = splitPeriod(seconds);
  const n = Number(amount);
  switch (unit) {
    case "days":
      return `${n} ${plural(n, "день", "дня", "дней")}`;
    case "hours":
      return `${n} ${plural(n, "час", "часа", "часов")}`;
    case "minutes":
      return `${n} мин`;
    default:
      return `${n} с`;
  }
}
