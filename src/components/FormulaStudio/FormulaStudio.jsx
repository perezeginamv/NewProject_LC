import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createFormulaContext } from "../../utils/formula/context";
import { hasErrors } from "../../utils/formula/validateFormula";
import { Button } from "../../ui";
import FormulaEditor from "../FormulaEditor/FormulaEditor";
import FormulaPalette from "./FormulaPalette";
import FormulaPreview from "./FormulaPreview";
import FormulaCheckResult from "./FormulaCheckResult";
import styles from "./FormulaStudio.module.css";

const EMPTY = [];

/**
 * Редактор формулы + справочник + использованные параметры + серверные действия.
 * Запросов не делает: серверные действия приходят через onFormat / onCheck.
 */
export default function FormulaStudio({
  value,
  onChange,
  catalog,
  parameters = EMPTY,
  selfCode,
  onCheck,
  onFormat,
  onValidate,
  label = "Формула",
  placeholder = "Например: boiler_power * 0.95 + math.abs(delta)",
  defaultShowPalette = true,
  disabled = false,
  id,
}) {
  const autoId = useId();
  // ← React генерирует уникальный id. Две студии на странице не будут конфликтовать
  const editorId = id ?? autoId;
  // ← приложение может передать свой id, иначе берём сгенерированный

  const editorRef = useRef(null);
  // ← сюда редактор положит свой «пульт» (insert, focus)

  const [showPalette, setShowPalette] = useState(defaultShowPalette);
  const [busy, setBusy] = useState(null);
  // ← какая серверная операция идёт: 'format' | 'check' | null. Кнопки на это время недоступны
  const [status, setStatus] = useState(null);
  // ← короткое сообщение под полем: { tone: 'muted' | 'error', text }
  const [check, setCheck] = useState(null);
  // ← результат проверки для FormulaCheckResult
  const [issues, setIssues] = useState(EMPTY);
  // ← ошибки валидации от редактора: по ним блокируем кнопки

  // ОДИН словарь на редактор, справочник и превью — не собираем его трижды.
  const context = useMemo(
    () => createFormulaContext({ catalog, parameters, selfCode }),
    [catalog, parameters, selfCode],
  );

  // Формулу изменили — старый результат проверки больше не про неё: убираем.
  useEffect(() => {
    setCheck(null);
    setStatus(null);
  }, [value]);

  function handleValidate(next) {
    setIssues(next); // ← себе: блокировать кнопки
    onValidate?.(next); // ← и приложению, если оно попросило
  }

  const insert = (text, caretOffset) =>
    editorRef.current?.insert(text, caretOffset);
  // ← справочник → пульт редактора. ?. — на случай, если редактор ещё не смонтирован

  const invalid = hasErrors(issues);

  async function runFormat() {
    setBusy("format"); // ← кнопки недоступны, на кнопке «Форматирование…»
    try {
      const formatted = await onFormat(value); // ← ждём ответ приложения (его запрос к бэкенду)
      if (formatted && formatted !== value) onChange(formatted);
      // ← пришла другая формула — подставляем. onChange отдаёт её родителю, как обычный ввод
      else setStatus({ tone: "muted", text: "Формула уже отформатирована" });
    } catch (e) {
      // ← запрос упал (нет сети, 500) — показываем, а не роняем страницу
      setStatus({
        tone: "error",
        text: `Не удалось отформатировать: ${e?.message ?? e}`,
      });
    } finally {
      setBusy(null); // ← в любом случае снимаем «занято»
    }
  }

  async function runCheck() {
    setBusy("check");
    try {
      const data = await onCheck(value);
      const error = data?.error ?? data?.error_message;
      // ← бэкенд может сообщить ошибку расчёта не исключением, а полем в ответе
      setCheck(error ? { error } : { data });
    } catch (e) {
      setCheck({ error: e?.message ?? String(e) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={styles.studio}>
      <div className={styles.studioHeader}>
        <label className={styles.studioLabel} htmlFor={editorId}>
          {label}
        </label>
        <div className={styles.studioActions}>
          {onFormat && (
            // ← нет функции от приложения — нет кнопки
            <Button
              onClick={runFormat}
              disabled={disabled || Boolean(busy) || !value.trim() || invalid}
            >
              {busy === "format" ? "Форматирование…" : "Форматировать"}
            </Button>
          )}
          {onCheck && (
            <Button
              onClick={runCheck}
              disabled={disabled || Boolean(busy) || !value.trim() || invalid}
              // ← недоступна: идёт запрос, формула пустая или в ней ошибки (сервер всё равно не посчитает)
              title={invalid ? "Сначала исправьте ошибки в формуле" : undefined}
            >
              {busy === "check" ? "Расчёт…" : "Проверить расчёт"}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => setShowPalette((v) => !v)}
            aria-expanded={showPalette}
          >
            {showPalette ? "Скрыть справочник" : "Показать справочник"}
          </Button>
        </div>
      </div>

      <div
        className={showPalette ? styles.studioBody : styles.studioBodySingle}
      >
        {/* ↑ со справочником — две колонки, без него — одна */}
        <div className={styles.studioMain}>
          <FormulaEditor
            ref={editorRef}
            id={editorId}
            value={value}
            onChange={onChange}
            catalog={context.catalog}
            // ← передаём УЖЕ нормализованный каталог: редактор не будет обрабатывать его заново
            parameters={parameters}
            selfCode={selfCode}
            onValidate={handleValidate}
            placeholder={placeholder}
            disabled={disabled}
          />
          {status && (
            <p
              className={
                status.tone === "error"
                  ? styles.statusError
                  : styles.statusMuted
              }
            >
              {status.text}
            </p>
          )}
          <FormulaPreview formula={value} context={context} />
          <FormulaCheckResult result={check} />
        </div>

        {showPalette && (
          <FormulaPalette
            catalog={context.catalog}
            parameters={parameters}
            selfCode={selfCode}
            onInsert={insert}
          />
        )}
      </div>
    </div>
  );
}
