const db = require('./db');
const bcrypt = require('bcryptjs');

async function initDB() {
  console.log('Initializing MySQL Database...');

  try {
    // 1. Create Users Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('incharge', 'store') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table ready.');

    // 2. Create Items Table
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
    
    // PERFORMANCE INDEXES
    // Adding indexes speeds up search and grouping significantly
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_project_id ON items(projectId)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_pr_number ON items(prNumber)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_item_code ON items(itemCode)`);
    
    console.log('Items table ready (with indexes).');

    // 3. Create Usage Table
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
    
    // PERFORMANCE INDEX FOR USAGE
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_usage_item_id ON usage_logs(itemId)`);
    
    console.log('Usage table ready.');

    // 4. Seed Default Users
    // Check if users exist first
    const [users] = await db.execute('SELECT * FROM users LIMIT 1');
    if (users.length === 0) {
        const hashIncharge = await bcrypt.hash('admin123', 10);
        const hashStore = await bcrypt.hash('store123', 10);

        await db.execute(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, ['incharge', hashIncharge, 'incharge']);
        await db.execute(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, ['store', hashStore, 'store']);
        
        console.log('Default users created:');
        console.log('1. User: incharge | Pass: admin123');
        console.log('2. User: store    | Pass: store123');
    }

    console.log('Database initialization complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
}

initDB();