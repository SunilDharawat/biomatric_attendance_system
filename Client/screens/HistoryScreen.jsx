// screens/HistoryScreen.js - Attendance history with filters
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";

import { useAttendance } from "../context/AttendanceContext";

const HistoryScreen = () => {
  const {
    attendanceHistory,
    isLoading,
    pagination,
    monthlyStats,
    loadAttendanceHistory,
    getAttendanceStatusColor,
    formatAttendanceTime,
  } = useAttendance();

  const [refreshing, setRefreshing] = useState(false);
  const [filterModal, setFilterModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(moment().month() + 1);
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedRecord, setSelectedRecord] = useState(null);

  const handleViewDetails = (record) => {
    console.log("Selected record:", record);
    setSelectedRecord(record);
  };

  useEffect(() => {
    loadHistory();
  }, [selectedMonth, selectedYear]);

  const loadHistory = async (page = 1) => {
    await loadAttendanceHistory(page, selectedMonth, selectedYear);
    setCurrentPage(page);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory(1);
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (pagination && pagination.hasNext && !isLoading) {
      await loadAttendanceHistory(currentPage + 1, selectedMonth, selectedYear);
      setCurrentPage((prev) => prev + 1);
    }
  };

  const renderAttendanceItem = ({ item }) => (
    <View style={styles.attendanceItem}>
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>{moment(item.date).format("DD")}</Text>
        <Text style={styles.monthText}>{moment(item.date).format("MMM")}</Text>
        <Text style={styles.dayText}>{moment(item.date).format("ddd")}</Text>
      </View>

      <View style={styles.attendanceDetails}>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getAttendanceStatusColor(item.status) },
            ]}
          />
          <Text style={styles.statusText}>
            {item.status?.toUpperCase() || "N/A"}
          </Text>
        </View>

        <View style={styles.timeContainer}>
          <View style={styles.timeItem}>
            <Ionicons name="log-in" size={16} color="#4CAF50" />
            <Text style={styles.timeText}>
              {item.check_in_time
                ? formatAttendanceTime(item.check_in_time)
                : "--:--"}
            </Text>
          </View>
          <View style={styles.timeItem}>
            <Ionicons name="log-out" size={16} color="#FF9800" />
            <Text style={styles.timeText}>
              {item.check_out_time
                ? formatAttendanceTime(item.check_out_time)
                : "--:--"}
            </Text>
          </View>
        </View>

        {item.total_minutes && (
          <Text style={styles.workingHours}>
            Working time: {Math.floor(item.total_minutes / 60)}h{" "}
            {item.total_minutes % 60}m
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.moreButton}
        onPress={() => handleViewDetails(item)}
      >
        <Ionicons name="chevron-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderStatsCard = () => (
    <View style={styles.statsCard}>
      <Text style={styles.statsTitle}>
        {moment()
          .month(selectedMonth - 1)
          .format("MMMM")}{" "}
        {selectedYear} Summary
      </Text>

      {monthlyStats ? (
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{monthlyStats.total_days || 0}</Text>
            <Text style={styles.statLabel}>Total Days</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {monthlyStats.present_days || 0}
            </Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{monthlyStats.half_days || 0}</Text>
            <Text style={styles.statLabel}>Half Day</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {monthlyStats.absent_days || 0}
            </Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{monthlyStats.late_days || 0}</Text>
            <Text style={styles.statLabel}>Late</Text>
          </View>
        </View>
      ) : (
        <ActivityIndicator size="small" color="#2196F3" />
      )}
    </View>
  );

  const renderFilterModal = () => (
    <Modal
      visible={filterModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setFilterModal(false)}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Filter History</Text>
          <TouchableOpacity onPress={() => setFilterModal(false)}>
            <Text style={styles.modalDone}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterContent}>
          <Text style={styles.filterLabel}>Select Month</Text>
          <View style={styles.monthGrid}>
            {moment.months().map((month, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.monthButton,
                  selectedMonth === index + 1 && styles.monthButtonSelected,
                ]}
                onPress={() => setSelectedMonth(index + 1)}
              >
                <Text
                  style={[
                    styles.monthButtonText,
                    selectedMonth === index + 1 &&
                      styles.monthButtonTextSelected,
                  ]}
                >
                  {month.substr(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.filterLabel}>Select Year</Text>
          <View style={styles.yearContainer}>
            {[2023, 2024, 2025].map((year) => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.yearButton,
                  selectedYear === year && styles.yearButtonSelected,
                ]}
                onPress={() => setSelectedYear(year)}
              >
                <Text
                  style={[
                    styles.yearButtonText,
                    selectedYear === year && styles.yearButtonTextSelected,
                  ]}
                >
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDetailsModal = () => (
    <Modal
      visible={!!selectedRecord}
      animationType="slide"
      transparent
      onRequestClose={() => setSelectedRecord(null)}
    >
      <View style={styles.detailsModalOverlay}>
        <View style={styles.detailsModalContainer}>
          <Text style={styles.detailsModalTitle}>Attendance Details</Text>

          {selectedRecord && (
            <>
              <Text style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Date: </Text>
                {moment(selectedRecord.date).format("DD MMM YYYY")}
              </Text>
              <Text style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Status: </Text>
                {selectedRecord.status}
              </Text>
              <Text style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Check In: </Text>
                {formatAttendanceTime(selectedRecord.check_in_time)}
              </Text>
              <Text style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Check Out: </Text>
                {formatAttendanceTime(selectedRecord.check_out_time)}
              </Text>
              <Text style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Minutes Worked: </Text>
                {selectedRecord.total_minutes}
              </Text>
              <Text style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Notes: </Text>
                {selectedRecord.notes || "N/A"}
              </Text>
            </>
          )}

          <TouchableOpacity
            style={styles.detailsCloseButton}
            onPress={() => setSelectedRecord(null)}
          >
            <Text style={styles.detailsCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Attendance History</Text>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setFilterModal(true)}
      >
        <Ionicons name="filter" size={20} color="#2196F3" />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No attendance records found</Text>
      <Text style={styles.emptySubtitle}>
        No records available for{" "}
        {moment()
          .month(selectedMonth - 1)
          .format("MMMM")}{" "}
        {selectedYear}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      <FlatList
        style={{ marginBottom: 70 }}
        data={attendanceHistory}
        keyExtractor={(item) => item.id?.toString() || item.date}
        renderItem={renderAttendanceItem}
        ListHeaderComponent={renderStatsCard}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2196F3"]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={
          isLoading && currentPage > 1 ? (
            <ActivityIndicator style={styles.loadingFooter} color="#2196F3" />
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      {renderFilterModal()}
      {renderDetailsModal()}
    </View>
  );
};

// StyleSheet placeholder

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  filterButton: {
    padding: 8,
  },

  statsCard: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  statItem: {
    alignItems: "center",
    width: "20%",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2196F3",
  },
  statLabel: {
    fontSize: 12,
    color: "#777",
  },

  attendanceItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
  },
  dateContainer: {
    alignItems: "center",
    marginRight: 16,
    width: 50,
  },
  dateText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2196F3",
  },
  monthText: {
    fontSize: 14,
    color: "#555",
  },
  dayText: {
    fontSize: 12,
    color: "#777",
  },

  attendanceDetails: {
    flex: 1,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  timeContainer: {
    flexDirection: "row",
    marginBottom: 6,
  },
  timeItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  timeText: {
    fontSize: 12,
    marginLeft: 4,
    color: "#555",
  },
  workingHours: {
    fontSize: 12,
    color: "#777",
  },

  moreButton: {
    color: "#fff",
    width: 32,
    height: 32,
    borderRadius: 16, // Makes it round
    backgroundColor: "#2196F3", // Or any accent color
    justifyContent: "center",
    alignItems: "center",
  },

  emptyContainer: {
    alignItems: "center",
    marginTop: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
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

  filterContent: {
    padding: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  monthButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  monthButtonSelected: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  monthButtonText: {
    fontSize: 12,
    color: "#333",
  },
  monthButtonTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },

  yearContainer: {
    flexDirection: "row",
    marginTop: 8,
  },
  yearButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  yearButtonSelected: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  yearButtonText: {
    fontSize: 14,
    color: "#333",
  },
  yearButtonTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },

  loadingFooter: {
    marginVertical: 16,
  },

  // renderDetails model
  detailsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  detailsModalContainer: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    elevation: 4,
  },

  detailsModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#333",
  },

  detailsRow: {
    fontSize: 14,
    color: "#555",
    marginBottom: 6,
  },

  detailsLabel: {
    fontWeight: "600",
    color: "#333",
  },

  detailsCloseButton: {
    marginTop: 16,
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#2196F3",
  },

  detailsCloseButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});

export default HistoryScreen;
