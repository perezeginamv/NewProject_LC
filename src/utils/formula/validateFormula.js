import { tokenizeFormula } from "./tokenizer";
import { WORD_OPERATORS, WORD_UNARY } from "./constants";

/**
 * @typedef {object} FormulaIssue
 * @property {'error'|'warning'} severity
 * @property {string} message  текст для пользователя
 * @property {number} start    позиция начала в строке формулы
 * @property {number} end      позиция конца (не включая)
 */

const UNARY_SYMBOLS = new Set(["-", "+", "!"]);
const MAX_ISSUES = 20;

function plural(n, one, few, many) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
  return many;
}

// Сколько аргументов принимает функция по справочнику: { min, max } или null, если неизвестно.
function arity(spec) {
  const args = spec.arguments;
  if (!Array.isArray(args)) return null;
  const min = args.filter(
    (a) => !a.variadic && a.required !== false && a.default === undefined,
  ).length;
  const max = args.some((a) => a.variadic) ? Infinity : args.length;
  return { min, max };
}

function arityMessage(name, { min, max }, given) {
  const word = (n) => plural(n, "аргумент", "аргумента", "аргументов");
  // после «не меньше» и «до» — родительный падеж: «до 2 аргументов», «до 1 аргумента»
  const genitive = (n) =>
    n % 10 === 1 && n % 100 !== 11 ? "аргумента" : "аргументов";
  let expected;
  if (max === Infinity) expected = `не меньше ${min} ${genitive(min)}`;
  else if (min === max) expected = `${min} ${word(min)}`;
  else expected = `от ${min} до ${max} ${genitive(max)}`;
  return `«${name}» принимает ${expected}, передано ${given}`;
}

// Сводим тип токена к роли в выражении.
function kindOf(token) {
  const { type, text } = token;
  if (type === "punct") {
    if (text === "(") return "open";
    if (text === ")") return "close";
    if (text === ",") return "comma";
    return "bad"; // [ ]
  }
  if (type === "operator") return "operator";
  if (type === "function" || type === "unknownFunction") return "func";
  if (type === "keyword") {
    const word = text.toLowerCase();
    if (WORD_OPERATORS.has(word)) return "operator"; // and, or
    if (WORD_UNARY.has(word)) return "unaryWord"; // not
    return "operand"; // true, false, null
  }
  if (type === "other") return "bad";
  return "operand"; // number, string, param, constant, unknown
}

/**
 * Проверяет формулу на клиенте, без запроса к бэкенду.
 * @param {string} formula
 * @param {ReturnType<import('./context').createFormulaContext>} context
 * @returns {FormulaIssue[]} пустой массив — ошибок нет
 */
