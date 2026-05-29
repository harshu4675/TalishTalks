import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineMail,
  HiOutlineUser,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineUserCircle,
  HiCheckCircle,
  HiXCircle,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";

const RegisterForm = ({ onSwitchToLogin }) => {
  const navigate = useNavigate();
  const { register } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken'

  // Password strength calculation
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Calculate password strength
  useEffect(() => {
    const calculateStrength = (password) => {
      let strength = 0;
      if (password.length >= 6) strength += 25;
      if (password.length >= 10) strength += 25;
      if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength += 25;
      if (/\d/.test(password) && /[!@#$%^&*]/.test(password)) strength += 25;
      else if (/\d/.test(password)) strength += 15;
      return Math.min(strength, 100);
    };
    setPasswordStrength(calculateStrength(formData.password));
  }, [formData.password]);

  // Username availability check (debounced)
  useEffect(() => {
    if (!formData.username || formData.username.length < 3) {
      setUsernameStatus(null);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/auth/check-username/${formData.username}`);
        setUsernameStatus(res.data.available ? "available" : "taken");
      } catch (err) {
        setUsernameStatus(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Frontend form validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Name must be at least 2 characters";
    }

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = "Only letters, numbers, and underscores allowed";
    } else if (usernameStatus === "taken") {
      newErrors.username = "Username is already taken";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = "Must contain letters and numbers";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors before submitting");
      return;
    }

    setLoading(true);

    const result = await register({
      fullName: formData.fullName,
      username: formData.username,
      email: formData.email,
      password: formData.password,
    });

    setLoading(false);

    if (result.success) {
      toast.success("Welcome to Talish Talks! 🎉");
      navigate("/");
    } else {
      toast.error(result.message || "Registration failed");
    }
  };

  // Get password strength color and label
  const getStrengthInfo = () => {
    if (passwordStrength === 0) return { color: "bg-dark-200", label: "" };
    if (passwordStrength <= 25) return { color: "bg-red-500", label: "Weak" };
    if (passwordStrength <= 50)
      return { color: "bg-orange-500", label: "Fair" };
    if (passwordStrength <= 75)
      return { color: "bg-yellow-500", label: "Good" };
    return { color: "bg-green-500", label: "Strong" };
  };

  const strengthInfo = getStrengthInfo();

  return (
    <motion.form
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      {/* Full Name Field */}
      <div>
        <label className="block text-xs font-medium text-gray-soft mb-1.5">
          Full Name
        </label>
        <div className="relative">
          <HiOutlineUserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-soft text-lg" />
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="John Doe"
            className={`input-dark pl-10 ${
              errors.fullName ? "border-red-500/50" : ""
            }`}
            autoComplete="name"
          />
        </div>
        {errors.fullName && (
          <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>
        )}
      </div>

      {/* Username Field */}
      <div>
        <label className="block text-xs font-medium text-gray-soft mb-1.5">
          Username
        </label>
        <div className="relative">
          <HiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-soft text-lg" />
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="johndoe"
            className={`input-dark pl-10 pr-10 ${
              errors.username
                ? "border-red-500/50"
                : usernameStatus === "available"
                  ? "border-green-500/50"
                  : usernameStatus === "taken"
                    ? "border-red-500/50"
                    : ""
            }`}
            autoComplete="username"
          />
          {/* Username status icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {usernameStatus === "checking" && (
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            )}
            {usernameStatus === "available" && (
              <HiCheckCircle className="text-green-500 text-lg" />
            )}
            {usernameStatus === "taken" && (
              <HiXCircle className="text-red-500 text-lg" />
            )}
          </div>
        </div>
        {errors.username && (
          <p className="text-red-400 text-xs mt-1">{errors.username}</p>
        )}
        {!errors.username && usernameStatus === "available" && (
          <p className="text-green-400 text-xs mt-1">✓ Username is available</p>
        )}
        {!errors.username && usernameStatus === "taken" && (
          <p className="text-red-400 text-xs mt-1">Username is already taken</p>
        )}
      </div>

      {/* Email Field */}
      <div>
        <label className="block text-xs font-medium text-gray-soft mb-1.5">
          Email
        </label>
        <div className="relative">
          <HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-soft text-lg" />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className={`input-dark pl-10 ${
              errors.email ? "border-red-500/50" : ""
            }`}
            autoComplete="email"
          />
        </div>
        {errors.email && (
          <p className="text-red-400 text-xs mt-1">{errors.email}</p>
        )}
      </div>

      {/* Password Field */}
      <div>
        <label className="block text-xs font-medium text-gray-soft mb-1.5">
          Password
        </label>
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
            autoComplete="new-password"
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

        {/* Password strength indicator */}
        {formData.password && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex-1 h-1 bg-dark-200 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${strengthInfo.color} transition-all duration-300`}
                  initial={{ width: 0 }}
                  animate={{ width: `${passwordStrength}%` }}
                />
              </div>
              <span className="text-xs text-gray-soft ml-2 min-w-[50px] text-right">
                {strengthInfo.label}
              </span>
            </div>
          </div>
        )}

        {errors.password && (
          <p className="text-red-400 text-xs mt-1">{errors.password}</p>
        )}
      </div>

      {/* Confirm Password Field */}
      <div>
        <label className="block text-xs font-medium text-gray-soft mb-1.5">
          Confirm Password
        </label>
        <div className="relative">
          <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-soft text-lg" />
          <input
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            className={`input-dark pl-10 pr-10 ${
              errors.confirmPassword ? "border-red-500/50" : ""
            }`}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-soft hover:text-offwhite transition-colors"
          >
            {showConfirmPassword ? (
              <HiOutlineEyeOff className="text-lg" />
            ) : (
              <HiOutlineEye className="text-lg" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="btn-accent w-full mt-6 relative"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Creating account...
          </span>
        ) : (
          "Create Account"
        )}
      </button>

      {/* Switch to Login */}
      <p className="text-center text-sm text-gray-soft mt-4">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-accent hover:text-accent-light font-semibold transition-colors"
        >
          Login here
        </button>
      </p>
    </motion.form>
  );
};

export default RegisterForm;
