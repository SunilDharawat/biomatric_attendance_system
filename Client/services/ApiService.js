// // services/ApiService.js - Complete API service for HTTP requests
// import axios from "axios";
// import * as SecureStore from "expo-secure-store";

// // API Configuration
// const API_CONFIG = {
//   baseURL: __DEV__
//     ? "http://192.168.137.1:5000/api" // Change this to your development server IP
//     : "https://your-production-api.com/api",
//   timeout: 30000,
//   headers: {
//     "Content-Type": "application/json",
//   },
// };

// class ApiService {
//   constructor() {
//     this.client = axios.create(API_CONFIG);
//     this.setupInterceptors();
//   }

//   setupInterceptors() {
//     // Request interceptor
//     this.client.interceptors.request.use(
//       (config) => {
//         console.log(
//           `API Request: ${config.method?.toUpperCase()} ${config.url}`
//         );
//         return config;
//       },
//       (error) => {
//         console.error("API Request Error:", error);
//         return Promise.reject(error);
//       }
//     );

//     // Response interceptor
//     this.client.interceptors.response.use(
//       (response) => {
//         console.log(`API Response: ${response.status} ${response.config.url}`);
//         return response;
//       },
//       async (error) => {
//         const originalRequest = error.config;

//         // Handle token expiration (401 Unauthorized)
//         if (error.response?.status === 401 && !originalRequest._retry) {
//           originalRequest._retry = true;

//           try {
//             // Try to refresh token
//             const refreshResponse = await this.post("/auth/refresh-token");

//             if (refreshResponse.success) {
//               const newToken = refreshResponse.token;
//               await SecureStore.setItemAsync("authToken", newToken);
//               this.setAuthToken(newToken);

//               // Retry original request with new token
//               originalRequest.headers.Authorization = `Bearer ${newToken}`;
//               return this.client(originalRequest);
//             }
//           } catch (refreshError) {
//             // Refresh failed, redirect to login
//             console.error("Token refresh failed:", refreshError);
//             await this.clearAuthData();
//             // Note: Navigation should be handled by the auth context
//           }
//         }

//         console.error(
//           "API Response Error:",
//           error.response?.data || error.message
//         );
//         return Promise.reject(error);
//       }
//     );
//   }

//   async initialize() {
//     try {
//       // Load stored auth token
//       const token = await SecureStore.getItemAsync("authToken");
//       if (token) {
//         this.setAuthToken(token);
//       }
//     } catch (error) {
//       console.error("ApiService initialization error:", error);
//     }
//   }

//   setAuthToken(token) {
//     if (token) {
//       this.client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
//     } else {
//       delete this.client.defaults.headers.common["Authorization"];
//     }
//   }

//   clearAuthToken() {
//     delete this.client.defaults.headers.common["Authorization"];
//   }

//   async clearAuthData() {
//     try {
//       await SecureStore.deleteItemAsync("authToken");
//       await SecureStore.deleteItemAsync("userData");
//       this.clearAuthToken();
//     } catch (error) {
//       console.error("Error clearing auth data:", error);
//     }
//   }

//   // Generic request method
//   async request(method, url, data = null, config = {}) {
//     try {
//       const response = await this.client({
//         method,
//         url,
//         data,
//         ...config,
//       });

//       return response.data;
//     } catch (error) {
//       if (error.response) {
//         // Server responded with error status
//         throw error;
//       } else if (error.request) {
//         // Network error
//         throw new Error(
//           "Network error. Please check your internet connection."
//         );
//       } else {
//         // Other error
//         throw new Error("An unexpected error occurred.");
//       }
//     }
//   }

//   // HTTP Methods
//   async get(url, config = {}) {
//     return this.request("GET", url, null, config);
//   }

//   async post(url, data = {}, config = {}) {
//     return this.request("POST", url, data, config);
//   }

//   async put(url, data = {}, config = {}) {
//     return this.request("PUT", url, data, config);
//   }

//   async patch(url, data = {}, config = {}) {
//     return this.request("PATCH", url, data, config);
//   }

//   async delete(url, config = {}) {
//     return this.request("DELETE", url, null, config);
//   }

//   // File upload method
//   async uploadFile(url, file, progressCallback = null) {
//     try {
//       const formData = new FormData();
//       formData.append("file", {
//         uri: file.uri,
//         type: file.type,
//         name: file.name,
//       });

