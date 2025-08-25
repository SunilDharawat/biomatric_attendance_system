// routes/reports.js - Reports and analytics routes
const express = require("express");
const { executeQuery } = require("../config/db");
const { authenticateToken, isAdmin } = require("../middlewares/auth");

const router = express.Router();

// @route   GET /api/reports/attendance
// @desc    Get attendance report (Admin only)
// @access  Private (Admin)
router.get("/attendance", authenticateToken, isAdmin, async (req, res) => {
  try {
    const {
      start_date,
      end_date,
      user_id,
      department,
      status,
      page = 1,
      limit = 50,
    } = req.query;

    const offset = (page - 1) * limit;

    // Build filters
    let whereClause = "WHERE 1=1";
    let params = [];

    if (start_date) {
      whereClause += " AND DATE(a.check_in) >= ?";
      params.push(start_date);
    }
    if (end_date) {
      whereClause += " AND DATE(a.check_in) <= ?";
      params.push(end_date);
    }
    if (user_id) {
      whereClause += " AND a.user_id = ?";
      params.push(user_id);
    }
    if (department) {
      whereClause += " AND u.department = ?";
      params.push(department);
    }
    if (status) {
      whereClause += " AND a.status = ?";
      params.push(status);
    }

    // ✅ Inline LIMIT/OFFSET safely
    const attendanceReport = await executeQuery(
      `SELECT 
    a.id,
    u.name,
    u.employee_id,
    u.department,
    DATE(a.check_in) as date,
    TIME(a.check_in) as check_in_time,
    TIME(a.check_out) as check_out_time,
    CASE 
      WHEN a.check_out IS NOT NULL 
      THEN CONCAT(
        FLOOR(TIMESTAMPDIFF(MINUTE, a.check_in, a.check_out) / 60), 'h ',
        TIMESTAMPDIFF(MINUTE, a.check_in, a.check_out) % 60, 'm'
      )
      ELSE 'Incomplete'
    END as total_hours,
    TIMESTAMPDIFF(MINUTE, a.check_in, a.check_out) as total_minutes,
    a.status,
    CASE 
      WHEN TIME(a.check_in) > '09:15:00' THEN 'Late'
      WHEN a.check_out IS NULL THEN 'Incomplete'
      ELSE 'On Time'
    END as punctuality,
    a.notes
   FROM attendance a
   JOIN users u ON a.user_id = u.id
   ${whereClause}
   ORDER BY a.check_in DESC 
   LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
      params
    );

    // Get total count
    const totalCount = await executeQuery(
      `SELECT COUNT(*) as count 
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       ${whereClause}`,
      params
    );

    // Get summary statistics
    const summaryStats = await executeQuery(
      `SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT a.user_id) as unique_employees,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN a.status = 'half_day' THEN 1 ELSE 0 END) as half_day_count,
        SUM(CASE WHEN a.check_out IS NULL THEN 1 ELSE 0 END) as incomplete_count,
        AVG(CASE WHEN a.check_out IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, a.check_in, a.check_out) ELSE NULL END) as avg_working_minutes
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        report: attendanceReport,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalCount[0].count / limit),
          total_records: totalCount[0].count,
          per_page: parseInt(limit),
        },
        summary: summaryStats[0],
      },
    });
  } catch (error) {
    console.error("Attendance report error:", error);
    res.status(500).json({
      success: false,
      message: "Server error generating attendance report",
    });
  }
});

