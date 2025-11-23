const db = require('./db');

async function initDB() {
  console.log('Initializing MySQL Database...');

  try {
    // 1. Create Items Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS items (
        id VARCHAR(36) PRIMARY KEY,
        itemCode VARCHAR(255) NOT NULL,
        prNumber VARCHAR(255) NOT NULL,
        description TEXT,
        weight DECIMAL(10, 2) DEFAULT 0,
        prQty DECIMAL(10, 2) DEFAULT 0,
        requiredQty DECIMAL(10, 2) DEFAULT 0,
        receivedQty DECIMAL(10, 2) DEFAULT 0,
        projectId VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Items table ready.');

    // 2. Create Usage Table
    // Note: TiDB supports Foreign Keys but sometimes checks need specific config. 
    // We keep it simple with standard SQL.
    await db.execute(`
      CREATE TABLE IF NOT EXISTS usage_logs (
        id VARCHAR(36) PRIMARY KEY,
        itemId VARCHAR(36) NOT NULL,
        projectId VARCHAR(255) NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL,
        date DATETIME,
        issuedTo VARCHAR(255),
        issueSlipImage LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE
      )
    `);
    console.log('Usage table ready.');

    console.log('Database initialization complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
}

initDB();