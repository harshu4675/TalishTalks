/**
 * Icons that are not part of the Feather icon set.
 *
 * Keeping them here means the rest of the application only ever imports from
 * `react-icons/fi`, which keeps the icon bundle small and consistent.
 */

/**
 * The double tick used for read receipts.
 */
export function DoubleCheckIcon({ size = 14, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d="M1 12.5 4.5 16 11 9.5" />
      <path d="M8 12.5 11.5 16 18 9.5" />
    </svg>
  );
}

/**
 * A map pin used to represent a pinned conversation.
 */
export function PinIcon({ size = 14, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export default DoubleCheckIcon;
