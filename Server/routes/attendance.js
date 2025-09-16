// routes/attendance.js - Attendance management routes
const express = require("express");
const { executeQuery } = require("../config/db");
const {
  authenticateToken,
  isAdmin,
  canAccessUserData,
} = require("../middlewares/auth");

const router = express.Router();

// Helper function to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Helper function to get office location from settings
const getOfficeLocation = async () => {
  const rules = await executeQuery(
    "SELECT office_latitude, office_longitude, location_radius_meters,check_in_time, check_out_time,late_threshold_minutes FROM attendance_rules WHERE is_active = true LIMIT 1"
  );

  if (rules.length > 0) {
    return {
      latitude: rules[0].office_latitude,
      longitude: rules[0].office_longitude,
      radius: rules[0].location_radius_meters,
      checkInTime: rules[0].check_in_time,
      checkOutTime: rules[0].check_out_time,
      lateThreshold: rules[0].late_threshold_minutes,
    };
  }

  // Default office location (Bhopal)
  return {
    latitude: 23.2599,
    longitude: 77.4126,
    radius: 100,
  };
};

// @route   POST /api/attendance/checkin
// @desc    Check in attendance
// @access  Private
router.post("/checkin", authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, device_id, notes } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Location coordinates are required",
      });
    }

    // Check if user already checked in today
    const today = new Date().toISOString().split("T")[0];
    const existingCheckIn = await executeQuery(
      "SELECT id FROM attendance WHERE user_id = ? AND DATE(check_in) = ? AND check_out IS NULL",
      [userId, today]
    );

    if (existingCheckIn.length > 0) {
      return res.status(400).json({
        success: false,
        message: "You have already checked in today",
      });
    }

    // Get office location and validate distance
    const officeLocation = await getOfficeLocation();
    const distance = calculateDistance(
      latitude,
      longitude,
      officeLocation.latitude,
      officeLocation.longitude
    );

    if (distance > officeLocation.radius) {
      return res.status(400).json({
        success: false,
        message: `You are ${Math.round(
          distance
        )}m away from office. Please check in from office location.`,
        distance: Math.round(distance),
        allowedRadius: officeLocation.radius,
      });
    }

    // // Determine if check-in is late
    // const checkInTime = new Date();
    // const checkInTimeStr = checkInTime.toTimeString().substring(0, 8);
    // const workStartTime = officeLocation.checkInTime; // 11:30:00  officeLocation have all details of settings
    // const lateThreshold = officeLocation.lateThreshold; // 15  as minitues

    // let status = "present";
    // if (checkInTimeStr > "09:15:00") {
    //   // 15 minutes late threshold
    //   status = "late";
    // }

    const checkInTime = new Date(); // Actual check-in timestamp
    const workStartTimeStr = officeLocation.checkInTime; // e.g., "11:30:00"
    const lateThreshold = officeLocation.lateThreshold; // e.g., 15 (minutes)

    // Parse workStartTime string into Date
    const [startHour, startMinute, startSecond] = workStartTimeStr
      .split(":")
      .map(Number);
    const lateCutoff = new Date(checkInTime); // create a copy with the same date
    lateCutoff.setHours(
      startHour,
      startMinute + lateThreshold,
      startSecond || 0,
      0
    ); // Add lateThreshold minutes

    let status = "present";
    if (checkInTime > lateCutoff) {
      status = "late";
    }

    // Insert check-in record
    const result = await executeQuery(
      `INSERT INTO attendance (user_id, check_in, latitude_in, longitude_in, device_id, notes, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        checkInTime,
        latitude,
        longitude,
        device_id || null,
        notes || null,
        status,
      ]
    );

    // Register/update device if device_id provided
    if (device_id) {
      await executeQuery(
        `INSERT INTO user_devices (user_id, device_id, device_name, last_used) 
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE last_used = NOW(), is_active = true`,
        [userId, device_id, "Mobile Device"]
      );
    }

    res.status(201).json({
      success: true,
      message: `Check-in successful${
        status === "late" ? " (marked as late)" : ""
      }`,
      attendance: {
        id: result.insertId,
        check_in: checkInTime,
        status: status,
        distance: Math.round(distance),
      },
    });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during check-in",
    });
  }
});

// @route   POST /api/attendance/checkout
// @desc    Check out attendance
// @access  Private
router.post("/checkout", authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, notes } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Location coordinates are required",
      });
    }

    // Find today's check-in record
    const today = new Date().toISOString().split("T")[0];
    const attendance = await executeQuery(
      "SELECT * FROM attendance WHERE user_id = ? AND DATE(check_in) = ? AND check_out IS NULL ORDER BY check_in DESC LIMIT 1",
      [userId, today]
    );

    if (attendance.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No active check-in found for today",
      });
    }

    const attendanceRecord = attendance[0];
    const checkOutTime = new Date();

    // Calculate total working hours
    const checkInTime = new Date(attendanceRecord.check_in);
    const totalMinutes = Math.floor((checkOutTime - checkInTime) / (1000 * 60));
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    // Update status based on working hours
    let finalStatus = attendanceRecord.status;
    if (totalMinutes < 240) {
      // Less than 4 hours
      finalStatus = "half_day";
    }

    // Update attendance record with check-out
    await executeQuery(
      `UPDATE attendance 
       SET check_out = ?, latitude_out = ?, longitude_out = ?, 
           notes = CONCAT(COALESCE(notes, ''), CASE WHEN notes IS NOT NULL THEN '; ' ELSE '' END, ?),
           status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        checkOutTime,
        latitude,
        longitude,
        notes || "Check-out completed",
        finalStatus,
        attendanceRecord.id,
      ]
    );

    res.json({
      success: true,
      message: "Check-out successful",
      attendance: {
        id: attendanceRecord.id,
        check_in: checkInTime,
        check_out: checkOutTime,
        total_hours: `${totalHours}h ${remainingMinutes}m`,
        total_minutes: totalMinutes,
        status: finalStatus,
      },
    });
  } catch (error) {
    console.error("Check-out error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during check-out",
    });
  }
});

