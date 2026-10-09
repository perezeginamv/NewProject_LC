import { useRef, useState } from "react";
import FormulaEditor from "../src/components/FormulaEditor/FormulaEditor";
import { Button } from "../src/ui";
import { functionsCatalog, parameters } from "./mockData";

export default function FormulaEditorDemo() {
  const [formula, setFormula] = useState(
    "math.round(boiler_power * efficiency / 100, 1)",
  );
  const [issues, setIssues] = useState([]);
  const editorRef = useRef(null);

  return (
    <section className="card">
      <h2>FormulaEditor (шаг 5)</h2>

      <FormulaEditor
        ref={editorRef}
        id="demo-formula"
        value={formula}
        onChange={setFormula}
        catalog={functionsCatalog}
        parameters={parameters}
        selfCode="useful_power"
        onValidate={setIssues}
        placeholder="Например: boiler_power * 0.95"
      />

      <div className="row" style={{ marginTop: 10 }}>
        {/* Проверяем метод insert из ref — так будет работать справочник на шаге 6 */}
        <Button onClick={() => editorRef.current.insert("math.abs()", 9)}>
          Вставить math.abs()
        </Button>
        <Button onClick={() => setFormula("")}>Очистить</Button>
        <span
          style={{ color: issues.length ? "var(--lc-err)" : "var(--lc-ok)" }}
        >
          {issues.length ? `Ошибок: ${issues.length}` : "Формула корректна"}
        </span>
      </div>
    </section>
  );
}
