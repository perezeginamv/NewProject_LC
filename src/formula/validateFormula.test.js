import { describe, expect, it } from "vitest";
import { createFormulaContext } from "./context";
import { validateFormula } from "./validateFormula";

// Справочник в формате ответа бэкенда /functions
const catalog = {
  scalar: [
    { name: "abs", namespace: "math", arguments: [{ name: "x" }] },
    {
      name: "round",
      namespace: "math",
      arguments: [
        { name: "x" },
        { name: "digits", required: false, default: 0 },
      ],
    },
    {
      name: "max",
      namespace: "math",
      arguments: [{ name: "values", variadic: true }],
    },
    {
      name: "if",
      namespace: "logic",
      arguments: [{ name: "cond" }, { name: "then" }, { name: "else" }],
    },
  ],
  aggregation: [
    {
      name: "avg",
      namespace: "series",
      arguments: [{ name: "param" }, { name: "window" }],
    },
  ],
  constants: [{ name: "PI" }],
};

const ctx = createFormulaContext({
  catalog,
  parameters: [{ code: "a" }, { code: "b" }, { code: "self" }],
  selfCode: "self",
});

const messages = (formula) =>
  validateFormula(formula, ctx).map((i) => i.message);

describe("validateFormula — корректные формулы", () => {
  it.each([
    "a + b",
    "-a * (b - 1)",
    "math.abs(a - b) / 2",
    "math.round(a)",
    "math.round(a, 2)",
    "math.max(a, b, 3, 4)",
    "math.max()",
    "logic.if(a > b and not b == 0, a, b)",
    "series.avg(a, 3600) ^ 2",
    "PI * a",
    "",
  ])("%s", (formula) => {
    expect(messages(formula)).toEqual([]);
  });
});

describe("validateFormula — ошибки", () => {
  it.each([
    ["a +", "Формула обрывается на «+»"],
    ["(a + b", "Не закрыта скобка"],
    ["a + b)", "Лишняя закрывающая скобка"],
    ["a b", "Пропущен оператор между «a» и «b»"],
    ["2 (a)", "Пропущен оператор между «2» и «(»"],
    ["* a", "Оператору «*» не хватает левой части"],
    ["a + * b", "Оператору «*» не хватает левой части"],
    ["()", "Пустые скобки"],
    ["math.abs(a,)", "Пустой аргумент"],
    ["math.max(a,,b)", "Пустой аргумент"],
    ["a, b", "Запятая вне вызова функции"],
    ["c + 1", "Неизвестное имя «c»: нет такого параметра или константы"],
    ["math.sqrt(a)", "Неизвестная функция «math.sqrt»"],
    [
      "math.abs + 1",
      "Функцию «math.abs» нужно вызывать со скобками: math.abs(…)",
    ],
    ["math.abs()", "«math.abs» принимает 1 аргумент, передано 0"],
    [
      "math.round(a, 1, 2)",
      "«math.round» принимает от 1 до 2 аргументов, передано 3",
    ],
    ["logic.if(a, b)", "«logic.if» принимает 3 аргумента, передано 2"],
    ["self * 2", "Параметр не может ссылаться сам на себя"],
    ["a # b", "Недопустимый символ «#»"],
    ["'abc", "Не закрыта кавычка"],
  ])("%s → %s", (formula, expected) => {
    expect(messages(formula)).toContain(expected);
  });

  it("возвращает позицию ошибки", () => {
    const [issue] = validateFormula("a + c", ctx);
    expect(issue).toMatchObject({ severity: "error", start: 4, end: 5 });
  });

  it("не ругается на функции, пока справочник не загружен", () => {
    const empty = createFormulaContext({ parameters: [{ code: "a" }] });
    expect(validateFormula("math.abs(a)", empty)).toEqual([]);
  });
});
