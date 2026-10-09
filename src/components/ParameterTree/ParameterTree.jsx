import TreeNode from "./TreeNode";
import styles from "./ParameterTree.module.css";

/**
 * Дерево зависимостей параметра с ленивой загрузкой узлов.
 * @param {{code, name?, isRaw?}} props.root
 * @param {(code: string) => Promise<Array>} props.loadDependencies   запрос делает приложение
 * @param {(node) => React.ReactNode} [props.renderMeta]                правая часть строки
 * @param {boolean} [props.defaultExpanded=true]
 */
export default function ParameterTree({
  root,
  loadDependencies,
  renderMeta,
  defaultExpanded = true,
}) {
  return (
    <ul className={styles.tree}>
      <TreeNode
        key={root.code}
        // ← key: выбрали другой корень — React создаст узел ЗАНОВО, со сброшенным состоянием.
        //   Без этого новое дерево унаследовало бы «уже загружено» от старого
        node={root}
        path={[]}
        // ← путь от корня до узла: нужен, чтобы заметить зацикливание
        loadDependencies={loadDependencies}
        renderMeta={renderMeta}
        defaultExpanded={defaultExpanded}
      />
    </ul>
  );
}
