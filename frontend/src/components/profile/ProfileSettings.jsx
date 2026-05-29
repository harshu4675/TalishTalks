import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import InstallAppButton from "../common/InstallAppButton";
import NotificationToggle from "../common//NotificationToggle";
import {
  HiOutlineX,
  HiOutlineUser,
  HiOutlinePencil,
  HiOutlineRefresh,
  HiOutlineLockClosed,
  HiOutlineKey,
  HiCheckCircle,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { userAPI } from "../../services/api";

// Same hash function as SiteLock
const hashPassword = (password) => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `talish_${Math.abs(hash).toString(36)}_${password.length}`;
};

const PASSWORD_KEY = "talish_site_password";
const HINT_KEY = "talish_site_password_hint";

const ProfileSettings = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [about, setAbout] = useState(user?.about || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [newHint, setNewHint] = useState(localStorage.getItem(HINT_KEY) || "");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleSaveProfile = async () => {
    if (fullName.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }

    setSaving(true);
    try {
      const res = await userAPI.updateProfile({
        fullName: fullName.trim(),
        about: about.trim(),
        avatar,
      });
      updateUser(res.data.user);
      toast.success("Profile updated! ✨");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const regenerateAvatar = () => {
    const seeds = [user?.username + Date.now()];
    const colors = ["E8713A", "D4943A", "4A7CFF", "3D2B1F", "5C3D2E", "FB3640"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    setAvatar(
      `https://api.dicebear.com/7.x/initials/svg?seed=${seeds[0]}&backgroundColor=${color}&textColor=ffffff`,
    );
  };

  const handleChangeSitePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error("Please fill all password fields");
      return;
    }

    if (newPassword.length < 4) {
      toast.error("New password must be at least 4 characters");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match");
      return;
    }

    const savedPassword = localStorage.getItem(PASSWORD_KEY);
    const currentHashed = hashPassword(currentPassword);

    if (currentHashed !== savedPassword) {
      toast.error("Current password is incorrect");
      return;
    }

    setChangingPassword(true);
    await new Promise((r) => setTimeout(r, 500));

    const newHashed = hashPassword(newPassword);
    localStorage.setItem(PASSWORD_KEY, newHashed);

    if (newHint.trim()) {
      localStorage.setItem(HINT_KEY, newHint.trim());
    } else {
      localStorage.removeItem(HINT_KEY);
    }

    setPasswordSuccess(true);
    setChangingPassword(false);
    toast.success("Site password changed successfully! 🔒");

    setTimeout(() => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordSuccess(false);
    }, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal Wrapper - FIXED MOBILE CENTERING */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl shadow-card-hover overflow-hidden flex flex-col my-auto"
              style={{
                backgroundColor: "var(--color-bgCard)",
                border: "1px solid var(--color-border)",
                maxHeight: "calc(100dvh - 1.5rem)",
              }}
            >
              {/* Header */}
              <div
                className="p-4 sm:p-5 border-b flex items-center justify-between flex-shrink-0"
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
                    <HiOutlineUser className="text-white text-lg" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className="text-base sm:text-lg font-display font-semibold truncate"
                      style={{ color: "var(--color-text)" }}
                    >
                      Settings
                    </h3>
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--color-textMuted)" }}
                    >
                      Manage your account & security
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors hover:bg-black/20 flex-shrink-0"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  <HiOutlineX className="text-lg" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex px-4 sm:px-5 pt-3 sm:pt-4 gap-1 flex-shrink-0">
                <button
                  onClick={() => setActiveTab("profile")}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor:
                      activeTab === "profile"
                        ? "var(--color-bgInput)"
                        : "transparent",
                    color:
                      activeTab === "profile"
                        ? "var(--color-text)"
                        : "var(--color-textMuted)",
                    borderBottom:
                      activeTab === "profile"
                        ? "2px solid var(--color-primary)"
                        : "2px solid transparent",
                  }}
                >
                  <HiOutlineUser className="text-base" />
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab("password")}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor:
                      activeTab === "password"
                        ? "var(--color-bgInput)"
                        : "transparent",
                    color:
                      activeTab === "password"
                        ? "var(--color-text)"
                        : "var(--color-textMuted)",
                    borderBottom:
                      activeTab === "password"
                        ? "2px solid var(--color-primary)"
                        : "2px solid transparent",
                  }}
                >
                  <HiOutlineLockClosed className="text-base" />
                  <span className="hidden xs:inline sm:inline">Site </span>
                  Password
                </button>
              </div>

              {/* Content Area - FLEX-1 for proper scroll */}
              <div className="overflow-y-auto scrollbar-thin flex-1 min-h-0">
                {/* PROFILE TAB */}
                {activeTab === "profile" && (
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <img
                          src={avatar}
                          alt={fullName}
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover"
                          style={{
                            border: "4px solid var(--color-primary)",
                          }}
                        />
                        <button
                          onClick={regenerateAvatar}
                          className="absolute bottom-0 right-0 p-2 rounded-full shadow-glow hover:scale-110 transition-transform"
                          style={{
                            background:
                              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
                          }}
                          title="Generate new avatar"
                        >
                          <HiOutlineRefresh className="text-white text-sm" />
                        </button>
                      </div>
                      <p
                        className="text-xs"
                        style={{ color: "var(--color-textMuted)" }}
                      >
                        Click refresh to generate a new avatar
                      </p>
                    </div>

                    <div>
                      <label
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: "var(--color-textMuted)" }}
                      >
                        Full Name
                      </label>
                      <div className="relative">
                        <HiOutlinePencil
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-base"
                          style={{ color: "var(--color-textMuted)" }}
                        />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="input-dark pl-10"
                          placeholder="Your full name"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: "var(--color-textMuted)" }}
                      >
                        Username (cannot be changed)
                      </label>
                      <input
                        type="text"
                        value={`@${user?.username}`}
                        disabled
                        className="input-dark opacity-60 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: "var(--color-textMuted)" }}
                      >
                        About
                      </label>
                      <textarea
                        value={about}
                        onChange={(e) => setAbout(e.target.value)}
                        rows={3}
                        maxLength={150}
                        className="input-dark resize-none"
                        placeholder="Tell us about yourself..."
                      />
                      <p
                        className="text-xs mt-1 text-right"
                        style={{ color: "var(--color-textMuted)" }}
                      >
                        {about.length}/150
                      </p>
                    </div>
                  </div>
                )}
                {/* Notification Toggle */}
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "var(--color-textMuted)" }}
                  >
                    Notifications
                  </label>
                  <NotificationToggle />
                </div>

                {/* Install App Button */}
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "var(--color-textMuted)" }}
                  >
                    App
                  </label>
                  <InstallAppButton variant="card" />
                </div>
                {/* PASSWORD TAB */}
                {activeTab === "password" && (
                  <div className="p-4 sm:p-5 space-y-4">
                    <div
                      className="p-4 rounded-xl"
                      style={{
                        backgroundColor: "var(--color-bgInput)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background:
                              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
                          }}
                        >
                          <HiOutlineLockClosed className="text-white text-base" />
                        </div>
                        <div>
                          <p
                            className="text-sm font-semibold mb-1"
                            style={{ color: "var(--color-text)" }}
                          >
                            Change Site Password
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: "var(--color-textMuted)" }}
                          >
                            This is the password used to access this website on
                            this device.
                          </p>
                        </div>
                      </div>
                    </div>

                    {passwordSuccess ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-8"
                      >
                        <HiCheckCircle className="text-green-500 text-5xl mx-auto mb-3" />
                        <p
                          className="font-semibold mb-1"
                          style={{ color: "var(--color-text)" }}
                        >
                          Password Changed!
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--color-textMuted)" }}
                        >
                          Your new password is now active 🔒
                        </p>
                      </motion.div>
                    ) : (
                      <form
                        onSubmit={handleChangeSitePassword}
                        className="space-y-4"
                      >
                        <div>
                          <label
                            className="block text-xs font-medium mb-1.5"
                            style={{ color: "var(--color-textMuted)" }}
                          >
                            Current Password
                          </label>
                          <div className="relative">
                            <HiOutlineLockClosed
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-lg"
                              style={{ color: "var(--color-textMuted)" }}
                            />
                            <input
                              type="password"
                              value={currentPassword}
                              onChange={(e) =>
                                setCurrentPassword(e.target.value)
                              }
                              placeholder="Enter current password"
                              className="input-dark pl-10"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            className="block text-xs font-medium mb-1.5"
                            style={{ color: "var(--color-textMuted)" }}
                          >
                            New Password (min 4 chars)
                          </label>
                          <div className="relative">
                            <HiOutlineKey
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-lg"
                              style={{ color: "var(--color-textMuted)" }}
                            />
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Create new password"
                              className="input-dark pl-10"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            className="block text-xs font-medium mb-1.5"
                            style={{ color: "var(--color-textMuted)" }}
                          >
                            Confirm New Password
                          </label>
                          <div className="relative">
                            <HiOutlineKey
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-lg"
                              style={{ color: "var(--color-textMuted)" }}
                            />
                            <input
                              type="password"
                              value={confirmNewPassword}
                              onChange={(e) =>
                                setConfirmNewPassword(e.target.value)
                              }
                              placeholder="Re-enter new password"
                              className="input-dark pl-10"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            className="block text-xs font-medium mb-1.5"
                            style={{ color: "var(--color-textMuted)" }}
                          >
                            Password Hint (optional)
                          </label>
                          <input
                            type="text"
                            value={newHint}
                            onChange={(e) => setNewHint(e.target.value)}
                            placeholder="e.g. My pet's name"
                            maxLength={50}
                            className="input-dark"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={changingPassword}
                          className="btn-accent w-full"
                        >
                          {changingPassword ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Changing...
                            </span>
                          ) : (
                            "Change Password"
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* Footer (only for profile tab) */}
              {activeTab === "profile" && (
                <div
                  className="p-4 sm:p-5 border-t flex gap-2 flex-shrink-0"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <button
                    onClick={onClose}
                    className="btn-ghost flex-1"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="btn-accent flex-1"
                  >
                    {saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProfileSettings;
