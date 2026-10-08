// Базовые элементы, из которых собраны контролы библиотеки.
// Это ЕДИНСТВЕННОЕ место, где их нужно будет заменить на @sspti/library, например:
//   export { Button } from '@sspti/library';
// Остальной код библиотеки импортирует Button и Chip только отсюда.
export { default as Button } from "./Button/Button";
export { default as Chip } from "./Chip/Chip";
export { default as inputStyles } from "./Input/Input.module.css";