// @route   GET /api/attendance/my
// @desc    Get my attendance history with safe param parsing
// @access  Private
router.get("/my", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const month = req.query.month ? parseInt(req.query.month) : null;
    const year = req.query.year ? parseInt(req.query.year) : null;
    const offset = (page - 1) * limit;

    let dateFilter = "";
    let dateParams = [];

    if (month && year) {
      dateFilter = "AND MONTH(check_in) = ? AND YEAR(check_in) = ?";
      dateParams = [month, year];
    } else if (year) {
      dateFilter = "AND YEAR(check_in) = ?";
      dateParams = [year];
    }

    console.log(
      "Attendance params:",
      [userId, ...dateParams],
      `LIMIT ${limit} OFFSET ${offset}`
    );

    const attendance = await executeQuery(
      `
  SELECT 
    id,
    DATE(check_in) as date,
    TIME(check_in) as check_in_time,
    TIME(check_out) as check_out_time,
    CASE 
      WHEN check_out IS NOT NULL 
      THEN TIMESTAMPDIFF(MINUTE, check_in, check_out)
      ELSE NULL 
    END as total_minutes,
    status,
    notes,
    latitude_in,
    longitude_in,
    created_at
  FROM attendance
  WHERE user_id = ? ${dateFilter}
  ORDER BY check_in DESC
  LIMIT ${limit} OFFSET ${offset}
  `,
      [userId, ...dateParams]
    );

    const totalCount = await executeQuery(
      `SELECT COUNT(*) as count FROM attendance WHERE user_id = ? ${dateFilter}`,
      [userId, ...dateParams]
    );

    // Get summary stats for current month
    const monthlyStats = await executeQuery(
      `SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
        SUM(CASE WHEN status = 'half_day' THEN 1 ELSE 0 END) as half_days,
        AVG(CASE WHEN check_out IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, check_in, check_out) ELSE NULL END) as avg_hours
       FROM attendance 
       WHERE user_id = ? AND MONTH(check_in) = MONTH(CURRENT_DATE()) AND YEAR(check_in) = YEAR(CURRENT_DATE())`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        attendance: attendance,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalCount[0].count / limit),
          total_records: totalCount[0].count,
          per_page: limit,
        },
        monthly_summary: monthlyStats[0],
      },
    });
  } catch (error) {
    console.error("Get attendance error:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting attendance data",
    });
  }
});

