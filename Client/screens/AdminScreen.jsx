// import React, { useState, useEffect, useCallback } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   RefreshControl,
//   TouchableOpacity,
//   Modal,
//   TextInput,
//   Alert,
//   FlatList,
//   Dimensions,
//   ActivityIndicator,
// } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { LineChart, BarChart } from "react-native-chart-kit";
// import moment from "moment";
// import ApiService from "../services/ApiService";
// import { useAuth } from "../context/AuthContext";

// const { width: screenWidth } = Dimensions.get("window");

// const AdminScreen = () => {
//   const { user } = useAuth();
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [selectedTab, setSelectedTab] = useState("dashboard");

//   // Dashboard state
//   const [dashboardStats, setDashboardStats] = useState({
//     today: {
//       total_checkins: 0,
//       on_time: 0,
//       late: 0,
//       still_in_office: 0,
//       unique_employees: 0,
//     },
//     monthly: {
//       total_attendance: 0,
//       active_employees: 0,
//       avg_working_minutes: 0,
//       total_late_days: 0,
//     },
//     trends: [],
//     departments: [],
//     late_arrivals: [],
//   });

//   // Employee management state
//   const [employees, setEmployees] = useState([]);
//   const [filteredEmployees, setFilteredEmployees] = useState([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
//   const [selectedEmployee, setSelectedEmployee] = useState(null);
//   const [showEmployeeModal, setShowEmployeeModal] = useState(false);

//   // Reports state
//   const [reportData, setReportData] = useState([]);
//   const [reportSummary, setReportSummary] = useState(null);
//   const [reportFilters, setReportFilters] = useState({
//     startDate: moment().startOf("month").format("YYYY-MM-DD"),
//     endDate: moment().format("YYYY-MM-DD"),
//     employeeId: "all",
//   });

//   // New employee form state
//   const [newEmployee, setNewEmployee] = useState({
//     name: "",
//     email: "",
//     password: "",
//     role: "employee",
//     employee_id: "",
//     department: "",
//     phone: "",
//   });

//   // Load initial data
//   useEffect(() => {
//     loadDashboardData();
//     loadEmployees();
//   }, []);

//   // Filter employees when search query changes
//   useEffect(() => {
//     if (searchQuery.trim() === "") {
//       setFilteredEmployees(employees);
//     } else {
//       const filtered = employees.filter(
//         (emp) =>
//           emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
//           emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
//           emp.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//           emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
//       );
//       setFilteredEmployees(filtered);
//     }
//   }, [searchQuery, employees]);

//   const loadDashboardData = async () => {
//     try {
//       setLoading(true);
//       const response = await ApiService.get("/api/reports/dashboard");
//       if (response.data.success) {
//         setDashboardStats(response.data.data);
//       }
//     } catch (error) {
//       console.error("Error loading dashboard data:", error);
//       Alert.alert("Error", "Failed to load dashboard statistics");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadEmployees = async () => {
//     try {
//       const response = await ApiService.get("/api/users");
//       if (response.data.success) {
//         setEmployees(response.data.data.users);
//         setFilteredEmployees(response.data.data.users);
//       }
//     } catch (error) {
//       console.error("Error loading employees:", error);
//       Alert.alert("Error", "Failed to load employees");
//     }
//   };

//   const loadReportData = async () => {
//     try {
//       setLoading(true);
//       const response = await ApiService.get("/api/reports/attendance", {
//         params: {
//           start_date: reportFilters.startDate,
//           end_date: reportFilters.endDate,
//           employee_id:
//             reportFilters.employeeId === "all"
//               ? undefined
//               : reportFilters.employeeId,
//         },
//       });

//       if (response.data.success) {
//         setReportData(response.data.data.report);
//         setReportSummary(response.data.data.summary);
//       }
//     } catch (error) {
//       console.error("Error loading report data:", error);
//       Alert.alert("Error", "Failed to load report data");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     try {
//       await Promise.all([
//         loadDashboardData(),
//         loadEmployees(),
//         selectedTab === "reports" && loadReportData(),
//       ]);
//     } catch (error) {
//       console.error("Error refreshing data:", error);
//     }
//     setRefreshing(false);
//   }, [selectedTab]);

//   const handleAddEmployee = async () => {
//     try {
//       if (!newEmployee.name || !newEmployee.email || !newEmployee.employee_id) {
//         Alert.alert("Error", "Name, email, and employee ID are required");
//         return;
//       }

//       setLoading(true);
//       const response = await ApiService.post("/api/auth/register", {
//         ...newEmployee,
//         password: newEmployee.password || "password123", // Default password if not provided
//       });

//       if (response.data.success) {
//         Alert.alert("Success", "Employee added successfully");
//         setShowAddEmployeeModal(false);
//         setNewEmployee({
//           name: "",
//           email: "",
//           password: "",
//           role: "employee",
//           employee_id: "",
//           department: "",
//           phone: "",
//         });
//         await loadEmployees();
//       }
//     } catch (error) {
//       console.error("Error adding employee:", error);
//       Alert.alert(
//         "Error",
//         error.response?.data?.message || "Failed to add employee"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleDeactivateEmployee = (employeeId, employeeName) => {
//     Alert.alert(
//       "Confirm Deactivation",
//       `Are you sure you want to deactivate ${employeeName}?`,
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Deactivate",
//           style: "destructive",
//           onPress: async () => {
//             try {
//               // You'll need to implement this API endpoint
//               await ApiService.put(`/api/users/${employeeId}/deactivate`);
//               Alert.alert("Success", "Employee deactivated successfully");
//               await loadEmployees();
//             } catch (error) {
//               Alert.alert("Error", "Failed to deactivate employee");
//             }
//           },
//         },
//       ]
//     );
//   };

//   const renderStatsCard = (title, value, icon, color) => (
//     <View style={[styles.statsCard, { borderLeftColor: color }]}>
//       <View style={styles.statsContent}>
//         <View style={styles.statsText}>
//           <Text style={styles.statsTitle}>{title}</Text>
//           <Text style={styles.statsValue}>{value}</Text>
//         </View>
//         <Ionicons name={icon} size={30} color={color} />
//       </View>
//     </View>
//   );

//   const renderDashboard = () => {
//     // Prepare chart data from trends
//     const chartData = {
//       labels: dashboardStats.trends
//         .slice(-7)
//         .map((item) => moment(item.date).format("DD")),
//       datasets: [
//         {
//           data:
//             dashboardStats.trends.length > 0
//               ? dashboardStats.trends
//                   .slice(-7)
//                   .map((item) => item.total_checkins)
//               : [0],
//         },
//       ],
//     };

//     return (
//       <ScrollView
//         style={styles.content}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//         }
//       >
//         <Text style={styles.sectionTitle}>Today's Overview</Text>

