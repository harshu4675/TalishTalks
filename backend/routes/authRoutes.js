const express = require("express");
const { body } = require("express-validator");
const {
  register,
  login,
  getMe,
  logout,
  checkUsername,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// ============================================
// VALIDATION RULES
// ============================================

// Register validation rules
const registerValidation = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Full name must be between 2 and 50 characters"),

  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 20 })
    .withMessage("Username must be between 3 and 20 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one letter and one number"),
];

// Login validation rules
const loginValidation = [
  body("identifier")
    .trim()
    .notEmpty()
    .withMessage("Email or username is required"),

  body("password").notEmpty().withMessage("Password is required"),
];

// ============================================
// ROUTES
// ============================================

// POST /api/auth/register
router.post("/register", registerValidation, register);

// POST /api/auth/login
router.post("/login", loginValidation, login);

// GET /api/auth/me - Get current user
router.get("/me", protect, getMe);

// POST /api/auth/logout
router.post("/logout", protect, logout);

// GET /api/auth/check-username/:username
router.get("/check-username/:username", checkUsername);

module.exports = router;
