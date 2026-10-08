// Заголовки пространств имён функций (для справочника в редакторе).
export const NAMESPACE_TITLES = {
  math: "Математика",
  series: "Временные ряды",
  logic: "Логика",
  source: "Источники данных",
  core: "Базовые",
};

// Порядок модулей в справочнике; остальные — по алфавиту после них.
export const NAMESPACE_ORDER = ["math", "series", "logic", "source"];

// Функции этих пространств имён пишутся с префиксом: math.abs(...)
export const PREFIXED_NAMESPACES = ["math", "logic", "series", "source"];

// Используются, если бэкенд не вернул список операторов.
export const FALLBACK_OPERATORS = [
  { symbol: "+", title: "Сложение" },
  { symbol: "-", title: "Вычитание" },
  { symbol: "*", title: "Умножение" },
  { symbol: "/", title: "Деление" },
  { symbol: "^", title: "Степень" },
  { symbol: ">", title: "Больше" },
  { symbol: "<", title: "Меньше" },
  { symbol: ">=", title: "Больше или равно" },
  { symbol: "<=", title: "Меньше или равно" },
  { symbol: "==", title: "Равно" },
  { symbol: "!=", title: "Не равно" },
];

export const PUNCTUATION = ["(", ")", ","];

// Слова-операторы и литералы. Сверить с грамматикой бэкенда.
export const WORD_OPERATORS = new Set(["and", "or"]);
export const WORD_UNARY = new Set(["not"]);
export const LITERALS = new Set(["true", "false", "null"]);
export const KEYWORDS = new Set([
  ...WORD_OPERATORS,
  ...WORD_UNARY,
  ...LITERALS,
]);

// Настройки редактора (понадобятся на шаге 5).
export const FORMULA_MAX_HEIGHT = 320;
export const AUTOCOMPLETE_LIMIT = 8;