// @route   GET /api/reports/dashboard
// @desc    Get dashboard statistics (Admin only)
// @access  Private (Admin)
router.get("/dashboard", authenticateToken, isAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    // Today's statistics
    const todayStats = await executeQuery(
      `SELECT 
        COUNT(*) as total_checkins,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as on_time,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN check_out IS NULL THEN 1 ELSE 0 END) as still_in_office,
        COUNT(DISTINCT user_id) as unique_employees
       FROM attendance 
       WHERE DATE(check_in) = ?`,
      [today]
    );

    // This month's statistics
    const monthlyStats = await executeQuery(
      `SELECT 
        COUNT(*) as total_attendance,
        COUNT(DISTINCT user_id) as active_employees,
        AVG(CASE WHEN check_out IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, check_in, check_out) ELSE NULL END) as avg_working_minutes,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as total_late_days
       FROM attendance 
       WHERE DATE_FORMAT(check_in, '%Y-%m') = ?`,
      [thisMonth]
    );

    // Employee count by department
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

    // Recent attendance trends (last 7 days)
    const attendanceTrends = await executeQuery(
      `SELECT 
        DATE(check_in) as date,
        COUNT(*) as total_checkins,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
        AVG(CASE WHEN check_out IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, check_in, check_out) ELSE NULL END) as avg_minutes
       FROM attendance 
       WHERE check_in >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
       GROUP BY DATE(check_in)
       ORDER BY date DESC`
    );

    // Top performers (employees with best attendance this month)
    const topPerformers = await executeQuery(
      `SELECT 
        u.name,
        u.employee_id,
        u.department,
        COUNT(*) as attendance_days,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as on_time_days,
        AVG(CASE WHEN a.check_out IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, a.check_in, a.check_out) ELSE NULL END) as avg_working_minutes
       FROM users u
       JOIN attendance a ON u.id = a.user_id
       WHERE u.role = 'employee' 
       AND DATE_FORMAT(a.check_in, '%Y-%m') = ?
       GROUP BY u.id
       HAVING attendance_days >= 15
       ORDER BY on_time_days DESC, avg_working_minutes DESC
       LIMIT 10`,
      [thisMonth]
    );

    // Late arrivals summary
    const lateArrivals = await executeQuery(
      `SELECT 
        u.name,
        u.employee_id,
        u.department,
        COUNT(*) as late_days,
        AVG(TIME_TO_SEC(TIME(a.check_in)) - TIME_TO_SEC('09:00:00')) / 60 as avg_late_minutes
       FROM users u
       JOIN attendance a ON u.id = a.user_id
       WHERE a.status = 'late' 
       AND DATE_FORMAT(a.check_in, '%Y-%m') = ?
       GROUP BY u.id
       ORDER BY late_days DESC
       LIMIT 10`,
      [thisMonth]
    );

    console.log("dashboard", todayStats[0]);
    console.log("dashboard", monthlyStats[0]);
    console.log("dashboard", departmentStats);
    console.log("dashboard", attendanceTrends);
    console.log("dashboard", topPerformers);
    console.log("dashboard", lateArrivals);

    res.json({
      success: true,
      data: {
        today: todayStats[0],
        monthly: monthlyStats[0],
        departments: departmentStats,
        trends: attendanceTrends,
        top_performers: topPerformers,
        late_arrivals: lateArrivals,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error generating dashboard statistics",
    });
  }
});

// @route   GET /api/reports/employee/:userId
// @desc    Get individual employee report
// @access  Private (Admin or own data)
router.get("/employee/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { month, year } = req.query;

    // Check permissions
    if (req.user.role !== "admin" && req.user.id !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Default to current month if not specified
    const reportMonth = month || new Date().getMonth() + 1;
    const reportYear = year || new Date().getFullYear();

    // Get employee info
    const employee = await executeQuery(
      "SELECT name, employee_id, department, email FROM users WHERE id = ?",
      [userId]
    );

    if (employee.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Get monthly attendance details
    const monthlyAttendance = await executeQuery(
      `SELECT 
        DATE(check_in) as date,
        TIME(check_in) as check_in_time,
        TIME(check_out) as check_out_time,
        CASE 
          WHEN check_out IS NOT NULL 
          THEN TIMESTAMPDIFF(MINUTE, check_in, check_out)
          ELSE NULL 
        END as working_minutes,
        status,
        CASE 
          WHEN TIME(check_in) > '09:15:00' THEN 'Late'
          WHEN check_out IS NULL THEN 'Incomplete'
          ELSE 'On Time'
        END as punctuality
       FROM attendance 
       WHERE user_id = ? AND MONTH(check_in) = ? AND YEAR(check_in) = ?
       ORDER BY check_in ASC`,
      [userId, reportMonth, reportYear]
    );

    // Get monthly summary
    const monthlySummary = await executeQuery(
      `SELECT 
        COUNT(*) as total_working_days,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
        SUM(CASE WHEN status = 'half_day' THEN 1 ELSE 0 END) as half_days,
        SUM(CASE WHEN check_out IS NULL THEN 1 ELSE 0 END) as incomplete_days,
        SUM(CASE WHEN check_out IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, check_in, check_out) ELSE 0 END) as total_working_minutes,
        AVG(CASE WHEN check_out IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, check_in, check_out) ELSE NULL END) as avg_working_minutes
       FROM attendance 
       WHERE user_id = ? AND MONTH(check_in) = ? AND YEAR(check_in) = ?`,
      [userId, reportMonth, reportYear]
    );

    // Calculate expected working days (excluding weekends)
    const daysInMonth = new Date(reportYear, reportMonth, 0).getDate();
    let expectedWorkingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(reportYear, reportMonth - 1, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Not Sunday (0) or Saturday (6)
        expectedWorkingDays++;
      }
    }

    // Get attendance comparison with previous month
    const prevMonth = reportMonth === 1 ? 12 : reportMonth - 1;
    const prevYear = reportMonth === 1 ? reportYear - 1 : reportYear;

    const previousMonthStats = await executeQuery(
      `SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
        AVG(CASE WHEN check_out IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, check_in, check_out) ELSE NULL END) as avg_minutes
       FROM attendance 
       WHERE user_id = ? AND MONTH(check_in) = ? AND YEAR(check_in) = ?`,
      [userId, prevMonth, prevYear]
    );

    res.json({
      success: true,
      data: {
        employee: employee[0],
        report_period: {
          month: reportMonth,
          year: reportYear,
          expected_working_days: expectedWorkingDays,
        },
        attendance: monthlyAttendance,
        summary: {
          ...monthlySummary[0],
          attendance_percentage:
            expectedWorkingDays > 0
              ? (
                  (monthlySummary[0].total_working_days / expectedWorkingDays) *
                  100
                ).toFixed(2)
              : 0,
          punctuality_percentage:
            monthlySummary[0].total_working_days > 0
              ? (
                  ((monthlySummary[0].total_working_days -
                    monthlySummary[0].late_days) /
                    monthlySummary[0].total_working_days) *
                  100
                ).toFixed(2)
              : 0,
        },
        comparison: previousMonthStats[0],
      },
    });
  } catch (error) {
    console.error("Employee report error:", error);
    res.status(500).json({
      success: false,
      message: "Server error generating employee report",
    });
  }
});

