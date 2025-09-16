// context/AttendanceContext.js - Attendance state management
import React, { createContext, useContext, useReducer, useEffect } from "react";
import ApiService from "../services/ApiService";
import { useAuth } from "./AuthContext";
import * as Device from "expo-device";

// Initial state
const initialState = {
  todayAttendance: null,
  attendanceHistory: [],
  isLoading: false,
  error: null,
  pagination: null,
  monthlyStats: null,
};

// Action types
const ATTENDANCE_ACTIONS = {
  SET_LOADING: "SET_LOADING",
  SET_TODAY_ATTENDANCE: "SET_TODAY_ATTENDANCE",
  SET_ATTENDANCE_HISTORY: "SET_ATTENDANCE_HISTORY",
  ADD_ATTENDANCE_RECORD: "ADD_ATTENDANCE_RECORD",
  UPDATE_ATTENDANCE_RECORD: "UPDATE_ATTENDANCE_RECORD",
  SET_MONTHLY_STATS: "SET_MONTHLY_STATS",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  RESET_STATE: "RESET_STATE",
};

// Reducer function
function attendanceReducer(state, action) {
  switch (action.type) {
    case ATTENDANCE_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case ATTENDANCE_ACTIONS.SET_TODAY_ATTENDANCE:
      return {
        ...state,
        todayAttendance: action.payload,
        isLoading: false,
        error: null,
      };

    case ATTENDANCE_ACTIONS.SET_ATTENDANCE_HISTORY:
      return {
        ...state,
        attendanceHistory: action.payload.attendance,
        pagination: action.payload.pagination,
        monthlyStats: action.payload.monthly_summary,
        isLoading: false,
        error: null,
      };

    case ATTENDANCE_ACTIONS.ADD_ATTENDANCE_RECORD:
      return {
        ...state,
        attendanceHistory: [action.payload, ...state.attendanceHistory],
        todayAttendance: action.payload,
      };

    case ATTENDANCE_ACTIONS.UPDATE_ATTENDANCE_RECORD:
      return {
        ...state,
        todayAttendance: { ...state.todayAttendance, ...action.payload },
        attendanceHistory: state.attendanceHistory.map((record) =>
          record.id === action.payload.id
            ? { ...record, ...action.payload }
            : record
        ),
      };

    case ATTENDANCE_ACTIONS.SET_MONTHLY_STATS:
      return {
        ...state,
        monthlyStats: action.payload,
      };

    case ATTENDANCE_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case ATTENDANCE_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case ATTENDANCE_ACTIONS.RESET_STATE:
      return initialState;

    default:
      return state;
  }
}

// Create context
const AttendanceContext = createContext();

// Custom hook to use attendance context
export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error("useAttendance must be used within an AttendanceProvider");
  }
  return context;
};

