import { useMemo, useState } from "react";
import { PUNCTUATION } from "../../utils/formula/constants";
import { normalizeCatalog } from "../../utils/formula/catalog";
import { cx } from "../../utils/cx";
import { Chip, inputStyles } from "../../ui";
import FunctionInfo from "../FormulaEditor/FunctionInfo";
import styles from "./FormulaPalette.module.css";

const TABS = [
  { id: "functions", label: "Функции" },
  { id: "params", label: "Параметры" },
  { id: "operators", label: "Операторы" },
];
const EMPTY = [];

/**
 * Справочник для формулы. Клик по элементу вызывает onInsert(text, caretOffset).
 * @param {object} props
 * @param {(text: string, caretOffset?: number) => void} props.onInsert
 * @param {object} [props.catalog]     ответ /functions или уже нормализованный каталог
 * @param {Array<{code, name?, hint?}>} [props.parameters]  hint — например, текущее значение
 * @param {string} [props.selfCode]    этот параметр не показываем
 */
export default function FormulaPalette({
  onInsert,
  catalog,
  parameters = EMPTY,
  selfCode,
}) {
  const [tab, setTab] = useState("functions");
  // ← какая вкладка открыта. Состояние ВНУТРИ справочника: приложению это знать не нужно

  const normalized = useMemo(
    () => (catalog?.byName ? catalog : normalizeCatalog(catalog)),
    [catalog],
  );
  // ← принимаем и сырой ответ бэкенда, и уже обработанный каталог.
  //   FormulaStudio передаст обработанный, чтобы не делать работу дважды

  return (
    <div className={styles.palette}>
      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={cx(styles.tab, tab === t.id && styles.tabActive)}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.tabPanel} role="tabpanel">
        {/* Рисуем только открытую вкладку */}
        {tab === "functions" && (
          <FunctionLibrary catalog={normalized} onInsert={onInsert} />
        )}
        {tab === "params" && (
          <ParameterList
            parameters={parameters}
            selfCode={selfCode}
            onInsert={onInsert}
          />
        )}
        {tab === "operators" && (
          <OperatorList catalog={normalized} onInsert={onInsert} />
        )}
      </div>
    </div>
  );
}

