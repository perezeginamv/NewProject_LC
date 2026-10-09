import { useEffect, useId, useMemo, useRef, useState } from "react";
import { filterUnits, findExactUnit, normalizeUnits } from "../../utils/units";
import { cx } from "../../utils/cx";
import { Chip, inputStyles } from "../../ui";
import styles from "./UomSelect.module.css";

const MAX_OPTIONS = 50; // ← больше 50 вариантов в списке не показываем — всё равно никто не листает
const EMPTY = [];

/**
 * Выбор единицы измерения. Справочник приходит с бэкенда через props.units.
 */
export default function UomSelect({
  value,
  onChange,
  units: unitsProp = EMPTY,
  quickGroups = EMPTY,
  onValidityChange,
  id,
  placeholder = "Например: кВт, %, м³/ч",
  disabled = false,
}) {
  const units = useMemo(() => normalizeUnits(unitsProp), [unitsProp]);
  // ← ответ бэкенда → единый формат. Пересчёт — только когда пришёл новый справочник

  const listId = useId();
  // ← уникальный id списка, чтобы связать его с полем (aria-controls)
  const inputRef = useRef(null);
  // ← поле — чтобы вернуть в него фокус после очистки
  const listRef = useRef(null);
  // ← список — чтобы прокрутить к подсвеченному варианту

  const selected = useMemo(
    () => units.find((u) => u.token === value) ?? null,
    [units, value],
  );
  // ← выбранная единица целиком (с подписью), или null

  const [query, setQuery] = useState(selected?.title ?? value ?? "");
  // ← текст в поле. Начальный: подпись выбранной единицы,
  //   а если справочник ещё не пришёл — хотя бы код
  const [open, setOpen] = useState(false);
  // ← открыт ли выпадающий список
  const [active, setActive] = useState(0);
  // ← какой вариант подсвечен (для стрелок)

  // Выбранная единица изменилась снаружи (форма подставила значение, пришёл справочник) —
  // показываем её подпись в поле.
  useEffect(() => {
    if (selected) setQuery(selected.title);
  }, [selected]);

  const options = useMemo(() => {
    const q = selected && query === selected.title ? "" : query;
    // ← в поле подпись уже выбранной единицы → показываем ВЕСЬ список, а не только её.
    //   Иначе после выбора «кВт» при открытии списка была бы одна строка
    return filterUnits(units, q).slice(0, MAX_OPTIONS);
  }, [units, query, selected]);

  // Подсвеченный вариант всегда в зоне видимости при листании стрелками.
  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function choose(unit) {
    onChange(unit.token); // ← наружу — КОД
    onValidityChange?.(true);
    setQuery(unit.title); // ← в поле — ПОДПИСЬ
    setOpen(false);
  }

  function clear() {
    onChange(null);
    onValidityChange?.(true); // ← пустое поле — это валидно (единица необязательна)
    setQuery("");
    inputRef.current?.focus();
  }

  function handleInput(text) {
    setQuery(text);
    setOpen(true);
    setActive(0);
    if (!text.trim()) {
      onChange(null);
      onValidityChange?.(true);
      return;
    }
    const exact = findExactUnit(units, text);
    onChange(exact?.token ?? null);
    // ← текст точно совпал с единицей — сразу выбираем её; нет — значение null
    onValidityChange?.(Boolean(exact));
    // ← и сообщаем форме: валидно ли поле
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      // ← стрелка вниз открывает закрытый список
      else setActive((i) => Math.min(i + 1, options.length - 1));
      // ← не уходим за последний вариант
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && options[active]) {
      e.preventDefault();
      // ← Enter не отправит форму, а выберет вариант
      choose(options[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      // ← закрываем только список, форма по этому Escape не закроется
      setOpen(false);
    }
  }

  const unknownText = query.trim() && !findExactUnit(units, query);
  // ← в поле что-то написано, но такой единицы нет → красная рамка

  return (
    <div className={styles.wrapper}>
      <div className={styles.combo}>
        <input
          ref={inputRef}
          id={id}
          className={cx(inputStyles.input, unknownText && inputStyles.invalid)}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={Boolean(unknownText)}
          autoComplete="off"
          placeholder={placeholder}
          disabled={disabled}
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          // ← встали в поле — сразу показываем список
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
        />

        {query && !disabled && (
          <button
            type="button"
            className={styles.clear}
            onClick={clear}
            aria-label="Очистить единицу"
          >
            ×
          </button>
        )}

        {open && !disabled && (
          <ul ref={listRef} id={listId} role="listbox" className={styles.menu}>
            {units.length === 0 && (
              <li className={styles.empty}>Справочник единиц не загружен</li>
            )}
            {/* ↑ бэкенд ещё не ответил или вернул пусто — так и говорим */}
            {units.length > 0 && options.length === 0 && (
              <li className={styles.empty}>Совпадений нет</li>
            )}
            {options.map((unit, index) => (
              <li
                key={unit.token}
                role="option"
                aria-selected={index === active}
                className={cx(
                  styles.option,
                  index === active && styles.optionActive,
                )}
                onMouseDown={(e) => e.preventDefault()}
                // ← тот же приём, что в редакторе формулы: клик не забирает фокус у поля
                onClick={() => choose(unit)}
                onMouseEnter={() => setActive(index)}
              >
                <span className={styles.optionTitle}>{unit.title}</span>
                {unit.name && (
                  <span className={styles.optionName}>{unit.name}</span>
                )}
                <code className={styles.optionToken}>{unit.token}</code>
              </li>
            ))}
          </ul>
        )}
      </div>

      {quickGroups.length > 0 && (
        <div className={styles.quick}>
          {quickGroups.map((group) => {
            const groupUnits = group.tokens
              .map((t) => units.find((u) => u.token === t))
              .filter(Boolean);
            // ← по кодам из группы находим единицы в справочнике. Каких нет в справочнике — пропускаем
            if (!groupUnits.length) return null;
            return (
              <div key={group.title} className={styles.quickGroup}>
                <span className={styles.quickTitle}>{group.title}:</span>
                {groupUnits.map((unit) => (
                  <Chip
                    key={unit.token}
                    active={unit.token === value}
                    // ← выбранная единица подсвечена
                    title={unit.name || unit.token}
                    disabled={disabled}
                    onClick={() => choose(unit)}
                  >
                    {unit.title}
                  </Chip>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
