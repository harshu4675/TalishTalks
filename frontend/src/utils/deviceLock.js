const PASSWORD_KEY = "talish_site_password";
const ENABLED_KEY = "talish_site_lock_enabled";
const HINT_KEY = "talish_site_password_hint";
const ITERATIONS = 210000;
const encode = (bytes) => btoa(String.fromCharCode(...bytes));
const decode = (value) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
const legacyHash = (password) => {
  let hash = 0;
  for (let index = 0; index < password.length; index++) hash = ((hash << 5) - hash + password.charCodeAt(index)) | 0;
  return `talish_${Math.abs(hash).toString(36)}_${password.length}`;
};
const derive = async (password, salt) => {
  if (!globalThis.crypto?.subtle) throw new Error("Device lock requires a secure HTTPS connection.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" }, key, 256));
};
export const deviceLockEnabled = () => localStorage.getItem(ENABLED_KEY) !== "false" && !!localStorage.getItem(PASSWORD_KEY);
export const setDeviceLock = async (password) => {
  if (password.length < 6) throw new Error("Use at least 6 characters for your device PIN or password.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt);
  localStorage.setItem(PASSWORD_KEY, JSON.stringify({ version: 2, salt: encode(salt), hash: encode(hash), iterations: ITERATIONS }));
  localStorage.setItem(ENABLED_KEY, "true");
  localStorage.removeItem(HINT_KEY);
};
export const verifyDeviceLock = async (password) => {
  const stored = localStorage.getItem(PASSWORD_KEY);
  if (!stored) return false;
  if (stored.startsWith("talish_")) {
    if (stored !== legacyHash(password)) return false;
    await setDeviceLock(password);
    return true;
  }
  try {
    const record = JSON.parse(stored);
    if (record.version !== 2 || record.iterations !== ITERATIONS) return false;
    const actual = await derive(password, decode(record.salt));
    const expected = decode(record.hash);
    let difference = actual.length ^ expected.length;
    actual.forEach((value, index) => { difference |= value ^ (expected[index] || 0); });
    return difference === 0;
  } catch { return false; }
};
export const changeDeviceLockEnabled = (enabled) => localStorage.setItem(ENABLED_KEY, String(enabled));
export const clearDeviceLock = () => { [PASSWORD_KEY, ENABLED_KEY, HINT_KEY].forEach((key) => localStorage.removeItem(key)); };
