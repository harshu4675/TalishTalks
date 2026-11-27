/**
 * ProfilePage - view and edit your own profile.
 */

import { useEffect, useRef, useState } from "react";
import { FiCamera, FiEdit3, FiLogOut, FiShield } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import AppLayout from "../../../app/AppLayout.jsx";

import { userApi } from "../../../core/api/endpoints.js";
import { useAuth } from "../../../core/auth/useAuth.js";
import { validateProfile } from "../../../core/auth/validation.js";
import { errorMessage } from "../../../core/utils/errors.js";
import { formatDateTime } from "../../../core/utils/date.js";
import Avatar from "../../../shared/components/Avatar.jsx";
import Button from "../../../shared/components/Button.jsx";
import { Field, Input, Textarea } from "../../../shared/components/Field.jsx";
import { useToast } from "../../../shared/components/useToast.js";

/**
 * The profile screen.
 */
export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [about, setAbout] = useState(user?.about || "");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setFullName(user?.fullName || "");
    setAbout(user?.about || "");
  }, [user?.fullName, user?.about]);

  const handleSave = async (event) => {
    event.preventDefault();
    const validation = validateProfile({ fullName, about });
    setErrors(validation);
    if (Object.keys(validation).length) return;

    setSaving(true);
    try {
      const data = await userApi.updateProfile({ fullName: fullName.trim(), about });
      updateUser({
        fullName: data.user?.fullName ?? fullName.trim(),
        about: data.user?.about ?? about,
      });
      toast.success("Profile updated", "Your details have been saved.");
    } catch (error) {
      toast.error("Could not save your profile", errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Unsupported file", "Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", "Choose an image smaller than 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const data = await userApi.uploadAvatar(file);
      updateUser({ avatar: data.avatar });
      toast.success("Photo updated", "Your new profile picture is live.");
    } catch (error) {
      toast.error("Could not upload the photo", errorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/signin", { replace: true });
  };

  return (
    <AppLayout
      eyebrow="Account"
      title="Your profile"
      subtitle="This is how other people see you. Keep your details current so conversations start smoothly."
    >
      <div>

        <section className="card">
          <div className="card__body" style={{ display: "grid", gap: "var(--space-6)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <div style={{ position: "relative" }}>
                <Avatar src={user?.avatar} name={user?.fullName} size="xl" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  aria-label="Change your profile photo"
                  style={{
                    position: "absolute",
                    right: -4,
                    bottom: -4,
                    display: "grid",
                    placeItems: "center",
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: "var(--brand-600)",
                    color: "#fff",
                    border: "2px solid var(--surface-raised)",
                  }}
                >
                  <FiCamera size={15} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: "none" }}
                />
              </div>

              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: "var(--text-xl)", fontWeight: "var(--weight-semibold)" }}>
                  {user?.fullName}
                </p>
                <p style={{ color: "var(--text-tertiary)" }}>@{user?.username}</p>
                {user?.createdAt ? (
                  <p style={{ marginTop: 4, fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
                    Joined {formatDateTime(user.createdAt)}
                  </p>
                ) : null}
              </div>
            </div>

            <form className="auth-card__form" onSubmit={handleSave} noValidate>
              <Field label="Full name" error={errors.fullName}>
                {({ id }) => (
                  <Input
                    id={id}
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    invalid={Boolean(errors.fullName)}
                    maxLength={50}
                  />
                )}
              </Field>

              <Field label="About" hint={`${about.length}/150 characters`} error={errors.about}>
                {({ id }) => (
                  <Textarea
                    id={id}
                    value={about}
                    onChange={(event) => setAbout(event.target.value)}
                    invalid={Boolean(errors.about)}
                    maxLength={150}
                    placeholder="A short line about you"
                    rows={3}
                  />
                )}
              </Field>

              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <Button type="submit" loading={saving}>
                  <FiEdit3 size={15} /> Save changes
                </Button>
              </div>
            </form>
          </div>
        </section>

        <section className="section card">
          <div className="card__header">
            <h2 className="card__title">
              <FiShield size={16} style={{ display: "inline", verticalAlign: "-2px" }} /> Session
            </h2>
          </div>
          <div className="card__body" style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-4)", flexWrap: "wrap" }}>
            <p style={{ color: "var(--text-secondary)", maxWidth: "46ch" }}>
              Signing out clears this session from the device. Your conversations stay exactly where
              they are.
            </p>
            <Button variant="danger-ghost" onClick={handleLogout}>
              <FiLogOut size={15} /> Sign out
            </Button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