//         <View style={styles.statsContainer}>
//           {renderStatsCard(
//             "Total Check-ins",
//             dashboardStats.today.total_checkins,
//             "people",
//             "#2196F3"
//           )}
//           {renderStatsCard(
//             "On Time",
//             dashboardStats.today.on_time,
//             "checkmark-circle",
//             "#4CAF50"
//           )}
//           {renderStatsCard(
//             "Late Arrivals",
//             dashboardStats.today.late,
//             "time",
//             "#FF9800"
//           )}
//           {renderStatsCard(
//             "Still in Office",
//             dashboardStats.today.still_in_office,
//             "business",
//             "#9C27B0"
//           )}
//         </View>

//         <Text style={styles.sectionTitle}>Monthly Statistics</Text>
//         <View style={styles.statsContainer}>
//           {renderStatsCard(
//             "Total Attendance",
//             dashboardStats.monthly.total_attendance,
//             "calendar",
//             "#2196F3"
//           )}
//           {renderStatsCard(
//             "Active Employees",
//             dashboardStats.monthly.active_employees,
//             "person",
//             "#4CAF50"
//           )}
//           {renderStatsCard(
//             "Avg Working Hours",
//             `${(
//               parseFloat(dashboardStats.monthly.avg_working_minutes) / 60
//             ).toFixed(1)}h`,
//             "time",
//             "#FF9800"
//           )}
//           {renderStatsCard(
//             "Total Late Days",
//             dashboardStats.monthly.total_late_days,
//             "warning",
//             "#F44336"
//           )}
//         </View>

//         <Text style={styles.sectionTitle}>Attendance Trend (Last 7 Days)</Text>
//         {dashboardStats.trends.length > 0 && (
//           <View style={styles.chartContainer}>
//             <LineChart
//               data={chartData}
//               width={screenWidth - 40}
//               height={220}
//               chartConfig={{
//                 backgroundColor: "#ffffff",
//                 backgroundGradientFrom: "#ffffff",
//                 backgroundGradientTo: "#ffffff",
//                 decimalPlaces: 0,
//                 color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
//                 style: {
//                   borderRadius: 16,
//                 },
//               }}
//               bezier
//               style={styles.chart}
//             />
//           </View>
//         )}

//         {/* Department Overview */}
//         {dashboardStats.departments.length > 0 && (
//           <>
//             <Text style={styles.sectionTitle}>Department Overview</Text>
//             <View style={styles.departmentContainer}>
//               {dashboardStats.departments.map((dept, index) => (
//                 <View key={index} style={styles.departmentCard}>
//                   <Text style={styles.departmentName}>{dept.department}</Text>
//                   <Text style={styles.departmentStats}>
//                     {dept.active_count}/{dept.employee_count} Active
//                   </Text>
//                 </View>
//               ))}
//             </View>
//           </>
//         )}

//         <TouchableOpacity
//           style={styles.actionButton}
//           onPress={() => setSelectedTab("reports")}
//         >
//           <Ionicons name="analytics" size={20} color="#fff" />
//           <Text style={styles.actionButtonText}>View Detailed Reports</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     );
//   };

//   const renderEmployeeItem = ({ item }) => (
//     <TouchableOpacity
//       style={styles.employeeCard}
//       onPress={() => {
//         setSelectedEmployee(item);
//         setShowEmployeeModal(true);
//       }}
//     >
//       <View style={styles.employeeInfo}>
//         <View style={styles.avatarContainer}>
//           <Text style={styles.avatarText}>
//             {item.name.charAt(0).toUpperCase()}
//           </Text>
//         </View>
//         <View style={styles.employeeDetails}>
//           <Text style={styles.employeeName}>{item.name}</Text>
//           <Text style={styles.employeeEmail}>{item.email}</Text>
//           <Text style={styles.employeeId}>ID: {item.employee_id}</Text>
//           <Text style={styles.employeeDepartment}>
//             {item.department || "No Department"}
//           </Text>
//         </View>
//       </View>
//       <View style={styles.employeeActions}>
//         <View
//           style={[
//             styles.statusBadge,
//             { backgroundColor: item.is_active ? "#4CAF50" : "#F44336" },
//           ]}
//         >
//           <Text style={styles.statusText}>
//             {item.is_active ? "Active" : "Inactive"}
//           </Text>
//         </View>
//         <Text style={styles.roleText}>{item.role}</Text>
//         <Ionicons name="chevron-forward" size={20} color="#666" />
//       </View>
//     </TouchableOpacity>
//   );

//   const renderEmployees = () => (
//     <View style={styles.content}>
//       <View style={styles.searchContainer}>
//         <Ionicons
//           name="search"
//           size={20}
//           color="#666"
//           style={styles.searchIcon}
//         />
//         <TextInput
//           style={styles.searchInput}
//           placeholder="Search employees..."
//           value={searchQuery}
//           onChangeText={setSearchQuery}
//         />
//         <TouchableOpacity
//           style={styles.addButton}
//           onPress={() => setShowAddEmployeeModal(true)}
//         >
//           <Ionicons name="add" size={20} color="#fff" />
//         </TouchableOpacity>
//       </View>

//       <FlatList
//         data={filteredEmployees}
//         keyExtractor={(item) => item.id.toString()}
//         renderItem={renderEmployeeItem}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//         }
//         showsVerticalScrollIndicator={false}
//       />
//     </View>
//   );

//   const renderReportItem = ({ item }) => (
//     <View style={styles.reportItem}>
//       <View style={styles.reportHeader}>
//         <Text style={styles.reportEmployeeName}>{item.name}</Text>
//         <Text style={styles.reportDate}>
//           {moment(item.date).format("DD MMM YYYY")}
//         </Text>
//       </View>
//       <View style={styles.reportDetails}>
//         <Text style={styles.reportTime}>
//           In: {item.check_in_time} | Out:{" "}
//           {item.check_out_time || "Not checked out"}
//         </Text>
//         <Text style={styles.reportHours}>Hours: {item.total_hours}</Text>
//         <View style={styles.reportBadges}>
//           <View
//             style={[
//               styles.statusBadge,
//               { backgroundColor: getStatusColor(item.status) },
//             ]}
//           >
//             <Text style={styles.statusText}>{item.status}</Text>
//           </View>
//           <View
//             style={[
//               styles.statusBadge,
//               {
//                 backgroundColor:
//                   item.punctuality === "Late" ? "#F44336" : "#4CAF50",
//               },
//             ]}
//           >
//             <Text style={styles.statusText}>{item.punctuality}</Text>
//           </View>
//         </View>
//       </View>
//     </View>
//   );

//   const getStatusColor = (status) => {
//     switch (status) {
//       case "present":
//         return "#4CAF50";
//       case "late":
//         return "#FF9800";
//       case "half_day":
//         return "#2196F3";
//       case "absent":
//         return "#F44336";
//       default:
//         return "#666";
//     }
//   };

//   const renderReports = () => (
//     <ScrollView
//       style={styles.content}
//       refreshControl={
//         <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//       }
//     >
//       <Text style={styles.sectionTitle}>Attendance Reports</Text>

