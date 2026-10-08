import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { LOWCODE_VERSION } from "../src/index.js";
import { Button, Chip, inputStyles } from "../src/ui";
import "./playground.css";

function Playground() {
  const [theme, setTheme] = useState("light");
  const [active, setActive] = useState("kW");

  // Тема контролов переключается атрибутом на <html> — так же будет делать приложение.
  useEffect(() => {
    document.documentElement.dataset.lcTheme = theme;
  }, [theme]);

  return (
    <main className="page">
      <div
        className="row"
        style={{ justifyContent: "space-between", marginBottom: 16 }}
      >
        <h1 style={{ margin: 0 }}>@sspti/lowcode — песочница</h1>
        <Button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
        </Button>
      </div>
      <p>Версия: {LOWCODE_VERSION}</p>

      <section className="card">
        <h2>Кнопки</h2>
        <div className="row">
          <Button>Обычная</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Недоступна</Button>
        </div>
      </section>

      <section className="card">
        <h2>Чипы</h2>
        <div className="row">
          {["%", "kW", "MW", "bar"].map((u) => (
            <Chip key={u} active={u === active} onClick={() => setActive(u)}>
              {u}
            </Chip>
          ))}
          <Chip mono>math.abs</Chip>
        </div>
      </section>

      <section className="card">
        <h2>Поля</h2>
        <div style={{ display: "grid", gap: 8, maxWidth: 360 }}>
          <input className={inputStyles.input} placeholder="Обычное поле" />
          <input
            className={`${inputStyles.input} ${inputStyles.invalid}`}
            defaultValue="Ошибка"
          />
          <input
            className={`${inputStyles.input} ${inputStyles.mono}`}
            defaultValue="boiler_power * 2"
          />
          <input
            className={inputStyles.input}
            disabled
            defaultValue="Недоступно"
          />
        </div>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Playground />
  </React.StrictMode>,
);
