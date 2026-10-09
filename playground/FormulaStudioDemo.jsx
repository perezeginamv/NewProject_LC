import { useState } from "react";
import FormulaStudio from "../src/components/FormulaStudio/FormulaStudio";
import { functionsCatalog, parameters } from "./mockData";

// Имитация задержки сети
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ЗАГЛУШКА «сервера» форматирования. В приложении здесь будет запрос к бэкенду.
async function fakeFormat(formula) {
  await wait(300);
  return formula
    .replace(/\s*([-+*/^]|==|!=|>=|<=|[<>])\s*/g, " $1 ") // пробелы вокруг операторов
    .replace(/\s*,\s*/g, ", ") // пробел после запятой
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+/g, " ")
    .trim();
}

// ЗАГЛУШКА «сервера» расчёта. Делит на ноль — ошибка, иначе фиктивный результат.
async function fakeCheck(formula) {
  await wait(500);
  if (/\/\s*0(?![\d.])/.test(formula)) return { error: "Деление на ноль" };
  const dependencies = parameters
    .map((p) => p.code)
    .filter((code) => formula.includes(code));
  return { value: 1104.2115, dependencies };
}

export default function FormulaStudioDemo() {
  const [formula, setFormula] = useState(
    "math.round(boiler_power*efficiency/100,1)",
  );
  const [issues, setIssues] = useState([]);

  return (
    <section className="card">
      <h2>FormulaStudio (шаг 6)</h2>
      <FormulaStudio
        value={formula}
        onChange={setFormula}
        catalog={functionsCatalog}
        parameters={parameters}
        selfCode="useful_power"
        onValidate={setIssues}
        onFormat={fakeFormat}
        onCheck={fakeCheck}
      />
      <p style={{ color: "var(--lc-muted)", fontSize: 13 }}>
        Форма могла бы сохранить формулу:{" "}
        {issues.length ? "нет, есть ошибки" : "да"}
      </p>
    </section>
  );
}
