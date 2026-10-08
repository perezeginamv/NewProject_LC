import {
  FALLBACK_OPERATORS,
  NAMESPACE_ORDER,
  NAMESPACE_TITLES,
  PREFIXED_NAMESPACES,
} from "./constants";

const CATEGORIES = ["scalar", "aggregation", "transform", "source"];

// Имя, под которым функция пишется в формуле: abs из модуля math → math.abs
export function publicFunctionName(spec) {
  if (spec.public_name) return spec.public_name;
  if (!PREFIXED_NAMESPACES.includes(spec.namespace)) return spec.name;
  const prefix = `${spec.namespace}.`;
  return spec.name.startsWith(prefix) ? spec.name : prefix + spec.name;
}

// Как показать аргумент в подсказке: x | [digits] | digits=0 | ...values
export function argumentSignature(arg) {
  if (arg.variadic) return `...${arg.name}`;
  if (arg.required === false || arg.default !== undefined) {
    return arg.default === undefined
      ? `[${arg.name}]`
      : `${arg.name}=${JSON.stringify(arg.default)}`;
  }
  return arg.name;
}

// Полная сигнатура: math.round(x, digits=0)
export function functionSignature(spec) {
  const args = (spec.arguments ?? []).map(argumentSignature).join(", ");
  return `${spec.publicName}(${args})`;
}

// Допустимые типы аргумента строкой: "number | int"
export function argumentTypes(arg) {
  const types = arg.accepted_types ?? arg.type;
  if (!types) return "";
  return Array.isArray(types) ? types.join(" | ") : String(types);
}

function groupByNamespace(functions) {
  const groups = new Map();
  for (const fn of functions) {
    const id = fn.namespace ?? "core";
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(fn);
  }
  const rank = (id) => {
    const i = NAMESPACE_ORDER.indexOf(id);
    return i === -1 ? NAMESPACE_ORDER.length : i;
  };
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([id, list]) => ({
      id,
      title: NAMESPACE_TITLES[id] ?? id,
      functions: list,
    }));
}

/**
 * Ответ бэкенда /functions → структура для редактора:
 * {
 *   functions:  [...],             плоский список, у каждой функции есть publicName
 *   byName:     Map(имя → функция) поиск по publicName, короткому имени и алиасам
 *   constants:  [{ name, description }]
 *   operators:  [{ symbol, title }]
 *   namespaces: [{ id, title, functions }]  для справочника по модулям
 * }
 * Работает и с пустым/неполученным ответом (data = undefined) — вернёт пустой каталог.
 */
export function normalizeCatalog(data) {
  const functions = [];
  for (const category of CATEGORIES) {
    for (const spec of data?.[category] ?? []) {
      const withNs = { ...spec, category, namespace: spec.namespace ?? "core" };
      functions.push({ ...withNs, publicName: publicFunctionName(withNs) });
    }
  }
  functions.sort((a, b) => a.publicName.localeCompare(b.publicName));

  const byName = new Map();
  for (const fn of functions) {
    byName.set(fn.publicName, fn);
    if (!byName.has(fn.name)) byName.set(fn.name, fn);
    for (const alias of fn.aliases ?? [])
      if (!byName.has(alias)) byName.set(alias, fn);
  }

  const constants = (data?.constants ?? []).map((c) =>
    typeof c === "string" ? { name: c } : c,
  );
  const operators = data?.operators?.length
    ? data.operators
    : FALLBACK_OPERATORS;

  return {
    functions,
    byName,
    constants,
    operators,
    namespaces: groupByNamespace(functions),
  };
}
