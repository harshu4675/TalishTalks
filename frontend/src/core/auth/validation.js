/**
 * Client-side validation for the authentication forms.
 *
 * The rules mirror the server's express-validator chains exactly, so the user
 * gets immediate, precise feedback and never has to wait for a round trip to
 * learn that a password is too weak. The server remains the authority.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export const LIMITS = Object.freeze({
  fullNameMin: 2,
  fullNameMax: 50,
  usernameMin: 3,
  usernameMax: 20,
  passwordMin: 6,
  passwordMax: 72,
  aboutMax: 150,
});

/**
 * Evaluate a password against the server's rules and return a 0-4 strength
 * score, a label and the list of requirements.
 *
 * The server requires a length of at least 6, at most 72, at least one letter
 * and at least one number. Uppercase letters and symbols are not required but
 * they do raise the score.
 */
export const evaluatePassword = (password) => {
  const value = typeof password === "string" ? password : "";

  const requirements = [
    {
      id: "length",
      label: `At least ${LIMITS.passwordMin} characters`,
      met: value.length >= LIMITS.passwordMin,
    },
    { id: "letter", label: "At least one letter", met: /[a-zA-Z]/.test(value) },
    { id: "number", label: "At least one number", met: /\d/.test(value) },
  ];

  const bonuses = [
    { id: "upper", label: "An uppercase letter", met: /[A-Z]/.test(value) },
    { id: "symbol", label: "A special character", met: /[^A-Za-z0-9]/.test(value) },
  ];

  let score = 0;
  if (requirements.every((item) => item.met)) score = 2;
  if (value.length >= 10 && bonuses[0].met) score = 3;
  if (value.length >= 12 && bonuses.every((item) => item.met)) score = 4;

  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
  return { score, label: labels[score], requirements, bonuses };
};

/**
 * Validate the sign-up form.
 * @returns {Record<string, string>} field name -> error message (empty when valid)
 */
export const validateSignUp = ({ fullName, username, email, password, confirmPassword }) => {
  const errors = {};

  const name = (fullName || "").trim();
  if (!name) errors.fullName = "Tell us your name.";
  else if (name.length < LIMITS.fullNameMin) errors.fullName = `Use at least ${LIMITS.fullNameMin} characters.`;
  else if (name.length > LIMITS.fullNameMax) errors.fullName = `Keep it under ${LIMITS.fullNameMax} characters.`;

  const handle = (username || "").trim();
  if (!handle) errors.username = "Choose a username.";
  else if (!USERNAME_PATTERN.test(handle)) errors.username = "Use letters, numbers and underscores only.";
  else if (handle.length < LIMITS.usernameMin) errors.username = `Use at least ${LIMITS.usernameMin} characters.`;
  else if (handle.length > LIMITS.usernameMax) errors.username = `Keep it under ${LIMITS.usernameMax} characters.`;

  const mail = (email || "").trim();
  if (!mail) errors.email = "Enter your email address.";
  else if (mail.length > 254) errors.email = "That email address is too long.";
  else if (!EMAIL_PATTERN.test(mail)) errors.email = "That email address does not look right.";

  const secret = password || "";
  if (!secret) errors.password = "Create a password.";
  else if (secret.length < LIMITS.passwordMin) errors.password = `Use at least ${LIMITS.passwordMin} characters.`;
  else if (secret.length > LIMITS.passwordMax) errors.password = `Keep it under ${LIMITS.passwordMax} characters.`;
  else if (!/[a-zA-Z]/.test(secret) || !/\d/.test(secret)) {
    errors.password = "Use at least one letter and one number.";
  }

  if (confirmPassword !== undefined) {
    if (!confirmPassword) errors.confirmPassword = "Re-enter your password.";
    else if (confirmPassword !== secret) errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
};

/**
 * Validate the sign-in form.
 * @returns {Record<string, string>} field name -> error message (empty when valid)
 */
export const validateSignIn = ({ identifier, password }) => {
  const errors = {};
  const who = (identifier || "").trim();
  if (!who) errors.identifier = "Enter your email or username.";
  else if (!who.includes("@") && who.length < LIMITS.usernameMin) {
    errors.identifier = "Enter a valid email or username.";
  }
  if (!password) errors.password = "Enter your password.";
  return errors;
};

/** Validate the profile editor. */
export const validateProfile = ({ fullName, about }) => {
  const errors = {};
  const name = (fullName || "").trim();
  if (!name) errors.fullName = "Your name cannot be empty.";
  else if (name.length < LIMITS.fullNameMin) errors.fullName = `Use at least ${LIMITS.fullNameMin} characters.`;
  else if (name.length > LIMITS.fullNameMax) errors.fullName = `Keep it under ${LIMITS.fullNameMax} characters.`;

  if (about && about.length > LIMITS.aboutMax) errors.about = `Keep it under ${LIMITS.aboutMax} characters.`;
  return errors;
};

/** True when a validation result contains no errors. */
export const isValid = (errors) => Object.keys(errors || {}).length === 0;
