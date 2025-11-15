// // screens/ProfileScreen.js - User profile and settings
// import React, { useState, useEffect } from "react";
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   Switch,
//   Alert,
//   Modal,
//   TextInput,
//   ActivityIndicator,
//   StyleSheet,
// } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import * as SecureStore from "expo-secure-store";

// import { useAuth } from "../context/AuthContext";
// import BiometricService from "../services/BiometricService";

// const ProfileScreen = () => {
//   const { user, logout, updateUser, changePassword } = useAuth();

//   const [biometricEnabled, setBiometricEnabled] = useState(false);
//   const [biometricAvailable, setBiometricAvailable] = useState(false);
//   const [notificationsEnabled, setNotificationsEnabled] = useState(true);
//   const [changePasswordModal, setChangePasswordModal] = useState(false);
//   const [editProfileModal, setEditProfileModal] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [helpModalVisible, setHelpModalVisible] = useState(false);
//   const [aboutModalVisible, setAboutModalVisible] = useState(false);

//   const [passwordForm, setPasswordForm] = useState({
//     currentPassword: "",
//     newPassword: "",
//     confirmPassword: "",
//   });

//   const [profileForm, setProfileForm] = useState({
//     name: user?.name || "",
//     email: user?.email || "",
//     phone: user?.phone || "",
//     department: user?.department || "",
//     role: user?.role || "",
//     is_active: user?.is_active || false,
//   });

//   useEffect(() => {
//     initializeSettings();
//   }, []);

//   const initializeSettings = async () => {
//     // Check biometric availability
//     const available = await BiometricService.isAvailable();
//     setBiometricAvailable(available);

//     // Load saved settings
//     try {
//       const biometricSetting = await SecureStore.getItemAsync(
//         "biometricLoginEnabled"
//       );
//       setBiometricEnabled(biometricSetting === "true");

//       const notificationSetting = await SecureStore.getItemAsync(
//         "notificationsEnabled"
//       );
//       setNotificationsEnabled(notificationSetting !== "false");
//     } catch (error) {
//       console.error("Error loading settings:", error);
//     }
//   };

//   const handleBiometricToggle = async (value) => {
//     if (value && biometricAvailable) {
//       const result = await BiometricService.handleBiometricToggle(
//         biometricEnabled,
//         async (enabled) => {
//           setBiometricEnabled(enabled);
//           await SecureStore.setItemAsync(
//             "biometricLoginEnabled",
//             enabled.toString()
//           );
//         }
//       );
//     } else {
//       setBiometricEnabled(false);
//       await SecureStore.setItemAsync("biometricLoginEnabled", "false");
//     }
//   };

//   const handleNotificationToggle = async (value) => {
//     setNotificationsEnabled(value);
//     await SecureStore.setItemAsync("notificationsEnabled", value.toString());
//   };

//   const handleChangePassword = async () => {
//     if (passwordForm.newPassword !== passwordForm.confirmPassword) {
//       Alert.alert("Error", "New passwords do not match");
//       return;
//     }

//     if (passwordForm.newPassword.length < 6) {
//       Alert.alert("Error", "New password must be at least 6 characters");
//       return;
//     }

//     setIsLoading(true);

//     const result = await changePassword(
//       passwordForm.currentPassword,
//       passwordForm.newPassword
//     );

//     setIsLoading(false);

//     if (result.success) {
//       Alert.alert("Success", "Password changed successfully");
//       setChangePasswordModal(false);
//       setPasswordForm({
//         currentPassword: "",
//         newPassword: "",
//         confirmPassword: "",
//       });
//     } else {
//       Alert.alert("Error", result.error);
//     }
//   };

//   const handleUpdateProfile = async () => {
//     setIsLoading(true);

//     try {
//       // Call API to update profile
//       // For now, just update local user data
//       // updateUser(profileForm);

//       const result = await updateUser(profileForm);
//       console.log("Profile update result:", result);