// @route   GET /api/attendance/today
// @desc    Get today's attendance status
// @access  Private
router.get("/today", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split("T")[0];

    const todayAttendance = await executeQuery(
      `SELECT 
        id,
        check_in,
        check_out,
        TIME(check_in) as check_in_time,
        TIME(check_out) as check_out_time,
        status,
        CASE 
          WHEN check_out IS NOT NULL 
          THEN TIMESTAMPDIFF(MINUTE, check_in, check_out)
          ELSE TIMESTAMPDIFF(MINUTE, check_in, NOW())
        END as minutes_worked,
        notes
       FROM attendance 
       WHERE user_id = ? AND DATE(check_in) = ?
       ORDER BY check_in DESC LIMIT 1`,
      [userId, today]
    );

    const isCheckedIn =
      todayAttendance.length > 0 && !todayAttendance[0].check_out;
    const hasCheckedOut =
      todayAttendance.length > 0 && todayAttendance[0].check_out;

    res.json({
      success: true,
      data: {
        has_attendance: todayAttendance.length > 0,
        is_checked_in: isCheckedIn,
        has_checked_out: hasCheckedOut,
        attendance: todayAttendance[0] || null,
        can_check_in: todayAttendance.length === 0,
        can_check_out: isCheckedIn,
      },
    });
  } catch (error) {
    console.error("Get today attendance error:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting today's attendance",
    });
  }
});

// @route   GET /api/attendance/user/:userId
// @desc    Get user attendance (Admin only or own data)
// @access  Private
router.get(
  "/user/:userId",
  authenticateToken,
  canAccessUserData,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10, month, year } = req.query;
      const offset = (page - 1) * limit;

      let dateFilter = "";
      let dateParams = [];

      if (month && year) {
        dateFilter = "AND MONTH(a.check_in) = ? AND YEAR(a.check_in) = ?";
        dateParams = [month, year];
      }

      const user = await executeQuery(
        "SELECT name, employee_id, department FROM users WHERE id = ?",
        [userId]
      );

      if (user.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const attendance = await executeQuery(
        `SELECT 
          a.id,
          DATE(a.check_in) as date,
          TIME(a.check_in) as check_in_time,
          TIME(a.check_out) as check_out_time,
          CASE 
            WHEN a.check_out IS NOT NULL 
            THEN TIMESTAMPDIFF(MINUTE, a.check_in, a.check_out)
            ELSE NULL 
          END as total_minutes,
          a.status,
          a.notes
         FROM attendance a
         WHERE a.user_id = ? ${dateFilter}
         ORDER BY a.check_in DESC 
         LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
        [userId, ...dateParams]
      );

      res.json({
        success: true,
        data: {
          user: user[0],
          attendance: attendance,
        },
      });
    } catch (error) {
      console.error("Get user attendance error:", error);
      res.status(500).json({
        success: false,
        message: "Server error getting user attendance",
      });
    }
  }
);

// @route   PUT /api/attendance/:attendanceId
// @desc    Update attendance record (Admin only)
// @access  Private (Admin)
router.put("/:attendanceId", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { check_in, check_out, status, notes } = req.body;

    // Validate attendance record exists
    const attendance = await executeQuery(
      "SELECT id FROM attendance WHERE id = ?",
      [attendanceId]
    );

    if (attendance.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (check_in) {
      updates.push("check_in = ?");
      params.push(check_in);
    }
    if (check_out) {
      updates.push("check_out = ?");
      params.push(check_out);
    }
    if (status) {
      updates.push("status = ?");
      params.push(status);
    }
    if (notes !== undefined) {
      updates.push("notes = ?");
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(attendanceId);

    await executeQuery(
      `UPDATE attendance SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    res.json({
      success: true,
      message: "Attendance record updated successfully",
    });
  } catch (error) {
    console.error("Update attendance error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating attendance",
    });
  }
});

// @route   DELETE /api/attendance/:attendanceId
// @desc    Delete attendance record (Admin only)
// @access  Private (Admin)
router.delete(
  "/:attendanceId",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      const { attendanceId } = req.params;

      const result = await executeQuery("DELETE FROM attendance WHERE id = ?", [
        attendanceId,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Attendance record not found",
        });
      }

      res.json({
        success: true,
        message: "Attendance record deleted successfully",
      });
    } catch (error) {
      console.error("Delete attendance error:", error);
      res.status(500).json({
        success: false,
        message: "Server error deleting attendance",
      });
    }
  }
);

module.exports = router;
