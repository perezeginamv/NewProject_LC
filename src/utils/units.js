/**
 * Приводит единицы с бэкенда к одному виду: { token, title, name, aliases }.
 * Понимает и объекты с разными именами полей, и просто строки.
 */
export function normalizeUnits(list) {
  return (
    (list ?? [])
      // ← бэкенд ещё не ответил (undefined) — работаем с пустым списком
      .map((u) => {
        if (typeof u === "string")
          return { token: u, title: u, name: "", aliases: [] };
        // ← если бэкенд вернёт просто ['kW', 'MW'] — тоже поймём
        return {
          token: u.unit_api ?? u.token ?? u.code,
          // ← код единицы. Разные варианты имени поля — на случай, если бэкенд назовёт его иначе
          title: u.title ?? u.symbol ?? u.unit_api ?? u.code,
          name: u.name ?? "",
          aliases: u.aliases ?? [],
        };
      })
      .filter((u) => u.token)
  );
  // ← единицу без кода выбросить: сохранить её всё равно нельзя
}

// Подпись по коду: 'kilowatt' → 'кВт'. Пригодится приложению для таблиц.
export function getUnitTitle(units, token) {
  if (!token) return "";
  return normalizeUnits(units).find((u) => u.token === token)?.title ?? token;
  // ← не нашли — показываем сам код, а не пустоту
}

// Все строки, по которым можно найти единицу, в нижнем регистре.
function haystack(unit) {
  return [unit.token, unit.title, unit.name, ...unit.aliases].map((s) =>
    String(s).toLowerCase(),
  );
}
// 'haystack' — «стог сена», в котором ищем иголку (то, что ввёл пользователь)

// Точное совпадение: пользователь ввёл ровно 'квт' или 'kw' — это kilowatt.
export function findExactUnit(units, text) {
  const q = text.trim().toLowerCase();
  if (!q) return null;
  return units.find((u) => haystack(u).includes(q)) ?? null;
}

// Поиск для выпадающего списка: сначала «начинается с», потом «содержит».
export function filterUnits(units, query) {
  const q = query.trim().toLowerCase();
  if (!q) return units;
  const starts = [];
  const contains = [];
  for (const unit of units) {
    const words = haystack(unit);
    if (words.some((w) => w.startsWith(q))) starts.push(unit);
    else if (words.some((w) => w.includes(q))) contains.push(unit);
  }
  return [...starts, ...contains];
}
