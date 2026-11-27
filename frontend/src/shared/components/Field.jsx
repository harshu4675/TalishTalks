/**
 * Form field primitives: label, hint, error text and the input itself.
 */

import { forwardRef, useId } from "react";

/**
 * A labelled form control with optional hint and error text.
 */
export const Field = function Field({
  label,
  hint,
  error,
  htmlFor,
  required = false,
  className = "",
  children,
}) {
  const generatedId = useId();
  const id = htmlFor || generatedId;

  return (
    <div className={`field ${className}`.trim()}>
      {label ? (
        <label className="field__label" htmlFor={id}>
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </label>
      ) : null}
      {typeof children === "function" ? children({ id, describedBy: error ? `${id}-error` : undefined }) : children}
      {hint && !error ? (
        <span className="field__hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="field__error" id={`${id}-error`} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
};

/**
 * A text input. The `invalid` flag adds the error styling.
 */
export const Input = forwardRef(function Input(
  { invalid = false, className = "", icon, action, ...rest },
  ref,
) {
  if (icon || action) {
    return (
      <div className={`input-group ${action ? "input-group--with-action" : ""}`.trim()}>
        {icon ? (
          <span className="input-group__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <input
          ref={ref}
          className={`input ${invalid ? "input--invalid" : ""} ${className}`.trim()}
          aria-invalid={invalid || undefined}
          {...rest}
        />
        {action ? <span className="input-group__action">{action}</span> : null}
      </div>
    );
  }

  return (
    <input
      ref={ref}
      className={`input ${invalid ? "input--invalid" : ""} ${className}`.trim()}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});

/** A multi-line input styled to match the single-line variant. */
export const Textarea = forwardRef(function Textarea(
  { invalid = false, className = "", ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={`input ${invalid ? "input--invalid" : ""} ${className}`.trim()}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});

export default Field;
