/**
 * Button - the single button primitive used across the application.
 */

import { forwardRef } from "react";

/**
 * @param {object} props
 * @param {"primary"|"secondary"|"ghost"|"soft"|"danger"|"danger-ghost"} [props.variant]
 * @param {"sm"|"md"|"lg"} [props.size]
 * @param {boolean} [props.loading] Show a spinner and block interaction.
 * @param {boolean} [props.block] Stretch to the width of the container.
 * @param {boolean} [props.iconOnly] Render as a square icon button.
 */
const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    block = false,
    iconOnly = false,
    className = "",
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref,
) {
  const classes = [
    "btn",
    `btn--${variant}`,
    size !== "md" ? `btn--${size}` : "",
    block ? "btn--block" : "",
    iconOnly ? "btn--icon" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
});

export default Button;