//       if (result.success) {
//         Alert.alert("Success", "Profile updated successfully");
//         setEditProfileModal(false);
//       } else {
//         Alert.alert("Error", result.error || "Failed to update profile");
//       }
//     } catch (error) {
//       Alert.alert("Error", "Failed to update profile");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleLogout = () => {
//     Alert.alert("Logout", "Are you sure you want to logout?", [
//       { text: "Cancel", style: "cancel" },
//       {
//         text: "Logout",
//         style: "destructive",
//         onPress: logout,
//       },
//     ]);
//   };

//   const renderUserInfo = () => (
//     <View style={styles.userCard}>
//       <View style={styles.avatarContainer}>
//         <View style={styles.avatar}>
//           <Text style={styles.avatarText}>
//             {user?.name?.charAt(0)?.toUpperCase() || "U"}
//           </Text>
//         </View>
//       </View>
//       <View style={styles.userInfo}>
//         <Text style={styles.userName}>{user?.name || "User"}</Text>
//         <Text style={styles.userEmail}>{user?.email || "No email"}</Text>
//         <Text style={styles.userRole}>
//           {user?.role?.toUpperCase() || "USER"}
//         </Text>
//       </View>
//       <TouchableOpacity
//         style={styles.editButton}
//         onPress={() => setEditProfileModal(true)}
//       >
//         <Ionicons name="create-outline" size={20} color="#2196F3" />
//       </TouchableOpacity>
//     </View>
//   );

//   const renderSettingsSection = () => (
//     <View style={styles.settingsCard}>
//       <Text style={styles.sectionTitle}>Settings</Text>

//       {biometricAvailable && (
//         <View style={styles.settingItem}>
//           <View style={styles.settingInfo}>
//             <Ionicons
//               name={BiometricService.getBiometricIconName()}
//               size={24}
//               color="#4CAF50"
//             />
//             <View style={styles.settingText}>
//               <Text style={styles.settingTitle}>
//                 {BiometricService.getBiometricTypeLabel()} Login
//               </Text>
//               <Text style={styles.settingSubtitle}>
//                 Use biometric authentication to login
//               </Text>
//             </View>
//           </View>
//           <Switch
//             value={biometricEnabled}
//             onValueChange={handleBiometricToggle}
//             trackColor={{ false: "#767577", true: "#4CAF50" }}
//           />
//         </View>
//       )}

//       <View style={styles.settingItem}>
//         <View style={styles.settingInfo}>
//           <Ionicons name="notifications" size={24} color="#FF9800" />
//           <View style={styles.settingText}>
//             <Text style={styles.settingTitle}>Push Notifications</Text>
//             <Text style={styles.settingSubtitle}>
//               Receive attendance reminders
//             </Text>
//           </View>
//         </View>
//         <Switch
//           value={notificationsEnabled}
//           onValueChange={handleNotificationToggle}
//           trackColor={{ false: "#767577", true: "#FF9800" }}
//         />
//       </View>
//     </View>
//   );

//   const renderActionsSection = () => (
//     <View style={styles.actionsCard}>
//       <Text style={styles.sectionTitle}>Account</Text>

//       <TouchableOpacity
//         style={styles.actionItem}
//         onPress={() => setChangePasswordModal(true)}
//       >
//         <Ionicons name="lock-closed" size={24} color="#2196F3" />
//         <Text style={styles.actionTitle}>Change Password</Text>
//         <Ionicons name="chevron-forward" size={20} color="#999" />
//       </TouchableOpacity>

//       <TouchableOpacity
//         style={styles.actionItem}
//         onPress={() => setHelpModalVisible(true)}
//       >
//         <Ionicons name="help-circle" size={24} color="#4CAF50" />
//         <Text style={styles.actionTitle}>Help & Support</Text>
//         <Ionicons name="chevron-forward" size={20} color="#999" />
//       </TouchableOpacity>

//       <TouchableOpacity
//         style={styles.actionItem}
//         onPress={() => setAboutModalVisible(true)}
//       >
//         <Ionicons name="information-circle" size={24} color="#FF9800" />
//         <Text style={styles.actionTitle}>About App</Text>
//         <Ionicons name="chevron-forward" size={20} color="#999" />
//       </TouchableOpacity>

