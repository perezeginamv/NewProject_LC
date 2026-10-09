import { KEYWORDS } from "./constants";

// Группы по порядку:
//  1 пробелы
//  2 строка в кавычках (закрывающая кавычка необязательна — тогда это ошибка "не закрыта кавычка")
//  3 число: 12, 1.5, 2e-3
//  4 идентификатор: буквы/цифры/_/точка, начинается не с цифры
//  5 оператор: сначала двухсимвольные (== != >= <= && ||), потом односимвольные
//  6 скобки, запятая
//  7 любой другой символ — недопустимый
const TOKEN_RE =
  /(\s+)|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)|(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([A-Za-z_][\w.]*)|(==|!=|>=|<=|&&|\|\||[-+*/%^<>!=?:])|([()[\],])|([\s\S])/g;

const WORD_CHAR = /[\w.]/;

function nextNonSpace(text, index) {
  let i = index;
  while (i < text.length && /\s/.test(text[i])) i++;
  return text[i];
}

function classifyIdentifier(ident, text, endIndex, ctx) {
  if (KEYWORDS.has(ident.toLowerCase())) return "keyword";
  if (nextNonSpace(text, endIndex) === "(") {
    return ctx.functionNames.has(ident) ? "function" : "unknownFunction";
  }
  if (ctx.paramCodes.has(ident)) return "param";
  if (ctx.constantNames.has(ident)) return "constant";
  return "unknown";
}

/**
 * Разбивает формулу на токены.
 * @param {string} text
 * @param {{ functionNames: Set, paramCodes: Set, constantNames: Set }} ctx
 * @returns {Array<{ type: string, text: string, start: number }>}
 *   type: space | string | number | function | unknownFunction | param | constant
 *         | keyword | unknown | operator | punct | other
 */
export function tokenizeFormula(text, ctx) {
  const tokens = [];
  TOKEN_RE.lastIndex = 0;
  let m;
  while ((m = TOKEN_RE.exec(text))) {
    const [full, space, str, num, ident, op, punct] = m;
    let type = "other";
    if (space) type = "space";
    else if (str) type = "string";
    else if (num) type = "number";
    else if (ident)
      type = classifyIdentifier(ident, text, TOKEN_RE.lastIndex, ctx);
    else if (op) type = "operator";
    else if (punct) type = "punct";
    tokens.push({ type, text: full, start: m.index });
  }
  return tokens;
}

// Какие параметры упомянуты в формуле и какие имена не распознаны.
export function analyzeFormula(text, ctx) {
  const params = new Set();
  const unknown = new Set();
  const unknownFunctions = new Set();
  for (const t of tokenizeFormula(text, ctx)) {
    if (t.type === "param") params.add(t.text);
    else if (t.type === "unknown") unknown.add(t.text);
    else if (t.type === "unknownFunction") unknownFunctions.add(t.text);
  }
  return {
    params: [...params],
    unknown: [...unknown],
    unknownFunctions: [...unknownFunctions],
  };
}

// ---------- помощники для редактора (шаг 5) ----------

// Слово под курсором: для автодополнения. { start, end, prefix }
export function getWordAtCursor(text, pos) {
  let start = pos;
  while (start > 0 && WORD_CHAR.test(text[start - 1])) start--;
  let end = pos;
  while (end < text.length && WORD_CHAR.test(text[end])) end++;
  return { start, end, prefix: text.slice(start, pos) };
}

// В каком вызове функции стоит курсор и на каком аргументе: для подсказки сигнатуры.
// Идём от курсора влево, считая скобки: ")" — вложенный вызов, "," — следующий аргумент.
export function findCallAtCursor(text, pos) {
  let depth = 0;
  let argIndex = 0;
  for (let i = pos - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === ")") depth++;
    else if (ch === "," && depth === 0) argIndex++;
    else if (ch === "(") {
      if (depth > 0) {
        depth--;
        continue;
      }
      let end = i;
      while (end > 0 && /\s/.test(text[end - 1])) end--;
      let start = end;
      while (start > 0 && WORD_CHAR.test(text[start - 1])) start--;
      const name = text.slice(start, end);
      return name ? { name, argIndex } : null;
    }
  }
  return null;
}

// Варианты автодополнения: сначала начинающиеся с префикса, потом содержащие его.
export function getCompletions(prefix, items, limit) {
  if (!prefix || !/^[A-Za-z_]/.test(prefix)) return [];
  const q = prefix.toLowerCase();
  const starts = [];
  const contains = [];
  for (const item of items) {
    const label = item.label.toLowerCase();
    if (label.startsWith(q)) starts.push(item);
    else if (label.includes(q)) contains.push(item);
  }
  const result = [...starts, ...contains].slice(0, limit);
  // Слово уже набрано полностью и вариант единственный — список не нужен.
  if (result.length === 1 && result[0].label === prefix) return [];
  return result;
}
