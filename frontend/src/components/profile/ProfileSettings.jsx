import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import InstallAppButton from "../common/InstallAppButton";
import NotificationToggle from "../common/NotificationToggle";
import {
  HiOutlineX,
  HiOutlineUser,
  HiOutlinePencil,
  HiOutlineCamera,
  HiOutlineLockClosed,
  HiOutlineKey,
  HiCheckCircle,
  HiOutlineBan,
  HiOutlineTrash,
  HiOutlineLogout,
  HiOutlineShieldCheck,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { userAPI } from "../../services/api";
import { useBackButton } from "../../hooks/useBackButton";
import SiteLockToggle from "../common/SiteLockToggle";
import { useChat } from "../../hooks/useChat";

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
  const { user, updateUser, logout } = useAuth();
  const { updateChatFlags, chats } = useChat();

  // Profile state
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [about, setAbout] = useState(user?.about || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [saving, setSaving] = useState(false);

  // 🔥 Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const avatarInputRef = useRef(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [newHint, setNewHint] = useState(localStorage.getItem(HINT_KEY) || "");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  // Blocked users state
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [unblockingId, setUnblockingId] = useState(null);
  const [showBlockedSection, setShowBlockedSection] = useState(false);

  // Logout state
  const [loggingOut, setLoggingOut] = useState(false);

  useBackButton(isOpen, onClose);

  // Sync user data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.fullName || "");
      setAbout(user.about || "");
      setAvatar(user.avatar || "");
    }
  }, [isOpen, user]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setShowPasswordSection(false);
      setShowBlockedSection(false);
      setBlockedUsers([]);
      setPasswordSuccess(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
  }, [isOpen]);

  // Fetch blocked users when section expands
  const fetchBlockedUsers = useCallback(async () => {
    setLoadingBlocked(true);
    try {
      const res = await userAPI.getBlocked();
      setBlockedUsers(res.data.blockedUsers || []);
    } catch (err) {
      toast.error("Failed to load blocked users");
    } finally {
      setLoadingBlocked(false);
    }
  }, []);

  useEffect(() => {
    if (showBlockedSection && isOpen) {
      fetchBlockedUsers();
    }
  }, [showBlockedSection, isOpen, fetchBlockedUsers]);

  // 🔥 Handle avatar file select + upload
  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Show preview instantly
    const previewUrl = URL.createObjectURL(file);
    setAvatar(previewUrl);
    setUploadingAvatar(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await userAPI.uploadAvatar(formData, (progress) => {
        setUploadProgress(progress);
      });

      const newAvatar = res.data.avatar;
      setAvatar(newAvatar);
      updateUser({ avatar: newAvatar });
      toast.success("Profile photo updated! 📸");
    } catch (err) {
      // Revert preview on error
      setAvatar(user?.avatar || "");
      toast.error(err.response?.data?.message || "Failed to upload photo");
    } finally {
      setUploadingAvatar(false);
      setUploadProgress(0);
      URL.revokeObjectURL(previewUrl);
      e.target.value = "";
    }
  };

  // Unblock user
  const handleUnblock = async (targetUser) => {
    setUnblockingId(targetUser._id);
    try {
      await userAPI.unblock(targetUser._id);
      setBlockedUsers((prev) => prev.filter((u) => u._id !== targetUser._id));
      const relatedChat = chats.find(
        (c) => c.otherUser?._id === targetUser._id,
      );
      if (relatedChat) {
        updateChatFlags(relatedChat._id, { iBlockedThem: false });
      }
      toast.success(`${targetUser.fullName} unblocked ✓`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to unblock");
    } finally {
      setUnblockingId(null);
    }
  };

  // Save profile
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
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // Change site password
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
    toast.success("Site password changed! 🔒");
    setTimeout(() => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordSuccess(false);
      setShowPasswordSection(false);
    }, 2000);
  };

  // Logout
  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to logout?")) return;
    setLoggingOut(true);
    await logout();
    toast.success("Logged out successfully 👋");
  };

  // Section component for consistent styling
  const Section = ({ title, children }) => (
    <div className="space-y-3">
      <p
        className="text-xs font-semibold uppercase tracking-widest px-1"
        style={{ color: "var(--color-textMuted)" }}
      >
        {title}
      </p>
      {children}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl shadow-card-hover flex flex-col my-auto"
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
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
                    }}
                  >
                    <HiOutlineUser className="text-white text-lg" />
                  </div>
                  <div>
                    <h3
                      className="text-base sm:text-lg font-display font-semibold"
                      style={{ color: "var(--color-text)" }}
                    >
                      Settings
                    </h3>
                    <p
                      className="text-xs"
                      style={{ color: "var(--color-textMuted)" }}
                    >
                      Manage your account
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors hover:bg-black/20"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  <HiOutlineX className="text-lg" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="overflow-y-auto scrollbar-thin flex-1 min-h-0 p-4 sm:p-5 space-y-6">
                {/* ── PROFILE SECTION ── */}
                <Section title="Profile">
                  {/* Avatar */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <img
                        src={avatar}
                        alt={fullName}
                        className="w-24 h-24 rounded-full object-cover"
                        style={{
                          border: "4px solid var(--color-primary)",
                          opacity: uploadingAvatar ? 0.7 : 1,
                        }}
                      />

                      {/* Upload progress ring */}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-24 h-24 -rotate-90 absolute">
                            <circle
                              cx="48"
                              cy="48"
                              r="44"
                              stroke="var(--color-primary)"
                              strokeWidth="4"
                              fill="none"
                              strokeDasharray={2 * Math.PI * 44}
                              strokeDashoffset={
                                2 * Math.PI * 44 * (1 - uploadProgress / 100)
                              }
                              className="transition-all duration-300"
                            />
                          </svg>
                          <span className="text-white text-xs font-bold z-10">
                            {uploadProgress}%
                          </span>
                        </div>
                      )}

                      {/* Camera button */}
                      <button
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="absolute bottom-0 right-0 p-2 rounded-full shadow-glow hover:scale-110 transition-transform disabled:opacity-50"
                        style={{
                          background:
                            "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
                        }}
                        title="Change photo"
                      >
                        <HiOutlineCamera className="text-white text-sm" />
                      </button>

                      {/* Hidden file input */}
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarSelect}
                        className="hidden"
                      />
                    </div>
                    <p
                      className="text-xs"
                      style={{ color: "var(--color-textMuted)" }}
                    >
                      Tap camera to change photo
                    </p>
                  </div>

                  {/* Full name */}
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

                  {/* Username */}
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

                  {/* About */}
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
                      rows={2}
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

                  {/* Save button */}
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="btn-accent w-full"
                  >
                    {saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      "Save Profile"
                    )}
                  </button>
                </Section>

                {/* Divider */}
                <div
                  className="border-t"
                  style={{ borderColor: "var(--color-border)" }}
                />

                {/* ── NOTIFICATIONS ── */}
                <Section title="Notifications">
                  <NotificationToggle />
                </Section>

                {/* Divider */}
                <div
                  className="border-t"
                  style={{ borderColor: "var(--color-border)" }}
                />

                {/* ── APP ── */}
                <Section title="App">
                  <InstallAppButton variant="card" />
                </Section>

                {/* Divider */}
                <div
                  className="border-t"
                  style={{ borderColor: "var(--color-border)" }}
                />

                {/* ── SECURITY ── */}
                <Section title="Security">
                  {/* Site Lock Toggle */}
                  <SiteLockToggle />

                  {/* Change site password - collapsible */}
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <button
                      onClick={() => setShowPasswordSection((p) => !p)}
                      className="w-full flex items-center gap-3 p-3 transition-colors hover:bg-black/10"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor:
                            "rgba(var(--color-primary-rgb, 124,58,237),0.15)",
                        }}
                      >
                        <HiOutlineShieldCheck
                          className="text-base"
                          style={{ color: "var(--color-primary)" }}
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <p
                          className="text-sm font-medium"
                          style={{ color: "var(--color-text)" }}
                        >
                          Change Site Password
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--color-textMuted)" }}
                        >
                          Update your app lock password
                        </p>
                      </div>
                      <motion.span
                        animate={{
                          rotate: showPasswordSection ? 180 : 0,
                        }}
                        className="text-xs"
                        style={{ color: "var(--color-textMuted)" }}
                      >
                        ▼
                      </motion.span>
                    </button>

                    <AnimatePresence>
                      {showPasswordSection && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="p-4 space-y-3 border-t"
                            style={{
                              borderColor: "var(--color-border)",
                              backgroundColor: "var(--color-bg)",
                            }}
                          >
                            {passwordSuccess ? (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-4"
                              >
                                <HiCheckCircle className="text-green-500 text-4xl mx-auto mb-2" />
                                <p
                                  className="text-sm font-semibold"
                                  style={{ color: "var(--color-text)" }}
                                >
                                  Password Changed!
                                </p>
                              </motion.div>
                            ) : (
                              <form
                                onSubmit={handleChangeSitePassword}
                                className="space-y-3"
                              >
                                <div className="relative">
                                  <HiOutlineLockClosed
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-base"
                                    style={{
                                      color: "var(--color-textMuted)",
                                    }}
                                  />
                                  <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) =>
                                      setCurrentPassword(e.target.value)
                                    }
                                    placeholder="Current password"
                                    className="input-dark pl-10"
                                  />
                                </div>
                                <div className="relative">
                                  <HiOutlineKey
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-base"
                                    style={{
                                      color: "var(--color-textMuted)",
                                    }}
                                  />
                                  <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) =>
                                      setNewPassword(e.target.value)
                                    }
                                    placeholder="New password (min 4)"
                                    className="input-dark pl-10"
                                  />
                                </div>
                                <div className="relative">
                                  <HiOutlineKey
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-base"
                                    style={{
                                      color: "var(--color-textMuted)",
                                    }}
                                  />
                                  <input
                                    type="password"
                                    value={confirmNewPassword}
                                    onChange={(e) =>
                                      setConfirmNewPassword(e.target.value)
                                    }
                                    placeholder="Confirm new password"
                                    className="input-dark pl-10"
                                  />
                                </div>
                                <input
                                  type="text"
                                  value={newHint}
                                  onChange={(e) => setNewHint(e.target.value)}
                                  placeholder="Password hint (optional)"
                                  maxLength={50}
                                  className="input-dark"
                                />
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
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Section>

                {/* Divider */}
                <div
                  className="border-t"
                  style={{ borderColor: "var(--color-border)" }}
                />

                {/* ── BLOCKED USERS ── */}
                <Section title="Privacy">
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <button
                      onClick={() => {
                        setShowBlockedSection((p) => !p);
                      }}
                      className="w-full flex items-center gap-3 p-3 transition-colors hover:bg-black/10"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: "rgba(239, 68, 68, 0.15)",
                        }}
                      >
                        <HiOutlineBan className="text-red-400 text-base" />
                      </div>
                      <div className="flex-1 text-left">
                        <p
                          className="text-sm font-medium"
                          style={{ color: "var(--color-text)" }}
                        >
                          Blocked Users
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--color-textMuted)" }}
                        >
                          Manage who you've blocked
                        </p>
                      </div>
                      <motion.span
                        animate={{
                          rotate: showBlockedSection ? 180 : 0,
                        }}
                        className="text-xs"
                        style={{ color: "var(--color-textMuted)" }}
                      >
                        ▼
                      </motion.span>
                    </button>

                    <AnimatePresence>
                      {showBlockedSection && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="border-t"
                            style={{
                              borderColor: "var(--color-border)",
                              backgroundColor: "var(--color-bg)",
                            }}
                          >
                            {loadingBlocked ? (
                              <div className="p-4 space-y-3">
                                {[1, 2].map((i) => (
                                  <div
                                    key={i}
                                    className="flex items-center gap-3 animate-pulse"
                                  >
                                    <div
                                      className="w-10 h-10 rounded-full"
                                      style={{
                                        backgroundColor: "var(--color-border)",
                                      }}
                                    />
                                    <div className="flex-1 space-y-1.5">
                                      <div
                                        className="h-3 rounded w-1/2"
                                        style={{
                                          backgroundColor:
                                            "var(--color-border)",
                                        }}
                                      />
                                      <div
                                        className="h-2.5 rounded w-1/3"
                                        style={{
                                          backgroundColor:
                                            "var(--color-border)",
                                        }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : blockedUsers.length === 0 ? (
                              <div className="text-center py-6">
                                <p className="text-2xl mb-1">🚫</p>
                                <p
                                  className="text-xs"
                                  style={{
                                    color: "var(--color-textMuted)",
                                  }}
                                >
                                  No blocked users
                                </p>
                              </div>
                            ) : (
                              <div className="p-3 space-y-2">
                                <AnimatePresence>
                                  {blockedUsers.map((blockedUser) => (
                                    <motion.div
                                      key={blockedUser._id}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{
                                        opacity: 0,
                                        x: 10,
                                        height: 0,
                                      }}
                                      className="flex items-center gap-3 p-2.5 rounded-xl"
                                      style={{
                                        backgroundColor: "var(--color-bgInput)",
                                        border: "1px solid var(--color-border)",
                                      }}
                                    >
                                      <div className="relative flex-shrink-0">
                                        <img
                                          src={blockedUser.avatar}
                                          alt={blockedUser.fullName}
                                          className="w-10 h-10 rounded-full object-cover"
                                          style={{
                                            opacity: 0.7,
                                            filter: "grayscale(30%)",
                                          }}
                                        />
                                        <div
                                          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                                          style={{
                                            backgroundColor:
                                              "rgba(239,68,68,0.9)",
                                            border:
                                              "1.5px solid var(--color-bgCard)",
                                          }}
                                        >
                                          <HiOutlineBan className="text-white text-[9px]" />
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p
                                          className="text-sm font-semibold truncate"
                                          style={{
                                            color: "var(--color-text)",
                                          }}
                                        >
                                          {blockedUser.fullName}
                                        </p>
                                        <p
                                          className="text-xs truncate"
                                          style={{
                                            color: "var(--color-textMuted)",
                                          }}
                                        >
                                          @{blockedUser.username}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() =>
                                          handleUnblock(blockedUser)
                                        }
                                        disabled={
                                          unblockingId === blockedUser._id
                                        }
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex-shrink-0"
                                        style={{
                                          backgroundColor:
                                            "rgba(239, 68, 68, 0.1)",
                                          color: "#f87171",
                                          border:
                                            "1px solid rgba(239,68,68,0.3)",
                                        }}
                                      >
                                        {unblockingId === blockedUser._id ? (
                                          <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <HiOutlineTrash className="text-xs" />
                                        )}
                                        Unblock
                                      </button>
                                    </motion.div>
                                  ))}
                                </AnimatePresence>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Section>

                {/* Divider */}
                <div
                  className="border-t"
                  style={{ borderColor: "var(--color-border)" }}
                />

                {/* ── LOGOUT ── */}
                <Section title="Account">
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                  >
                    <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
                      {loggingOut ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <HiOutlineLogout className="text-red-400 text-base" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-red-400">
                        {loggingOut ? "Logging out..." : "Logout"}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--color-textMuted)" }}
                      >
                        Sign out of your account
                      </p>
                    </div>
                  </button>
                </Section>

                {/* Bottom spacing */}
                <div className="h-2" />
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProfileSettings;