//       const config = {
//         headers: {
//           "Content-Type": "multipart/form-data",
//         },
//         onUploadProgress: (progressEvent) => {
//           if (progressCallback) {
//             const percentCompleted = Math.round(
//               (progressEvent.loaded * 100) / progressEvent.total
//             );
//             progressCallback(percentCompleted);
//           }
//         },
//       };

//       return await this.post(url, formData, config);
//     } catch (error) {
//       console.error("File upload error:", error);
//       throw error;
//     }
//   }

//   // Authentication Methods
//   async login(email, password) {
//     return this.post("/auth/login", { email, password });
//   }

//   async logout() {
//     return this.post("/auth/logout");
//   }

//   async refreshToken() {
//     return this.post("/auth/refresh-token");
//   }

//   async getProfile() {
//     return this.get("/auth/me");
//   }

//   async changePassword(currentPassword, newPassword) {
//     return this.post("/auth/change-password", {
//       currentPassword,
//       newPassword,
//     });
//   }

//   async forgotPassword(email) {
//     return this.post("/auth/forgot-password", { email });
//   }

//   async resetPassword(token, newPassword) {
//     return this.post("/auth/reset-password", { token, newPassword });
//   }

//   // Attendance Methods
//   async getTodayAttendance() {
//     return this.get("/attendance/today");
//   }

//   async getMyAttendance(params = {}) {
//     return this.get("/attendance/my", { params });
//   }

//   async checkIn(data) {
//     return this.post("/attendance/checkin", data);
//   }

//   async checkOut(data) {
//     return this.post("/attendance/checkout", data);
//   }

//   async getAttendanceStats(month, year) {
//     return this.get("/attendance/stats", {
//       params: { month, year },
//     });
//   }

//   async getAttendanceCalendar(month, year) {
//     return this.get("/attendance/calendar", {
//       params: { month, year },
//     });
//   }

//   // User Profile Methods
//   async updateProfile(userData) {
//     return this.put("/users/profile", userData);
//   }

//   async uploadProfilePicture(imageFile) {
//     return this.uploadFile("/users/profile-picture", imageFile);
//   }

//   async updateBiometricSettings(enabled) {
//     return this.put("/users/biometric-settings", { enabled });
//   }

//   async updateNotificationSettings(settings) {
//     return this.put("/users/notification-settings", settings);
//   }

//   // Admin Methods
//   async getAllUsers(params = {}) {
//     return this.get("/admin/users", { params });
//   }

//   async getUserById(userId) {
//     return this.get(`/admin/users/${userId}`);
//   }

//   async updateUser(userId, userData) {
//     return this.put(`/api/users/${userId}`, userData);
//   }

//   async deleteUser(userId) {
//     return this.delete(`/admin/users/${userId}`);
//   }

//   async createUser(userData) {
//     return this.post("/admin/users", userData);
//   }

//   async getUserAttendance(userId, params = {}) {
//     return this.get(`/admin/users/${userId}/attendance`, { params });
//   }

//   async getAllAttendance(params = {}) {
//     return this.get("/admin/attendance", { params });
//   }

//   async getAttendanceReports(params = {}) {
//     return this.get("/admin/reports/attendance", { params });
//   }

//   async exportAttendanceReport(params = {}) {
//     return this.get("/admin/reports/export", {
//       params,
//       responseType: "blob",
//     });
//   }

//   async getDashboardStats() {
//     return this.get("/admin/dashboard/stats");
//   }

//   async getSystemSettings() {
//     return this.get("/admin/settings");
//   }

//   async updateSystemSettings(settings) {
//     return this.put("/admin/settings", settings);
//   }

//   // Notification Methods
//   async registerPushToken(token) {
//     return this.post("/notifications/register-token", { token });
//   }

//   async getNotifications(params = {}) {
//     return this.get("/notifications", { params });
//   }

//   async markNotificationRead(notificationId) {
//     return this.put(`/notifications/${notificationId}/read`);
//   }

//   async markAllNotificationsRead() {
//     return this.put("/notifications/mark-all-read");
//   }

//   // Location Methods
//   async validateLocation(latitude, longitude) {
//     return this.post("/location/validate", { latitude, longitude });
//   }

//   async getOfficeLocations() {
//     return this.get("/location/offices");
//   }

//   // System Methods
//   async checkServerHealth() {
//     return this.get("/health");
//   }

//   async getAppVersion() {
//     return this.get("/version");
//   }

//   // Emergency Methods
//   async emergencyCheckOut(reason) {
//     return this.post("/attendance/emergency-checkout", { reason });
//   }

