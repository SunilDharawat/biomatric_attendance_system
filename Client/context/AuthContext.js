// context/AuthContext.js - Authentication context and state management
import React, { createContext, useContext, useReducer, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import ApiService from "../services/ApiService";

// Initial state
const initialState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,
  error: null,
};

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: "SET_LOADING",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_ERROR: "LOGIN_ERROR",
  LOGOUT: "LOGOUT",
  UPDATE_USER: "UPDATE_USER",
  CLEAR_ERROR: "CLEAR_ERROR",
};

// Reducer function
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_ERROR:
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: null,
        error: action.payload,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: null,
        error: null,
      };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
}

// Create context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing authentication on app start
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      const token = await SecureStore.getItemAsync("authToken");
      const userData = await SecureStore.getItemAsync("userData");

      if (token && userData) {
        const user = JSON.parse(userData);

        // Set token in API service
        ApiService.setAuthToken(token);

        // Verify token is still valid
        try {
          const response = await ApiService.get("/auth/me");
          if (response.success) {
            dispatch({
              type: AUTH_ACTIONS.LOGIN_SUCCESS,
              payload: {
                user: response.user,
                token,
              },
            });
          } else {
            // Token is invalid, clear storage
            await clearAuthData();
            dispatch({ type: AUTH_ACTIONS.LOGOUT });
          }
        } catch (error) {
          // Token verification failed
          await clearAuthData();
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
        }
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    } catch (error) {
      console.error("Auth state check error:", error);
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const login = async (email, password) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await ApiService.post("/auth/login", {
        email,
        password,
      });

      if (response.success) {
        // Store auth data securely
        await SecureStore.setItemAsync("authToken", response.token);
        await SecureStore.setItemAsync(
          "userData",
          JSON.stringify(response.user)
        );

        // Set token in API service
        ApiService.setAuthToken(response.token);

        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: response.user,
            token: response.token,
          },
        });

        return { success: true };
      } else {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_ERROR,
          payload: response.message || "Login failed",
        });
        return { success: false, error: response.message };
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Network error. Please try again.";
      dispatch({
        type: AUTH_ACTIONS.LOGIN_ERROR,
        payload: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      // Call logout API
      await ApiService.post("/auth/logout");
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      // Clear local auth data regardless of API call result
      await clearAuthData();
      ApiService.clearAuthToken();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  const clearAuthData = async () => {
    try {
      await SecureStore.deleteItemAsync("authToken");
      await SecureStore.deleteItemAsync("userData");
    } catch (error) {
      console.error("Error clearing auth data:", error);
    }
  };

  const updateUser = (userData) => {
    dispatch({
      type: AUTH_ACTIONS.UPDATE_USER,
      payload: userData,
    });
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await ApiService.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      if (response.success) {
        return { success: true, message: response.message };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to change password";
      return { success: false, error: errorMessage };
    }
  };

  const refreshToken = async () => {
    try {
      const response = await ApiService.post("/auth/refresh-token");

      if (response.success) {
        await SecureStore.setItemAsync("authToken", response.token);
        ApiService.setAuthToken(response.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Token refresh error:", error);
      return false;
    }
  };

  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Context value
  const value = {
    // State
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    user: state.user,
    token: state.token,
    error: state.error,

    // Actions
    login,
    logout,
    updateUser,
    changePassword,
    refreshToken,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
