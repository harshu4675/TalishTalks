/**
 * Error presentation helpers.
 *
 * Turns any thrown value into a message that is safe and useful to show to a
 * person, plus a short title used by the toast layer.
 */

import { ApiError } from "../api/http.js";

/**
 * Extract a human readable message from any error value.
 * @param {unknown} error
 * @returns {string}
 */
export const errorMessage = (error) => {
  if (!error) return "Something went wrong. Please try again.";
  if (typeof error === "string") return error;
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
};

/**
 * Extract a short title describing the kind of failure.
 * @param {unknown} error
 * @returns {string}
 */
export const errorTitle = (error) => {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "Connection problem";
    if (error.isUnauthorized) return "Session expired";
    if (error.isForbidden) return "Not allowed";
    if (error.isNotFound) return "Not found";
    if (error.isRateLimited) return "Slow down";
    if (error.isValidationError) return "Check your details";
    return "Request failed";
  }
  return "Something went wrong";
};

/**
 * Map a server field-error payload onto a form's error object.
 * @param {unknown} error
 * @param {Record<string, string>} [fallback] Errors to use when the server
 *   did not describe the failing field.
 */
export const fieldErrorsFrom = (error, fallback = {}) => {
  if (error instanceof ApiError && error.fieldErrors) {
    return { ...fallback, ...error.fieldErrors };
  }
  return fallback;
};

export default { errorMessage, errorTitle, fieldErrorsFrom };
