import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import TalishLogo from "../assets/logo";
import LoginForm from "../components/auth/LoginForm";
import RegisterForm from "../components/auth/RegisterForm";
import { useAuth } from "../hooks/useAuth";
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate(), location = useLocation();
  const { user, loading, error, checkAuth } = useAuth();
  useEffect(() => { if (!loading && user) navigate(location.state?.from?.startsWith("/chat/") ? location.state.from : "/", { replace: true }); }, [user, loading, navigate, location.state]);
  return <div className="auth-page"><div className="auth-container">
    <div className="auth-brand"><TalishLogo size="lg" /></div>
    <main className="auth-card"><h1>{isLogin ? "Welcome back" : "Create your account"}</h1><p className="auth-subtitle">{isLogin ? "Sign in to continue your conversations." : "A simpler way to keep in touch."}</p>
      <div className="auth-tabs" role="tablist" aria-label="Account access"><button role="tab" aria-selected={isLogin} className={isLogin ? "active" : ""} onClick={() => setIsLogin(true)}>Sign in</button><button role="tab" aria-selected={!isLogin} className={!isLogin ? "active" : ""} onClick={() => setIsLogin(false)}>Create account</button></div>
      {error && !user && <div className="inline-error mb-4"><p>{error}</p><button className="text-button" onClick={checkAuth}>Retry session check</button></div>}
      {isLogin ? <LoginForm onSwitchToRegister={() => setIsLogin(false)} /> : <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />}
    </main><footer className="auth-footer">Your conversations, connected.<br />Talish Talks</footer>
  </div></div>;
};
export default AuthPage;
