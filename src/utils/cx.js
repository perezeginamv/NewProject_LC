// Склеивает CSS-классы, пропуская пустые значения:
// cx(styles.chip, isActive && styles.active) → "chip active" или "chip"
export const cx = (...classes) => classes.filter(Boolean).join(" ");