//       <TouchableOpacity
//         style={[styles.actionItem, styles.logoutItem]}
//         onPress={handleLogout}
//       >
//         <Ionicons name="log-out" size={24} color="#F44336" />
//         <Text style={[styles.actionTitle, styles.logoutText]}>Logout</Text>
//         <Ionicons name="chevron-forward" size={20} color="#999" />
//       </TouchableOpacity>
//     </View>
//   );

//   const renderEditProfileModal = () => (
//     <Modal visible={editProfileModal} animationType="slide">
//       <View style={styles.modalContainer}>
//         <View style={styles.modalHeader}>
//           <TouchableOpacity onPress={() => setEditProfileModal(false)}>
//             <Text style={styles.modalCancel}>Cancel</Text>
//           </TouchableOpacity>
//           <Text style={styles.modalTitle}>Edit Profile</Text>
//           <TouchableOpacity onPress={handleUpdateProfile}>
//             <Text style={styles.modalDone}>Save</Text>
//           </TouchableOpacity>
//         </View>

//         <View style={styles.modalContent}>
//           {/* Name (Everyone) */}
//           <Text style={styles.inputLabel}>Name</Text>
//           <TextInput
//             style={styles.input}
//             value={profileForm.name}
//             onChangeText={(text) =>
//               setProfileForm({ ...profileForm, name: text })
//             }
//             placeholder="Name"
//           />

//           {/* Phone (Everyone) */}
//           <Text style={styles.inputLabel}>Phone</Text>
//           <TextInput
//             style={styles.input}
//             value={profileForm.phone}
//             onChangeText={(text) =>
//               setProfileForm({ ...profileForm, phone: text })
//             }
//             placeholder="Phone"
//             keyboardType="phone-pad"
//           />

//           {/* Extra fields only for Admin */}
//           {user?.role === "admin" && (
//             <>
//               <Text style={styles.inputLabel}>Email</Text>
//               <TextInput
//                 style={styles.input}
//                 value={profileForm.email}
//                 onChangeText={(text) =>
//                   setProfileForm({ ...profileForm, email: text })
//                 }
//                 placeholder="Email"
//                 keyboardType="email-address"
//               />

//               <Text style={styles.inputLabel}>Department</Text>
//               <TextInput
//                 style={styles.input}
//                 value={profileForm.department || ""}
//                 onChangeText={(text) =>
//                   setProfileForm({ ...profileForm, department: text })
//                 }
//                 placeholder="Department"
//               />

//               <Text style={styles.inputLabel}>Role</Text>
//               <TextInput
//                 style={styles.input}
//                 value={profileForm.role || ""}
//                 onChangeText={(text) =>
//                   setProfileForm({ ...profileForm, role: text })
//                 }
//                 placeholder="Role (e.g., user/admin)"
//               />

//               <View
//                 style={{
//                   flexDirection: "row",
//                   alignItems: "center",
//                   marginTop: 16,
//                 }}
//               >
//                 <Text style={[styles.inputLabel, { flex: 1 }]}>
//                   Active Status
//                 </Text>
//                 <Switch
//                   value={profileForm.is_active ?? true}
//                   onValueChange={(value) =>
//                     setProfileForm({ ...profileForm, is_active: value })
//                   }
//                   trackColor={{ false: "#767577", true: "#4CAF50" }}
//                 />
//               </View>
//             </>
//           )}

//           {/* Loader */}
//           {isLoading && (
//             <ActivityIndicator
//               size="small"
//               color="#2196F3"
//               style={{ marginTop: 16 }}
//             />
//           )}
//         </View>
//       </View>
//     </Modal>
//   );

//   const renderChangePasswordModal = () => (
//     <Modal visible={changePasswordModal} animationType="slide">
//       <View style={styles.modalContainer}>
//         <View style={styles.modalHeader}>
//           <TouchableOpacity onPress={() => setChangePasswordModal(false)}>
//             <Text style={styles.modalCancel}>Cancel</Text>
//           </TouchableOpacity>
//           <Text style={styles.modalTitle}>Change Password</Text>
//           <TouchableOpacity onPress={handleChangePassword}>
//             <Text style={styles.modalDone}>Save</Text>
//           </TouchableOpacity>
//         </View>

