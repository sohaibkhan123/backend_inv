require('dotenv').config();
const mysql = require('mysql2');

// Parse the connection string from environment variable or use individual fields
// Expected format: mysql://user:pass@host:port/database
const connectionUrl = process.env.DATABASE_URL;

let pool;

if (connectionUrl) {
    pool = mysql.createPool({
        uri: connectionUrl,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: {
            rejectUnauthorized: true // Required for TiDB Cloud
        }
    });
} else {
    // Fallback to individual params if URL not provided
    pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 4000,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: {
            rejectUnauthorized: true
        }
    });
}

// Promisify for async/await usage
const promisePool = pool.promise();

module.exports = promisePool;