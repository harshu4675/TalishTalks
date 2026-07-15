import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineUser,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeOff,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";

const LoginForm = ({ onSwitchToRegister }) => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.identifier.trim()) {
      newErrors.identifier = "Email or username is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const result = await login({
      identifier: formData.identifier,
      password: formData.password,
    });

    setLoading(false);

    if (result.success) {
      toast.success("Welcome back!");
      navigate("/");
    } else {
      toast.error(result.message || "Login failed");
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {/* Email or Username Field */}
      <div>
        <label className="block text-xs font-medium text-gray-soft mb-1.5">
          Email or Username
        </label>
        <div className="relative">
          <HiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-soft text-lg" />
          <input
            type="text"
            name="identifier"
            value={formData.identifier}
            onChange={handleChange}
            placeholder="you@example.com or username"
            className={`input-dark pl-10 ${
              errors.identifier ? "border-red-500/50" : ""
            }`}
            autoComplete="username"
          />
        </div>
        {errors.identifier && (
          <p className="text-red-400 text-xs mt-1">{errors.identifier}</p>
        )}
      </div>

      {/* Password Field */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-medium text-gray-soft">
            Password
          </label>
          <button
            type="button"
            className="text-xs text-accent hover:text-accent-light transition-colors"
            onClick={() => toast("Coming soon! 🚀", { icon: "🔧" })}
          >
            Forgot?
          </button>
        </div>
        <div className="relative">
          <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-soft text-lg" />
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            className={`input-dark pl-10 pr-10 ${
              errors.password ? "border-red-500/50" : ""
            }`}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-soft hover:text-offwhite transition-colors"
          >
            {showPassword ? (
              <HiOutlineEyeOff className="text-lg" />
            ) : (
              <HiOutlineEye className="text-lg" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-red-400 text-xs mt-1">{errors.password}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="btn-accent w-full mt-6"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Logging in...
          </span>
        ) : (
          "Login"
        )}
      </button>

      {/* Switch to Register */}
      <p className="text-center text-sm text-gray-soft mt-4">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-accent hover:text-accent-light font-semibold transition-colors"
        >
          Create one
        </button>
      </p>
    </motion.form>
  );
};

export default LoginForm;
