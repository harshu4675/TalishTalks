import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import {
  HiOutlineLockClosed,
  HiOutlineX,
  HiOutlineBackspace,
} from "react-icons/hi";
import { useBackButton } from "../../hooks/useBackButton";

/**
 * Reusable PIN modal for chat lock operations
 * @param {string} mode - "set" | "verify" | "remove"
 * @param {string} title - Custom title
 * @param {string} subtitle - Custom subtitle
 * @param {function} onSubmit - async (pin) => {} - throw error to show error
 * @param {function} onClose
 */
const PinModal = ({
  isOpen,
  mode = "verify",
  title,
  subtitle,
  onSubmit,
  onClose,
}) => {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState(1); // for "set" mode (1 = enter, 2 = confirm)
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useBackButton(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setConfirmPin("");
      setStep(1);
      setError("");
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const currentPin = mode === "set" && step === 2 ? confirmPin : pin;
  const setCurrentPin = mode === "set" && step === 2 ? setConfirmPin : setPin;

  const handleNumberClick = (num) => {
    if (currentPin.length >= 8) return;
    setCurrentPin(currentPin + num);
    setError("");
  };

  const handleBackspace = () => {
    setCurrentPin(currentPin.slice(0, -1));
    setError("");
  };

  const handleSubmit = async () => {
    if (currentPin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    // "Set" mode: 2 steps
    if (mode === "set" && step === 1) {
      setStep(2);
      return;
    }

    if (mode === "set" && step === 2) {
      if (pin !== confirmPin) {
        setError("PINs don't match. Try again.");
        setConfirmPin("");
        return;
      }
    }

    // Submit
    setSubmitting(true);
    try {
      await onSubmit(mode === "set" ? pin : pin);
      // Parent closes modal on success
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed");
      setPin("");
      setConfirmPin("");
      if (mode === "set") setStep(1);
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-submit when PIN reaches 4+ digits and user pauses? No — let them tap "Confirm"

  const displayTitle =
    title ||
    (mode === "set"
      ? step === 1
        ? "Set Chat Lock PIN"
        : "Confirm PIN"
      : mode === "remove"
        ? "Enter PIN to Unlock"
        : "Enter Chat Lock PIN");

  const displaySubtitle =
    subtitle ||
    (mode === "set"
      ? step === 1
        ? "Create a PIN (min 4 digits) to lock chats"
        : "Re-enter your PIN to confirm"
      : mode === "remove"
        ? "Enter your PIN to remove the lock"
        : "Enter your PIN to view locked chats");

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
            onClick={onClose}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
              style={{
                backgroundColor: "var(--color-bgCard)",
                border: "1px solid var(--color-border)",
              }}
            >
              {/* Header */}
              <div
                className="p-5 border-b flex items-center justify-between"
                style={{ borderColor: "var(--color-border)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
                    }}
                  >
                    <HiOutlineLockClosed className="text-white text-lg" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className="text-base font-display font-semibold truncate"
                      style={{ color: "var(--color-text)" }}
                    >
                      {displayTitle}
                    </h3>
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--color-textMuted)" }}
                    >
                      {displaySubtitle}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-black/20 flex-shrink-0"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  <HiOutlineX className="text-lg" />
                </button>
              </div>

              {/* PIN dots */}
              <div className="p-6">
                <div className="flex items-center justify-center gap-3 mb-6">
                  {Array.from({ length: Math.max(currentPin.length, 4) }).map(
                    (_, i) => (
                      <div
                        key={i}
                        className="rounded-full transition-all"
                        style={{
                          width: "14px",
                          height: "14px",
                          backgroundColor:
                            i < currentPin.length
                              ? "var(--color-primary)"
                              : "var(--color-border)",
                        }}
                      />
                    ),
                  )}
                </div>

                {/* Hidden actual input (for paste/keyboard support) */}
                <input
                  ref={inputRef}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={currentPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 8);
                    setCurrentPin(val);
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                  }}
                  className="sr-only"
                  autoComplete="off"
                />

                {/* Error */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-center text-red-400 mb-3"
                  >
                    {error}
                  </motion.p>
                )}

                {/* Number pad */}
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleNumberClick(String(num))}
                      disabled={submitting}
                      className="aspect-square rounded-2xl text-2xl font-semibold transition-all active:scale-95 disabled:opacity-50"
                      style={{
                        backgroundColor: "var(--color-bgInput)",
                        color: "var(--color-text)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => inputRef.current?.focus()}
                    disabled={submitting}
                    className="aspect-square rounded-2xl text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
                    style={{
                      backgroundColor: "transparent",
                      color: "var(--color-textMuted)",
                    }}
                  >
                    Type
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumberClick("0")}
                    disabled={submitting}
                    className="aspect-square rounded-2xl text-2xl font-semibold transition-all active:scale-95 disabled:opacity-50"
                    style={{
                      backgroundColor: "var(--color-bgInput)",
                      color: "var(--color-text)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    disabled={submitting || currentPin.length === 0}
                    className="aspect-square rounded-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-30"
                    style={{
                      backgroundColor: "transparent",
                      color: "var(--color-textMuted)",
                    }}
                  >
                    <HiOutlineBackspace className="text-2xl" />
                  </button>
                </div>

                {/* Submit button */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || currentPin.length < 4}
                  className="btn-accent w-full mt-4"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : mode === "set" && step === 1 ? (
                    "Next"
                  ) : (
                    "Confirm"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default PinModal;
