import { formatValue } from "../../utils/format";
import styles from "./FormulaStudio.module.css";

/**
 * Результат пробного расчёта:
 *   { data: { value, dependencies?, resolved_formula? } } — успех
 *   { error: 'текст' }                                     — ошибка
 *   null                                                   — проверки ещё не было
 */
export default function FormulaCheckResult({ result }) {
  if (!result) return null;

  if (result.error) {
    return (
      <div className={`${styles.check} ${styles.checkError}`} role="alert">
        {/* ↑ role="alert" — экранный диктор сразу зачитает ошибку */}
        <strong>Формула не рассчитана.</strong> {result.error}
      </div>
    );
  }

  const data = result.data ?? {};
  const dependencies = data.dependencies ?? [];
  return (
    <div className={`${styles.check} ${styles.checkOk}`} role="status">
      <div>
        Результат:{" "}
        <strong className={styles.checkValue}>{formatValue(data.value)}</strong>
      </div>
      {data.resolved_formula && (
        <div>
          Развёрнутая формула:{" "}
          <code className={styles.example}>{data.resolved_formula}</code>
          {/* ↑ если бэкенд присылает формулу с подставленными значениями — показываем */}
        </div>
      )}
      {dependencies.length > 0 && (
        <div>
          Зависит от:{" "}
          {dependencies
            .map((d) => (typeof d === "string" ? d : d.code))
            .join(", ")}
        </div>
        // ← зависимости могут прийти строками или объектами — понимаем оба вида
      )}
    </div>
  );
}
