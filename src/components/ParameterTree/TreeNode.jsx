import { useEffect, useRef, useState } from "react";
import { cx } from "../../utils/cx";
import styles from "./ParameterTree.module.css";

// Зависимость с бэкенда → единый вид. Понимает и строки, и объекты, и snake_case.
export function normalizeDependency(d) {
  if (typeof d === "string") return { code: d };
  return {
    code: d.code,
    name: d.name,
    isRaw: d.isRaw ?? d.is_raw,
    isAggregation: d.isAggregation ?? d.is_aggregation ?? d.aggregation,
  };
}

function normalizeList(data) {
  const list = Array.isArray(data)
    ? data
    : (data?.dependencies ?? data?.items ?? []);
  // ← бэкенд может вернуть массив или объект { dependencies: [...] } — понимаем оба
  return list.map(normalizeDependency);
}

export default function TreeNode({
  node,
  path,
  loadDependencies,
  renderMeta,
  defaultExpanded = false,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  // ← раскрыт ли узел
  const [state, setState] = useState({
    status: "idle",
    items: [],
    error: null,
  });
  // ← состояние загрузки детей: idle (не грузили) | loading | done | error
  const loadedRef = useRef(false);
  // ← «уже загружено». ref, а не state: от него не зависит картинка, он только
  //   не даёт загрузить второй раз при повторном раскрытии

  const { code, name, isRaw, isAggregation } = node;
  const isCycle = path.includes(code);
  // ← этот параметр уже встречался выше по ветке → зацикливание (A → B → A)
  const canExpand = !isRaw && !isCycle;
  // ← у «ввода вручную» нет формулы, а значит, и детей; цикл не раскрываем — иначе бесконечное дерево

  useEffect(() => {
    if (!expanded || !canExpand || loadedRef.current) return undefined;
    // ← загружаем, только если узел раскрыт, может иметь детей и ещё не загружен

    let cancelled = false;
    // ← флаг «результат больше не нужен» (узел закрыли или он исчез, пока шёл запрос)

    setState({ status: "loading", items: [], error: null });
    Promise.resolve(loadDependencies(code))
      // ← Promise.resolve — на случай, если приложение вернёт не промис, а сразу массив
      .then((data) => {
        if (cancelled) return;
        loadedRef.current = true;
        setState({ status: "done", items: normalizeList(data), error: null });
      })
      .catch((e) => {
        if (!cancelled)
          setState({
            status: "error",
            items: [],
            error: e?.message ?? String(e),
          });
        // ← ошибку показываем в дереве. loadedRef не ставим — при следующем раскрытии попробуем снова
      });

    return () => {
      cancelled = true;
      // ← «уборка»: React вызовет её, если узел закроют или удалят до ответа сервера.
      //   Тогда поздний ответ просто проигнорируется
    };
  }, [expanded, canExpand, code, loadDependencies]);

  const badge = isCycle
    ? "цикл"
    : isRaw
      ? "ввод вручную"
      : isAggregation
        ? "агрегация"
        : "формула";

  return (
    <li className={styles.node}>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setExpanded((v) => !v)}
          disabled={!canExpand}
          aria-expanded={canExpand ? expanded : undefined}
          aria-label={expanded ? `Свернуть ${code}` : `Развернуть ${code}`}
        >
          {canExpand ? (expanded ? "▾" : "▸") : "•"}
          {/* ↑ можно раскрыть — стрелка; лист дерева — точка */}
        </button>
        <code className={styles.code}>{code}</code>
        {name && <span className={styles.name}>{name}</span>}
        <span className={cx(styles.badge, isCycle && styles.badgeError)}>
          {badge}
        </span>
        {renderMeta && <span className={styles.meta}>{renderMeta(node)}</span>}
        {/* ↑ правую часть рисует приложение: дерево не знает про значения */}
      </div>

      {expanded && canExpand && (
        <ul className={styles.children}>
          {state.status === "loading" && (
            <li className={styles.muted}>Загрузка…</li>
          )}
          {state.status === "error" && (
            <li className={styles.error}>
              Не удалось загрузить зависимости: {state.error}
            </li>
          )}
          {state.status === "done" && state.items.length === 0 && (
            <li className={styles.muted}>
              Формула не ссылается на другие параметры
            </li>
          )}
          {state.items.map((dep) => (
            <TreeNode
              key={dep.code}
              node={dep}
              path={[...path, code]}
              // ← детям передаём путь, дополненный текущим узлом
              loadDependencies={loadDependencies}
              renderMeta={renderMeta}
            />
            // ← TreeNode рисует TreeNode — это рекурсия: дерево любой глубины одним компонентом
          ))}
        </ul>
      )}
    </li>
  );
}
