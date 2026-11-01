import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";
import { useAuth } from "../../hooks/useAuth";
const LoginForm = ({ onSwitchToRegister }) => {
  const { login } = useAuth();
  const navigate = useNavigate(), location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    const result = await login({ identifier: identifier.trim(), password });
    setBusy(false);
    if (result.success) navigate(location.state?.from?.startsWith("/chat/") ? location.state.from : "/", { replace: true });
    else setError(result.message);
  };
  return <form className="auth-form" onSubmit={submit}>
    <label className="field-label">Email or username<input className="input" name="identifier" autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="you@example.com" required maxLength={254} /></label>
    <label className="field-label">Password<div className="password-field"><input className="input" type={visible ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={72} /><button type="button" className="icon-button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <HiOutlineEyeOff /> : <HiOutlineEye />}</button></div></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button primary" disabled={busy || !identifier.trim() || !password}>{busy ? "Signing in…" : "Sign in"}</button>
    <p className="muted text-center text-sm">New to Talish Talks? <button type="button" className="text-button" onClick={onSwitchToRegister}>Create an account</button></p>
  </form>;
};
export default LoginForm;
