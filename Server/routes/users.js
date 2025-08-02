// routes/users.js - User management routes
const express = require("express");
const bcrypt = require("bcryptjs");
const { executeQuery } = require("../config/db");
const {
  authenticateToken,
  isAdmin,
  canAccessUserData,
} = require("../middlewares/auth");

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private (Admin)
router.get("/", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, department, role } = req.query;
    const offset = (page - 1) * limit;

    // Build search filters
    let whereClause = "WHERE 1=1";
    let params = [];

    if (search) {
      whereClause += " AND (name LIKE ? OR email LIKE ? OR employee_id LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (department) {
      whereClause += " AND department = ?";
      params.push(department);
    }

    if (role) {
      whereClause += " AND role = ?";
      params.push(role);
    }

    // ✅ Inline LIMIT/OFFSET safely
    const users = await executeQuery(
      `SELECT 
        id, name, email, role, employee_id, department, phone, 
        is_active, created_at, updated_at
       FROM users 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
      params
    );

    // Get total count
    const totalCount = await executeQuery(
      `SELECT COUNT(*) as count FROM users ${whereClause}`,
      params
    );

    // Department stats stays same — no problem there
    const departmentStats = await executeQuery(
      `SELECT 
        department, 
        COUNT(*) as employee_count,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count
       FROM users 
       WHERE role = 'employee' AND department IS NOT NULL
       GROUP BY department
       ORDER BY employee_count DESC`
    );

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalCount[0].count / limit),
          total_records: totalCount[0].count,
          per_page: parseInt(limit),
        },
        department_stats: departmentStats,
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting users",
    });
  }
});

// @route   GET /api/users/:userId
// @desc    Get single user
// @access  Private (Admin or own data)
router.get(
  "/:userId",
  authenticateToken,
  canAccessUserData,
  async (req, res) => {
    try {
      const { userId } = req.params;

      const users = await executeQuery(
        `SELECT 
        id, name, email, role, employee_id, department, phone, 
        is_active, created_at, updated_at
       FROM users WHERE id = ?`,
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Get user's recent attendance stats if requesting own data or admin
      const attendanceStats = await executeQuery(
        `SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
        SUM(CASE WHEN status = 'half_day' THEN 1 ELSE 0 END) as half_days,
        AVG(CASE WHEN check_out IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, check_in, check_out) ELSE NULL END) as avg_minutes
       FROM attendance 
       WHERE user_id = ? AND check_in >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)`,
        [userId]
      );

      // Get registered devices
      const devices = await executeQuery(
        `SELECT device_id, device_name, biometric_enabled, last_used, is_active
       FROM user_devices 
       WHERE user_id = ? AND is_active = true
       ORDER BY last_used DESC`,
        [userId]
      );

      res.json({
        success: true,
        data: {
          user: users[0],
          attendance_stats: attendanceStats[0],
          devices: devices,
        },
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({
        success: false,
        message: "Server error getting user",
      });
    }
  }
);

// @route   PUT /api/users/:userId
// @desc    Update user
// @access  Private (Admin or own basic data)
router.put("/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, department, phone, role, is_active } = req.body;

    // Check permissions
    const isOwnData = req.user.id === parseInt(userId);
    const isAdmin = req.user.role === "admin";

    if (!isOwnData && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Non-admin users can only update limited fields
    const allowedUpdates = isAdmin
      ? ["name", "email", "department", "phone", "role", "is_active"]
      : ["name", "phone"]; // Regular users can only update name and phone

    // Build update query
    const updates = [];
    const params = [];

    if (name && allowedUpdates.includes("name")) {
      updates.push("name = ?");
      params.push(name);
    }
    if (email && allowedUpdates.includes("email")) {
      // Check if email already exists
      const existingEmail = await executeQuery(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email, userId]
      );
      if (existingEmail.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
      updates.push("email = ?");
      params.push(email);
    }
    if (department && allowedUpdates.includes("department")) {
      updates.push("department = ?");
      params.push(department);
    }
    if (phone && allowedUpdates.includes("phone")) {
      updates.push("phone = ?");
      params.push(phone);
    }
    if (role && allowedUpdates.includes("role")) {
      updates.push("role = ?");
      params.push(role);
    }
    if (is_active !== undefined && allowedUpdates.includes("is_active")) {
      updates.push("is_active = ?");
      params.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(userId);

    const result = await executeQuery(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating user",
    });
  }
});

// @route   DELETE /api/users/:userId
// @desc    Delete user (Admin only)
// @access  Private (Admin)
router.delete("/:userId", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent admin from deleting themselves
    if (req.user.id === parseInt(userId)) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    // Soft delete - just deactivate the user
    const result = await executeQuery(
      "UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting user",
    });
  }
});

// @route   POST /api/users/:userId/reset-password
// @desc    Reset user password (Admin only)
// @access  Private (Admin)
router.post(
  "/:userId/reset-password",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { new_password } = req.body;

      if (!new_password) {
        return res.status(400).json({
          success: false,
          message: "New password is required",
        });
      }

      if (new_password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      // Hash new password
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(new_password, saltRounds);

      const result = await executeQuery(
        "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [password_hash, userId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({
        success: false,
        message: "Server error resetting password",
      });
    }
  }
);

// @route   GET /api/users/:userId/devices
// @desc    Get user devices
// @access  Private (Admin or own data)
router.get(
  "/:userId/devices",
  authenticateToken,
  canAccessUserData,
  async (req, res) => {
    try {
      const { userId } = req.params;

      const devices = await executeQuery(
        `SELECT 
        id, device_id, device_name, biometric_enabled, 
        last_used, is_active, created_at
       FROM user_devices 
       WHERE user_id = ?
       ORDER BY last_used DESC`,
        [userId]
      );

      res.json({
        success: true,
        data: devices,
      });
    } catch (error) {
      console.error("Get user devices error:", error);
      res.status(500).json({
        success: false,
        message: "Server error getting user devices",
      });
    }
  }
);

// @route   POST /api/users/:userId/devices
// @desc    Register new device for user
// @access  Private (Admin or own data)
router.post(
  "/:userId/devices",
  authenticateToken,
  canAccessUserData,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { device_id, device_name, biometric_enabled = false } = req.body;

      if (!device_id) {
        return res.status(400).json({
          success: false,
          message: "Device ID is required",
        });
      }

      // Insert or update device
      await executeQuery(
        `INSERT INTO user_devices (user_id, device_id, device_name, biometric_enabled, last_used) 
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE 
       device_name = VALUES(device_name),
       biometric_enabled = VALUES(biometric_enabled),
       last_used = NOW(),
       is_active = true`,
        [userId, device_id, device_name || "Mobile Device", biometric_enabled]
      );

      res.json({
        success: true,
        message: "Device registered successfully",
      });
    } catch (error) {
      console.error("Register device error:", error);
      res.status(500).json({
        success: false,
        message: "Server error registering device",
      });
    }
  }
);

// @route   DELETE /api/users/:userId/devices/:deviceId
// @desc    Remove device from user
// @access  Private (Admin or own data)
router.delete(
  "/:userId/devices/:deviceId",
  authenticateToken,
  canAccessUserData,
  async (req, res) => {
    try {
      const { userId, deviceId } = req.params;

      const result = await executeQuery(
        "UPDATE user_devices SET is_active = false WHERE user_id = ? AND device_id = ?",
        [userId, deviceId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Device not found",
        });
      }

      res.json({
        success: true,
        message: "Device removed successfully",
      });
    } catch (error) {
      console.error("Remove device error:", error);
      res.status(500).json({
        success: false,
        message: "Server error removing device",
      });
    }
  }
);

module.exports = router;