//       <View style={styles.filtersContainer}>
//         <Text style={styles.filterLabel}>Date Range:</Text>
//         <View style={styles.dateFilters}>
//           <TextInput
//             style={styles.dateInput}
//             value={reportFilters.startDate}
//             placeholder="Start Date (YYYY-MM-DD)"
//             onChangeText={(text) =>
//               setReportFilters({ ...reportFilters, startDate: text })
//             }
//           />
//           <TextInput
//             style={styles.dateInput}
//             value={reportFilters.endDate}
//             placeholder="End Date (YYYY-MM-DD)"
//             onChangeText={(text) =>
//               setReportFilters({ ...reportFilters, endDate: text })
//             }
//           />
//         </View>

//         <TouchableOpacity
//           style={styles.loadReportButton}
//           onPress={loadReportData}
//           disabled={loading}
//         >
//           {loading ? (
//             <ActivityIndicator color="#fff" />
//           ) : (
//             <Text style={styles.loadReportButtonText}>Load Report</Text>
//           )}
//         </TouchableOpacity>
//       </View>

//       {reportSummary && (
//         <View style={styles.summaryContainer}>
//           <Text style={styles.summaryTitle}>Report Summary</Text>
//           <View style={styles.summaryStats}>
//             <View style={styles.summaryItem}>
//               <Text style={styles.summaryLabel}>Total Records</Text>
//               <Text style={styles.summaryValue}>
//                 {reportSummary.total_records}
//               </Text>
//             </View>
//             <View style={styles.summaryItem}>
//               <Text style={styles.summaryLabel}>Unique Employees</Text>
//               <Text style={styles.summaryValue}>
//                 {reportSummary.unique_employees}
//               </Text>
//             </View>
//             <View style={styles.summaryItem}>
//               <Text style={styles.summaryLabel}>Late Count</Text>
//               <Text style={styles.summaryValue}>
//                 {reportSummary.late_count}
//               </Text>
//             </View>
//             <View style={styles.summaryItem}>
//               <Text style={styles.summaryLabel}>Half Days</Text>
//               <Text style={styles.summaryValue}>
//                 {reportSummary.half_day_count}
//               </Text>
//             </View>
//           </View>
//         </View>
//       )}

//       {reportData.length > 0 && (
//         <View style={styles.reportContainer}>
//           <FlatList
//             data={reportData}
//             keyExtractor={(item, index) => `${item.id}-${index}`}
//             renderItem={renderReportItem}
//             scrollEnabled={false}
//           />
//         </View>
//       )}
//     </ScrollView>
//   );

//   const renderAddEmployeeModal = () => (
//     <Modal
//       visible={showAddEmployeeModal}
//       animationType="slide"
//       presentationStyle="pageSheet"
//     >
//       <View style={styles.modalContainer}>
//         <View style={styles.modalHeader}>
//           <TouchableOpacity onPress={() => setShowAddEmployeeModal(false)}>
//             <Ionicons name="close" size={24} color="#333" />
//           </TouchableOpacity>
//           <Text style={styles.modalTitle}>Add New Employee</Text>
//           <TouchableOpacity onPress={handleAddEmployee} disabled={loading}>
//             <Text style={styles.saveButton}>Save</Text>
//           </TouchableOpacity>
//         </View>

//         <ScrollView style={styles.formContainer}>
//           <View style={styles.inputGroup}>
//             <Text style={styles.inputLabel}>Full Name *</Text>
//             <TextInput
//               style={styles.textInput}
//               value={newEmployee.name}
//               onChangeText={(text) =>
//                 setNewEmployee({ ...newEmployee, name: text })
//               }
//               placeholder="Enter full name"
//             />
//           </View>

//           <View style={styles.inputGroup}>
//             <Text style={styles.inputLabel}>Employee ID *</Text>
//             <TextInput
//               style={styles.textInput}
//               value={newEmployee.employee_id}
//               onChangeText={(text) =>
//                 setNewEmployee({ ...newEmployee, employee_id: text })
//               }
//               placeholder="Enter employee ID"
//             />
//           </View>

//           <View style={styles.inputGroup}>
//             <Text style={styles.inputLabel}>Email *</Text>
//             <TextInput
//               style={styles.textInput}
//               value={newEmployee.email}
//               onChangeText={(text) =>
//                 setNewEmployee({ ...newEmployee, email: text })
//               }
//               placeholder="Enter email address"
//               keyboardType="email-address"
//             />
//           </View>

//           <View style={styles.inputGroup}>
//             <Text style={styles.inputLabel}>Password</Text>
//             <TextInput
//               style={styles.textInput}
//               value={newEmployee.password}
//               onChangeText={(text) =>
//                 setNewEmployee({ ...newEmployee, password: text })
//               }
//               placeholder="Enter password (default: password123)"
//               secureTextEntry
//             />
//           </View>

//           <View style={styles.inputGroup}>
//             <Text style={styles.inputLabel}>Department</Text>
//             <TextInput
//               style={styles.textInput}
//               value={newEmployee.department}
//               onChangeText={(text) =>
//                 setNewEmployee({ ...newEmployee, department: text })
//               }
//               placeholder="Enter department"
//             />
//           </View>

//           <View style={styles.inputGroup}>
//             <Text style={styles.inputLabel}>Phone</Text>
//             <TextInput
//               style={styles.textInput}
//               value={newEmployee.phone}
//               onChangeText={(text) =>
//                 setNewEmployee({ ...newEmployee, phone: text })
//               }
//               placeholder="Enter phone number"
//               keyboardType="phone-pad"
//             />
//           </View>

