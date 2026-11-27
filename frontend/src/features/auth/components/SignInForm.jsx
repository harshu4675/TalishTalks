/**
 * SignInForm - the email/username + password sign-in form.
 */

import { useState } from "react";
import { FiAlertCircle, FiAtSign } from "react-icons/fi";

import { useAuth } from "../../../core/auth/useAuth.js";
import { validateSignIn } from "../../../core/auth/validation.js";
import { errorMessage } from "../../../core/utils/errors.js";
import Button from "../../../shared/components/Button.jsx";
import { Field, Input } from "../../../shared/components/Field.jsx";
import PasswordField from "./PasswordField.jsx";

/**
 * @param {object} props
 * @param {() => void} props.onSwitchMode Switch to the sign-up form.
 */
export default function SignInForm({ onSwitchMode }) {
  const { login, isSubmitting } = useAuth();

  const [values, setValues] = useState({ identifier: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);

  const update = (field) => (event) => {
    const { value } = event.target;
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
    setFormError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateSignIn(values);
    setErrors(validation);
    if (Object.keys(validation).length) return;

    try {
      await login(values);
    } catch (caught) {
      setFormError(errorMessage(caught));
    }
  };

  return (
    <form className="auth-card__form" onSubmit={handleSubmit} noValidate data-testid="sign-in-form">
      {formError ? (
        <div className="callout callout--error" role="alert" data-testid="sign-in-error">
          <FiAlertCircle className="callout__icon" size={17} />
          <span>{formError}</span>
        </div>
      ) : null}

      <Field label="Email or username" error={errors.identifier} required>
        {({ id }) => (
          <Input
            id={id}
            name="identifier"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            value={values.identifier}
            onChange={update("identifier")}
            invalid={Boolean(errors.identifier)}
            icon={<FiAtSign size={16} />}
            required
            data-testid="sign-in-identifier"
          />
        )}
      </Field>

      <PasswordField
        label="Password"
        value={values.password}
        onChange={update("password")}
        error={errors.password}
        autoComplete="current-password"
        placeholder="Your password"
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        id="sign-in-password"
        testId="sign-in-password"
      />

      <Button type="submit" block size="lg" loading={isSubmitting} data-testid="sign-in-submit">
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>

      <p className="auth-switch">
        New to Talish Talks?{" "}
        <button type="button" className="auth-switch__link" onClick={onSwitchMode}>
          Create an account
        </button>
      </p>
    </form>
  );
}