//         <View style={styles.modalContent}>
//           <Text style={styles.inputLabel}>Current Password</Text>
//           <TextInput
//             style={styles.input}
//             value={passwordForm.currentPassword}
//             onChangeText={(text) =>
//               setPasswordForm({ ...passwordForm, currentPassword: text })
//             }
//             placeholder="Current Password"
//             secureTextEntry
//           />

//           <Text style={styles.inputLabel}>New Password</Text>
//           <TextInput
//             style={styles.input}
//             value={passwordForm.newPassword}
//             onChangeText={(text) =>
//               setPasswordForm({ ...passwordForm, newPassword: text })
//             }
//             placeholder="New Password"
//             secureTextEntry
//           />

//           <Text style={styles.inputLabel}>Confirm New Password</Text>
//           <TextInput
//             style={styles.input}
//             value={passwordForm.confirmPassword}
//             onChangeText={(text) =>
//               setPasswordForm({ ...passwordForm, confirmPassword: text })
//             }
//             placeholder="Confirm New Password"
//             secureTextEntry
//           />

//           {isLoading && (
//             <ActivityIndicator
//               size="small"
//               color="#2196F3"
//               style={{ marginTop: 16 }}
//             />
//           )}
//         </View>
//       </View>
//     </Modal>
//   );

//   const renderHelpModal = () => (
//     <Modal visible={helpModalVisible} animationType="slide">
//       <View style={styles.modalContainer}>
//         <View style={styles.modalHeader}>
//           <TouchableOpacity onPress={() => setHelpModalVisible(false)}>
//             <Text style={styles.modalCancel}>Close</Text>
//           </TouchableOpacity>
//           <Text style={styles.modalTitle}>Help & Support</Text>
//           <View style={{ width: 50 }} />
//         </View>
//         <ScrollView style={styles.modalContent}>
//           <Text style={styles.inputLabel}>FAQs</Text>

//           <Text style={styles.input}>
//             • How to reset password?{"\n"}
//             Go to "Change Password" section and follow the instructions.{"\n\n"}
//             • How to contact support?{"\n"}
//             You can reach out to our team using the contact info below.
//           </Text>

//           <Text style={styles.inputLabel}>Contact Us</Text>
//           <Text style={styles.input}>
//             Email: support@sysassist.com{"\n"}
//             Phone: +91 1234567890
//           </Text>
//         </ScrollView>
//       </View>
//     </Modal>
//   );

//   const renderAboutModal = () => (
//     <Modal visible={aboutModalVisible} animationType="slide">
//       <View style={styles.modalContainer}>
//         <View style={styles.modalHeader}>
//           <TouchableOpacity onPress={() => setAboutModalVisible(false)}>
//             <Text style={styles.modalCancel}>Close</Text>
//           </TouchableOpacity>
//           <Text style={styles.modalTitle}>About App</Text>
//           <View style={{ width: 50 }} />
//         </View>
//         <ScrollView style={styles.modalContent}>
//           <Text style={styles.input}>
//             Version: 1.0.0{"\n\n"}
//             This app is designed to help you manage your attendance, receive
//             notifications, and keep your profile updated.{"\n\n"}
//             Developed by Team SysAssist IT Solutions, Indore.
//           </Text>
//         </ScrollView>
//       </View>
//     </Modal>
//   );

//   return (
//     <ScrollView style={styles.container}>
//       {renderUserInfo()}
//       {renderSettingsSection()}
//       {renderActionsSection()}
//       {renderEditProfileModal()}
//       {renderChangePasswordModal()}
//       {renderHelpModal()}
//       {renderAboutModal()}
//     </ScrollView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#f5f5f5",
//   },

