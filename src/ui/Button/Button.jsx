import { cx } from "../../utils/cx";
import styles from "./Button.module.css";

// variant: secondary | ghost
export default function Button({
  variant = "secondary",
  type = "button",
  className,
  ...props
}) {
  return (
    <button
      type={type}
      className={cx(styles.button, styles[variant], className)}
      {...props}
    />
  );
}
