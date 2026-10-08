// Тестовые данные в формате ответов бэкенда — только для песочницы.

// GET /functions
export const functionsCatalog = {
  scalar: [
    {
      name: "abs",
      namespace: "math",
      description: "Модуль числа",
      arguments: [{ name: "x", accepted_types: ["number"] }],
      returns: "number",
      example: "math.abs(delta)",
    },
    {
      name: "round",
      namespace: "math",
      description: "Округление до digits знаков",
      arguments: [
        { name: "x", accepted_types: ["number"] },
        { name: "digits", required: false, default: 0 },
      ],
      returns: "number",
      example: "math.round(useful_power, 1)",
    },
    {
      name: "max",
      namespace: "math",
      description: "Максимум из аргументов",
      arguments: [{ name: "values", variadic: true }],
      returns: "number",
    },
    {
      name: "if",
      namespace: "logic",
      description: "Если условие истинно — then, иначе else",
      arguments: [{ name: "cond" }, { name: "then" }, { name: "else" }],
      example: "logic.if(efficiency > 90, 1, 0)",
    },
  ],
  aggregation: [
    {
      name: "avg",
      namespace: "series",
      description: "Среднее значение параметра за окно",
      arguments: [
        { name: "param" },
        { name: "window_seconds", accepted_types: ["int"] },
      ],
      returns: "number",
      example: "series.avg(useful_power, 3600)",
    },
  ],
  constants: [{ name: "PI", description: "Число π" }],
};

// GET /parameters (только нужные контролам поля)
export const parameters = [
  { code: "boiler_power", name: "Мощность котла", hint: "1 250,5 кВт" },
  { code: "efficiency", name: "КПД", hint: "92,3 %" },
  { code: "useful_power", name: "Полезная мощность", hint: "1 154,2 кВт" },
];

// GET /units
export const units = [
  { unit_api: "percent", title: "%", name: "Процент", aliases: ["pct"] },
  {
    unit_api: "kilowatt",
    title: "кВт",
    name: "Киловатт",
    aliases: ["kw", "квт"],
  },
  { unit_api: "megawatt", title: "МВт", name: "Мегаватт", aliases: ["mw"] },
  { unit_api: "bar", title: "бар", name: "Бар", aliases: [] },
  {
    unit_api: "degree_celsius",
    title: "°C",
    name: "Градус Цельсия",
    aliases: ["celsius"],
  },
];
