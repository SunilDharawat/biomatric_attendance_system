// routes/settings.js - Company Settings management routes
const express = require("express");
const { executeQuery } = require("../config/db");
const { authenticateToken, isAdmin } = require("../middlewares/auth");

const router = express.Router();

// Default settings
const DEFAULT_SETTINGS = {
  company_name: "Smart Attendance Corp",
  working_hours_start: "09:00",
  working_hours_end: "18:00",
  late_threshold: "15",
  location_radius: "100",
  office_latitude: "23.2599",
  office_longitude: "77.4126",
  break_duration: "60",
  overtime_threshold: "480",
  weekend_working: "false",
  holiday_list: "[]",
};

// Helper function to get setting by key
const getSetting = async (key) => {
  const result = await executeQuery(
    "SELECT setting_value FROM company_settings WHERE setting_key = ?",
    [key]
  );
  return result.length > 0 ? result[0].setting_value : null;
};

// Helper function to get all settings
const getAllSettings = async () => {
  const result = await executeQuery(
    "SELECT setting_key, setting_value, description FROM company_settings ORDER BY setting_key"
  );

  const settings = {};
  result.forEach((row) => {
    settings[row.setting_key] = row.setting_value;
  });

  return settings;
};

// @route   GET /api/settings
// @desc    Get all company settings
// @access  Private
router.get("/", authenticateToken, async (req, res) => {
  try {
    const settings = await getAllSettings();

    // If no settings exist, return defaults
    if (Object.keys(settings).length === 0) {
      return res.json({
        success: true,
        data: DEFAULT_SETTINGS,
        message: "Using default settings",
      });
    }

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting settings",
    });
  }
});

// @route   GET /api/settings/:key
// @desc    Get specific setting by key
// @access  Private
router.get("/:key", authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    const value = await getSetting(key);

    if (value === null) {
      // Return default value if exists
      const defaultValue = DEFAULT_SETTINGS[key];
      if (defaultValue !== undefined) {
        return res.json({
          success: true,
          data: {
            setting_key: key,
            setting_value: defaultValue,
            is_default: true,
          },
        });
      }

      return res.status(404).json({
        success: false,
        message: "Setting not found",
      });
    }

    const settingDetails = await executeQuery(
      "SELECT setting_key, setting_value, description, updated_at FROM company_settings WHERE setting_key = ?",
      [key]
    );

    res.json({
      success: true,
      data: settingDetails[0],
    });
  } catch (error) {
    console.error("Get setting error:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting setting",
    });
  }
});

// @route   POST /api/settings
// @desc    Create or update company settings (Admin only)
// @access  Private (Admin)
router.post("/", authenticateToken, isAdmin, async (req, res) => {
  try {
    const settings = req.body;

    if (!settings || typeof settings !== "object") {
      return res.status(400).json({
        success: false,
        message: "Settings object is required",
      });
    }

    const updatedSettings = [];
    const errors = [];

    // Process each setting
    for (const [key, value] of Object.entries(settings)) {
      try {
        // Validate setting based on key
        if (!validateSetting(key, value)) {
          errors.push(`Invalid value for ${key}: ${value}`);
          continue;
        }

        // Insert or update setting
        await executeQuery(
          `INSERT INTO company_settings (setting_key, setting_value, description, created_at, updated_at) 
           VALUES (?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE 
           setting_value = VALUES(setting_value), 
           updated_at = NOW()`,
          [key, String(value), getSettingDescription(key)]
        );

        updatedSettings.push({ key, value });
      } catch (error) {
        console.error(`Error updating setting ${key}:`, error);
        errors.push(`Failed to update ${key}`);
      }
    }

    if (errors.length > 0 && updatedSettings.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to update settings",
        errors: errors,
      });
    }

    res.json({
      success: true,
      message: `Successfully updated ${updatedSettings.length} settings`,
      data: {
        updated: updatedSettings,
        errors: errors,
      },
    });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating settings",
    });
  }
});

// @route   PUT /api/settings/:key
// @desc    Update specific setting (Admin only)
// @access  Private (Admin)
router.put("/:key", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: "Setting value is required",
      });
    }

    // Validate setting
    if (!validateSetting(key, value)) {
      return res.status(400).json({
        success: false,
        message: `Invalid value for ${key}: ${value}`,
      });
    }

    const settingDescription = description || getSettingDescription(key);

    await executeQuery(
      `INSERT INTO company_settings (setting_key, setting_value, description, created_at, updated_at) 
       VALUES (?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
       setting_value = VALUES(setting_value), 
       description = VALUES(description),
       updated_at = NOW()`,
      [key, String(value), settingDescription]
    );

    res.json({
      success: true,
      message: "Setting updated successfully",
      data: {
        setting_key: key,
        setting_value: String(value),
        description: settingDescription,
      },
    });
  } catch (error) {
    console.error("Update setting error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating setting",
    });
  }
});