export function validateFormula(formula, context) {
  const issues = [];
  const add = (message, start, end, severity = "error") => {
    if (issues.length < MAX_ISSUES)
      issues.push({ severity, message, start, end });
  };

  if (!formula || !formula.trim()) return issues;

  const tokens = tokenizeFormula(formula, context.tokenCtx).filter(
    (t) => t.type !== "space",
  );
  const stack = []; // открытые скобки: { start, isCall, name, nameStart, spec, commas }

  // Что стояло перед текущим токеном:
  // start | operand | close | operator | unary | open | comma | func
  let prev = "start";
  let prevToken = null;
  let pendingFunc = null;

  const needsOperatorBefore = () => prev === "operand" || prev === "close";
  const missingOperator = (token) =>
    add(
      `Пропущен оператор между «${prevToken.text}» и «${token.text}»`,
      prevToken.start,
      token.start + token.text.length,
    );

  for (const token of tokens) {
    const end = token.start + token.text.length;

    switch (kindOf(token)) {
      case "bad":
        add(`Недопустимый символ «${token.text}»`, token.start, end);
        break;

      case "operand": {
        if (needsOperatorBefore()) missingOperator(token);
        if (token.type === "string") {
          const q = token.text[0];
          if (
            token.text.length < 2 ||
            token.text[token.text.length - 1] !== q
          ) {
            add("Не закрыта кавычка", token.start, end);
          }
        } else if (token.type === "unknown") {
          if (context.byName.has(token.text)) {
            add(
              `Функцию «${token.text}» нужно вызывать со скобками: ${token.text}(…)`,
              token.start,
              end,
            );
          } else {
            add(
              `Неизвестное имя «${token.text}»: нет такого параметра или константы`,
              token.start,
              end,
            );
          }
        } else if (
          token.type === "param" &&
          context.selfCode &&
          token.text === context.selfCode
        ) {
          add("Параметр не может ссылаться сам на себя", token.start, end);
        }
        prev = "operand";
        break;
      }

      case "func":
        if (needsOperatorBefore()) missingOperator(token);
        if (token.type === "unknownFunction" && context.catalogLoaded) {
          add(`Неизвестная функция «${token.text}»`, token.start, end);
        }
        pendingFunc = token;
        prev = "func";
        break;

      case "open":
        if (prev === "func") {
          // начало вызова функции — запоминаем, чтобы на ")" посчитать аргументы
          stack.push({
            start: token.start,
            isCall: true,
            name: pendingFunc.text,
            nameStart: pendingFunc.start,
            spec: context.byName.get(pendingFunc.text),
            commas: 0,
          });
        } else {
          if (needsOperatorBefore()) missingOperator(token);
          stack.push({ start: token.start, isCall: false });
        }
        prev = "open";
        break;

      case "close": {
        const top = stack.pop();
        if (!top) {
          add("Лишняя закрывающая скобка", token.start, end);
        } else {
          if (prev === "operator" || prev === "unary") {
            add("Выражение не закончено перед «)»", prevToken.start, end);
          } else if (prev === "comma") {
            add("Пустой аргумент", prevToken.start, end);
          } else if (prev === "open" && !top.isCall) {
            add("Пустые скобки", top.start, end);
          }
          if (top.isCall && top.spec) {
            const given = prev === "open" ? 0 : top.commas + 1;
            const range = arity(top.spec);
            if (range && (given < range.min || given > range.max)) {
              add(arityMessage(top.name, range, given), top.nameStart, end);
            }
          }
        }
        prev = "close";
        break;
      }

      case "comma": {
        const top = stack[stack.length - 1];
        if (!top || !top.isCall) {
          add("Запятая вне вызова функции", token.start, end);
        } else {
          if (prev === "open" || prev === "comma")
            add("Пустой аргумент", token.start, end);
          else if (prev === "operator" || prev === "unary") {
            add("Выражение не закончено перед «,»", prevToken.start, end);
          }
          top.commas += 1;
        }
        prev = "comma";
        break;
      }

      case "unaryWord":
        if (needsOperatorBefore()) missingOperator(token);
        prev = "unary";
        break;

      case "operator": {
        if (needsOperatorBefore()) {
          // слева есть операнд — это бинарный оператор (кроме "!", он только унарный)
          if (token.text === "!") missingOperator(token);
          prev = "operator";
        } else if (UNARY_SYMBOLS.has(token.text)) {
          prev = "unary"; // -a, +a, !a
        } else {
          add(
            `Оператору «${token.text}» не хватает левой части`,
            token.start,
            end,
          );
          prev = "operator";
        }
        break;
      }

      default:
        break;
    }
    prevToken = token;
  }

  // Формула не должна заканчиваться оператором, запятой или именем функции без скобок.
  if (prevToken && ["operator", "unary", "comma", "func"].includes(prev)) {
    const end = prevToken.start + prevToken.text.length;
    add(
      prev === "func"
        ? `После «${prevToken.text}» нужны скобки`
        : `Формула обрывается на «${prevToken.text}»`,
      prevToken.start,
      end,
    );
  }
  // Всё, что осталось в стеке, — незакрытые скобки.
  for (const open of stack) {
    add("Не закрыта скобка", open.start, open.start + 1);
  }

  return issues.sort((a, b) => a.start - b.start);
}

export const hasErrors = (issues) => issues.some((i) => i.severity === "error");
