import { useMemo, useState } from "react";
import { createFormulaContext } from "../src/formula/context";
import { validateFormula } from "../src/formula/validateFormula";
import { inputStyles } from "../src/ui";
import { functionsCatalog, parameters } from "./mockData";

export default function ValidationDemo() {
  const [formula, setFormula] = useState(
    "math.round(boiler_power * efficiency / 100, 1",
  );

  // Контекст пересоздаём, только если поменялись данные, а не на каждый символ.
  const context = useMemo(
    () =>
      createFormulaContext({
        catalog: functionsCatalog,
        parameters,
        selfCode: "useful_power",
      }),
    [],
  );
  const issues = validateFormula(formula, context);

  return (
    <section className="card">
      <h2>Валидация формулы (шаг 4)</h2>
      <input
        className={`${inputStyles.input} ${inputStyles.mono} ${issues.length ? inputStyles.invalid : ""}`}
        value={formula}
        onChange={(e) => setFormula(e.target.value)}
      />
      {issues.length === 0 ? (
        <p style={{ color: "var(--lc-ok)" }}>Ошибок нет</p>
      ) : (
        <ul style={{ color: "var(--lc-err)" }}>
          {issues.map((issue, i) => (
            <li key={i}>
              {issue.message} <small>(символ {issue.start + 1})</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