// AttendanceProvider component
export const AttendanceProvider = ({ children }) => {
  const [state, dispatch] = useReducer(attendanceReducer, initialState);
  const { isAuthenticated, user } = useAuth();

  // Load today's attendance when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadTodayAttendance();
    } else {
      dispatch({ type: ATTENDANCE_ACTIONS.RESET_STATE });
    }
  }, [isAuthenticated, user]);

  const loadTodayAttendance = async () => {
    try {
      dispatch({ type: ATTENDANCE_ACTIONS.SET_LOADING, payload: true });

      const response = await ApiService.get("/attendance/today");

      if (response.success) {
        dispatch({
          type: ATTENDANCE_ACTIONS.SET_TODAY_ATTENDANCE,
          payload: response.data,
        });
      } else {
        dispatch({
          type: ATTENDANCE_ACTIONS.SET_ERROR,
          payload: response.message || "Failed to load today's attendance",
        });
      }
    } catch (error) {
      console.error("Load today attendance error:", error);
      dispatch({
        type: ATTENDANCE_ACTIONS.SET_ERROR,
        payload: "Network error loading attendance data",
      });
    }
  };

  const loadAttendanceHistory = async (page = 1, month = null, year = null) => {
    try {
      dispatch({ type: ATTENDANCE_ACTIONS.SET_LOADING, payload: true });

      const params = { page, limit: 10 };
      if (month) params.month = month;
      if (year) params.year = year;

      const response = await ApiService.get("/attendance/my", { params });

      if (response.success) {
        dispatch({
          type: ATTENDANCE_ACTIONS.SET_ATTENDANCE_HISTORY,
          payload: response.data,
        });
      } else {
        dispatch({
          type: ATTENDANCE_ACTIONS.SET_ERROR,
          payload: response.message || "Failed to load attendance history",
        });
      }
    } catch (error) {
      console.error("Load attendance history error:", error);
      dispatch({
        type: ATTENDANCE_ACTIONS.SET_ERROR,
        payload: "Network error loading attendance history",
      });
    }
  };

  const checkIn = async (
    latitude,
    longitude,
    deviceId = null,
    notes = null
  ) => {
    try {
      dispatch({ type: ATTENDANCE_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: ATTENDANCE_ACTIONS.CLEAR_ERROR });

      // Auto-fetch device info if not provided
      const resolvedDeviceId =
        deviceId ||
        Device.osInternalBuildId ||
        Device.modelId ||
        "unknown-device-id";
      const resolvedDeviceName =
        Device.deviceName || Device.modelName || "Unknown Device";

      const response = await ApiService.post("/attendance/checkin", {
        latitude,
        longitude,
        device_id: resolvedDeviceId,
        device_name: resolvedDeviceName,
        notes,
      });

      if (response.success) {
        // Reload today's attendance to get updated data
        await loadTodayAttendance();

        return {
          success: true,
          message: response.message,
          data: response.attendance,
        };
      } else {
        dispatch({
          type: ATTENDANCE_ACTIONS.SET_ERROR,
          payload: response.message || "Check-in failed",
        });
        return {
          success: false,
          error: response.message,
          distance: response.distance,
          allowedRadius: response.allowedRadius,
        };
      }
    } catch (error) {
      console.error("Check-in error:", error);
      const errorMessage =
        error.response?.data?.message || "Network error during check-in";
      dispatch({
        type: ATTENDANCE_ACTIONS.SET_ERROR,
        payload: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  };

  const checkOut = async (latitude, longitude, notes = null) => {
    try {
      dispatch({ type: ATTENDANCE_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: ATTENDANCE_ACTIONS.CLEAR_ERROR });

      const response = await ApiService.post("/attendance/checkout", {
        latitude,
        longitude,
        notes,
      });

      if (response.success) {
        // Reload today's attendance to get updated data
        await loadTodayAttendance();

        return {
          success: true,
          message: response.message,
          data: response.attendance,
        };
      } else {
        dispatch({
          type: ATTENDANCE_ACTIONS.SET_ERROR,
          payload: response.message || "Check-out failed",
        });
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error("Check-out error:", error);
      const errorMessage =
        error.response?.data?.message || "Network error during check-out";
      dispatch({
        type: ATTENDANCE_ACTIONS.SET_ERROR,
        payload: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  };

  const refreshAttendance = async () => {
    await loadTodayAttendance();
  };

  const clearError = () => {
    dispatch({ type: ATTENDANCE_ACTIONS.CLEAR_ERROR });
  };

  // Helper functions for attendance status
  const getTodayStatus = () => {
    if (!state.todayAttendance) return "not_marked";

    const { has_attendance, is_checked_in, has_checked_out } =
      state.todayAttendance;

    if (!has_attendance) return "not_marked";
    if (is_checked_in && !has_checked_out) return "checked_in";
    if (has_checked_out) return "completed";

    return "unknown";
  };

  const canCheckIn = () => {
    return state.todayAttendance?.can_check_in || false;
  };

  const canCheckOut = () => {
    return state.todayAttendance?.can_check_out || false;
  };

  const getTodayWorkingHours = () => {
    if (!state.todayAttendance?.attendance?.minutes_worked) return "0h 0m";

    const minutes = state.todayAttendance.attendance.minutes_worked;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return `${hours}h ${remainingMinutes}m`;
  };

  const getAttendanceStatusColor = (status) => {
    switch (status) {
      case "present":
        return "#4CAF50";
      case "late":
        return "#FF9800";
      case "half_day":
        return "#2196F3";
      case "absent":
        return "#F44336";
      default:
        return "#757575";
    }
  };

  const formatAttendanceTime = (timeString) => {
    if (!timeString) return "--:--";

    try {
      const date = new Date(`2000-01-01T${timeString}`);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      return timeString;
    }
  };

  // Context value
  const value = {
    // State
    todayAttendance: state.todayAttendance,
    attendanceHistory: state.attendanceHistory,
    isLoading: state.isLoading,
    error: state.error,
    pagination: state.pagination,
    monthlyStats: state.monthlyStats,

    // Actions
    checkIn,
    checkOut,
    loadTodayAttendance,
    loadAttendanceHistory,
    refreshAttendance,
    clearError,

    // Helper functions
    getTodayStatus,
    canCheckIn,
    canCheckOut,
    getTodayWorkingHours,
    getAttendanceStatusColor,
    formatAttendanceTime,
  };

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
};
