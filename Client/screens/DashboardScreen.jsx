// screens/DashboardScreen.js - Main dashboard screen
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";

import { useAuth } from "../context/AuthContext";
import { useAttendance } from "../context/AttendanceContext";
import LocationService from "../services/LocationService";
import BiometricService from "../services/BiometricService";

const { width } = Dimensions.get("window");

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const {
    todayAttendance,
    isLoading,
    getTodayStatus,
    canCheckIn,
    canCheckOut,
    getTodayWorkingHours,
    formatAttendanceTime,
    refreshAttendance,
    checkIn,
    checkOut,
  } = useAttendance();

  const [currentTime, setCurrentTime] = useState(moment());
  const [refreshing, setRefreshing] = useState(false);
  const [locationStatus, setLocationStatus] = useState(null);

  useEffect(() => {
    // Update current time every minute
    const timer = setInterval(() => {
      setCurrentTime(moment());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    checkLocationStatus();
  }, []);

  const checkLocationStatus = async () => {
    try {
      const validation = await LocationService.validateLocationForAttendance();
      setLocationStatus(validation);
    } catch (error) {
      console.error("Location check error:", error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshAttendance(), checkLocationStatus()]);
    setRefreshing(false);
  }, []);

  const handleQuickCheckIn = async () => {
    try {
      // Validate location first
      const locationValidation =
        await LocationService.validateLocationForAttendance();

      if (!locationValidation.valid) {
        Alert.alert("Location Error", locationValidation.error);
        return;
      }

      // Check biometric if available
      const biometricAvailable = await BiometricService.isAvailable();
      if (biometricAvailable) {
        const biometricResult =
          await BiometricService.authenticateForAttendance();

        if (!biometricResult.success) {
          if (biometricResult.errorCode !== "USER_CANCEL") {
            Alert.alert("Authentication Failed", biometricResult.error);
          }
          return;
        }
      }

      const { latitude, longitude } = locationValidation.location;
      const result = await checkIn(latitude, longitude);

      if (result.success) {
        Alert.alert(
          "Check-in Successful",
          result.message || "You have been checked in successfully.",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Check-in Failed", result.error);
      }
    } catch (error) {
      console.error("Quick check-in error:", error);
      Alert.alert("Error", "An error occurred during check-in");
    }
  };

  const handleQuickCheckOut = async () => {
    try {
      // Validate location first
      const locationValidation =
        await LocationService.validateLocationForAttendance();

      if (!locationValidation.valid) {
        Alert.alert("Location Error", locationValidation.error);
        return;
      }

      // Check biometric if available
      const biometricAvailable = await BiometricService.isAvailable();
      if (biometricAvailable) {
        const biometricResult =
          await BiometricService.authenticateForAttendance();

        if (!biometricResult.success) {
          if (biometricResult.errorCode !== "USER_CANCEL") {
            Alert.alert("Authentication Failed", biometricResult.error);
          }
          return;
        }
      }

      const { latitude, longitude } = locationValidation.location;
      const result = await checkOut(latitude, longitude);

      if (result.success) {
        Alert.alert(
          "Check-out Successful",
          result.message || "You have been checked out successfully.",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Check-out Failed", result.error);
      }
    } catch (error) {
      console.error("Quick check-out error:", error);
      Alert.alert("Error", "An error occurred during check-out");
    }
  };

  const getGreeting = () => {
    const hour = currentTime.hour();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const getTodayStatusInfo = () => {
    const status = getTodayStatus();

    switch (status) {
      case "not_marked":
        return {
          title: "Not Checked In",
          subtitle: "Click below to mark your attendance",
          color: "#FF9800",
          icon: "time-outline",
        };
      case "checked_in":
        return {
          title: "Checked In",
          subtitle: `Working time: ${getTodayWorkingHours()}`,
          color: "#4CAF50",
          icon: "checkmark-circle",
        };
      case "completed":
        return {
          title: "Day Completed",
          subtitle: `Total time: ${getTodayWorkingHours()}`,
          color: "#2196F3",
          icon: "checkmark-done-circle",
        };
      default:
        return {
          title: "Unknown Status",
          subtitle: "Please refresh to check status",
          color: "#757575",
          icon: "help-circle-outline",
        };
    }
  };

  const statusInfo = getTodayStatusInfo();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#2196F3"]}
          tintColor="#2196F3"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{user?.name || "User"}</Text>
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.currentTime}>{currentTime.format("HH:mm")}</Text>
          <Text style={styles.currentDate}>
            {currentTime.format("MMM DD, YYYY")}
          </Text>
        </View>
      </View>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Ionicons name={statusInfo.icon} size={24} color={statusInfo.color} />
          <Text style={[styles.statusTitle, { color: statusInfo.color }]}>
            {statusInfo.title}
          </Text>
        </View>
        <Text style={styles.statusSubtitle}>{statusInfo.subtitle}</Text>

        {todayAttendance && (
          <View style={styles.timeDetails}>
            {todayAttendance.attendance?.check_in_time && (
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>Check In:</Text>
                <Text style={styles.timeValue}>
                  {formatAttendanceTime(
                    todayAttendance.attendance.check_in_time
                  )}
                </Text>
              </View>
            )}
            {todayAttendance.attendance?.check_out_time && (
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>Check Out:</Text>
                <Text style={styles.timeValue}>
                  {formatAttendanceTime(
                    todayAttendance.attendance.check_out_time
                  )}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {canCheckIn() && (
          <TouchableOpacity
            style={[styles.actionButton, styles.checkInButton]}
            onPress={handleQuickCheckIn}
            disabled={isLoading}
          >
            <Ionicons name="log-in" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Quick Check In</Text>
          </TouchableOpacity>
        )}

        {canCheckOut() && (
          <TouchableOpacity
            style={[styles.actionButton, styles.checkOutButton]}
            onPress={handleQuickCheckOut}
            disabled={isLoading}
          >
            <Ionicons name="log-out" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Quick Check Out</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.attendanceButton]}
          onPress={() => navigation.navigate("Attendance")}
        >
          <Ionicons name="finger-print" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Mark Attendance</Text>
        </TouchableOpacity>
      </View>

      {/* Location Status */}
      {locationStatus && (
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <Ionicons
              name="location"
              size={20}
              color={locationStatus.valid ? "#4CAF50" : "#F44336"}
            />
            <Text style={styles.locationTitle}>Location Status</Text>
          </View>
          <Text
            style={[
              styles.locationText,
              { color: locationStatus.valid ? "#4CAF50" : "#F44336" },
            ]}
          >
            {locationStatus.valid
              ? `✅ Within office area (${locationStatus.distance}m away)`
              : locationStatus.error}
          </Text>
          {locationStatus.accuracy && (
            <Text style={styles.accuracyText}>
              GPS Accuracy: ±{locationStatus.accuracy}m
            </Text>
          )}
        </View>
      )}

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="calendar" size={24} color="#2196F3" />
          <Text style={styles.statValue}>{moment().format("dddd")}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="time" size={24} color="#4CAF50" />
          <Text style={styles.statValue}>{getTodayWorkingHours()}</Text>
          <Text style={styles.statLabel}>Working Time</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="business" size={24} color="#FF9800" />
          <Text style={styles.statValue}>
            {todayAttendance?.attendance?.status?.toUpperCase() || "N/A"}
          </Text>
          <Text style={styles.statLabel}>Status</Text>
        </View>
      </View>

      {/* Navigation Cards */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={styles.navCard}
          onPress={() => navigation.navigate("History")}
        >
          <Ionicons name="time-outline" size={32} color="#2196F3" />
          <Text style={styles.navTitle}>View History</Text>
          <Text style={styles.navSubtitle}>Check attendance records</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => navigation.navigate("Profile")}
        >
          <Ionicons name="person-outline" size={32} color="#4CAF50" />
          <Text style={styles.navTitle}>Profile</Text>
          <Text style={styles.navSubtitle}>Settings and preferences</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#007AFF", // fresher blue
    marginTop: 10,
    paddingHorizontal: 20,
    paddingTop: 20, // more breathing room for status bar
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },

  greetingContainer: {
    flex: 1,
  },

  greeting: {
    color: "#FFFFFF",
    fontSize: 16,
    opacity: 0.8,
    letterSpacing: 0.5,
  },

  userName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  timeContainer: {
    alignItems: "flex-end",
  },

  currentTime: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  currentDate: {
    color: "#FFFFFF",
    fontSize: 14,
    opacity: 0.8,
    letterSpacing: 0.3,
  },

  statusCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
  statusSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  timeDetails: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 16,
  },
  timeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: "#666",
  },
  timeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  actionContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  checkInButton: {
    backgroundColor: "#4CAF50",
  },
  checkOutButton: {
    backgroundColor: "#FF9800",
  },
  attendanceButton: {
    backgroundColor: "#2196F3",
  },
  actionButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "bold",
  },
  locationCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  locationText: {
    fontSize: 14,
    marginBottom: 4,
  },
  accuracyText: {
    fontSize: 12,
    color: "#666",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 1,
    justifyContent: "space-around",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    width: width / 3.2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 8,
    color: "#333",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 16,
    marginBottom: 80,
  },
  navCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    width: width / 2.3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 8,
    color: "#333",
  },
  navSubtitle: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
  },
});
export default DashboardScreen;
