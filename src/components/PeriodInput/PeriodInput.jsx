import { useEffect, useRef, useState } from "react";
import { PERIOD_UNITS, splitPeriod, toSeconds } from "../../utils/period";
import { inputStyles } from "../../ui";
import styles from "./PeriodInput.module.css";

/**
 * Период пересчёта: число + единица. Наружу — секунды.
 * @param {number|null} props.seconds                       значение в секундах (period_seconds с бэкенда)
 * @param {(seconds: number|null) => void} props.onChange   null — ввод некорректен или пустой
 */
export default function PeriodInput({ id, seconds, onChange, disabled }) {
  const initial = splitPeriod(seconds);
  const [amount, setAmount] = useState(initial.amount);
  // ← текст в поле числа. Хранится строкой: человек может ввести '1,' или '' — это ещё не число
  const [unit, setUnit] = useState(initial.unit);

  const lastEmitted = useRef(seconds);
  // ← какое значение мы САМИ последним отдали наружу

  // Значение поменяли СНАРУЖИ (форма открыла другой параметр) — обновляем поля.
  // Если это наше же значение вернулось от родителя — ничего не трогаем,
  // иначе стиралось бы то, что человек сейчас печатает.
  useEffect(() => {
    if (seconds !== lastEmitted.current) {
      const next = splitPeriod(seconds);
      setAmount(next.amount);
      setUnit(next.unit);
      lastEmitted.current = seconds;
    }
  }, [seconds]);

  function emit(nextAmount, nextUnit) {
    const n = Number(String(nextAmount).replace(",", "."));
    // ← принимаем и запятую, и точку: '1,5' → 1.5
    const result =
      nextAmount !== "" && Number.isFinite(n) && n > 0
        ? toSeconds(n, nextUnit)
        : null;
    // ← пусто, не число, ноль или минус → null («нет корректного периода»)
    lastEmitted.current = result;
    onChange(result);
  }

  return (
    <div className={styles.period}>
      <input
        id={id}
        className={`${inputStyles.input} ${styles.amount}`}
        inputMode="decimal"
        // ← на телефоне откроется цифровая клавиатура
        value={amount}
        disabled={disabled}
        onChange={(e) => {
          setAmount(e.target.value);
          emit(e.target.value, unit);
        }}
      />
      <select
        className={`${inputStyles.input} ${styles.unit}`}
        aria-label="Единица периода"
        value={unit}
        disabled={disabled}
        onChange={(e) => {
          setUnit(e.target.value);
          emit(amount, e.target.value);
          // ← сменили «минуты» на «часы» — число то же, секунды пересчитаны
        }}
      >
        {PERIOD_UNITS.map((u) => (
          <option key={u.value} value={u.value}>
            {u.label}
          </option>
        ))}
      </select>
    </div>
  );
}