// @route   DELETE /api/settings/:key
// @desc    Delete specific setting (Admin only)
// @access  Private (Admin)
router.delete("/:key", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { key } = req.params;

    const result = await executeQuery(
      "DELETE FROM company_settings WHERE setting_key = ?",
      [key]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Setting not found",
      });
    }

    res.json({
      success: true,
      message: "Setting deleted successfully",
    });
  } catch (error) {
    console.error("Delete setting error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting setting",
    });
  }
});

// @route   GET /api/settings/attendance/rules
// @desc    Get attendance-related settings for mobile app
// @access  Private
router.get("/attendance/rules", authenticateToken, async (req, res) => {
  try {
    const attendanceSettings = await executeQuery(
      `SELECT setting_key, setting_value 
       FROM company_settings 
       WHERE setting_key IN (
         'working_hours_start', 'working_hours_end', 'late_threshold', 
         'location_radius', 'office_latitude', 'office_longitude',
         'break_duration', 'overtime_threshold'
       )`
    );

    const settings = {};
    attendanceSettings.forEach((row) => {
      settings[row.setting_key] = row.setting_value;
    });

    // Add defaults for missing values
    const defaults = {
      working_hours_start: "09:00",
      working_hours_end: "18:00",
      late_threshold: "15",
      location_radius: "100",
      office_latitude: "23.2599",
      office_longitude: "77.4126",
      break_duration: "60",
      overtime_threshold: "480",
    };

    Object.keys(defaults).forEach((key) => {
      if (!settings[key]) {
        settings[key] = defaults[key];
      }
    });

    res.json({
      success: true,
      data: {
        office_location: {
          latitude: parseFloat(settings.office_latitude),
          longitude: parseFloat(settings.office_longitude),
          radius: parseInt(settings.location_radius),
        },
        working_hours: {
          start: settings.working_hours_start,
          end: settings.working_hours_end,
        },
        policies: {
          late_threshold_minutes: parseInt(settings.late_threshold),
          break_duration_minutes: parseInt(settings.break_duration),
          overtime_threshold_minutes: parseInt(settings.overtime_threshold),
        },
      },
    });
  } catch (error) {
    console.error("Get attendance rules error:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting attendance rules",
    });
  }
});

// @route   POST /api/settings/reset
// @desc    Reset all settings to default (Admin only)
// @access  Private (Admin)
router.post("/reset", authenticateToken, isAdmin, async (req, res) => {
  try {
    // Delete all existing settings
    await executeQuery("DELETE FROM company_settings");

    // Insert default settings
    const insertPromises = Object.entries(DEFAULT_SETTINGS).map(
      ([key, value]) => {
        return executeQuery(
          `INSERT INTO company_settings (setting_key, setting_value, description, created_at, updated_at) 
         VALUES (?, ?, ?, NOW(), NOW())`,
          [key, value, getSettingDescription(key)]
        );
      }
    );

    await Promise.all(insertPromises);

    res.json({
      success: true,
      message: "Settings reset to default values",
      data: DEFAULT_SETTINGS,
    });
  } catch (error) {
    console.error("Reset settings error:", error);
    res.status(500).json({
      success: false,
      message: "Server error resetting settings",
    });
  }
});

// Helper function to validate settings
function validateSetting(key, value) {
  switch (key) {
    case "working_hours_start":
    case "working_hours_end":
      return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);

    case "late_threshold":
    case "location_radius":
    case "break_duration":
    case "overtime_threshold":
      return !isNaN(value) && parseInt(value) >= 0;

    case "office_latitude":
      return (
        !isNaN(value) && parseFloat(value) >= -90 && parseFloat(value) <= 90
      );

    case "office_longitude":
      return (
        !isNaN(value) && parseFloat(value) >= -180 && parseFloat(value) <= 180
      );

    case "weekend_working":
      return value === "true" || value === "false";

    case "company_name":
      return typeof value === "string" && value.length > 0;

    case "holiday_list":
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }

    default:
      return true; // Allow custom settings
  }
}

// Helper function to get setting descriptions
function getSettingDescription(key) {
  const descriptions = {
    company_name: "Company name for reports and branding",
    working_hours_start: "Standard work start time",
    working_hours_end: "Standard work end time",
    late_threshold: "Minutes after which employee is marked late",
    location_radius: "Allowed radius from office location in meters",
    office_latitude: "Office location latitude coordinate",
    office_longitude: "Office location longitude coordinate",
    break_duration: "Standard break duration in minutes",
    overtime_threshold: "Minutes after which overtime is calculated",
    weekend_working: "Whether weekend working is allowed",
    holiday_list: "JSON array of holiday dates",
  };

  return descriptions[key] || "Custom company setting";
}

module.exports = router;
