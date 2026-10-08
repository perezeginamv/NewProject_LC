import React from "react";
import ReactDOM from "react-dom/client";
// Песочница берёт код прямо из src/, а не из dist/:
// изменения видны сразу, без пересборки.
import { LOWCODE_VERSION } from "../src/index.js";

function Playground() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>lowcode — песочница</h1>
      <p>Версия: {LOWCODE_VERSION}</p>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Playground />
  </React.StrictMode>,
);
