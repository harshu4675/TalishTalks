/**
 * Avatar - a user's profile picture with an initials fallback and an
 * optional presence indicator.
 */

import { useEffect, useState } from "react";

import { initialOf } from "../../core/utils/text.js";

/**
 * @param {object} props
 * @param {string} [props.src] Image URL.
 * @param {string} props.name Used for the fallback initials and alt text.
 * @param {"xs"|"sm"|"md"|"lg"|"xl"} [props.size]
 * @param {boolean} [props.online] Show the presence dot.
 * @param {boolean} [props.offline] Force the "offline" dot styling.
 */
export default function Avatar({
  src,
  name = "",
  size = "md",
  online = false,
  offline = false,
  className = "",
  ...rest
}) {
  const showPresence = online || offline;
  const presenceClass = online ? "avatar__presence--online" : "avatar__presence--offline";
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [src]);

  return (
    <span className={`avatar avatar--${size} ${className}`.trim()} {...rest}>
      {src && !imageFailed ? (
        <img src={src} alt={name ? `${name}'s avatar` : "Avatar"} loading="lazy" decoding="async" onError={() => setImageFailed(true)} />
      ) : (
        <span aria-hidden="true">{initialOf(name)}</span>
      )}
      {showPresence ? (
        <span
          className={`avatar__presence ${presenceClass}`}
          title={online ? "Online" : "Offline"}
        />
      ) : null}
    </span>
  );
}
