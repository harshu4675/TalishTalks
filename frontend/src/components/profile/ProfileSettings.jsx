import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import InstallAppButton from "../common/InstallAppButton";
import NotificationToggle from "../common/NotificationToggle";
import {
  HiOutlineX,
  HiOutlineUser,
  HiOutlinePencil,
  HiOutlineRefresh,
  HiOutlineLockClosed,
  HiOutlineKey,
  HiCheckCircle,
  HiOutlineBan,
  HiOutlineTrash,
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
  const { user, updateUser } = useAuth();
  const { updateChatFlags, chats } = useChat();
  const [activeTab, setActiveTab] = useState("profile");

  // Profile state
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [about, setAbout] = useState(user?.about || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [saving, setSaving] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [newHint, setNewHint] = useState(localStorage.getItem(HINT_KEY) || "");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // 🔥 Phase 10: Blocked users state
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [unblockingId, setUnblockingId] = useState(null);

  useBackButton(isOpen, onClose);

  // 🔥 Phase 10: Fetch blocked users when tab opens
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
    if (activeTab === "blocked" && isOpen) {
      fetchBlockedUsers();
    }
  }, [activeTab, isOpen, fetchBlockedUsers]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab("profile");
      setBlockedUsers([]);
    }
  }, [isOpen]);

  // 🔥 Phase 10: Unblock a user
  const handleUnblock = async (targetUser) => {
    setUnblockingId(targetUser._id);
    try {
      await userAPI.unblock(targetUser._id);

      // Remove from local list instantly
      setBlockedUsers((prev) => prev.filter((u) => u._id !== targetUser._id));

      // Update chat flags if chat exists
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

  // Tab config
  const tabs = [
    {
      key: "profile",
      label: "Profile",
      icon: <HiOutlineUser className="text-base" />,
    },
    {
      key: "password",
      label: "Password",
      icon: <HiOutlineLockClosed className="text-base" />,
    },
    {
      key: "blocked",
      label: "Blocked",
      icon: <HiOutlineBan className="text-base" />,
    },
  ];

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

              {/* Tabs - 3 tabs now */}
              <div className="flex px-4 sm:px-5 pt-3 sm:pt-4 gap-1 flex-shrink-0">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="flex-1 px-2 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5"
                    style={{
                      backgroundColor:
                        activeTab === tab.key
                          ? "var(--color-bgInput)"
                          : "transparent",
                      color:
                        activeTab === tab.key
                          ? "var(--color-text)"
                          : "var(--color-textMuted)",
                      borderBottom:
                        activeTab === tab.key
                          ? "2px solid var(--color-primary)"
                          : "2px solid transparent",
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Content Area */}
              <div className="overflow-y-auto scrollbar-thin flex-1 min-h-0">
                {/* Profile Tab */}
                {activeTab === "profile" && (
                  <div className="p-4 sm:p-5 space-y-4">
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

                    <div>
                      <label
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: "var(--color-textMuted)" }}
                      >
                        Notifications
                      </label>
                      <NotificationToggle />
                    </div>

                    <div>
                      <label
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: "var(--color-textMuted)" }}
                      >
                        App
                      </label>
                      <InstallAppButton variant="card" />
                    </div>

                    <div>
                      <label
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: "var(--color-textMuted)" }}
                      >
                        Security
                      </label>
                      <SiteLockToggle />
                    </div>
                  </div>
                )}

                {/* Password Tab */}
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

                {/* 🔥 Phase 10: Blocked Users Tab */}
                {activeTab === "blocked" && (
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Info banner */}
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
                            backgroundColor: "rgba(239, 68, 68, 0.15)",
                          }}
                        >
                          <HiOutlineBan className="text-red-400 text-base" />
                        </div>
                        <div>
                          <p
                            className="text-sm font-semibold mb-1"
                            style={{ color: "var(--color-text)" }}
                          >
                            Blocked Users
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: "var(--color-textMuted)" }}
                          >
                            Blocked users cannot message you or see your online
                            status.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Loading state */}
                    {loadingBlocked ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 p-3 rounded-xl animate-pulse"
                            style={{
                              backgroundColor: "var(--color-bgInput)",
                            }}
                          >
                            <div
                              className="w-11 h-11 rounded-full skeleton flex-shrink-0"
                              style={{
                                backgroundColor: "var(--color-border)",
                              }}
                            />
                            <div className="flex-1 space-y-2">
                              <div
                                className="h-3.5 rounded w-2/3"
                                style={{
                                  backgroundColor: "var(--color-border)",
                                }}
                              />
                              <div
                                className="h-3 rounded w-1/3"
                                style={{
                                  backgroundColor: "var(--color-border)",
                                }}
                              />
                            </div>
                            <div
                              className="w-20 h-8 rounded-lg"
                              style={{
                                backgroundColor: "var(--color-border)",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : blockedUsers.length === 0 ? (
                      // Empty state
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-12"
                      >
                        <div className="text-5xl mb-3">🚫</div>
                        <p
                          className="text-sm font-medium mb-1"
                          style={{ color: "var(--color-text)" }}
                        >
                          No blocked users
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--color-textMuted)" }}
                        >
                          Users you block will appear here
                        </p>
                      </motion.div>
                    ) : (
                      // Blocked users list
                      <div className="space-y-2">
                        <p
                          className="text-xs font-medium uppercase tracking-wide px-1"
                          style={{ color: "var(--color-textMuted)" }}
                        >
                          {blockedUsers.length} blocked{" "}
                          {blockedUsers.length === 1 ? "user" : "users"}
                        </p>

                        <AnimatePresence>
                          {blockedUsers.map((blockedUser, index) => (
                            <motion.div
                              key={blockedUser._id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10, height: 0 }}
                              transition={{ delay: index * 0.04 }}
                              className="flex items-center gap-3 p-3 rounded-xl"
                              style={{
                                backgroundColor: "var(--color-bgInput)",
                                border: "1px solid var(--color-border)",
                              }}
                            >
                              {/* Avatar */}
                              <div className="relative flex-shrink-0">
                                <img
                                  src={blockedUser.avatar}
                                  alt={blockedUser.fullName}
                                  className="w-11 h-11 rounded-full object-cover"
                                  style={{
                                    border: "1px solid var(--color-border)",
                                    opacity: 0.7,
                                    filter: "grayscale(30%)",
                                  }}
                                />
                                <div
                                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                                  style={{
                                    backgroundColor: "rgba(239,68,68,0.9)",
                                    border: "1.5px solid var(--color-bgCard)",
                                  }}
                                >
                                  <HiOutlineBan className="text-white text-[9px]" />
                                </div>
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p
                                  className="text-sm font-semibold truncate"
                                  style={{ color: "var(--color-text)" }}
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

                              {/* Unblock button */}
                              <button
                                onClick={() => handleUnblock(blockedUser)}
                                disabled={unblockingId === blockedUser._id}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex-shrink-0"
                                style={{
                                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                                  color: "#f87171",
                                  border: "1px solid rgba(239,68,68,0.3)",
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
                )}
              </div>

              {/* Footer - only for profile tab */}
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
