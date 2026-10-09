import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AUTOCOMPLETE_LIMIT,
  FORMULA_MAX_HEIGHT,
} from "../../utils/formula/constants";
import { createFormulaContext } from "../../utils/formula/context";
import {
  findCallAtCursor,
  getCompletions,
  getWordAtCursor,
  tokenizeFormula,
} from "../../utils/formula/tokenizer";
import {
  hasErrors,
  validateFormula,
} from "../../utils/formula/validateFormula";
import { cx } from "../../utils/cx";
import FunctionInfo from "./FunctionInfo";
import styles from "./FormulaEditor.module.css";

const KIND_LABELS = {
  function: "функция",
  param: "параметр",
  constant: "константа",
};
// Один и тот же пустой массив, чтобы значение по умолчанию не менялось между рендерами.
const EMPTY = [];

/**
 * Поле ввода формулы: подсветка, автодополнение, подсказка по аргументам, валидация.
 * Управляемое поле: value + onChange. Ничего не запрашивает — данные приходят через props.
 * Через ref доступны insert(text, caretOffset) и focus().
 */
const FormulaEditor = forwardRef(function FormulaEditor(
  {
    value,
    onChange,
    catalog,
    parameters = EMPTY,
    selfCode,
    validate = true,
    onValidate,
    showIssues = true,
    id,
    placeholder,
    disabled = false,
  },
  ref,
) {
  const textareaRef = useRef(null);
  const highlightRef = useRef(null);
  const pendingCaret = useRef(null); // куда поставить курсор после программной вставки
  const [caret, setCaret] = useState(value.length);
  const [focused, setFocused] = useState(false);
  const [ac, setAc] = useState(null); // автодополнение: { start, end, items, active } или null

  // ---------- 1. Данные для анализа ----------
  // Пересчитываются только когда меняются справочник, параметры или selfCode,
  // а не на каждое нажатие клавиши.
  const context = useMemo(
    () => createFormulaContext({ catalog, parameters, selfCode }),
    [catalog, parameters, selfCode],
  );

  const completions = useMemo(
    () => [
      ...context.catalog.functions.map((f) => ({
        label: f.publicName,
        kind: "function",
        detail: f.description ?? "",
      })),
      ...parameters
        .filter((p) => p.code !== selfCode)
        .map((p) => ({ label: p.code, kind: "param", detail: p.name ?? "" })),
      ...context.catalog.constants.map((c) => ({
        label: c.name,
        kind: "constant",
        detail: c.description ?? "",
      })),
    ],
    [context, parameters, selfCode],
  );

  // ---------- 2. Разбор и проверка текста ----------
  const tokens = useMemo(
    () => tokenizeFormula(value, context.tokenCtx),
    [value, context],
  );
  const issues = useMemo(
    () => (validate ? validateFormula(value, context) : EMPTY),
    [validate, value, context],
  );
  const invalid = hasErrors(issues);

  // Сообщаем результат проверки наружу.
  // onValidate храним в ref: если приложение передаёт новую функцию на каждом рендере,
  // эффект всё равно сработает только при изменении issues, без бесконечного цикла.
  const onValidateRef = useRef(onValidate);
  onValidateRef.current = onValidate;
  useEffect(() => {
    onValidateRef.current?.(issues);
  }, [issues]);

  // ---------- 3. Синхронизация двух слоёв ----------
  function syncScroll() {
    const ta = textareaRef.current;
    const hl = highlightRef.current;
    if (ta && hl) {
      hl.scrollTop = ta.scrollTop;
      hl.scrollLeft = ta.scrollLeft;
    }
  }

  // useLayoutEffect — до отрисовки, чтобы не было мигания:
  // ставим курсор после вставки, подгоняем высоту под текст, синхронизируем прокрутку.
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (pendingCaret.current !== null) {
      ta.focus();
      ta.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
    ta.style.height = "auto";
    const borders = ta.offsetHeight - ta.clientHeight;
    ta.style.height = `${Math.min(ta.scrollHeight + borders, FORMULA_MAX_HEIGHT)}px`;
    ta.style.overflowY =
      ta.scrollHeight + borders > FORMULA_MAX_HEIGHT ? "auto" : "hidden";
    syncScroll();
  }, [value]);

  // ---------- 4. Изменение текста программно ----------
  function replaceRange(start, end, text, caretOffset = text.length) {
    pendingCaret.current = start + caretOffset;
    setCaret(start + caretOffset);
    onChange(value.slice(0, start) + text + value.slice(end));
  }

  function moveCaret(position) {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(position, position);
    setCaret(position);
  }

  // Методы для родителя через ref: справочник на шаге 6 будет вставлять функции в позицию курсора.
  useImperativeHandle(
    ref,
    () => ({
      insert(text, caretOffset = text.length) {
        const ta = textareaRef.current;
        const start = ta ? ta.selectionStart : value.length;
        const end = ta ? ta.selectionEnd : value.length;
        replaceRange(start, end, text, caretOffset);
        setAc(null);
      },
      focus() {
        textareaRef.current?.focus();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value],
  );

  // ---------- 5. Автодополнение ----------
  function updateAutocomplete(text, pos) {
    const { start, end, prefix } = getWordAtCursor(text, pos);
    const items = getCompletions(prefix, completions, AUTOCOMPLETE_LIMIT);
    setAc(items.length ? { start, end, items, active: 0 } : null);
  }

  function applyCompletion(item) {
    if (!ac) return;
    let text = item.label;
    let offset = text.length;
    // Для функции сразу добавляем скобки и ставим курсор внутрь: math.abs(|)
    if (item.kind === "function" && value[ac.end] !== "(") {
      text += "()";
      offset += 1;
    }
    replaceRange(ac.start, ac.end, text, offset);
    setAc(null);
  }

  function handleKeyDown(e) {
    if (!ac) return; // клавиши перехватываем, только когда открыт список
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAc({ ...ac, active: (ac.active + 1) % ac.items.length });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAc({
        ...ac,
        active: (ac.active - 1 + ac.items.length) % ac.items.length,
      });
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      applyCompletion(ac.items[ac.active]);
    } else if (e.key === "Escape") {
      e.preventDefault(); // закрываем только подсказку, а не форму, в которой лежит редактор
      setAc(null);
    }
  }

  // ---------- 6. Подсказка по аргументам ----------
  const call = focused ? findCallAtCursor(value, caret) : null;
  const callSpec = call ? context.byName.get(call.name) : null;

  // Токены, попадающие в диапазон ошибки, подчёркиваем.
  const errorRanges = issues.filter((i) => i.severity === "error");
  const inIssue = (t) =>
    errorRanges.some(
      (r) => t.start < r.end && t.start + t.text.length > r.start,
    );
  const issuesId = id ? `${id}-issues` : undefined;

  // ---------- 7. Разметка ----------
  return (
    <div className={styles.root}>
      <div className={cx(styles.editor, invalid && styles.editorInvalid)}>
        {/* Нижний слой: цветной текст. aria-hidden — экранный диктор читает только textarea. */}
        <pre ref={highlightRef} className={styles.highlight} aria-hidden="true">
          {tokens.map((t, i) =>
            t.type === "space" ? (
              t.text
            ) : (
              <span
                key={i}
                className={cx(styles[t.type], inIssue(t) && styles.issue)}
              >
                {t.text}
              </span>
            ),
          )}
          {/* Лишний перенос строки: иначе пустая последняя строка в <pre> схлопывается
              и слои расходятся по высоте. */}
          {"\n"}
        </pre>

        {/* Верхний слой: настоящее поле ввода с прозрачным текстом. */}
        <textarea
          ref={textareaRef}
          id={id}
          className={styles.textarea}
          value={value}
          rows={3}
          spellCheck={false}
          autoComplete="off"
          placeholder={placeholder}
          disabled={disabled}
          role="combobox"
          aria-expanded={Boolean(ac)}
          aria-autocomplete="list"
          aria-invalid={invalid}
          aria-describedby={showIssues && issues.length ? issuesId : undefined}
          onChange={(e) => {
            onChange(e.target.value);
            setCaret(e.target.selectionStart);
            updateAutocomplete(e.target.value, e.target.selectionStart);
          }}
          onSelect={(e) => setCaret(e.target.selectionStart)}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setAc(null);
          }}
        />

        {ac && (
          <ul className={styles.autocomplete} role="listbox">
            {ac.items.map((item, index) => (
              <li
                key={`${item.kind}:${item.label}`}
                role="option"
                aria-selected={index === ac.active}
                className={cx(
                  styles.option,
                  index === ac.active && styles.optionActive,
                )}
                // mousedown + preventDefault: иначе textarea потеряет фокус раньше,
                // чем сработает click, и список закроется до выбора.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyCompletion(item)}
                onMouseEnter={() => setAc({ ...ac, active: index })}
              >
                <code className={cx(styles.optionLabel, styles[item.kind])}>
                  {item.label}
                </code>
                <span className={styles.optionDetail}>{item.detail}</span>
                <span className={styles.optionKind}>
                  {KIND_LABELS[item.kind]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {callSpec && !ac && (
        <div className={styles.callHint}>
          <FunctionInfo spec={callSpec} activeArg={call.argIndex} compact />
        </div>
      )}

      {showIssues && issues.length > 0 && (
        <ul id={issuesId} className={styles.issues} aria-live="polite">
          {issues.map((issue, i) => (
            <li key={`${issue.start}-${i}`}>
              <button
                type="button"
                className={cx(
                  styles.issueItem,
                  issue.severity === "warning" && styles.issueWarning,
                )}
                onClick={() => moveCaret(issue.start)}
                title="Перейти к месту ошибки"
              >
                <span>{issue.message}</span>
                <span className={styles.issuePos}>
                  символ {issue.start + 1}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default FormulaEditor;
