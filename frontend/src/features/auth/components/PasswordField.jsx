/**
 * PasswordField - a password input with a visibility toggle and an optional
 * strength meter.
 */

import { useMemo, useState } from "react";
import { FiEye, FiEyeOff, FiLock } from "react-icons/fi";

import { evaluatePassword } from "../../../core/auth/validation.js";
import { Field, Input } from "../../../shared/components/Field.jsx";

/**
 * @param {object} props
 * @param {string} props.label
 * @param {string} props.value
 * @param {(event: import('react').ChangeEvent<HTMLInputElement>) => void} props.onChange
 * @param {string} [props.error]
 * @param {boolean} [props.showStrength] Render the strength meter.
 * @param {string} [props.autoComplete]
 */
export default function PasswordField({
  label = "Password",
  value,
  onChange,
  error,
  hint,
  required = false,
  showStrength = false,
  autoComplete = "current-password",
  placeholder = "Enter your password",
  id,
  onKeyDown,
  testId,
}) {
  const [revealed, setRevealed] = useState(false);
  const strength = useMemo(() => evaluatePassword(value), [value]);

  const strengthClass = ["weak", "fair", "good", "strong"][Math.max(0, strength.score - 1)];

  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} required={required}>
      {({ id: fieldId }) => (
        <>
          <Input
            id={fieldId}
            type={revealed ? "text" : "password"}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            autoComplete={autoComplete}
            invalid={Boolean(error)}
            required={required}
            data-testid={testId}
            icon={<FiLock size={16} />}
            action={
              <button
                type="button"
                className="input-group__action"
                onClick={() => setRevealed((current) => !current)}
                aria-label={revealed ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {revealed ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            }
          />

          {showStrength ? (
            <div className="auth-strength">
              <div className="auth-strength__track" aria-hidden="true">
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={`auth-strength__segment ${
                      strength.score >= step ? `auth-strength__segment--active-${strengthClass}` : ""
                    }`.trim()}
                  />
                ))}
              </div>
              <span className="auth-strength__label">
                Password strength: {strength.label}
                {strength.requirements.some((item) => !item.met)
                  ? ` - needs ${strength.requirements
                      .filter((item) => !item.met)
                      .map((item) => item.label.toLowerCase())
                      .join(", ")}`
                  : " - great"}
              </span>
            </div>
          ) : null}
        </>
      )}
    </Field>
  );
}