// @route   GET /api/reports/export/attendance
// @desc    Export attendance report as CSV data
// @access  Private (Admin)
router.get(
  "/export/attendance",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      const { start_date, end_date, department } = req.query;

      // Build filters
      let whereClause = "WHERE 1=1";
      let params = [];

      if (start_date) {
        whereClause += " AND DATE(a.check_in) >= ?";
        params.push(start_date);
      }
      if (end_date) {
        whereClause += " AND DATE(a.check_in) <= ?";
        params.push(end_date);
      }
      if (department) {
        whereClause += " AND u.department = ?";
        params.push(department);
      }

      const exportData = await executeQuery(
        `SELECT 
        u.employee_id as 'Employee ID',
        u.name as 'Name',
        u.department as 'Department',
        DATE(a.check_in) as 'Date',
        TIME(a.check_in) as 'Check In',
        TIME(a.check_out) as 'Check Out',
        CASE 
          WHEN a.check_out IS NOT NULL 
          THEN CONCAT(
            FLOOR(TIMESTAMPDIFF(MINUTE, a.check_in, a.check_out) / 60), ':',
            LPAD(TIMESTAMPDIFF(MINUTE, a.check_in, a.check_out) % 60, 2, '0')
          )
          ELSE 'Incomplete'
        END as 'Total Hours',
        a.status as 'Status',
        CASE 
          WHEN TIME(a.check_in) > '09:15:00' THEN 'Late'
          WHEN a.check_out IS NULL THEN 'Incomplete'
          ELSE 'On Time'
        END as 'Punctuality',
        COALESCE(a.notes, '') as 'Notes'
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       ${whereClause}
       ORDER BY a.check_in DESC`,
        params
      );

      // Convert to CSV format
      if (exportData.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No data found for export",
        });
      }

      res.json({
        success: true,
        data: exportData,
        filename: `attendance_report_${start_date || "all"}_to_${
          end_date || "all"
        }.csv`,
      });
    } catch (error) {
      console.error("Export attendance error:", error);
      res.status(500).json({
        success: false,
        message: "Server error exporting attendance data",
      });
    }
  }
);

// @route   GET /api/reports/analytics
// @desc    Get advanced analytics (Admin only)
// @access  Private (Admin)
router.get("/analytics", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { period = "30" } = req.query; // days

    // Attendance trends over time
    const attendanceTrends = await executeQuery(
      `SELECT 
        DATE(check_in) as date,
        COUNT(*) as total_attendance,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as on_time_count,
        AVG(CASE WHEN check_out IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, check_in, check_out) ELSE NULL END) as avg_working_minutes
       FROM attendance 
       WHERE check_in >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
       GROUP BY DATE(check_in)
       ORDER BY date ASC`,
      [period]
    );

    // Peak check-in hours
    const checkInPatterns = await executeQuery(
      `SELECT 
        HOUR(check_in) as hour,
        COUNT(*) as checkin_count
       FROM attendance 
       WHERE check_in >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
       GROUP BY HOUR(check_in)
       ORDER BY hour ASC`,
      [period]
    );

    // Department performance
    const departmentPerformance = await executeQuery(
      `SELECT 
        u.department,
        COUNT(*) as total_attendance,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
        AVG(CASE WHEN a.check_out IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, a.check_in, a.check_out) ELSE NULL END) as avg_working_minutes,
        COUNT(DISTINCT a.user_id) as active_employees
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       WHERE a.check_in >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
       AND u.department IS NOT NULL
       GROUP BY u.department
       ORDER BY total_attendance DESC`,
      [period]
    );

    res.json({
      success: true,
      data: {
        period_days: parseInt(period),
        attendance_trends: attendanceTrends,
        checkin_patterns: checkInPatterns,
        department_performance: departmentPerformance,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error generating analytics",
    });
  }
});

module.exports = router;
