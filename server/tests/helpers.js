const fs = require('fs');
const path = require('path');
const db = require('../database');

/**
 * Setup test database before all tests
 */
const setupTestDatabase = () => {
  return new Promise((resolve) => {
    db.initializeDatabase(() => {
      resolve();
    });
  });
};

/**
 * Clean up test database after all tests
 */
const cleanupTestDatabase = () => {
  db.closeConnection();
  const testDbPath = db.DB_PATH;
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
};

/**
 * Reset test database between tests
 */
const resetTestDatabase = () => {
  return new Promise((resolve) => {
    db.closeConnection();
    const testDbPath = db.DB_PATH;
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db.initializeDatabase(() => {
      resolve();
    });
  });
};

module.exports = {
  setupTestDatabase,
  cleanupTestDatabase,
  resetTestDatabase
};
