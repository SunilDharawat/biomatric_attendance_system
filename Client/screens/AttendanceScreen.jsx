// screens/AttendanceScreen.js - Attendance marking with biometric authentication
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";

import { useAttendance } from "../context/AttendanceContext";
import BiometricService from "../services/BiometricService";
import LocationService from "../services/LocationService";

const AttendanceScreen = () => {
  const {
    todayAttendance,
    isLoading,
    getTodayStatus,
    canCheckIn,
    canCheckOut,
    checkIn,
    checkOut,
  } = useAttendance();

  const [locationStatus, setLocationStatus] = useState(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = async () => {
    await Promise.all([checkBiometricAvailability(), checkLocationStatus()]);
  };

  const checkBiometricAvailability = async () => {
    const available = await BiometricService.isAvailable();
    setBiometricAvailable(available);
  };

  const checkLocationStatus = async () => {
    const validation = await LocationService.validateLocationForAttendance();
    setLocationStatus(validation);
  };

  const handleCheckIn = async () => {
    setIsProcessing(true);

    try {
      // Validate location
      const locationValidation =
        await LocationService.validateLocationForAttendance();
      if (!locationValidation.valid) {
        Alert.alert("Location Error", locationValidation.error);
        return;
      }

      // Biometric authentication
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

      // Perform check-in
      const { latitude, longitude } = locationValidation.location;
      const result = await checkIn(latitude, longitude, null, notes);

      if (result.success) {
        Alert.alert("Success", "Check-in completed successfully!");
        setNotes("");
        await checkLocationStatus();
      } else {
        Alert.alert("Check-in Failed", result.error);
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckOut = async () => {
    setIsProcessing(true);

    try {
      // Validate location
      const locationValidation =
        await LocationService.validateLocationForAttendance();
      if (!locationValidation.valid) {
        Alert.alert("Location Error", locationValidation.error);
        return;
      }

      // Biometric authentication
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

      // Perform check-out
      const { latitude, longitude } = locationValidation.location;
      const result = await checkOut(latitude, longitude, notes);

      if (result.success) {
        Alert.alert("Success", "Check-out completed successfully!");
        setNotes("");
        await checkLocationStatus();
      } else {
        Alert.alert("Check-out Failed", result.error);
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStatusCard = () => {
    const status = getTodayStatus();

    return (
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Ionicons
            name={status === "checked_in" ? "checkmark-circle" : "time-outline"}
            size={32}
            color={status === "checked_in" ? "#4CAF50" : "#FF9800"}
          />
          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>
              {status === "not_marked" && "Ready to Check In"}
              {status === "checked_in" && "Currently Checked In"}
              {status === "completed" && "Day Completed"}
            </Text>
            <Text style={styles.statusSubtitle}>
              {moment().format("dddd, MMMM Do YYYY")}
            </Text>
          </View>
        </View>

        {todayAttendance?.attendance && (
          <View style={styles.timeInfo}>
            {todayAttendance.attendance.check_in_time && (
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>Check In Time:</Text>
                <Text style={styles.timeValue}>
                  {moment(
                    todayAttendance.attendance.check_in_time,
                    "HH:mm:ss"
                  ).format("h:mm A")}
                </Text>
              </View>
            )}
            {todayAttendance.attendance.check_out_time && (
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>Check Out Time:</Text>
                <Text style={styles.timeValue}>
                  {moment(
                    todayAttendance.attendance.check_out_time,
                    "HH:mm:ss"
                  ).format("h:mm A")}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderLocationCard = () => (
    <View style={styles.locationCard}>
      <View style={styles.locationHeader}>
        <Ionicons name="location" size={24} color="#2196F3" />
        <Text style={styles.locationTitle}>Location Verification</Text>
        <TouchableOpacity
          onPress={checkLocationStatus}
          style={styles.refreshButton}
        >
          <Ionicons name="refresh" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {locationStatus ? (
        <View style={styles.locationContent}>
          <Text
            style={[
              styles.locationStatus,
              { color: locationStatus.valid ? "#4CAF50" : "#F44336" },
            ]}
          >
            {locationStatus.valid
              ? `✅ Within office area (${locationStatus.distance}m away)`
              : `❌ ${locationStatus.error}`}
          </Text>
          {locationStatus.accuracy && (
            <Text style={styles.accuracyText}>
              GPS Accuracy: ±{locationStatus.accuracy}m
            </Text>
          )}
        </View>
      ) : (
        <ActivityIndicator size="small" color="#2196F3" />
      )}
    </View>
  );

  const renderBiometricCard = () => (
    <View style={styles.biometricCard}>
      <View style={styles.biometricHeader}>
        <Ionicons
          name={BiometricService.getBiometricIconName()}
          size={24}
          color="#4CAF50"
        />
        <Text style={styles.biometricTitle}>Biometric Authentication</Text>
      </View>
      <Text style={styles.biometricStatus}>
        {biometricAvailable
          ? `${BiometricService.getBiometricTypeLabel()} authentication is ready`
          : "Biometric authentication not available"}
      </Text>
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionContainer}>
      {canCheckIn() && (
        <TouchableOpacity
          style={[styles.actionButton, styles.checkInButton]}
          onPress={handleCheckIn}
          disabled={isProcessing || !locationStatus?.valid}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="log-in" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Check In</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {canCheckOut() && (
        <TouchableOpacity
          style={[styles.actionButton, styles.checkOutButton]}
          onPress={handleCheckOut}
          disabled={isProcessing || !locationStatus?.valid}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="log-out" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Check Out</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading attendance data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {renderStatusCard()}
      {renderLocationCard()}
      {renderBiometricCard()}
      {renderActionButtons()}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Important Notes:</Text>
        <Text style={styles.infoText}>
          • Ensure you are within the office premises
        </Text>
        <Text style={styles.infoText}>
          • Biometric authentication is required for security
        </Text>
        <Text style={styles.infoText}>
          • GPS location will be recorded with your attendance
        </Text>
      </View>
    </ScrollView>
  );
};

// StyleSheet placeholder - you'll add the actual styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },

  // Loader
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },

  // Status Card
  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statusText: {
    marginLeft: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  statusSubtitle: {
    fontSize: 14,
    color: "#777",
  },
  timeInfo: {
    marginTop: 12,
  },
  timeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 14,
    color: "#555",
  },
  timeValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },

  // Location Card
  locationCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  refreshButton: {
    padding: 4,
  },
  locationContent: {
    marginTop: 8,
  },
  locationStatus: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  accuracyText: {
    fontSize: 12,
    color: "#777",
  },

  // Biometric Card
  biometricCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
  },
  biometricHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  biometricTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    color: "#333",
  },
  biometricStatus: {
    fontSize: 14,
    color: "#555",
  },

  // Action Buttons
  actionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 8,
  },
  checkInButton: {
    backgroundColor: "#4CAF50",
    marginRight: 8,
  },
  checkOutButton: {
    backgroundColor: "#F44336",
    marginLeft: 8,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },

  // Info Card
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    color: "#333",
  },
  infoText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
});
export default AttendanceScreen;
