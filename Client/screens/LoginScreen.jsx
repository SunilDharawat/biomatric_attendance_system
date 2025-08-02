// screens/LoginScreen.js - Login screen with biometric authentication
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Image,
  Switch,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

import { useAuth } from "../context/AuthContext";
import BiometricService from "../services/BiometricService";

const LoginScreen = ({ navigation }) => {
  const { login, error, isLoading, clearError } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    initializeBiometric();
    loadSavedCredentials();
    clearError();
  }, []);

  const initializeBiometric = async () => {
    try {
      await BiometricService.initialize();
      const available = await BiometricService.isAvailable();
      setBiometricAvailable(available);

      if (available) {
        setBiometricType(BiometricService.getBiometricTypeLabel());

        // Check if user has biometric login enabled
        const biometricSetting = await SecureStore.getItemAsync(
          "biometricLoginEnabled"
        );
        setBiometricEnabled(biometricSetting === "true");
      }
    } catch (error) {
      console.error("Biometric initialization error:", error);
    }
  };

  const loadSavedCredentials = async () => {
    try {
      const savedEmail = await SecureStore.getItemAsync("savedEmail");
      const savedRememberMe = await SecureStore.getItemAsync("rememberMe");

      if (savedEmail && savedRememberMe === "true") {
        setFormData((prev) => ({ ...prev, email: savedEmail }));
        setRememberMe(true);
      }
    } catch (error) {
      console.error("Error loading saved credentials:", error);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.password.trim()) {
      errors.password = "Password is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }

    // Clear general error
    if (error) {
      clearError();
    }
  };

  const saveCredentials = async (email) => {
    try {
      if (rememberMe) {
        await SecureStore.setItemAsync("savedEmail", email);
        await SecureStore.setItemAsync("rememberMe", "true");
      } else {
        await SecureStore.deleteItemAsync("savedEmail");
        await SecureStore.setItemAsync("rememberMe", "false");
      }
    } catch (error) {
      console.error("Error saving credentials:", error);
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        await saveCredentials(formData.email);

        // Save biometric setting
        if (biometricAvailable) {
          await SecureStore.setItemAsync(
            "biometricLoginEnabled",
            biometricEnabled.toString()
          );
        }
      }
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      if (!biometricAvailable) {
        Alert.alert(
          "Biometric Not Available",
          "Biometric authentication is not available on this device."
        );
        return;
      }

      // Check if we have saved credentials for biometric login
      const savedEmail = await SecureStore.getItemAsync("savedEmail");
      const savedPassword = await SecureStore.getItemAsync("biometricPassword");

      if (!savedEmail || !savedPassword) {
        Alert.alert(
          "Setup Required",
          "Please log in with your email and password first to enable biometric login.",
          [{ text: "OK" }]
        );
        return;
      }

      const result = await BiometricService.authenticateForLogin();

      if (result.success) {
        setIsSubmitting(true);

        const loginResult = await login(savedEmail, savedPassword);

        if (!loginResult.success) {
          Alert.alert(
            "Login Failed",
            "Biometric authentication succeeded but login failed. Please try logging in with your password."
          );
        }

        setIsSubmitting(false);
      } else if (result.errorCode !== "USER_CANCEL") {
        Alert.alert("Authentication Failed", result.error);
      }
    } catch (error) {
      console.error("Biometric login error:", error);
      Alert.alert("Error", "An error occurred during biometric login");
      setIsSubmitting(false);
    }
  };

  const handleBiometricToggle = async (value) => {
    if (value && biometricAvailable) {
      // Enabling biometric login
      if (!formData.email || !formData.password) {
        Alert.alert(
          "Credentials Required",
          "Please enter your email and password first, then enable biometric login."
        );
        return;
      }

      const result = await BiometricService.authenticate({
        promptMessage: "Verify your identity to enable biometric login",
        cancelLabel: "Cancel",
      });

      if (result.success) {
        setBiometricEnabled(true);
        // Save password for biometric login (encrypted by SecureStore)
        await SecureStore.setItemAsync("biometricPassword", formData.password);
        Alert.alert(
          "Biometric Login Enabled",
          `You can now use ${biometricType} to log in to your account.`
        );
      } else if (result.errorCode !== "USER_CANCEL") {
        Alert.alert("Setup Failed", result.error);
      }
    } else {
      // Disabling biometric login
      setBiometricEnabled(false);
      await SecureStore.deleteItemAsync("biometricPassword");
    }
  };

  const renderBiometricSection = () => {
    if (!biometricAvailable) return null;

    return (
      <View style={styles.biometricSection}>
        <View style={styles.biometricToggle}>
          <View style={styles.biometricInfo}>
            <Ionicons
              name={BiometricService.getBiometricIconName()}
              size={20}
              color="#2196F3"
            />
            <Text style={styles.biometricLabel}>
              Enable {biometricType} Login
            </Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={handleBiometricToggle}
            trackColor={{ false: "#767577", true: "#2196F3" }}
            thumbColor={biometricEnabled ? "#fff" : "#f4f3f4"}
          />
        </View>

        {biometricEnabled && (
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricLogin}
            disabled={isSubmitting || isLoading}
          >
            <Ionicons
              name={BiometricService.getBiometricIconName()}
              size={24}
              color="#fff"
            />
            <Text style={styles.biometricButtonText}>
              Sign in with {biometricType}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" backgroundColor="#1976D2" />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="business" size={60} color="#2196F3" />
          </View>
          <Text style={styles.title}>Smart Attendance</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#F44336" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Login Form */}
        <View style={styles.formContainer}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <View
              style={[
                styles.inputWrapper,
                formErrors.email && styles.inputError,
              ]}
            >
              <Ionicons
                name="mail"
                size={20}
                color="#757575"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your email"
                value={formData.email}
                onChangeText={(value) => handleInputChange("email", value)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting && !isLoading}
              />
            </View>
            {formErrors.email && (
              <Text style={styles.fieldError}>{formErrors.email}</Text>
            )}
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View
              style={[
                styles.inputWrapper,
                formErrors.password && styles.inputError,
              ]}
            >
              <Ionicons
                name="lock-closed"
                size={20}
                color="#757575"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your password"
                value={formData.password}
                onChangeText={(value) => handleInputChange("password", value)}
                secureTextEntry={!showPassword}
                editable={!isSubmitting && !isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#757575"
                />
              </TouchableOpacity>
            </View>
            {formErrors.password && (
              <Text style={styles.fieldError}>{formErrors.password}</Text>
            )}
          </View>

          {/* Remember Me */}
          <View style={styles.rememberContainer}>
            <TouchableOpacity
              style={styles.rememberToggle}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <Ionicons
                name={rememberMe ? "checkbox" : "checkbox-outline"}
                size={20}
                color="#2196F3"
              />
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              (isSubmitting || isLoading) && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting || isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Biometric Section */}
        {renderBiometricSection()}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Secure biometric attendance system
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffebee",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#F44336",
  },
  errorText: {
    color: "#F44336",
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  inputError: {
    borderColor: "#F44336",
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: "#333",
  },
  eyeIcon: {
    padding: 12,
  },
  fieldError: {
    color: "#F44336",
    fontSize: 12,
    marginTop: 4,
  },
  rememberContainer: {
    marginBottom: 20,
  },
  rememberToggle: {
    flexDirection: "row",
    alignItems: "center",
  },
  rememberText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  loginButton: {
    backgroundColor: "#2196F3",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  biometricSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  biometricToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  biometricInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  biometricLabel: {
    fontSize: 16,
    color: "#333",
    marginLeft: 8,
    fontWeight: "500",
  },
  biometricButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    height: 48,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  biometricButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  footer: {
    alignItems: "center",
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
});

export default LoginScreen;