//   async reportIssue(issue) {
//     return this.post("/support/report-issue", issue);
//   }

//   async getAttendanceReport(filters) {
//     return this.get("/admin/attendance-report", { params: filters });
//   }

//   async getEmployee() {
//     return this.get("/api/users");
//   }
//   async getDashboardData() {
//     return this.get("/api/reports/dashboard");
//   }
// }

// const apiServiceInstance = new ApiService();
// export default apiServiceInstance;
// services/ApiService.js - Fixed API service for HTTP requests
import axios from "axios";
import * as SecureStore from "expo-secure-store";

// API Configuration
const API_CONFIG = {
  baseURL: __DEV__
    ? "http://192.168.137.1:5000/api" // Change this to your development server IP
    : "https://your-production-api.com/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
};

class ApiService {
  constructor() {
    this.client = axios.create(API_CONFIG);
    this.isRefreshing = false;
    this.failedQueue = [];
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(
          `API Request: ${config.method?.toUpperCase()} ${config.url}`
        );
        return config;
      },
      (error) => {
        console.error("API Request Error:", error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - FIXED VERSION
    this.client.interceptors.response.use(
      (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle token expiration (401 Unauthorized)
        if (error.response?.status === 401 && !originalRequest._retry) {
          // Skip refresh for login and refresh-token endpoints to avoid infinite loop
          if (
            originalRequest.url.includes("/auth/login") ||
            originalRequest.url.includes("/auth/refresh-token")
          ) {
            return Promise.reject(error);
          }

          if (this.isRefreshing) {
            // If refresh is already in progress, queue this request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.client(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const token = await SecureStore.getItemAsync("authToken");

            if (!token) {
              throw new Error("No token available");
            }

            // Create a separate axios instance for refresh to avoid interceptor conflicts
            const refreshClient = axios.create({
              baseURL: API_CONFIG.baseURL,
              timeout: API_CONFIG.timeout,
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            });

            const refreshResponse = await refreshClient.post(
              "/auth/refresh-token"
            );

            if (refreshResponse.data.success) {
              const newToken = refreshResponse.data.token;
              await SecureStore.setItemAsync("authToken", newToken);
              this.setAuthToken(newToken);

              // Process failed queue
              this.processQueue(null, newToken);

              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            } else {
              throw new Error("Token refresh failed");
            }
          } catch (refreshError) {
            // Refresh failed, clear auth data and reject all queued requests
            console.error("Token refresh failed:", refreshError);
            this.processQueue(refreshError, null);
            await this.clearAuthData();

            // Don't throw here, let the caller handle the 401
            return Promise.reject(error);
          } finally {
            this.isRefreshing = false;
          }
        }

        console.error(
          "API Response Error:",
          error.response?.data || error.message
        );
        return Promise.reject(error);
      }
    );
  }

  processQueue(error, token = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });

