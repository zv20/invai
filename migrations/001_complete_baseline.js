/**
 * Migration 001: Complete Baseline Schema - ALL TABLES
 * 
 * This single migration creates the complete database schema including:
 * - Core: Products, Categories, Suppliers
 * - Users: Users table with management fields, sessions, password history, account lockout
 * - Activity: Activity logging, user preferences
 * - Inventory: Stock take, batches
 * - Business Intelligence: Search tables, dashboard stats
 * - PWA: Push subscriptions
 * - Performance: All indexes
 * 
 * Version: 0.10.0-beta
 * Date: January 26, 2026
 */

module.exports = {
  version: 1,
  name: 'complete_baseline',
  description: 'Complete database schema with all tables and features',

  async up(db) {
    console.log('   🏗️  Creating complete baseline schema...');

    // ============================================
    // CORE TABLES
    // ============================================
    
    // Products table
    await db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        category TEXT,
        supplier TEXT,
        barcode TEXT,
        category_id INTEGER REFERENCES categories(id),
        supplier_id INTEGER REFERENCES suppliers(id),
        reorder_point INTEGER DEFAULT 0,
        max_stock INTEGER DEFAULT 0,
        is_favorite INTEGER DEFAULT 0,
        last_restock_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Products table created');

    // Categories table
    await db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        color TEXT DEFAULT '#9333ea',
        icon TEXT DEFAULT '📦',
        display_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Categories table created');

    // Suppliers table
    await db.run(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        contact_name TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        notes TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Suppliers table created');

    // ============================================
    // USER MANAGEMENT TABLES
    // ============================================

    // Users table with full management fields
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        role VARCHAR(20) DEFAULT 'user',
        is_active BOOLEAN DEFAULT 1,
        password_changed_at DATETIME,
        account_locked INTEGER DEFAULT 0,
        locked_until DATETIME,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER REFERENCES users(id)
      )
    `);
    console.log('   ✅ Users table created');

    // Sessions table
    await db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Sessions table created');

    // Password history table
    await db.run(`
      CREATE TABLE IF NOT EXISTS password_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Password history table created');

    // Account lockout table
    await db.run(`
      CREATE TABLE IF NOT EXISTS account_lockout (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        failed_attempts INTEGER DEFAULT 0,
        locked_until DATETIME,
        last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Account lockout table created');

    // Login attempts table (for tracking login history)
    await db.run(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        user_agent TEXT,
        success INTEGER DEFAULT 0,
        attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        failure_reason TEXT
      )
    `);
    console.log('   ✅ Login attempts table created');

    // ============================================
    // ACTIVITY & PREFERENCES
    // ============================================

    // Activity log table
    await db.run(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        entity_name TEXT,
        description TEXT,
        old_value TEXT,
        new_value TEXT,
        user_id INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Activity log table created');

    // User preferences table
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT 1,
        key TEXT NOT NULL UNIQUE,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ User preferences table created');

    // ============================================
    // INVENTORY MANAGEMENT
    // ============================================

    // Inventory batches table
    await db.run(`
      CREATE TABLE IF NOT EXISTS inventory_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        batch_number TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        expiry_date DATE,
        received_date DATE DEFAULT CURRENT_DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Inventory batches table created');

    // Stock take table
    await db.run(`
      CREATE TABLE IF NOT EXISTS stock_takes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'in_progress',
        started_by INTEGER REFERENCES users(id),
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        completed_by INTEGER REFERENCES users(id),
        notes TEXT
      )
    `);
    console.log('   ✅ Stock takes table created');

    // Stock take items table
    await db.run(`
      CREATE TABLE IF NOT EXISTS stock_take_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stock_take_id INTEGER NOT NULL REFERENCES stock_takes(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        expected_quantity INTEGER NOT NULL,
        actual_quantity INTEGER,
        variance INTEGER,
        notes TEXT,
        counted_at DATETIME,
        counted_by INTEGER REFERENCES users(id)
      )
    `);
    console.log('   ✅ Stock take items table created');

    // ============================================
    // BUSINESS INTELLIGENCE TABLES
    // ============================================

    // Search history table
    await db.run(`
      CREATE TABLE IF NOT EXISTS search_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        search_query TEXT NOT NULL,
        result_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Search history table created');

    // Dashboard stats cache table
    await db.run(`
      CREATE TABLE IF NOT EXISTS dashboard_stats_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stat_key TEXT NOT NULL UNIQUE,
        stat_value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Dashboard stats cache table created');

    // ============================================
    // PWA TABLES
    // ============================================

    // Push subscriptions table
    await db.run(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh_key TEXT NOT NULL,
        auth_key TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Push subscriptions table created');

    // ============================================
    // INDEXES FOR PERFORMANCE
    // ============================================

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)',
      'CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id)',
      'CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)',
      'CREATE INDEX IF NOT EXISTS idx_batches_product ON inventory_batches(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_batches_expiration ON inventory_batches(expiry_date)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username)',
      'CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address)',
      'CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempted_at)',
      'CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_stock_take_items_take ON stock_take_items(stock_take_id)',
      'CREATE INDEX IF NOT EXISTS idx_stock_take_items_product ON stock_take_items(product_id)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)'
    ];

    for (const indexSQL of indexes) {
      await db.run(indexSQL);
    }
    console.log('   ✅ Created ' + indexes.length + ' performance indexes');

    // ============================================
    // TRIGGERS
    // ============================================

    // Auto-update users.updated_at
    await db.run(`
      CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
      AFTER UPDATE ON users
      FOR EACH ROW
      BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `);
    console.log('   ✅ Created users timestamp trigger');

    console.log('   ✅ Complete baseline schema created successfully');
    console.log('   ℹ️  Database ready with all tables, indexes, and triggers');
  },

  async down(db) {
    const tables = [
      'push_subscriptions',
      'dashboard_stats_cache',
      'search_history',
      'stock_take_items',
      'stock_takes',
      'inventory_batches',
      'user_preferences',
      'activity_log',
      'login_attempts',
      'account_lockout',
      'password_history',
      'sessions',
      'users',
      'suppliers',
      'categories',
      'products'
    ];

    for (const table of tables) {
      await db.run(`DROP TABLE IF EXISTS ${table}`);
    }
  }
};
