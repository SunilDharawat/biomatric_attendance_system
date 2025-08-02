// routes/auth.js - Authentication routes
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { executeQuery } = require("../config/db");
const { authenticateToken, isAdmin } = require("../middlewares/auth");

const router = express.Router();

// JWT secret
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      employee_id: user.employee_id,
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
};

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user by email
    const users = await executeQuery(
      "SELECT * FROM users WHERE email = ? AND is_active = true",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = users[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken(user);

    // Remove password from user object
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register new user (Admin only)
// @access  Private (Admin)
router.post("/register", authenticateToken, isAdmin, async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = "employee",
      employee_id,
      department,
      phone,
    } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    // Check if user already exists
    const existingUsers = await executeQuery(
      "SELECT id FROM users WHERE email = ? OR employee_id = ?",
      [email, employee_id]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User with this email or employee ID already exists",
      });
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await executeQuery(
      `INSERT INTO users (name, email, password_hash, role, employee_id, department, phone) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, password_hash, role, employee_id, department, phone]
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: result.insertId,
        name,
        email,
        role,
        employee_id,
        department,
        phone,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user info
// @access  Private
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const users = await executeQuery(
      "SELECT id, name, email, role, employee_id, department, phone, created_at FROM users WHERE id = ?",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: users[0],
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting user info",
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post("/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    // Get current user
    const users = await executeQuery(
      "SELECT password_hash FROM users WHERE id = ?",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      users[0].password_hash
    );
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await executeQuery(
      "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newPasswordHash, req.user.id]
    );

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error changing password",
    });
  }
});

// @route   POST /api/auth/refresh-token
// @desc    Refresh JWT token
// @access  Private
router.post("/refresh-token", authenticateToken, async (req, res) => {
  try {
    // Generate new token
    const newToken = generateToken(req.user);

    res.json({
      success: true,
      message: "Token refreshed successfully",
      token: newToken,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      success: false,
      message: "Server error refreshing token",
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post("/logout", authenticateToken, (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // Here we just acknowledge the logout request
  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

module.exports = router;
