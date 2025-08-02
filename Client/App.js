// App.js - Main React Native App Component
import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Platform } from "react-native";

// Import screens
import LoginScreen from "./screens/LoginScreen";
// import DashboardScreen from "./screens/DashboardScreen";
// import AttendanceScreen from "./screens/AttendanceScreen";
// import HistoryScreen from "./screens/HistoryScreen";
// import ProfileScreen from "./screens/ProfileScreen";
// import AdminScreen from "./screens/AdminScreen";
// import LoadingScreen from "./screens/LoadingScreen";

// Import context and services
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AttendanceProvider } from "./context/AttendanceContext";
import ApiService from "./services/ApiService";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Main Tab Navigator for authenticated users
function MainTabNavigator() {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Dashboard") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Attendance") {
            iconName = focused ? "finger-print" : "finger-print-outline";
          } else if (route.name === "History") {
            iconName = focused ? "time" : "time-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          } else if (route.name === "Admin") {
            iconName = focused ? "settings" : "settings-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#2196F3",
        tabBarInactiveTintColor: "gray",
        headerStyle: {
          backgroundColor: "#2196F3",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      })}
    >
      {/* <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: "Dashboard" }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{ title: "Mark Attendance" }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: "My History" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
      {user?.role === "admin" && (
        <Tab.Screen
          name="Admin"
          component={AdminScreen}
          options={{ title: "Admin Panel" }}
        />
      )} */}
    </Tab.Navigator>
  );
}

// Auth Stack Navigator
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

// Main App Navigator
function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  // if (isLoading) {
  //   return <LoadingScreen />;
  // }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}

// Main App Component
export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Request notification permissions
        if (Platform.OS !== "web") {
          const { status: existingStatus } =
            await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;

          if (existingStatus !== "granted") {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }

          if (finalStatus !== "granted") {
            Alert.alert(
              "Permission Required",
              "Please enable notifications to receive attendance reminders.",
              [{ text: "OK" }]
            );
          }
        }

        // Initialize API service
        await ApiService.initialize();

        // Set up notification listeners
        const notificationListener =
          Notifications.addNotificationReceivedListener((notification) => {
            console.log("Notification received:", notification);
          });

        const responseListener =
          Notifications.addNotificationResponseReceivedListener((response) => {
            console.log("Notification response:", response);
          });

        setIsReady(true);

        return () => {
          Notifications.removeNotificationSubscription(notificationListener);
          Notifications.removeNotificationSubscription(responseListener);
        };
      } catch (error) {
        console.error("App initialization error:", error);
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  // if (!isReady) {
  //   return <LoadingScreen />;
  // }

  return (
    <AuthProvider>
      <AttendanceProvider>
        <StatusBar style="light" backgroundColor="#1976D2" />
        <AppNavigator />
      </AttendanceProvider>
    </AuthProvider>
  );
}
