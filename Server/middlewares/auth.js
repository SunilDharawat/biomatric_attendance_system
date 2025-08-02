// middlewares/auth.js - Authentication middleware
const jwt = require("jsonwebtoken");
const { executeQuery } = require("../config/db");

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if user still exists and is active
    const users = await executeQuery(
      "SELECT id, name, email, role, employee_id, is_active FROM users WHERE id = ? AND is_active = true",
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User not found or inactive",
      });
    }

    // Attach user info to request
    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during authentication",
    });
  }
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }
  next();
};

// Middleware to check if user is employee or admin
const isEmployeeOrAdmin = (req, res, next) => {
  if (req.user.role !== "employee" && req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Employee or admin access required",
    });
  }
  next();
};

// Middleware to check if user can access their own data or is admin
const canAccessUserData = (req, res, next) => {
  const targetUserId = parseInt(
    req.params.userId || req.body.userId || req.query.userId
  );

  if (req.user.role === "admin" || req.user.id === targetUserId) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Access denied: Can only access your own data",
    });
  }
};

module.exports = {
  authenticateToken,
  isAdmin,
  isEmployeeOrAdmin,
  canAccessUserData,
};