// ---------- Вкладка «Функции» ----------
function FunctionLibrary({ catalog, onInsert }) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(() => new Set());
  // ← какие модули свёрнуты. Set id-шников: 'math', 'logic'...
  //   () => new Set() — «ленивое» начальное значение: создаётся один раз, а не при каждом рендере
  const [hovered, setHovered] = useState(null);
  // ← функция под мышкой — её описание показываем внизу

  const q = search.trim().toLowerCase();

  // Модули с отфильтрованными функциями. Пересчёт — только при смене каталога или строки поиска.
  const modules = useMemo(() => {
    if (!q) return catalog.namespaces;
    return catalog.namespaces
      .map((ns) => ({
        ...ns,
        functions: ns.functions.filter((f) =>
          [f.publicName, f.description, ...(f.aliases ?? [])].some(
            (s) => s && s.toLowerCase().includes(q),
          ),
        ),
        // ← ищем по имени, описанию и алиасам: «округ» найдёт math.round по описанию
      }))
      .filter((ns) => ns.functions.length > 0);
    // ← модули, где ничего не нашлось, прячем
  }, [catalog.namespaces, q]);

  function toggleModule(id) {
    setCollapsed((prev) => {
      const next = new Set(prev); // ← копия: state не меняем на месте
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!catalog.functions.length)
    return <p className={styles.muted}>Справочник функций пуст</p>;
  // ← бэкенд ещё не ответил или вернул пустой список — честно об этом говорим

  return (
    <div className={styles.library}>
      <input
        type="search"
        className={inputStyles.input}
        placeholder="Найти функцию"
        aria-label="Поиск функции"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className={styles.modules}>
        {modules.length === 0 && (
          <p className={styles.muted}>Ничего не найдено</p>
        )}
        {modules.map((ns) => {
          const expanded = Boolean(q) || !collapsed.has(ns.id);
          // ← во время поиска все модули раскрыты: иначе найденное могло бы прятаться в свёрнутом
          return (
            <div key={ns.id}>
              <button
                type="button"
                className={styles.moduleHeader}
                aria-expanded={expanded}
                onClick={() => toggleModule(ns.id)}
              >
                <span className={styles.moduleArrow} aria-hidden="true">
                  {expanded ? "▾" : "▸"}
                </span>
                {ns.title}
                <span className={styles.moduleCount}>
                  {ns.functions.length}
                </span>
              </button>
              {expanded && (
                <div className={styles.chips}>
                  {ns.functions.map((fn) => (
                    <Chip
                      key={fn.publicName}
                      mono
                      onClick={() =>
                        onInsert(`${fn.publicName}()`, fn.publicName.length + 1)
                      }
                      // ← вставляем со скобками, курсор — внутрь скобок
                      onMouseEnter={() => setHovered(fn)}
                      onFocus={() => setHovered(fn)}
                      // ← onFocus: описание видно и при навигации с клавиатуры (Tab)
                    >
                      {fn.publicName}
                    </Chip>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.infoPanel}>
        {hovered ? (
          <FunctionInfo spec={hovered} />
        ) : (
          // ← полный вид (без compact): аргументы, типы, пример
          <p className={styles.muted}>
            Наведите на функцию, чтобы увидеть описание. Клик вставляет её в
            формулу.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------- Вкладка «Параметры» ----------
function ParameterList({ parameters, selfCode, onInsert }) {
  const [search, setSearch] = useState("");

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (
      parameters
        .filter((p) => p.code !== selfCode)
        // ← себя не предлагаем
        .filter(
          (p) =>
            !q ||
            [p.code, p.name].some((s) => s && s.toLowerCase().includes(q)),
        )
    );
    // ← поиск по коду и по названию: «котл» найдёт boiler_power
  }, [parameters, selfCode, search]);

  return (
    <div className={styles.library}>
      <input
        type="search"
        className={inputStyles.input}
        placeholder="Найти параметр"
        aria-label="Поиск параметра"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {list.length === 0 && (
        <p className={styles.muted}>Нет подходящих параметров</p>
      )}
      <ul className={styles.paramList}>
        {list.map((p) => (
          <li key={p.code}>
            <button
              type="button"
              className={styles.paramItem}
              onClick={() => onInsert(p.code)}
            >
              <code className={styles.paramCode}>{p.code}</code>
              <span className={styles.paramName}>{p.name}</span>
              {p.hint && <span className={styles.paramValue}>{p.hint}</span>}
              {/* ↑ hint готовит приложение: например, текущее значение «1 250,5 кВт».
                    Библиотека не знает про значения и единицы — просто показывает строку */}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Вкладка «Операторы» ----------
function OperatorList({ catalog, onInsert }) {
  return (
    <div className={styles.library}>
      <div className={styles.groupTitle}>Операторы</div>
      <div className={styles.chips}>
        {catalog.operators.map((op) => (
          <Chip
            key={op.symbol}
            mono
            title={op.title}
            onClick={() => onInsert(` ${op.symbol} `)}
          >
            {/* ↑ оператор вставляем с пробелами вокруг: 'a + b', а не 'a+b' */}
            {op.symbol}
          </Chip>
        ))}
        {PUNCTUATION.map((symbol) => (
          <Chip
            key={symbol}
            mono
            onClick={() => onInsert(symbol === "," ? ", " : symbol)}
          >
            {symbol}
          </Chip>
        ))}
      </div>

      {catalog.constants.length > 0 && (
        <>
          <div className={styles.groupTitle}>Константы</div>
          <div className={styles.chips}>
            {catalog.constants.map((c) => (
              <Chip
                key={c.name}
                mono
                title={c.description ?? ""}
                onClick={() => onInsert(c.name)}
              >
                {c.name}
              </Chip>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