//           <View style={styles.inputGroup}>
//             <Text style={styles.inputLabel}>Role</Text>
//             <View style={styles.roleContainer}>
//               <TouchableOpacity
//                 style={[
//                   styles.roleButton,
//                   newEmployee.role === "employee" && styles.roleButtonActive,
//                 ]}
//                 onPress={() =>
//                   setNewEmployee({ ...newEmployee, role: "employee" })
//                 }
//               >
//                 <Text
//                   style={[
//                     styles.roleButtonText,
//                     newEmployee.role === "employee" &&
//                       styles.roleButtonTextActive,
//                   ]}
//                 >
//                   Employee
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[
//                   styles.roleButton,
//                   newEmployee.role === "admin" && styles.roleButtonActive,
//                 ]}
//                 onPress={() =>
//                   setNewEmployee({ ...newEmployee, role: "admin" })
//                 }
//               >
//                 <Text
//                   style={[
//                     styles.roleButtonText,
//                     newEmployee.role === "admin" && styles.roleButtonTextActive,
//                   ]}
//                 >
//                   Admin
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </ScrollView>

//         {loading && (
//           <View style={styles.loadingOverlay}>
//             <ActivityIndicator size="large" color="#2196F3" />
//           </View>
//         )}
//       </View>
//     </Modal>
//   );

//   const renderEmployeeModal = () => (
//     <Modal
//       visible={showEmployeeModal}
//       animationType="slide"
//       presentationStyle="pageSheet"
//     >
//       <View style={styles.modalContainer}>
//         <View style={styles.modalHeader}>
//           <TouchableOpacity onPress={() => setShowEmployeeModal(false)}>
//             <Ionicons name="close" size={24} color="#333" />
//           </TouchableOpacity>
//           <Text style={styles.modalTitle}>Employee Details</Text>
//           <TouchableOpacity onPress={() => {}}>
//             <Text style={styles.saveButton}>Edit</Text>
//           </TouchableOpacity>
//         </View>

//         {selectedEmployee && (
//           <ScrollView style={styles.employeeModalContent}>
//             <View style={styles.employeeHeader}>
//               <View style={styles.largeAvatar}>
//                 <Text style={styles.largeAvatarText}>
//                   {selectedEmployee.name.charAt(0).toUpperCase()}
//                 </Text>
//               </View>
//               <Text style={styles.employeeModalName}>
//                 {selectedEmployee.name}
//               </Text>
//               <Text style={styles.employeeModalEmail}>
//                 {selectedEmployee.email}
//               </Text>
//             </View>

//             <View style={styles.employeeInfoSection}>
//               <View style={styles.infoItem}>
//                 <Text style={styles.infoLabel}>Employee ID:</Text>
//                 <Text style={styles.infoValue}>
//                   {selectedEmployee.employee_id}
//                 </Text>
//               </View>
//               <View style={styles.infoItem}>
//                 <Text style={styles.infoLabel}>Department:</Text>
//                 <Text style={styles.infoValue}>
//                   {selectedEmployee.department || "Not assigned"}
//                 </Text>
//               </View>
//               <View style={styles.infoItem}>
//                 <Text style={styles.infoLabel}>Role:</Text>
//                 <Text style={styles.infoValue}>{selectedEmployee.role}</Text>
//               </View>
//               <View style={styles.infoItem}>
//                 <Text style={styles.infoLabel}>Phone:</Text>
//                 <Text style={styles.infoValue}>
//                   {selectedEmployee.phone || "Not provided"}
//                 </Text>
//               </View>
//               <View style={styles.infoItem}>
//                 <Text style={styles.infoLabel}>Joined:</Text>
//                 <Text style={styles.infoValue}>
//                   {moment(selectedEmployee.created_at).format("DD MMM YYYY")}
//                 </Text>
//               </View>
//               <View style={styles.infoItem}>
//                 <Text style={styles.infoLabel}>Status:</Text>
//                 <Text
//                   style={[
//                     styles.infoValue,
//                     {
//                       color: selectedEmployee.is_active ? "#4CAF50" : "#F44336",
//                     },
//                   ]}
//                 >
//                   {selectedEmployee.is_active ? "Active" : "Inactive"}
//                 </Text>
//               </View>
//             </View>

//             <View style={styles.actionButtonsContainer}>
//               {selectedEmployee.is_active && (
//                 <TouchableOpacity
//                   style={[styles.actionButton, styles.deactivateButton]}
//                   onPress={() =>
//                     handleDeactivateEmployee(
//                       selectedEmployee.id,
//                       selectedEmployee.name
//                     )
//                   }
//                 >
//                   <Ionicons name="person-remove" size={20} color="#fff" />
//                   <Text style={styles.actionButtonText}>Deactivate</Text>
//                 </TouchableOpacity>
//               )}
//             </View>
//           </ScrollView>
//         )}
//       </View>
//     </Modal>
//   );

//   if (loading && selectedTab === "dashboard") {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#2196F3" />
//         <Text style={styles.loadingText}>Loading admin panel...</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       {/* Tab Navigation */}
//       <View style={styles.tabContainer}>
//         <TouchableOpacity
//           style={[styles.tab, selectedTab === "dashboard" && styles.activeTab]}
//           onPress={() => setSelectedTab("dashboard")}
//         >
//           <Ionicons
//             name="analytics"
//             size={20}
//             color={selectedTab === "dashboard" ? "#2196F3" : "#666"}
//           />
//           <Text
//             style={[
//               styles.tabText,
//               selectedTab === "dashboard" && styles.activeTabText,
//             ]}
//           >
//             Dashboard
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={[styles.tab, selectedTab === "employees" && styles.activeTab]}
//           onPress={() => setSelectedTab("employees")}
//         >
//           <Ionicons
//             name="people"
//             size={20}
//             color={selectedTab === "employees" ? "#2196F3" : "#666"}
//           />
//           <Text
//             style={[
//               styles.tabText,
//               selectedTab === "employees" && styles.activeTabText,
//             ]}
//           >
//             Employees
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={[styles.tab, selectedTab === "reports" && styles.activeTab]}
//           onPress={() => setSelectedTab("reports")}
//         >
//           <Ionicons
//             name="document-text"
//             size={20}
//             color={selectedTab === "reports" ? "#2196F3" : "#666"}
//           />
//           <Text
//             style={[
//               styles.tabText,
//               selectedTab === "reports" && styles.activeTabText,
//             ]}
//           >
//             Reports
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* Content */}
//       {selectedTab === "dashboard" && renderDashboard()}
//       {selectedTab === "employees" && renderEmployees()}
//       {selectedTab === "reports" && renderReports()}