//   userCard: {
//     backgroundColor: "#fff",
//     margin: 16,
//     borderRadius: 12,
//     padding: 16,
//     flexDirection: "row",
//     alignItems: "center",
//     elevation: 2,
//   },
//   avatarContainer: {
//     marginRight: 16,
//   },
//   avatar: {
//     width: 64,
//     height: 64,
//     borderRadius: 32,
//     backgroundColor: "#2196F3",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   avatarText: {
//     fontSize: 28,
//     color: "#fff",
//     fontWeight: "700",
//   },
//   userInfo: {
//     flex: 1,
//   },
//   userName: {
//     fontSize: 18,
//     fontWeight: "700",
//     color: "#333",
//   },
//   userEmail: {
//     fontSize: 14,
//     color: "#555",
//   },
//   userRole: {
//     fontSize: 12,
//     color: "#777",
//     marginTop: 4,
//   },
//   editButton: {
//     padding: 8,
//   },

//   settingsCard: {
//     backgroundColor: "#fff",
//     marginHorizontal: 16,
//     marginBottom: 16,
//     borderRadius: 12,
//     padding: 16,
//     elevation: 1,
//   },
//   sectionTitle: {
//     fontSize: 16,
//     fontWeight: "700",
//     color: "#333",
//     marginBottom: 12,
//   },
//   settingItem: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 16,
//   },
//   settingInfo: {
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   settingText: {
//     marginLeft: 12,
//   },
//   settingTitle: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#333",
//   },
//   settingSubtitle: {
//     fontSize: 12,
//     color: "#777",
//   },

//   actionsCard: {
//     backgroundColor: "#fff",
//     marginHorizontal: 16,
//     marginBottom: 16,
//     borderRadius: 12,
//     padding: 16,
//     elevation: 1,
//   },
//   actionItem: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: "#eee",
//   },
//   actionTitle: {
//     flex: 1,
//     marginLeft: 12,
//     fontSize: 14,
//     color: "#333",
//   },
//   logoutItem: {
//     borderBottomWidth: 0,
//   },
//   logoutText: {
//     color: "#F44336",
//     fontWeight: "700",
//   },

//   modalContainer: {
//     flex: 1,
//     backgroundColor: "#fff",
//   },
//   modalHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: "#ddd",
//   },
//   modalCancel: {
//     fontSize: 16,
//     color: "#F44336",
//   },
//   modalTitle: {
//     fontSize: 16,
//     fontWeight: "700",
//     color: "#333",
//   },
//   modalDone: {
//     fontSize: 16,
//     color: "#4CAF50",
//   },
//   modalContent: {
//     padding: 16,
//   },
//   inputLabel: {
//     fontSize: 12,
//     color: "#777",
//     marginBottom: 4,
//     marginTop: 12,
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: "#ddd",
//     borderRadius: 8,
//     padding: 12,
//     fontSize: 14,
//     backgroundColor: "#f9f9f9",
//   },
// });

// export default ProfileScreen;

// screens/ProfileScreen.js - User profile and settings with photo upload
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
  Image,
  ActionSheetIOS,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import { getInfoAsync } from "expo-file-system/legacy";

import { useAuth } from "../context/AuthContext";
import BiometricService from "../services/BiometricService";
import ApiService from "../services/ApiService";

const ProfileScreen = () => {
  const { user, logout, updateUser, changePassword } = useAuth();

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

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
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    // Request camera and media library permissions
    const { status: cameraStatus } =
      await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== "granted" || mediaStatus !== "granted") {
      console.log("Permissions not granted for camera/media");
    }
  };

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

  const showImagePicker = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo", "Choose from Library"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            openCamera();
          } else if (buttonIndex === 2) {
            openImageLibrary();
          }
        }
      );
    } else {
      Alert.alert("Select Photo", "Choose how you want to select a photo", [
        { text: "Cancel", style: "cancel" },
        { text: "Camera", onPress: openCamera },
        { text: "Gallery", onPress: openImageLibrary },
      ]);
    }
  };

  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePhoto(result.assets[0]);
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Failed to open camera");
    }
  };

  const openImageLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePhoto(result.assets[0]);
      }
    } catch (error) {
      console.error("Image library error:", error);
      Alert.alert("Error", "Failed to open image library");
    }
  };

  const uploadProfilePhoto = async (imageAsset) => {
    try {
      setIsUploadingPhoto(true);

      // Get file info using the legacy API to avoid deprecation warnings
      const fileInfo = await getInfoAsync(imageAsset.uri);

      // Check file size (limit to 5MB)
      if (fileInfo.size > 5 * 1024 * 1024) {
        Alert.alert("Error", "Image size should be less than 5MB");
        return;
      }

      // Create form data
      const formData = new FormData();
      formData.append("photo", {
        uri: imageAsset.uri,
        type: imageAsset.type || "image/jpeg",
        name: `profile_${user.id}_${Date.now()}.jpg`,
      });

      // Make API call
      const response = await fetch(
        `${ApiService.client.defaults.baseURL}/users/${user.id}/upload-photo`,
        {
          method: "POST",
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization:
              ApiService.client.defaults.headers.common["Authorization"],
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (result.success) {
        // Update user data with new profile photo
        const updatedUser = {
          ...user,
          profile_photo: result.data.profile_photo,
        };

        // Update context and secure store
        updateUser({ profile_photo: result.data.profile_photo });
        await SecureStore.setItemAsync("userData", JSON.stringify(updatedUser));

        Alert.alert("Success", "Profile photo updated successfully");
      } else {
        Alert.alert("Error", result.message || "Failed to upload photo");
      }
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Failed to upload profile photo");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const getProfileImageSource = () => {
    if (user?.profile_photo) {
      // If it's a full URL, use it directly
      if (user.profile_photo.startsWith("http")) {
        return { uri: user.profile_photo };
      }
      // If it's a relative path, prepend the base URL
      const baseURL = ApiService.client.defaults.baseURL.replace("/api", "");
      return { uri: `${baseURL}${user.profile_photo}` };
    }
    return null;
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
        <TouchableOpacity onPress={showImagePicker} disabled={isUploadingPhoto}>
          <View style={styles.avatar}>
            {getProfileImageSource() ? (
              <Image
                source={getProfileImageSource()}
                style={styles.profileImage}
                onError={(error) => {
                  console.error("Profile image load error:", error);
                }}
              />
            ) : (
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            )}

            {/* Camera icon overlay */}
            <View style={styles.cameraOverlay}>
              {isUploadingPhoto ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={16} color="#fff" />
              )}
            </View>
          </View>
        </TouchableOpacity>
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

      <TouchableOpacity
        style={styles.actionItem}
        onPress={() => setHelpModalVisible(true)}
      >
        <Ionicons name="help-circle" size={24} color="#4CAF50" />
        <Text style={styles.actionTitle}>Help & Support</Text>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionItem}
        onPress={() => setAboutModalVisible(true)}
      >
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

  const renderHelpModal = () => (
    <Modal visible={helpModalVisible} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setHelpModalVisible(false)}>
            <Text style={styles.modalCancel}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Help & Support</Text>
          <View style={{ width: 50 }} />
        </View>
        <ScrollView style={styles.modalContent}>
          <Text style={styles.inputLabel}>FAQs</Text>

          <Text style={styles.input}>
            • How to reset password?{"\n"}
            Go to "Change Password" section and follow the instructions.{"\n\n"}
            • How to change profile photo?{"\n"}
            Tap on your profile picture and select camera or gallery.{"\n\n"}•
            How to contact support?{"\n"}
            You can reach out to our team using the contact info below.
          </Text>

          <Text style={styles.inputLabel}>Contact Us</Text>
          <Text style={styles.input}>
            Email: support@sysassist.com{"\n"}
            Phone: +91 1234567890
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderAboutModal = () => (
    <Modal visible={aboutModalVisible} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setAboutModalVisible(false)}>
            <Text style={styles.modalCancel}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>About App</Text>
          <View style={{ width: 50 }} />
        </View>
        <ScrollView style={styles.modalContent}>
          <Text style={styles.input}>
            Version: 1.0.0{"\n\n"}
            This app is designed to help you manage your attendance, receive
            notifications, and keep your profile updated.{"\n\n"}
            Developed by Team SysAssist IT Solutions, Indore.
          </Text>
        </ScrollView>
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
      {renderHelpModal()}
      {renderAboutModal()}
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
    position: "relative",
    overflow: "hidden",
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 10,
    width: 20,
    height: 20,
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
