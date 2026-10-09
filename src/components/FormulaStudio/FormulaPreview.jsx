import { useMemo } from "react";
import { analyzeFormula } from "../../utils/formula/tokenizer";
import styles from "./FormulaStudio.module.css";

/**
 * Какие параметры использует формула, рядом — hint (например, текущее значение).
 * Неизвестные имена здесь не показываем: их уже перечисляет список ошибок редактора.
 */
export default function FormulaPreview({ formula, context }) {
  const { params } = useMemo(
    () => analyzeFormula(formula, context.tokenCtx),
    [formula, context],
  );
  // ← analyzeFormula из шага 4: собирает все токены типа 'param' без повторов

  if (!formula.trim() || params.length === 0) return null;
  // ← нечего показывать — ничего не рисуем

  const byCode = new Map(context.parameters.map((p) => [p.code, p]));
  // ← быстрый поиск параметра по коду, чтобы достать name и hint

  return (
    <div className={styles.preview}>
      <span className={styles.previewTitle}>В формуле:</span>
      {params.map((code) => {
        const p = byCode.get(code);
        return (
          <span key={code} className={styles.refChip} title={p?.name ?? ""}>
            {/* ↑ при наведении — полное название параметра */}
            <code>{code}</code>
            {p?.hint ? ` = ${p.hint}` : ""}
          </span>
        );
      })}
    </div>
  );
}