//       {/* Modals */}
//       {renderAddEmployeeModal()}
//       {renderEmployeeModal()}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#f5f5f5",
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "#f5f5f5",
//   },
//   loadingText: {
//     marginTop: 10,
//     fontSize: 16,
//     color: "#666",
//   },
//   tabContainer: {
//     flexDirection: "row",
//     backgroundColor: "#fff",
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     borderBottomWidth: 1,
//     borderBottomColor: "#e0e0e0",
//   },
//   tab: {
//     flex: 1,
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     paddingVertical: 8,
//     paddingHorizontal: 12,
//     borderRadius: 8,
//   },
//   activeTab: {
//     backgroundColor: "#e3f2fd",
//   },
//   tabText: {
//     marginLeft: 6,
//     fontSize: 14,
//     color: "#666",
//     fontWeight: "500",
//   },
//   activeTabText: {
//     color: "#2196F3",
//     fontWeight: "600",
//   },
//   content: {
//     flex: 1,
//     padding: 20,
//   },
//   sectionTitle: {
//     fontSize: 20,
//     fontWeight: "600",
//     color: "#333",
//     marginBottom: 16,
//   },
//   statsContainer: {
//     marginBottom: 24,
//   },
//   statsCard: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 12,
//     borderLeftWidth: 4,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   statsContent: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },
//   statsText: {
//     flex: 1,
//   },
//   statsTitle: {
//     fontSize: 14,
//     color: "#666",
//     marginBottom: 4,
//   },
//   statsValue: {
//     fontSize: 24,
//     fontWeight: "700",
//     color: "#333",
//   },
//   departmentContainer: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     gap: 12,
//     marginBottom: 24,
//   },
//   departmentCard: {
//     backgroundColor: "#fff",
//     borderRadius: 8,
//     padding: 12,
//     minWidth: 120,
//     alignItems: "center",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 2,
//     elevation: 2,
//   },
//   departmentName: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#333",
//     marginBottom: 4,
//   },
//   departmentStats: {
//     fontSize: 12,
//     color: "#666",
//   },
//   chartContainer: {
//     alignItems: "center",
//     marginBottom: 24,
//   },
//   chart: {
//     marginVertical: 8,
//     borderRadius: 16,
//   },
//   actionButton: {
//     backgroundColor: "#2196F3",
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     paddingVertical: 12,
//     paddingHorizontal: 20,
//     borderRadius: 8,
//     marginBottom: 12,
//   },
//   actionButtonText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "600",
//     marginLeft: 8,
//   },
//   searchContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     marginBottom: 16,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   searchIcon: {
//     marginRight: 12,
//   },
//   searchInput: {
//     flex: 1,
//     fontSize: 16,
//     color: "#333",
//   },
//   addButton: {
//     backgroundColor: "#2196F3",
//     borderRadius: 20,
//     width: 40,
//     height: 40,
//     alignItems: "center",
//     justifyContent: "center",
//     marginLeft: 12,
//   },
//   employeeCard: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 12,
//     flexDirection: "row",
//     alignItems: "center",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   employeeInfo: {
//     flex: 1,
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   avatarContainer: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     backgroundColor: "#2196F3",
//     alignItems: "center",
//     justifyContent: "center",
//     marginRight: 12,
//   },
//   avatarText: {
//     color: "#fff",
//     fontSize: 18,
//     fontWeight: "600",
//   },
//   employeeDetails: {
//     flex: 1,
//   },
//   employeeName: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#333",
//     marginBottom: 2,
//   },
//   employeeEmail: {
//     fontSize: 14,
//     color: "#666",
//     marginBottom: 2,
//   },
//   employeeId: {
//     fontSize: 12,
//     color: "#999",
//     marginBottom: 2,
//   },
//   employeeDepartment: {
//     fontSize: 12,
//     color: "#999",
//   },
//   employeeActions: {
//     alignItems: "center",
//   },
//   statusBadge: {
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//     marginBottom: 4,
//   },
//   statusText: {
//     color: "#fff",
//     fontSize: 10,
//     fontWeight: "600",
//   },
//   roleText: {
//     fontSize: 10,
//     color: "#999",
//     marginBottom: 4,
//     textTransform: "capitalize",
//   },
//   filtersContainer: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 16,
//   },
//   filterLabel: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#333",
//     marginBottom: 8,
//   },
//   dateFilters: {
//     flexDirection: "row",
//     gap: 12,
//     marginBottom: 16,
//   },
//   dateInput: {
//     flex: 1,
//     borderWidth: 1,
//     borderColor: "#ddd",
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     fontSize: 14,
//   },
//   loadReportButton: {
//     backgroundColor: "#2196F3",
//     paddingVertical: 12,
//     borderRadius: 8,
//     alignItems: "center",
//   },
//   loadReportButtonText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "600",
//   },
//   summaryContainer: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 16,
//   },
//   summaryTitle: {
//     fontSize: 18,
//     fontWeight: "600",
//     color: "#333",
//     marginBottom: 12,
//   },
//   summaryStats: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     gap: 16,
//   },
//   summaryItem: {
//     flex: 1,
//     minWidth: 120,
//     alignItems: "center",
//   },
//   summaryLabel: {
//     fontSize: 12,
//     color: "#666",
//     marginBottom: 4,
//   },
//   summaryValue: {
//     fontSize: 20,
//     fontWeight: "700",
//     color: "#2196F3",
//   },
//   reportContainer: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 16,
//   },
//   reportItem: {
//     borderBottomWidth: 1,
//     borderBottomColor: "#f0f0f0",
//     paddingVertical: 12,
//   },
//   reportHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 8,
//   },
//   reportEmployeeName: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#333",
//   },
//   reportDate: {
//     fontSize: 12,
//     color: "#666",
//   },
//   reportDetails: {
//     marginBottom: 8,
//   },
//   reportTime: {
//     fontSize: 14,
//     color: "#666",
//     marginBottom: 4,
//   },
//   reportHours: {
//     fontSize: 14,
//     color: "#666",
//     marginBottom: 8,
//   },
//   reportBadges: {
//     flexDirection: "row",
//     gap: 8,
//   },
//   modalContainer: {
//     flex: 1,
//     backgroundColor: "#fff",
//   },
//   modalHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     paddingHorizontal: 20,
//     paddingVertical: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: "#e0e0e0",
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: "600",
//     color: "#333",
//   },
//   saveButton: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#2196F3",
//   },
//   formContainer: {
//     flex: 1,
//     padding: 20,
//   },
//   inputGroup: {
//     marginBottom: 20,
//   },
//   inputLabel: {
//     fontSize: 16,
//     fontWeight: "500",
//     color: "#333",
//     marginBottom: 8,
//   },
//   textInput: {
//     borderWidth: 1,
//     borderColor: "#ddd",
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     paddingVertical: 12,
//     fontSize: 16,
//     backgroundColor: "#f9f9f9",
//   },
//   roleContainer: {
//     flexDirection: "row",
//     gap: 12,
//   },
//   roleButton: {
//     flex: 1,
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: "#ddd",
//     alignItems: "center",
//     backgroundColor: "#f9f9f9",
//   },
//   roleButtonActive: {
//     backgroundColor: "#2196F3",
//     borderColor: "#2196F3",
//   },
//   roleButtonText: {
//     fontSize: 14,
//     fontWeight: "500",
//     color: "#666",
//   },
//   roleButtonTextActive: {
//     color: "#fff",
//   },
//   loadingOverlay: {
//     position: "absolute",
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: "rgba(255, 255, 255, 0.8)",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   employeeModalContent: {
//     flex: 1,
//     padding: 20,
//   },
//   employeeHeader: {
//     alignItems: "center",
//     marginBottom: 24,
//   },
//   largeAvatar: {
//     width: 80,
//     height: 80,
//     borderRadius: 40,
//     backgroundColor: "#2196F3",
//     alignItems: "center",
//     justifyContent: "center",
//     marginBottom: 12,
//   },
//   largeAvatarText: {
//     color: "#fff",
//     fontSize: 32,
//     fontWeight: "600",
//   },
//   employeeModalName: {
//     fontSize: 24,
//     fontWeight: "600",
//     color: "#333",
//     marginBottom: 4,
//   },
//   employeeModalEmail: {
//     fontSize: 16,
//     color: "#666",
//   },
//   employeeInfoSection: {
//     backgroundColor: "#f9f9f9",
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 24,
//   },
//   infoItem: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     paddingVertical: 8,
//     borderBottomWidth: 1,
//     borderBottomColor: "#e0e0e0",
//   },
//   infoLabel: {
//     fontSize: 16,
//     fontWeight: "500",
//     color: "#333",
//     flex: 1,
//   },
//   infoValue: {
//     fontSize: 16,
//     color: "#666",
//     flex: 1,
//     textAlign: "right",
//   },
//   actionButtonsContainer: {
//     gap: 12,
//   },
//   editButton: {
//     backgroundColor: "#4CAF50",
//   },
//   deactivateButton: {
//     backgroundColor: "#F44336",
//   },
// });

// export default AdminScreen;
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, BarChart } from "react-native-chart-kit";
import moment from "moment";
import ApiService from "../services/ApiService";
import { useAuth } from "../context/AuthContext";