    this.failedQueue = [];
  }

  async initialize() {
    try {
      // Load stored auth token
      const token = await SecureStore.getItemAsync("authToken");
      if (token) {
        this.setAuthToken(token);
      }
    } catch (error) {
      console.error("ApiService initialization error:", error);
    }
  }

  setAuthToken(token) {
    if (token) {
      this.client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common["Authorization"];
    }
  }

  clearAuthToken() {
    delete this.client.defaults.headers.common["Authorization"];
  }

  async clearAuthData() {
    try {
      await SecureStore.deleteItemAsync("authToken");
      await SecureStore.deleteItemAsync("userData");
      this.clearAuthToken();
    } catch (error) {
      console.error("Error clearing auth data:", error);
    }
  }

  // Generic request method
  async request(method, url, data = null, config = {}) {
    try {
      const response = await this.client({
        method,
        url,
        data,
        ...config,
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        // Server responded with error status
        throw error;
      } else if (error.request) {
        // Network error
        throw new Error(
          "Network error. Please check your internet connection."
        );
      } else {
        // Other error
        throw new Error("An unexpected error occurred.");
      }
    }
  }

  // HTTP Methods
  async get(url, config = {}) {
    return this.request("GET", url, null, config);
  }

  async post(url, data = {}, config = {}) {
    return this.request("POST", url, data, config);
  }

  async put(url, data = {}, config = {}) {
    return this.request("PUT", url, data, config);
  }

  async patch(url, data = {}, config = {}) {
    return this.request("PATCH", url, data, config);
  }

  async delete(url, config = {}) {
    return this.request("DELETE", url, null, config);
  }

  // File upload method
  async uploadFile(url, file, progressCallback = null) {
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        type: file.type,
        name: file.name,
      });

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressCallback) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            progressCallback(percentCompleted);
          }
        },
      };

      return await this.post(url, formData, config);
    } catch (error) {
      console.error("File upload error:", error);
      throw error;
    }
  }

  // Authentication Methods
  async login(email, password) {
    return this.post("/auth/login", { email, password });
  }

  async logout() {
    return this.post("/auth/logout");
  }

  async refreshToken() {
    return this.post("/auth/refresh-token");
  }

  async getProfile() {
    return this.get("/auth/me");
  }

  async changePassword(currentPassword, newPassword) {
    return this.post("/auth/change-password", {
      currentPassword,
      newPassword,
    });
  }

  async forgotPassword(email) {
    return this.post("/auth/forgot-password", { email });
  }

  async resetPassword(token, newPassword) {
    return this.post("/auth/reset-password", { token, newPassword });
  }

  // Attendance Methods
  async getTodayAttendance() {
    return this.get("/attendance/today");
  }

  async getMyAttendance(params = {}) {
    return this.get("/attendance/my", { params });
  }

  async checkIn(data) {
    return this.post("/attendance/checkin", data);
  }

  async checkOut(data) {
    return this.post("/attendance/checkout", data);
  }

  async getAttendanceStats(month, year) {
    return this.get("/attendance/stats", {
      params: { month, year },
    });
  }

  async getAttendanceCalendar(month, year) {
    return this.get("/attendance/calendar", {
      params: { month, year },
    });
  }

  // User Profile Methods
  async updateProfile(userData) {
    return this.put("/users/profile", userData);
  }

  async uploadProfilePicture(imageFile) {
    return this.uploadFile("/users/profile-picture", imageFile);
  }

  async updateBiometricSettings(enabled) {
    return this.put("/users/biometric-settings", { enabled });
  }

  async updateNotificationSettings(settings) {
    return this.put("/users/notification-settings", settings);
  }

  // Admin Methods
  async getAllUsers(params = {}) {
    return this.get("/admin/users", { params });
  }

  async getUserById(userId) {
    return this.get(`/admin/users/${userId}`);
  }

  async updateUser(userId, userData) {
    return this.put(`/api/users/${userId}`, userData);
  }

  async deleteUser(userId) {
    return this.delete(`/admin/users/${userId}`);
  }

  async createUser(userData) {
    return this.post("/admin/users", userData);
  }

  async getUserAttendance(userId, params = {}) {
    return this.get(`/admin/users/${userId}/attendance`, { params });
  }

  async getAllAttendance(params = {}) {
    return this.get("/admin/attendance", { params });
  }

  async getAttendanceReports(params = {}) {
    return this.get("/admin/reports/attendance", { params });
  }

  async exportAttendanceReport(params = {}) {
    return this.get("/admin/reports/export", {
      params,
      responseType: "blob",
    });
  }

  async getDashboardStats() {
    return this.get("/admin/dashboard/stats");
  }

  async getSystemSettings() {
    return this.get("/admin/settings");
  }

  async updateSystemSettings(settings) {
    return this.put("/admin/settings", settings);
  }

  // Notification Methods
  async registerPushToken(token) {
    return this.post("/notifications/register-token", { token });
  }

  async getNotifications(params = {}) {
    return this.get("/notifications", { params });
  }

  async markNotificationRead(notificationId) {
    return this.put(`/notifications/${notificationId}/read`);
  }

  async markAllNotificationsRead() {
    return this.put("/notifications/mark-all-read");
  }

  // Location Methods
  async validateLocation(latitude, longitude) {
    return this.post("/location/validate", { latitude, longitude });
  }

  async getOfficeLocations() {
    return this.get("/location/offices");
  }

  // System Methods
  async checkServerHealth() {
    return this.get("/health");
  }

  async getAppVersion() {
    return this.get("/version");
  }

  // Emergency Methods
  async emergencyCheckOut(reason) {
    return this.post("/attendance/emergency-checkout", { reason });
  }

  async reportIssue(issue) {
    return this.post("/support/report-issue", issue);
  }

  async getAttendanceReport(filters) {
    return this.get("/admin/attendance-report", { params: filters });
  }

  async getEmployee() {
    return this.get("/api/users");
  }

  async getDashboardData() {
    return this.get("/api/reports/dashboard");
  }
}

const apiServiceInstance = new ApiService();
export default apiServiceInstance;
