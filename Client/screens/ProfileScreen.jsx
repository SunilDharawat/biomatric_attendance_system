// screens/ProfileScreen.js - User profile and settings
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

import { useAuth } from "../context/AuthContext";
import BiometricService from "../services/BiometricService";

const ProfileScreen = () => {
  const { user, logout, updateUser, changePassword } = useAuth();

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    department: user?.department || "",
    role: user?.role || "",
    is_active: user?.is_active || false,
  });

  useEffect(() => {
    initializeSettings();
  }, []);

  const initializeSettings = async () => {
    // Check biometric availability
    const available = await BiometricService.isAvailable();
    setBiometricAvailable(available);

    // Load saved settings
    try {
      const biometricSetting = await SecureStore.getItemAsync(
        "biometricLoginEnabled"
      );
      setBiometricEnabled(biometricSetting === "true");

      const notificationSetting = await SecureStore.getItemAsync(
        "notificationsEnabled"
      );
      setNotificationsEnabled(notificationSetting !== "false");
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleBiometricToggle = async (value) => {
    if (value && biometricAvailable) {
      const result = await BiometricService.handleBiometricToggle(
        biometricEnabled,
        async (enabled) => {
          setBiometricEnabled(enabled);
          await SecureStore.setItemAsync(
            "biometricLoginEnabled",
            enabled.toString()
          );
        }
      );
    } else {
      setBiometricEnabled(false);
      await SecureStore.setItemAsync("biometricLoginEnabled", "false");
    }
  };

  const handleNotificationToggle = async (value) => {
    setNotificationsEnabled(value);
    await SecureStore.setItemAsync("notificationsEnabled", value.toString());
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    const result = await changePassword(
      passwordForm.currentPassword,
      passwordForm.newPassword
    );

    setIsLoading(false);

    if (result.success) {
      Alert.alert("Success", "Password changed successfully");
      setChangePasswordModal(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } else {
      Alert.alert("Error", result.error);
    }
  };

  const handleUpdateProfile = async () => {
    setIsLoading(true);

    try {
      // Call API to update profile
      // For now, just update local user data
      // updateUser(profileForm);

      const result = await updateUser(profileForm);
      console.log("Profile update result:", result);

      if (result.success) {
        Alert.alert("Success", "Profile updated successfully");
        setEditProfileModal(false);
      } else {
        Alert.alert("Error", result.error || "Failed to update profile");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: logout,
      },
    ]);
  };

  const renderUserInfo = () => (
    <View style={styles.userCard}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </Text>
        </View>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user?.name || "User"}</Text>
        <Text style={styles.userEmail}>{user?.email || "No email"}</Text>
        <Text style={styles.userRole}>
          {user?.role?.toUpperCase() || "USER"}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => setEditProfileModal(true)}
      >
        <Ionicons name="create-outline" size={20} color="#2196F3" />
      </TouchableOpacity>
    </View>
  );

  const renderSettingsSection = () => (
    <View style={styles.settingsCard}>
      <Text style={styles.sectionTitle}>Settings</Text>

      {biometricAvailable && (
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons
              name={BiometricService.getBiometricIconName()}
              size={24}
              color="#4CAF50"
            />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>
                {BiometricService.getBiometricTypeLabel()} Login
              </Text>
              <Text style={styles.settingSubtitle}>
                Use biometric authentication to login
              </Text>
            </View>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={handleBiometricToggle}
            trackColor={{ false: "#767577", true: "#4CAF50" }}
          />
        </View>
      )}

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Ionicons name="notifications" size={24} color="#FF9800" />
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Push Notifications</Text>
            <Text style={styles.settingSubtitle}>
              Receive attendance reminders
            </Text>
          </View>
        </View>
        <Switch
          value={notificationsEnabled}
          onValueChange={handleNotificationToggle}
          trackColor={{ false: "#767577", true: "#FF9800" }}
        />
      </View>
    </View>
  );

  const renderActionsSection = () => (
    <View style={styles.actionsCard}>
      <Text style={styles.sectionTitle}>Account</Text>

      <TouchableOpacity
        style={styles.actionItem}
        onPress={() => setChangePasswordModal(true)}
      >
        <Ionicons name="lock-closed" size={24} color="#2196F3" />
        <Text style={styles.actionTitle}>Change Password</Text>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem}>
        <Ionicons name="help-circle" size={24} color="#4CAF50" />
        <Text style={styles.actionTitle}>Help & Support</Text>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem}>
        <Ionicons name="information-circle" size={24} color="#FF9800" />
        <Text style={styles.actionTitle}>About App</Text>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionItem, styles.logoutItem]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out" size={24} color="#F44336" />
        <Text style={[styles.actionTitle, styles.logoutText]}>Logout</Text>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    </View>
  );

  // const renderEditProfileModal = () => (
  //   <Modal visible={editProfileModal} animationType="slide">
  //     <View style={styles.modalContainer}>
  //       <View style={styles.modalHeader}>
  //         <TouchableOpacity onPress={() => setEditProfileModal(false)}>
  //           <Text style={styles.modalCancel}>Cancel</Text>
  //         </TouchableOpacity>
  //         <Text style={styles.modalTitle}>Edit Profile</Text>
  //         <TouchableOpacity onPress={handleUpdateProfile}>
  //           <Text style={styles.modalDone}>Save</Text>
  //         </TouchableOpacity>
  //       </View>

  //       <View style={styles.modalContent}>
  //         <Text style={styles.inputLabel}>Name</Text>
  //         <TextInput
  //           style={styles.input}
  //           value={profileForm.name}
  //           onChangeText={(text) =>
  //             setProfileForm({ ...profileForm, name: text })
  //           }
  //           placeholder="Name"
  //         />

  //         <Text style={styles.inputLabel}>Email</Text>
  //         <TextInput
  //           style={styles.input}
  //           value={profileForm.email}
  //           onChangeText={(text) =>
  //             setProfileForm({ ...profileForm, email: text })
  //           }
  //           placeholder="Email"
  //           keyboardType="email-address"
  //         />

  //         <Text style={styles.inputLabel}>Phone</Text>
  //         <TextInput
  //           style={styles.input}
  //           value={profileForm.phone}
  //           onChangeText={(text) =>
  //             setProfileForm({ ...profileForm, phone: text })
  //           }
  //           placeholder="Phone"
  //           keyboardType="phone-pad"
  //         />

  //         {isLoading && (
  //           <ActivityIndicator
  //             size="small"
  //             color="#2196F3"
  //             style={{ marginTop: 16 }}
  //           />
  //         )}
  //       </View>
  //     </View>
  //   </Modal>
  // );

  const renderEditProfileModal = () => (
    <Modal visible={editProfileModal} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setEditProfileModal(false)}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleUpdateProfile}>
            <Text style={styles.modalDone}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          {/* Name (Everyone) */}
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={profileForm.name}
            onChangeText={(text) =>
              setProfileForm({ ...profileForm, name: text })
            }
            placeholder="Name"
          />

          {/* Phone (Everyone) */}
          <Text style={styles.inputLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            value={profileForm.phone}
            onChangeText={(text) =>
              setProfileForm({ ...profileForm, phone: text })
            }
            placeholder="Phone"
            keyboardType="phone-pad"
          />

          {/* Extra fields only for Admin */}
          {user?.role === "admin" && (
            <>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={profileForm.email}
                onChangeText={(text) =>
                  setProfileForm({ ...profileForm, email: text })
                }
                placeholder="Email"
                keyboardType="email-address"
              />

              <Text style={styles.inputLabel}>Department</Text>
              <TextInput
                style={styles.input}
                value={profileForm.department || ""}
                onChangeText={(text) =>
                  setProfileForm({ ...profileForm, department: text })
                }
                placeholder="Department"
              />

              <Text style={styles.inputLabel}>Role</Text>
              <TextInput
                style={styles.input}
                value={profileForm.role || ""}
                onChangeText={(text) =>
                  setProfileForm({ ...profileForm, role: text })
                }
                placeholder="Role (e.g., user/admin)"
              />

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 16,
                }}
              >
                <Text style={[styles.inputLabel, { flex: 1 }]}>
                  Active Status
                </Text>
                <Switch
                  value={profileForm.is_active ?? true}
                  onValueChange={(value) =>
                    setProfileForm({ ...profileForm, is_active: value })
                  }
                  trackColor={{ false: "#767577", true: "#4CAF50" }}
                />
              </View>
            </>
          )}

          {/* Loader */}
          {isLoading && (
            <ActivityIndicator
              size="small"
              color="#2196F3"
              style={{ marginTop: 16 }}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  const renderChangePasswordModal = () => (
    <Modal visible={changePasswordModal} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setChangePasswordModal(false)}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Change Password</Text>
          <TouchableOpacity onPress={handleChangePassword}>
            <Text style={styles.modalDone}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <Text style={styles.inputLabel}>Current Password</Text>
          <TextInput
            style={styles.input}
            value={passwordForm.currentPassword}
            onChangeText={(text) =>
              setPasswordForm({ ...passwordForm, currentPassword: text })
            }
            placeholder="Current Password"
            secureTextEntry
          />

          <Text style={styles.inputLabel}>New Password</Text>
          <TextInput
            style={styles.input}
            value={passwordForm.newPassword}
            onChangeText={(text) =>
              setPasswordForm({ ...passwordForm, newPassword: text })
            }
            placeholder="New Password"
            secureTextEntry
          />

          <Text style={styles.inputLabel}>Confirm New Password</Text>
          <TextInput
            style={styles.input}
            value={passwordForm.confirmPassword}
            onChangeText={(text) =>
              setPasswordForm({ ...passwordForm, confirmPassword: text })
            }
            placeholder="Confirm New Password"
            secureTextEntry
          />

          {isLoading && (
            <ActivityIndicator
              size="small"
              color="#2196F3"
              style={{ marginTop: 16 }}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      {renderUserInfo()}
      {renderSettingsSection()}
      {renderActionsSection()}
      {renderEditProfileModal()}
      {renderChangePasswordModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  userCard: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#2196F3",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  userEmail: {
    fontSize: 14,
    color: "#555",
  },
  userRole: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },
  editButton: {
    padding: 8,
  },

  settingsCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingText: {
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  settingSubtitle: {
    fontSize: 12,
    color: "#777",
  },

  actionsCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  actionTitle: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: "#333",
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: "#F44336",
    fontWeight: "700",
  },

  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  modalCancel: {
    fontSize: 16,
    color: "#F44336",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  modalDone: {
    fontSize: 16,
    color: "#4CAF50",
  },
  modalContent: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: "#777",
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#f9f9f9",
  },
});

export default ProfileScreen;
