// services/LocationService.js - Location and GPS service
import * as Location from "expo-location";
import { Alert, Platform } from "react-native";

class LocationService {
  constructor() {
    this.currentLocation = null;
    this.watchId = null;
    this.permissionStatus = null;

    // Office coordinates (replace with actual office location)
    this.officeLocation = {
      latitude: 22.7559262, // Bhopal coordinates - replace with your office
      longitude: 75.882972,
      radius: 100, // meters
    };
  }

  async requestPermissions() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      this.permissionStatus = status;

      if (status !== "granted") {
        return {
          granted: false,
          message:
            "Location permission is required to mark attendance. Please enable location access in your device settings.",
        };
      }

      // For background location (if needed)
      if (Platform.OS === "android") {
        const backgroundStatus =
          await Location.requestBackgroundPermissionsAsync();
        console.log("Background location permission:", backgroundStatus.status);
      }

      return { granted: true };
    } catch (error) {
      console.error("Location permission error:", error);
      return {
        granted: false,
        message: "Failed to request location permission",
      };
    }
  }

  async checkPermissions() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      this.permissionStatus = status;
      return status === "granted";
    } catch (error) {
      console.error("Check location permission error:", error);
      return false;
    }
  }

  async getCurrentLocation(highAccuracy = true) {
    try {
      const hasPermission = await this.checkPermissions();

      if (!hasPermission) {
        const permissionResult = await this.requestPermissions();
        if (!permissionResult.granted) {
          throw new Error(permissionResult.message);
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: highAccuracy
          ? Location.Accuracy.High
          : Location.Accuracy.Balanced,
        timeout: 15000,
        maximumAge: 10000,
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };

      return {
        success: true,
        location: this.currentLocation,
      };
    } catch (error) {
      console.error("Get current location error:", error);

      let errorMessage = "Failed to get current location";

      if (error.code === "E_LOCATION_TIMEOUT") {
        errorMessage = "Location request timed out. Please try again.";
      } else if (error.code === "E_LOCATION_UNAVAILABLE") {
        errorMessage =
          "Location services are unavailable. Please check your GPS settings.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in meters
    return Math.round(distance);
  }

  calculateDistanceFromOffice(latitude, longitude) {
    return this.calculateDistance(
      latitude,
      longitude,
      this.officeLocation.latitude,
      this.officeLocation.longitude
    );
  }

  isWithinOfficeRadius(latitude, longitude, customRadius = null) {
    const distance = this.calculateDistanceFromOffice(latitude, longitude);
    const allowedRadius = customRadius || this.officeLocation.radius;

    return {
      isWithin: distance <= allowedRadius,
      distance: distance,
      allowedRadius: allowedRadius,
    };
  }

  async validateLocationForAttendance() {
    try {
      const locationResult = await this.getCurrentLocation(true);

      if (!locationResult.success) {
        return {
          valid: false,
          error: locationResult.error,
        };
      }

      const { latitude, longitude, accuracy } = locationResult.location;

      // Check location accuracy
      if (accuracy > 50) {
        // More than 50 meters accuracy
        return {
          valid: false,
          error:
            "Location accuracy is too low. Please move to an area with better GPS signal.",
          accuracy: Math.round(accuracy),
        };
      }

      // Check distance from office
      const radiusCheck = this.isWithinOfficeRadius(latitude, longitude);

      if (!radiusCheck.isWithin) {
        return {
          valid: false,
          error: `You are ${radiusCheck.distance}m away from the office. You must be within ${radiusCheck.allowedRadius}m to mark attendance.`,
          distance: radiusCheck.distance,
          allowedRadius: radiusCheck.allowedRadius,
          location: { latitude, longitude },
        };
      }

      return {
        valid: true,
        location: { latitude, longitude },
        accuracy: Math.round(accuracy),
        distance: radiusCheck.distance,
      };
    } catch (error) {
      console.error("Location validation error:", error);
      return {
        valid: false,
        error: "Failed to validate location",
      };
    }
  }

  formatDistance(meters) {
    if (meters < 1000) {
      return `${meters}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }

  getLocationStatusText(distance, allowedRadius) {
    if (distance <= allowedRadius) {
      return `✅ Within office area (${distance}m away)`;
    } else {
      return `❌ Outside office area (${distance}m away, max ${allowedRadius}m)`;
    }
  }

  getAccuracyStatusText(accuracy) {
    if (accuracy <= 10) {
      return `🎯 Excellent accuracy (±${Math.round(accuracy)}m)`;
    } else if (accuracy <= 25) {
      return `📍 Good accuracy (±${Math.round(accuracy)}m)`;
    } else if (accuracy <= 50) {
      return `📍 Fair accuracy (±${Math.round(accuracy)}m)`;
    } else {
      return `📍 Poor accuracy (±${Math.round(accuracy)}m)`;
    }
  }

  startWatchingLocation(callback, options = {}) {
    const defaultOptions = {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000, // 5 seconds
      distanceInterval: 10, // 10 meters
    };

    const watchOptions = { ...defaultOptions, ...options };

    this.watchId = Location.watchPositionAsync(watchOptions, (location) => {
      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };

      if (callback) {
        callback(this.currentLocation);
      }
    });

    return this.watchId;
  }

  stopWatchingLocation() {
    if (this.watchId) {
      this.watchId.then((subscription) => {
        subscription.remove();
      });
      this.watchId = null;
    }
  }

  async getLocationSettings() {
    try {
      const hasServicesEnabled = await Location.hasServicesEnabledAsync();
      const permissions = await Location.getForegroundPermissionsAsync();

      return {
        servicesEnabled: hasServicesEnabled,
        permissionStatus: permissions.status,
        canAskAgain: permissions.canAskAgain,
      };
    } catch (error) {
      console.error("Get location settings error:", error);
      return {
        servicesEnabled: false,
        permissionStatus: "undetermined",
        canAskAgain: true,
      };
    }
  }

  showLocationSettingsAlert() {
    Alert.alert(
      "Location Required",
      "This app needs location access to verify your attendance. Please enable location services in your device settings.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Open Settings",
          onPress: () => {
            if (Platform.OS === "ios") {
              Alert.alert(
                "Enable Location",
                "Go to Settings > Privacy & Security > Location Services and enable location for this app."
              );
            } else {
              Alert.alert(
                "Enable Location",
                "Go to Settings > Apps > Smart Attendance > Permissions and enable location access."
              );
            }
          },
        },
      ]
    );
  }

  // Update office location (for admin settings)
  updateOfficeLocation(latitude, longitude, radius = 100) {
    this.officeLocation = {
      latitude,
      longitude,
      radius,
    };
  }

  getOfficeLocation() {
    return { ...this.officeLocation };
  }

  // Geocoding functions (optional - for address display)
  async reverseGeocode(latitude, longitude) {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        return {
          success: true,
          address: {
            street: address.street,
            city: address.city,
            region: address.region,
            country: address.country,
            postalCode: address.postalCode,
            formattedAddress: `${address.street || ""}, ${
              address.city || ""
            }, ${address.region || ""}`.replace(/^,\s*|,\s*$/g, ""),
          },
        };
      }

      return {
        success: false,
        error: "No address found for this location",
      };
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return {
        success: false,
        error: "Failed to get address for this location",
      };
    }
  }
}

const locationService = new LocationService();
export default locationService;
