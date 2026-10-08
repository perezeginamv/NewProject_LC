import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Один конфиг на два режима:
//   npm run dev   → песочница playground/ для разработки контролов
//   npm run build → сборка библиотеки в dist/
export default defineConfig(({ command, mode }) => ({
  plugins: [react()],

  // В режиме разработки открываем песочницу.
  root: command === "serve" && mode !== "test" ? "playground" : ".",

  css: {
    modules: {
      // Классы вида lc_FormulaEditor__textarea__a1b2c — не пересекаются со стилями приложения.
      generateScopedName: "lc_[name]__[local]__[hash:base64:5]",
    },
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    cssCodeSplit: false, // все стили → один dist/style.css
    lib: {
      entry: "src/index.js",
      formats: ["es"],
      fileName: () => "index.js",
      cssFileName: "style",
    },
    rollupOptions: {
      // React не вшиваем в сборку — его даст приложение.
      external: ["react", "react-dom", "react/jsx-runtime"],
    },
  },
  test: {
    include: ["src/**/*.test.js"],
  },
}));
