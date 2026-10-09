import { useState } from "react";
import UomSelect from "../src/components/UomSelect/UomSelect";
import PeriodInput from "../src/components/PeriodInput/PeriodInput";
import ParameterTree from "../src/components/ParameterTree/ParameterTree";
import { formatPeriod } from "../src/utils/period";
import { Button } from "../src/ui";
import {
  units,
  unitQuickGroups,
  fakeLoadDependencies,
  currentValues,
} from "./mockData";

const renderMeta = (node) => currentValues[node.code] ?? null;
// ← объявлена ВНЕ компонента — стабильная функция, как и fakeLoadDependencies

export default function ControlsDemo() {
  const [unit, setUnit] = useState("kilowatt");
  const [unitValid, setUnitValid] = useState(true);
  const [seconds, setSeconds] = useState(3600);
  const [root, setRoot] = useState("avg_power_1h");
  const [unitsLoaded, setUnitsLoaded] = useState(true);

  return (
    <>
      <section className="card">
        <h2>UomSelect (шаг 7)</h2>
        <div style={{ maxWidth: 420 }}>
          <UomSelect
            value={unit}
            onChange={setUnit}
            units={unitsLoaded ? units : undefined}
            // ← переключателем ниже имитируем «бэкенд ещё не ответил»
            quickGroups={unitQuickGroups}
            onValidityChange={setUnitValid}
          />
        </div>
        <p>
          Значение: <code>{String(unit)}</code> · поле{" "}
          {unitValid ? "валидно" : "НЕвалидно"}
        </p>
        <Button onClick={() => setUnitsLoaded((v) => !v)}>
          {unitsLoaded
            ? "Имитировать: справочник не загружен"
            : "Вернуть справочник"}
        </Button>
      </section>

      <section className="card">
        <h2>PeriodInput (шаг 7)</h2>
        <div style={{ maxWidth: 320 }}>
          <PeriodInput seconds={seconds} onChange={setSeconds} />
        </div>
        <p>
          Секунды: <code>{String(seconds)}</code> · в таблице:{" "}
          {formatPeriod(seconds)}
        </p>
        <div className="row">
          {/* ↑ проверяем, что внешнее изменение значения обновляет поля */}
          <Button onClick={() => setSeconds(86400)}>Подставить 1 день</Button>
          <Button onClick={() => setSeconds(5400)}>Подставить 90 минут</Button>
        </div>
      </section>

      <section className="card">
        <h2>ParameterTree (шаг 7)</h2>
        <div className="row" style={{ marginBottom: 12 }}>
          {["avg_power_1h", "cycle_a", "broken"].map((code) => (
            <Button key={code} onClick={() => setRoot(code)}>
              {code}
            </Button>
          ))}
        </div>
        <ParameterTree
          root={{ code: root }}
          loadDependencies={fakeLoadDependencies}
          renderMeta={renderMeta}
        />
      </section>
    </>
  );
}
