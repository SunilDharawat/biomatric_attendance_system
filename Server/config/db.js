// config/db.js - Database configuration and connection
const mysql = require("mysql2/promise");

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "biometric_attendance",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000,
  // timeout: 60000,
  // reconnect: true,
  charset: "utf8mb4",
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Database connected successfully");
    connection.release();
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    return false;
  }
};

// Initialize database connection
const initializeDatabase = async () => {
  try {
    await testConnection();

    // Check if required tables exist
    const [tables] = await pool.query("SHOW TABLES LIKE 'users'");
    if (tables.length === 0) {
      console.log(
        "⚠️ Database tables not found. Please run the schema.sql file."
      );
    } else {
      console.log("✅ Database tables verified");
    }
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message);
    process.exit(1);
  }
};

// Helper function to execute queries
const executeQuery = async (query, params = []) => {
  try {
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error("Database query error:", error.message);
    throw new Error("Database operation failed");
  }
};

// Helper function for transactions
const executeTransaction = async (queries) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const results = [];
    for (const { query, params } of queries) {
      const [result] = await connection.execute(query, params);
      results.push(result);
    }

    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    console.error("Transaction error:", error.message);
    throw new Error("Transaction failed");
  } finally {
    connection.release();
  }
};

// Graceful shutdown
const closeDatabase = async () => {
  try {
    await pool.end();
    console.log("✅ Database connections closed");
  } catch (error) {
    console.error("❌ Error closing database:", error.message);
  }
};

// Handle process termination
process.on("SIGINT", closeDatabase);
process.on("SIGTERM", closeDatabase);

module.exports = {
  pool,
  executeQuery,
  executeTransaction,
  initializeDatabase,
  testConnection,
  closeDatabase,
};
