// Склонение по числу: plural(5, 'день', 'дня', 'дней') → 'дней'. Понадобится на шаге 7.
export function plural(n, one, few, many) {
  const n10 = Math.abs(n) % 10;
  const n100 = Math.abs(n) % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
  return many;
}

// Значение для показа пользователю.
export function formatValue(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    // ru-RU: пробел между разрядами, запятая в дробной части; не больше 6 знаков после запятой
    return value.toLocaleString("ru-RU", { maximumFractionDigits: 6 });
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
