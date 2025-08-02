// services/BiometricService.js - Biometric authentication service
import * as LocalAuthentication from "expo-local-authentication";
import { Alert, Platform } from "react-native";

class BiometricService {
  constructor() {
    this.isInitialized = false;
    this.hasHardware = false;
    this.supportedTypes = [];
    this.isEnrolled = false;
  }

  async initialize() {
    try {
      this.hasHardware = await LocalAuthentication.hasHardwareAsync();
      this.supportedTypes =
        await LocalAuthentication.supportedAuthenticationTypesAsync();
      this.isEnrolled = await LocalAuthentication.isEnrolledAsync();
      this.isInitialized = true;

      console.log("BiometricService initialized:", {
        hasHardware: this.hasHardware,
        supportedTypes: this.supportedTypes,
        isEnrolled: this.isEnrolled,
      });

      return true;
    } catch (error) {
      console.error("BiometricService initialization error:", error);
      return false;
    }
  }

  async isAvailable() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.hasHardware && this.isEnrolled;
  }

  getSupportedBiometricTypes() {
    const types = [];

    this.supportedTypes.forEach((type) => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          types.push("Fingerprint");
          break;
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          types.push("Face ID");
          break;
        case LocalAuthentication.AuthenticationType.IRIS:
          types.push("Iris");
          break;
        default:
          types.push("Biometric");
      }
    });

    return types;
  }

  getBiometricTypeLabel() {
    if (Platform.OS === "ios") {
      return this.supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      )
        ? "Face ID"
        : "Touch ID";
    } else {
      return this.supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FINGERPRINT
      )
        ? "Fingerprint"
        : "Biometric";
    }
  }

  async authenticate(options = {}) {
    try {
      if (!(await this.isAvailable())) {
        return {
          success: false,
          error: "Biometric authentication is not available on this device",
          errorCode: "NOT_AVAILABLE",
        };
      }

      const defaultOptions = {
        promptMessage: "Authenticate with biometrics",
        cancelLabel: "Cancel",
        fallbackLabel: "Use Password",
        disableDeviceFallback: false,
      };

      const authOptions = { ...defaultOptions, ...options };

      const result = await LocalAuthentication.authenticateAsync(authOptions);

      if (result.success) {
        return {
          success: true,
          authType: this.getBiometricTypeLabel(),
        };
      } else {
        let errorMessage = "Authentication failed";
        let errorCode = "AUTH_FAILED";

        switch (result.error) {
          case "user_cancel":
            errorMessage = "Authentication was cancelled";
            errorCode = "USER_CANCEL";
            break;
          case "user_fallback":
            errorMessage = "User chose to use fallback authentication";
            errorCode = "USER_FALLBACK";
            break;
          case "system_cancel":
            errorMessage = "Authentication was cancelled by the system";
            errorCode = "SYSTEM_CANCEL";
            break;
          case "passcode_not_set":
            errorMessage = "Passcode is not set on the device";
            errorCode = "PASSCODE_NOT_SET";
            break;
          case "biometric_not_available":
            errorMessage = "Biometric authentication is not available";
            errorCode = "NOT_AVAILABLE";
            break;
          case "biometric_not_enrolled":
            errorMessage = "No biometrics are enrolled on this device";
            errorCode = "NOT_ENROLLED";
            break;
          case "biometric_lockout":
            errorMessage = "Biometric authentication is locked out";
            errorCode = "LOCKOUT";
            break;
          case "biometric_lockout_permanent":
            errorMessage = "Biometric authentication is permanently locked out";
            errorCode = "LOCKOUT_PERMANENT";
            break;
          case "too_many_attempts":
            errorMessage = "Too many failed attempts";
            errorCode = "TOO_MANY_ATTEMPTS";
            break;
          default:
            errorMessage = result.error || "Authentication failed";
        }

        return {
          success: false,
          error: errorMessage,
          errorCode,
          warning: result.warning,
        };
      }
    } catch (error) {
      console.error("Biometric authentication error:", error);
      return {
        success: false,
        error: "An unexpected error occurred during authentication",
        errorCode: "UNEXPECTED_ERROR",
      };
    }
  }

  async authenticateForLogin() {
    return this.authenticate({
      promptMessage: "Sign in with biometrics",
      cancelLabel: "Cancel",
      fallbackLabel: "Use Password",
      disableDeviceFallback: false,
    });
  }

  async authenticateForAttendance() {
    return this.authenticate({
      promptMessage: "Authenticate to mark attendance",
      cancelLabel: "Cancel",
      fallbackLabel: "Skip Biometric",
      disableDeviceFallback: true,
    });
  }

  async checkEnrollmentStatus() {
    try {
      if (!this.hasHardware) {
        return {
          canUse: false,
          reason: "This device does not support biometric authentication",
        };
      }

      if (!this.isEnrolled) {
        return {
          canUse: false,
          reason:
            "No biometrics are enrolled on this device. Please set up biometric authentication in your device settings.",
        };
      }

      return {
        canUse: true,
        types: this.getSupportedBiometricTypes(),
      };
    } catch (error) {
      console.error("Error checking enrollment status:", error);
      return {
        canUse: false,
        reason: "Unable to check biometric enrollment status",
      };
    }
  }

  showEnrollmentPrompt() {
    const biometricType = this.getBiometricTypeLabel();

    Alert.alert(
      `${biometricType} Not Set Up`,
      `To use ${biometricType} authentication, please set it up in your device settings.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Go to Settings",
          onPress: () => {
            if (Platform.OS === "ios") {
              // iOS doesn't allow direct navigation to settings
              Alert.alert(
                "Set Up Biometrics",
                "Please go to Settings > Face ID & Passcode (or Touch ID & Passcode) to set up biometric authentication."
              );
            } else {
              // Android - could potentially open settings
              Alert.alert(
                "Set Up Biometrics",
                "Please go to Settings > Security > Fingerprint to set up biometric authentication."
              );
            }
          },
        },
      ]
    );
  }

  // Helper method to get icon name for biometric type
  getBiometricIconName() {
    if (Platform.OS === "ios") {
      return this.supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      )
        ? "face-id"
        : "finger-print";
    } else {
      return "finger-print";
    }
  }

  // Method to handle biometric settings toggle
  async handleBiometricToggle(currentValue, onToggle) {
    if (!currentValue) {
      // User wants to enable biometric
      const available = await this.isAvailable();

      if (!available) {
        const status = await this.checkEnrollmentStatus();
        Alert.alert("Biometric Not Available", status.reason, [
          { text: "OK" },
          {
            text: "Set Up",
            onPress: () => this.showEnrollmentPrompt(),
          },
        ]);
        return false;
      }

      // Test biometric authentication
      const result = await this.authenticate({
        promptMessage: "Verify your identity to enable biometric login",
        cancelLabel: "Cancel",
      });

      if (result.success) {
        onToggle(true);
        return true;
      } else {
        if (result.errorCode !== "USER_CANCEL") {
          Alert.alert("Authentication Failed", result.error);
        }
        return false;
      }
    } else {
      // User wants to disable biometric
      onToggle(false);
      return true;
    }
  }
}

const biometricService = new BiometricService();
export default biometricService;
