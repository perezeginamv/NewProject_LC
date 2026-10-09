import { normalizeCatalog } from "./catalog";

/**
 * Собирает всё, что нужно для анализа формулы.
 * @param {object} options
 * @param {object} [options.catalog]  ответ бэкенда /functions (или уже нормализованный каталог)
 * @param {Array<{code: string}>} [options.parameters]  параметры, на которые можно ссылаться (с бэкенда)
 * @param {string} [options.selfCode]  код редактируемого параметра — ссылка на него будет ошибкой
 */
export function createFormulaContext({
  catalog,
  parameters = [],
  selfCode,
} = {}) {
  // Каталог можно передать как есть с бэкенда или уже нормализованным.
  const normalized = catalog?.byName ? catalog : normalizeCatalog(catalog);
  return {
    catalog: normalized,
    parameters,
    selfCode,
    byName: normalized.byName,
    // Пока справочник функций не загружен, неизвестные функции не считаем ошибкой —
    // иначе при открытии формы на мгновение всё будет красным.
    catalogLoaded: normalized.functions.length > 0,
    tokenCtx: {
      functionNames: new Set(normalized.byName.keys()),
      paramCodes: new Set(parameters.map((p) => p.code)),
      constantNames: new Set(normalized.constants.map((c) => c.name)),
    },
  };
}
