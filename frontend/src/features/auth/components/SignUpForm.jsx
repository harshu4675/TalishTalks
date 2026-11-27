/**
 * SignUpForm - the registration form.
 *
 * The form validates locally, checks the username against the server as it is
 * typed, and surfaces the server's own messages when a submission is rejected.
 */

import { useEffect, useRef, useState } from "react";
import { FiAlertCircle, FiAtSign, FiCheckCircle, FiUser } from "react-icons/fi";

import { useAuth } from "../../../core/auth/useAuth.js";
import { checkUsername } from "../../../core/auth/authService.js";
import { validateSignUp } from "../../../core/auth/validation.js";
import { errorMessage } from "../../../core/utils/errors.js";
import Button from "../../../shared/components/Button.jsx";
import { Field, Input } from "../../../shared/components/Field.jsx";
import PasswordField from "./PasswordField.jsx";

/**
 * @param {object} props
 * @param {() => void} props.onSwitchMode Switch to the sign-in form.
 */
export default function SignUpForm({ onSwitchMode }) {
  const { register, isSubmitting } = useAuth();

  const [values, setValues] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [usernameState, setUsernameState] = useState("idle");

  const usernameTimer = useRef(null);

  /* Ask the server whether the username is free, but only once the shopper
     has typed enough to make the question meaningful. */
  useEffect(() => {
    const handle = (username) => {
      if (usernameTimer.current) clearTimeout(usernameTimer.current);

      if (username.length < 3) {
        setUsernameState("idle");
        return;
      }

      setUsernameState("checking");
      usernameTimer.current = setTimeout(async () => {
        try {
          const available = await checkUsername(username);
          setUsernameState(available ? "available" : "taken");
        } catch {
          setUsernameState("idle");
        }
      }, 450);
    };

    handle(values.username.trim());
    return () => usernameTimer.current && clearTimeout(usernameTimer.current);
  }, [values.username]);

  const update = (field) => (event) => {
    const { value } = event.target;
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
    setFormError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateSignUp(values);
    setErrors(validation);
    if (Object.keys(validation).length) return;

    try {
      await register(values);
    } catch (caught) {
      setFormError(errorMessage(caught));
    }
  };

  return (
    <form className="auth-card__form" onSubmit={handleSubmit} noValidate data-testid="sign-up-form">
      {formError ? (
        <div className="callout callout--error" role="alert" data-testid="sign-up-error">
          <FiAlertCircle className="callout__icon" size={17} />
          <span>{formError}</span>
        </div>
      ) : null}

      <Field label="Full name" error={errors.fullName} required>
        {({ id }) => (
          <Input
            id={id}
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="Aria Sharma"
            value={values.fullName}
            onChange={update("fullName")}
            invalid={Boolean(errors.fullName)}
            icon={<FiUser size={16} />}
            required
            data-testid="sign-up-fullname"
          />
        )}
      </Field>

      <Field
        label="Username"
        error={errors.username}
        hint={
          usernameState === "available"
            ? "This username is available."
            : usernameState === "taken"
              ? "This username is already taken."
              : "Letters, numbers and underscores."
        }
        required
      >
        {({ id }) => (
          <Input
            id={id}
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="aria.sharma"
            value={values.username}
            onChange={update("username")}
            invalid={Boolean(errors.username) || usernameState === "taken"}
            icon={<FiAtSign size={16} />}
            required
            data-testid="sign-up-username"
          />
        )}
      </Field>

      <Field label="Email address" error={errors.email} required>
        {({ id }) => (
          <Input
            id={id}
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            value={values.email}
            onChange={update("email")}
            invalid={Boolean(errors.email)}
            required
            data-testid="sign-up-email"
          />
        )}
      </Field>

      <PasswordField
        label="Password"
        value={values.password}
        onChange={update("password")}
        error={errors.password}
        autoComplete="new-password"
        placeholder="Create a password"
        showStrength
        required
        testId="sign-up-password"
      />

      <PasswordField
        label="Confirm password"
        value={values.confirmPassword}
        onChange={update("confirmPassword")}
        error={errors.confirmPassword}
        autoComplete="new-password"
        placeholder="Repeat your password"
        required
        testId="sign-up-confirm-password"
      />

      <Button type="submit" block size="lg" loading={isSubmitting} data-testid="sign-up-submit">
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>

      <p className="auth-switch">
        Already have an account?{" "}
        <button type="button" className="auth-switch__link" onClick={onSwitchMode}>
          Sign in
        </button>
      </p>

      {usernameState === "available" ? (
        <span className="sr-only" role="status">
          <FiCheckCircle size={12} /> Username available
        </span>
      ) : null}
    </form>
  );
}