const { width: screenWidth } = Dimensions.get("window");

const AdminScreen = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState("dashboard");

  // Dashboard state
  const [dashboardStats, setDashboardStats] = useState({
    today: {
      total_checkins: 0,
      on_time: 0,
      late: 0,
      still_in_office: 0,
      unique_employees: 0,
    },
    monthly: {
      total_attendance: 0,
      active_employees: 0,
      avg_working_minutes: 0,
      total_late_days: 0,
    },
    trends: [],
    departments: [],
    late_arrivals: [],
  });

  // Employee management state
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  // Reports state
  const [reportData, setReportData] = useState([]);
  const [reportSummary, setReportSummary] = useState(null);
  const [reportFilters, setReportFilters] = useState({
    startDate: moment().startOf("month").format("YYYY-MM-DD"),
    endDate: moment().format("YYYY-MM-DD"),
    employeeId: "all",
  });

  // New employee form state
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
    employee_id: "",
    department: "",
    phone: "",
  });

  // Load initial data
  useEffect(() => {
    loadDashboardData();
    loadEmployees();
  }, []);

  // Filter employees when search query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter(
        (emp) =>
          emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  }, [searchQuery, employees]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log("Loading dashboard data...");
      const response = await ApiService.get("/reports/dashboard");
      console.log("Dashboard API Response:", response.data);

      if (response.data.success) {
        setDashboardStats(response.data.data);
      } else {
        console.error("Dashboard API returned success: false");
        Alert.alert("Error", "Failed to load dashboard statistics");
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      if (error.response) {
        console.error("API Response Error:", error.response.data);
        Alert.alert(
          "Error",
          `API Error: ${
            error.response.data.message || "Failed to load dashboard statistics"
          }`
        );
      } else if (error.request) {
        console.error("Network Error:", error.request);
        Alert.alert("Error", "Network error. Please check your connection.");
      } else {
        console.error("Request Error:", error.message);
        Alert.alert("Error", "Failed to load dashboard statistics");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      console.log("Loading employees...");
      const response = await ApiService.get("/users");
      console.log("Users API Response:", response.data.users);

      if (response.data.success) {
        setEmployees(response.data.users);
        setFilteredEmployees(response.data.users);
      } else {
        console.error("Users API returned success: false");
        Alert.alert("Error", "Failed to load employees");
      }
    } catch (error) {
      console.error("Error loading employees:", error);
      if (error.response) {
        console.error("API Response Error:", error.response.data);
        Alert.alert(
          "Error",
          `API Error: ${
            error.response.data.message || "Failed to load employees"
          }`
        );
      } else if (error.request) {
        console.error("Network Error:", error.request);
        Alert.alert("Error", "Network error. Please check your connection.");
      } else {
        console.error("Request Error:", error.message);
        Alert.alert("Error", "Failed to load employees");
      }
    }
  };

  const loadReportData = async () => {
    try {
      setLoading(true);
      console.log("Loading report data with filters:", reportFilters);

      const params = {
        start_date: reportFilters.startDate,
        end_date: reportFilters.endDate,
      };

      if (reportFilters.employeeId !== "all") {
        params.employee_id = reportFilters.employeeId;
      }

      const response = await ApiService.get("/reports/attendance", { params });
      console.log("Attendance Report API Response:", response.data);

      if (response.data.success) {
        setReportData(response.data.data.report);
        setReportSummary(response.data.data.summary);
      } else {
        console.error("Attendance Report API returned success: false");
        Alert.alert("Error", "Failed to load report data");
      }
    } catch (error) {
      console.error("Error loading report data:", error);
      if (error.response) {
        console.error("API Response Error:", error.response.data);
        Alert.alert(
          "Error",
          `API Error: ${
            error.response.data.message || "Failed to load report data"
          }`
        );
      } else if (error.request) {
        console.error("Network Error:", error.request);
        Alert.alert("Error", "Network error. Please check your connection.");
      } else {
        console.error("Request Error:", error.message);
        Alert.alert("Error", "Failed to load report data");
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadDashboardData(),
        loadEmployees(),
        selectedTab === "reports" && loadReportData(),
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
    setRefreshing(false);
  }, [selectedTab]);

  const handleAddEmployee = async () => {
    try {
      if (!newEmployee.name || !newEmployee.email || !newEmployee.employee_id) {
        Alert.alert("Error", "Name, email, and employee ID are required");
        return;
      }

      setLoading(true);
      console.log("Adding employee:", newEmployee);

      const response = await ApiService.post("/auth/register", {
        ...newEmployee,
        password: newEmployee.password || "password123", // Default password if not provided
      });

      console.log("Register API Response:", response.data);

      if (response.data.success) {
        Alert.alert("Success", "Employee added successfully");
        setShowAddEmployeeModal(false);
        setNewEmployee({
          name: "",
          email: "",
          password: "",
          role: "employee",
          employee_id: "",
          department: "",
          phone: "",
        });
        await loadEmployees();
      } else {
        Alert.alert("Error", response.data.message || "Failed to add employee");
      }
    } catch (error) {
      console.error("Error adding employee:", error);
      if (error.response) {
        console.error("API Response Error:", error.response.data);
        Alert.alert(
          "Error",
          error.response.data.message || "Failed to add employee"
        );
      } else if (error.request) {
        console.error("Network Error:", error.request);
        Alert.alert("Error", "Network error. Please check your connection.");
      } else {
        console.error("Request Error:", error.message);
        Alert.alert("Error", "Failed to add employee");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateEmployee = (employeeId, employeeName) => {
    Alert.alert(
      "Confirm Deactivation",
      `Are you sure you want to deactivate ${employeeName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("Deactivating employee:", employeeId);
              // You'll need to implement this API endpoint on your backend
              await ApiService.put(`/users/${employeeId}/deactivate`);
              Alert.alert("Success", "Employee deactivated successfully");
              await loadEmployees();
            } catch (error) {
              console.error("Error deactivating employee:", error);
              if (error.response && error.response.status === 404) {
                Alert.alert("Error", "Deactivate endpoint not implemented yet");
              } else {
                Alert.alert("Error", "Failed to deactivate employee");
              }
            }
          },
        },
      ]
    );
  };

  const renderStatsCard = (title, value, icon, color) => (
    <View style={[styles.statsCard, { borderLeftColor: color }]}>
      <View style={styles.statsContent}>
        <View style={styles.statsText}>
          <Text style={styles.statsTitle}>{title}</Text>
          <Text style={styles.statsValue}>{value}</Text>
        </View>
        <Ionicons name={icon} size={30} color={color} />
      </View>
    </View>
  );

  const renderDashboard = () => {
    // Prepare chart data from trends
    const chartData = {
      labels: dashboardStats.trends
        .slice(-7)
        .map((item) => moment(item.date).format("DD")),
      datasets: [
        {
          data:
            dashboardStats.trends.length > 0
              ? dashboardStats.trends
                  .slice(-7)
                  .map((item) => item.total_checkins)
              : [0],
        },
      ],
    };

    return (
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>Today's Overview</Text>

        <View style={styles.statsContainer}>
          {renderStatsCard(
            "Total Check-ins",
            dashboardStats.today.total_checkins,
            "people",
            "#2196F3"
          )}
          {renderStatsCard(
            "On Time",
            dashboardStats.today.on_time,
            "checkmark-circle",
            "#4CAF50"
          )}
          {renderStatsCard(
            "Late Arrivals",
            dashboardStats.today.late,
            "time",
            "#FF9800"
          )}
          {renderStatsCard(
            "Still in Office",
            dashboardStats.today.still_in_office,
            "business",
            "#9C27B0"
          )}
        </View>

        <Text style={styles.sectionTitle}>Monthly Statistics</Text>
        <View style={styles.statsContainer}>
          {renderStatsCard(
            "Total Attendance",
            dashboardStats.monthly.total_attendance,
            "calendar",
            "#2196F3"
          )}
          {renderStatsCard(
            "Active Employees",
            dashboardStats.monthly.active_employees,
            "person",
            "#4CAF50"
          )}
          {renderStatsCard(
            "Avg Working Hours",
            `${(
              parseFloat(dashboardStats.monthly.avg_working_minutes) / 60
            ).toFixed(1)}h`,
            "time",
            "#FF9800"
          )}
          {renderStatsCard(
            "Total Late Days",
            dashboardStats.monthly.total_late_days,
            "warning",
            "#F44336"
          )}
        </View>

        <Text style={styles.sectionTitle}>Attendance Trend (Last 7 Days)</Text>
        {dashboardStats.trends.length > 0 && (
          <View style={styles.chartContainer}>
            <LineChart
              data={chartData}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
              }}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {/* Department Overview */}
        {dashboardStats.departments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Department Overview</Text>
            <View style={styles.departmentContainer}>
              {dashboardStats.departments.map((dept, index) => (
                <View key={index} style={styles.departmentCard}>
                  <Text style={styles.departmentName}>{dept.department}</Text>
                  <Text style={styles.departmentStats}>
                    {dept.active_count}/{dept.employee_count} Active
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setSelectedTab("reports")}
        >
          <Ionicons name="analytics" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>View Detailed Reports</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderEmployeeItem = ({ item }) => (
    <TouchableOpacity
      style={styles.employeeCard}
      onPress={() => {
        setSelectedEmployee(item);
        setShowEmployeeModal(true);
      }}
    >
      <View style={styles.employeeInfo}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.employeeDetails}>
          <Text style={styles.employeeName}>{item.name}</Text>
          <Text style={styles.employeeEmail}>{item.email}</Text>
          <Text style={styles.employeeId}>ID: {item.employee_id}</Text>
          <Text style={styles.employeeDepartment}>
            {item.department || "No Department"}
          </Text>
        </View>
      </View>
      <View style={styles.employeeActions}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: item.is_active ? "#4CAF50" : "#F44336" },
          ]}
        >
          <Text style={styles.statusText}>
            {item.is_active ? "Active" : "Inactive"}
          </Text>
        </View>
        <Text style={styles.roleText}>{item.role}</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );

  const renderEmployees = () => (
    <View style={styles.content}>
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#666"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search employees..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddEmployeeModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredEmployees}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderEmployeeItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  const renderReportItem = ({ item }) => (
    <View style={styles.reportItem}>
      <View style={styles.reportHeader}>
        <Text style={styles.reportEmployeeName}>{item.name}</Text>
        <Text style={styles.reportDate}>
          {moment(item.date).format("DD MMM YYYY")}
        </Text>
      </View>
      <View style={styles.reportDetails}>
        <Text style={styles.reportTime}>
          In: {item.check_in_time} | Out:{" "}
          {item.check_out_time || "Not checked out"}
        </Text>
        <Text style={styles.reportHours}>Hours: {item.total_hours}</Text>
        <View style={styles.reportBadges}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  item.punctuality === "Late" ? "#F44336" : "#4CAF50",
              },
            ]}
          >
            <Text style={styles.statusText}>{item.punctuality}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return "#4CAF50";
      case "late":
        return "#FF9800";
      case "half_day":
        return "#2196F3";
      case "absent":
        return "#F44336";
      default:
        return "#666";
    }
  };

  const renderReports = () => (
    <ScrollView
      style={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.sectionTitle}>Attendance Reports</Text>

      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>Date Range:</Text>
        <View style={styles.dateFilters}>
          <TextInput
            style={styles.dateInput}
            value={reportFilters.startDate}
            placeholder="Start Date (YYYY-MM-DD)"
            onChangeText={(text) =>
              setReportFilters({ ...reportFilters, startDate: text })
            }
          />
          <TextInput
            style={styles.dateInput}
            value={reportFilters.endDate}
            placeholder="End Date (YYYY-MM-DD)"
            onChangeText={(text) =>
              setReportFilters({ ...reportFilters, endDate: text })
            }
          />
        </View>

        <TouchableOpacity
          style={styles.loadReportButton}
          onPress={loadReportData}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loadReportButtonText}>Load Report</Text>
          )}
        </TouchableOpacity>
      </View>

      {reportSummary && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Report Summary</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Records</Text>
              <Text style={styles.summaryValue}>
                {reportSummary.total_records}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Unique Employees</Text>
              <Text style={styles.summaryValue}>
                {reportSummary.unique_employees}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Late Count</Text>
              <Text style={styles.summaryValue}>
                {reportSummary.late_count}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Half Days</Text>
              <Text style={styles.summaryValue}>
                {reportSummary.half_day_count}
              </Text>
            </View>
          </View>
        </View>
      )}

      {reportData.length > 0 && (
        <View style={styles.reportContainer}>
          <FlatList
            data={reportData}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={renderReportItem}
            scrollEnabled={false}
          />
        </View>
      )}
    </ScrollView>
  );

  const renderAddEmployeeModal = () => (
    <Modal
      visible={showAddEmployeeModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowAddEmployeeModal(false)}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Add New Employee</Text>
          <TouchableOpacity onPress={handleAddEmployee} disabled={loading}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.textInput}
              value={newEmployee.name}
              onChangeText={(text) =>
                setNewEmployee({ ...newEmployee, name: text })
              }
              placeholder="Enter full name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Employee ID *</Text>
            <TextInput
              style={styles.textInput}
              value={newEmployee.employee_id}
              onChangeText={(text) =>
                setNewEmployee({ ...newEmployee, employee_id: text })
              }
              placeholder="Enter employee ID"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email *</Text>
            <TextInput
              style={styles.textInput}
              value={newEmployee.email}
              onChangeText={(text) =>
                setNewEmployee({ ...newEmployee, email: text })
              }
              placeholder="Enter email address"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.textInput}
              value={newEmployee.password}
              onChangeText={(text) =>
                setNewEmployee({ ...newEmployee, password: text })
              }
              placeholder="Enter password (default: password123)"
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Department</Text>
            <TextInput
              style={styles.textInput}
              value={newEmployee.department}
              onChangeText={(text) =>
                setNewEmployee({ ...newEmployee, department: text })
              }
              placeholder="Enter department"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={styles.textInput}
              value={newEmployee.phone}
              onChangeText={(text) =>
                setNewEmployee({ ...newEmployee, phone: text })
              }
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Role</Text>
            <View style={styles.roleContainer}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  newEmployee.role === "employee" && styles.roleButtonActive,
                ]}
                onPress={() =>
                  setNewEmployee({ ...newEmployee, role: "employee" })
                }
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    newEmployee.role === "employee" &&
                      styles.roleButtonTextActive,
                  ]}
                >
                  Employee
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  newEmployee.role === "admin" && styles.roleButtonActive,
                ]}
                onPress={() =>
                  setNewEmployee({ ...newEmployee, role: "admin" })
                }
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    newEmployee.role === "admin" && styles.roleButtonTextActive,
                  ]}
                >
                  Admin
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2196F3" />
          </View>
        )}
      </View>
    </Modal>
  );

  const renderEmployeeModal = () => (
    <Modal
      visible={showEmployeeModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowEmployeeModal(false)}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Employee Details</Text>
          <TouchableOpacity onPress={() => {}}>
            <Text style={styles.saveButton}>Edit</Text>
          </TouchableOpacity>
        </View>

        {selectedEmployee && (
          <ScrollView style={styles.employeeModalContent}>
            <View style={styles.employeeHeader}>
              <View style={styles.largeAvatar}>
                <Text style={styles.largeAvatarText}>
                  {selectedEmployee.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.employeeModalName}>
                {selectedEmployee.name}
              </Text>
              <Text style={styles.employeeModalEmail}>
                {selectedEmployee.email}
              </Text>
            </View>

            <View style={styles.employeeInfoSection}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Employee ID:</Text>
                <Text style={styles.infoValue}>
                  {selectedEmployee.employee_id}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Department:</Text>
                <Text style={styles.infoValue}>
                  {selectedEmployee.department || "Not assigned"}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Role:</Text>
                <Text style={styles.infoValue}>{selectedEmployee.role}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>
                  {selectedEmployee.phone || "Not provided"}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Joined:</Text>
                <Text style={styles.infoValue}>
                  {moment(selectedEmployee.created_at).format("DD MMM YYYY")}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Status:</Text>
                <Text
                  style={[
                    styles.infoValue,
                    {
                      color: selectedEmployee.is_active ? "#4CAF50" : "#F44336",
                    },
                  ]}
                >
                  {selectedEmployee.is_active ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>

            <View style={styles.actionButtonsContainer}>
              {selectedEmployee.is_active && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deactivateButton]}
                  onPress={() =>
                    handleDeactivateEmployee(
                      selectedEmployee.id,
                      selectedEmployee.name
                    )
                  }
                >
                  <Ionicons name="person-remove" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Deactivate</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  if (loading && selectedTab === "dashboard") {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading admin panel...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "dashboard" && styles.activeTab]}
          onPress={() => setSelectedTab("dashboard")}
        >
          <Ionicons
            name="analytics"
            size={20}
            color={selectedTab === "dashboard" ? "#2196F3" : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              selectedTab === "dashboard" && styles.activeTabText,
            ]}
          >
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === "employees" && styles.activeTab]}
          onPress={() => setSelectedTab("employees")}
        >
          <Ionicons
            name="people"
            size={20}
            color={selectedTab === "employees" ? "#2196F3" : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              selectedTab === "employees" && styles.activeTabText,
            ]}
          >
            Employees
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === "reports" && styles.activeTab]}
          onPress={() => setSelectedTab("reports")}
        >
          <Ionicons
            name="document-text"
            size={20}
            color={selectedTab === "reports" ? "#2196F3" : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              selectedTab === "reports" && styles.activeTabText,
            ]}
          >
            Reports
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {selectedTab === "dashboard" && renderDashboard()}
      {selectedTab === "employees" && renderEmployees()}
      {selectedTab === "reports" && renderReports()}

      {/* Modals */}
      {renderAddEmployeeModal()}
      {renderEmployeeModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "#e3f2fd",
  },
  tabText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#2196F3",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsText: {
    flex: 1,
  },
  statsTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
  departmentContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  departmentCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    minWidth: 120,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  departmentName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  departmentStats: {
    fontSize: 12,
    color: "#666",
  },
  chartContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  actionButton: {
    backgroundColor: "#2196F3",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  addButton: {
    backgroundColor: "#2196F3",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  employeeCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  employeeInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#2196F3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  employeeEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  employeeId: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  employeeDepartment: {
    fontSize: 12,
    color: "#999",
  },
  employeeActions: {
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  roleText: {
    fontSize: 10,
    color: "#999",
    marginBottom: 4,
    textTransform: "capitalize",
  },
  filtersContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  dateFilters: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  loadReportButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  loadReportButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  summaryContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  summaryStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    minWidth: 120,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2196F3",
  },
  reportContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  reportItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingVertical: 12,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reportEmployeeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  reportDate: {
    fontSize: 12,
    color: "#666",
  },
  reportDetails: {
    marginBottom: 8,
  },
  reportTime: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  reportHours: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  reportBadges: {
    flexDirection: "row",
    gap: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  saveButton: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2196F3",
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  roleContainer: {
    flexDirection: "row",
    gap: 12,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  roleButtonActive: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  roleButtonTextActive: {
    color: "#fff",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  employeeModalContent: {
    flex: 1,
    padding: 20,
  },
  employeeHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#2196F3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  largeAvatarText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "600",
  },
  employeeModalName: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  employeeModalEmail: {
    fontSize: 16,
    color: "#666",
  },
  employeeInfoSection: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: "#666",
    flex: 1,
    textAlign: "right",
  },
  actionButtonsContainer: {
    gap: 12,
  },
  editButton: {
    backgroundColor: "#4CAF50",
  },
  deactivateButton: {
    backgroundColor: "#F44336",
  },
});

export default AdminScreen;
