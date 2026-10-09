import { Fragment } from "react";
import { argumentSignature, argumentTypes } from "../../utils/formula/catalog";
import styles from "./FunctionInfo.module.css";

/**
 * Описание функции: сигнатура, назначение, аргументы, пример.
 * @param {object} props
 * @param {object} props.spec          функция из normalizeCatalog
 * @param {number} [props.activeArg]   индекс аргумента под курсором — подсвечивается
 * @param {boolean} [props.compact]    только сигнатура и описание
 */
export default function FunctionInfo({
  spec,
  activeArg = -1,
  compact = false,
}) {
  const args = spec.arguments ?? [];
  const lastIndex = args.length - 1;
  // Для math.max(a, b, c, ...) курсор может быть на 5-м аргументе,
  // а в описании он один — "...values". Подсвечиваем его.
  const highlighted =
    activeArg > lastIndex && args[lastIndex]?.variadic ? lastIndex : activeArg;

  return (
    <div className={styles.info}>
      <code className={styles.signature}>
        <span className={styles.signatureName}>{spec.publicName}</span>(
        {args.map((arg, i) => (
          <Fragment key={arg.name ?? i}>
            {i > 0 && ", "}
            <span className={i === highlighted ? styles.activeArg : undefined}>
              {argumentSignature(arg)}
            </span>
          </Fragment>
        ))}
        )
        {spec.returns && (
          <span className={styles.returns}>: {String(spec.returns)}</span>
        )}
      </code>

      {spec.description && (
        <p className={styles.infoText}>{spec.description}</p>
      )}

      {!compact && args.length > 0 && (
        <ul className={styles.args}>
          {args.map((arg, i) => (
            <li key={arg.name ?? i}>
              <code>{arg.name}</code>
              {argumentTypes(arg) && (
                <span className={styles.argType}> {argumentTypes(arg)}</span>
              )}
              {arg.description && <span> — {arg.description}</span>}
            </li>
          ))}
        </ul>
      )}

      {!compact && spec.example && (
        <p className={styles.infoText}>
          Пример: <code className={styles.example}>{spec.example}</code>
        </p>
      )}
    </div>
  );
}
