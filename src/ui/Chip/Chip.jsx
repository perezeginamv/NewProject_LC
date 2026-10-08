import { cx } from "../../utils/cx";
import styles from "./Chip.module.css";

export default function Chip({ active, mono, className, ...props }) {
  return (
    <button
      type="button"
      className={cx(
        styles.chip,
        active && styles.active,
        mono && styles.mono,
        className,
      )}
      {...props}
    />
  );
}
