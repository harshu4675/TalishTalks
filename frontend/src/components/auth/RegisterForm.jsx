import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";
import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";
const RegisterForm = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", username: "", email: "", password: "", confirmPassword: "" });
  const [visible, setVisible] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [usernameStatus, setUsernameStatus] = useState("");
  useEffect(() => {
    setUsernameStatus("");
    if (form.username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(form.username)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setUsernameStatus("Checking username…");
      try { const response = await api.get(`/auth/check-username/${encodeURIComponent(form.username)}`, { signal: controller.signal }); setUsernameStatus(response.data.available ? "Username is available" : "Username is already taken"); }
      catch (failure) { if (failure.code !== "ERR_CANCELED") setUsernameStatus("Could not check username. You can still submit."); }
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [form.username]);
  const change = (event) => setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); if (busy) return;
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    if (usernameStatus === "Username is already taken") { setError("Choose another username."); return; }
    setBusy(true); setError("");
    const result = await register({ fullName: form.fullName.trim(), username: form.username.trim(), email: form.email.trim(), password: form.password });
    setBusy(false);
    if (result.success) navigate("/", { replace: true }); else setError(result.message);
  };
  return <form className="auth-form" onSubmit={submit}>
    <label className="field-label">Full name<input data-autofocus className="input" name="fullName" autoComplete="name" minLength={2} maxLength={50} required value={form.fullName} onChange={change} /></label>
    <label className="field-label">Username<input className="input" aria-label="Username" name="username" autoComplete="username" minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+" required value={form.username} onChange={change} aria-describedby="username-status" /><span id="username-status" className={`block text-xs mt-1 ${usernameStatus.includes("taken") ? "form-error" : "muted"}`}>{usernameStatus || "3–20 letters, numbers or underscores"}</span></label>
    <label className="field-label">Email<input className="input" name="email" type="email" autoComplete="email" maxLength={254} required value={form.email} onChange={change} /></label>
    <label className="field-label">Password<div className="password-field"><input className="input" aria-label="Password" name="password" type={visible ? "text" : "password"} autoComplete="new-password" minLength={6} maxLength={72} required value={form.password} onChange={change} /><button type="button" className="icon-button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <HiOutlineEyeOff /> : <HiOutlineEye />}</button></div><span className="muted text-xs font-normal block mt-1">At least 6 characters, including a letter and a number.</span></label>
    <label className="field-label">Confirm password<input className="input" name="confirmPassword" type={visible ? "text" : "password"} autoComplete="new-password" required maxLength={72} value={form.confirmPassword} onChange={change} /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button primary" disabled={busy || usernameStatus === "Checking username…"}>{busy ? "Creating account…" : "Create account"}</button>
    <p className="muted text-center text-sm">Already have an account? <button type="button" className="text-button" onClick={onSwitchToLogin}>Sign in</button></p>
  </form>;
};
export default RegisterForm;
