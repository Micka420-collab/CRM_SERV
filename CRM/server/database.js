const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const path = require('path');

const fs = require('fs');

const userDataPath = process.env.ELECTRON_USER_DATA_PATH;
let dbPath;

if (userDataPath) {
  // In production, store DB in AppData
  dbPath = path.join(userDataPath, 'database', 'inventory.db');
  // Ensure directory exists
  if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
} else {
  // In dev, use local file
  dbPath = path.resolve(__dirname, 'inventory.db');
}

let db;

async function initializeDatabase() {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT, -- 'admin', 'hotliner'
      xp INTEGER DEFAULT 0,
      team3150_unlocked INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      icon TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      category_id INTEGER,
      quantity INTEGER DEFAULT 0,
      min_quantity INTEGER DEFAULT 5,
      description TEXT,
      location TEXT,
      notes TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT,
      details TEXT,
      quantity_change INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      department TEXT,
      password TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS equipment_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      employee_id INTEGER,
      assigned_by INTEGER,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      returned_at DATETIME,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (assigned_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS loan_pcs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      serial_number TEXT,
      status TEXT DEFAULT 'available',
      current_user TEXT,
      loan_reason TEXT,
      loan_start DATETIME,
      loan_end_expected DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS loan_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pc_id INTEGER,
      pc_name TEXT,
      user_name TEXT,
      reason TEXT,
      start_date DATETIME,
      end_date DATETIME,
      actual_return_date DATETIME,
      notes TEXT,
      created_by INTEGER,
      action_type TEXT DEFAULT 'loan',
      FOREIGN KEY (pc_id) REFERENCES loan_pcs(id)
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pc_id INTEGER,
      user_name TEXT,
      start_date DATETIME,
      end_date DATETIME,
      reason TEXT,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pc_id) REFERENCES loan_pcs(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      user_role TEXT,
      action TEXT,
      details TEXT,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      badge_id TEXT,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS software_catalog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      description TEXT,
      category TEXT,
      source TEXT,
      comments TEXT
    );

    CREATE TABLE IF NOT EXISTS software_blacklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      status TEXT, -- 'Interdit', 'Bloqué', 'Déconseillé'
      comments TEXT
    );

    CREATE TABLE IF NOT EXISTS software_installations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dossier_number TEXT,
      user_name TEXT,
      machine_name TEXT,
      software_name TEXT,
      installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS phones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      serial_number TEXT,
      tlp_id TEXT,
      assigned_to TEXT,
      department TEXT,
      condition TEXT DEFAULT 'Bon',
      notes TEXT,
      is_sensitive INTEGER DEFAULT 0,
      dossier_number TEXT,
      imputation TEXT,
      last_remaster_date DATETIME,
      loan_start DATETIME,
      loan_end_expected DATETIME,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS licenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_key TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      expires_at DATETIME,
      activated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: Ensure gamification columns exist in users table
  try {
    await db.exec(`ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0`);
    console.log('Added xp column to users table');
  } catch (e) {
    // Column already exists
  }
  try {
    await db.exec(`ALTER TABLE users ADD COLUMN team3150_unlocked INTEGER DEFAULT 0`);
    console.log('Added team3150_unlocked column to users table');
  } catch (e) {
    // Column already exists
  }

  // Seed default admin if not exists
  const admin = await db.get("SELECT * FROM users WHERE username = 'admin'");
  if (!admin) {
    const hash = await bcrypt.hash('admin123', 10);
    await db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', hash, 'admin']);
    console.log('Default admin user created: admin / admin123');
  }

  // Seed Hotline6 admin if not exists
  const hotline6 = await db.get("SELECT * FROM users WHERE username = 'Hotline6'");
  if (!hotline6) {
    const hash = await bcrypt.hash('Elouan', 10);
    await db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['Hotline6', hash, 'admin']);
    console.log('Admin user created: Hotline6');
  }

  // Seed categories
  const categories = ['PC', 'Laptop', 'Screen', 'Keyboard', 'Mouse', 'Battery', 'Charger', 'Adapter', 'Cleaning', 'Cables', 'Projector', 'Privacy Filter', 'Station d\'accueil'];
  for (const cat of categories) {
    await db.run("INSERT OR IGNORE INTO categories (name) VALUES (?)", [cat]);
  }

  console.log('Database initialized');

  // Migration: Add quantity_change column if it doesn't exist
  try {
    await db.run("ALTER TABLE logs ADD COLUMN quantity_change INTEGER");
    console.log('Migration: Added quantity_change column to logs table');
  } catch (e) {
    // Column already exists, ignore error
  }

  // Migration: Add password column to employees if it doesn't exist
  try {
    await db.run("ALTER TABLE employees ADD COLUMN password TEXT");
    console.log('Migration: Added password column to employees table');
  } catch (e) {
    // Column already exists, ignore error
  }

  // Migration: Add photo column to products if it doesn't exist
  try {
    await db.run("ALTER TABLE products ADD COLUMN photo TEXT");
    console.log('Migration: Added photo column to products table');
  } catch (e) {
    // Column already exists, ignore error
  }

  // Migration: Add has_seen_tutorial column to users if it doesn't exist
  try {
    // Default to 0 (false)
    await db.run("ALTER TABLE users ADD COLUMN has_seen_tutorial INTEGER DEFAULT 0");
    console.log('Migration: Added has_seen_tutorial column to users table');
  } catch (e) {
    // Column already exists, ignore error
  }

  // Migration: Add has_seen_tutorial column to employees if it doesn't exist
  try {
    await db.run("ALTER TABLE employees ADD COLUMN has_seen_tutorial INTEGER DEFAULT 0");
    console.log('Migration: Added has_seen_tutorial column to employees table');
  } catch (e) {
    // Column already exists, ignore error
  }

  // Migration: Add is_remastering to loan_pcs
  try {
    await db.run("ALTER TABLE loan_pcs ADD COLUMN is_remastering INTEGER DEFAULT 0");
    console.log('Migration: Added is_remastering column to loan_pcs table');
  } catch (e) {
    // Column already exists, ignore
  }

  // Create auth_logs table for login tracking
  await db.run(`
    CREATE TABLE IF NOT EXISTS auth_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add XP columns to users
  try {
    await db.run("ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0");
    console.log('Migration: Added xp column to users table');
  } catch (e) { /* exists */ }

  try {
    await db.run("ALTER TABLE users ADD COLUMN team3150_unlocked INTEGER DEFAULT 0");
    console.log('Migration: Added team3150_unlocked column to users table');
  } catch (e) { /* exists */ }

  // Migration: Add photo_url column to users
  try {
    await db.run("ALTER TABLE users ADD COLUMN photo_url TEXT");
    console.log('Migration: Added photo_url column to users table');
  } catch (e) { /* exists */ }

  try {
    await db.run("ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1");
    console.log('Migration: Added level column to users table');
  } catch (e) { /* exists */ }

  // Migration: Add photo_url column to employees
  try {
    await db.run("ALTER TABLE employees ADD COLUMN photo_url TEXT");
    console.log('Migration: Added photo_url column to employees table');
  } catch (e) { /* exists */ }

  // Migration: Add team3150_unlocked to employees
  try {
    await db.run("ALTER TABLE employees ADD COLUMN team3150_unlocked INTEGER DEFAULT 0");
    console.log('Migration: Added team3150_unlocked column to employees table');
  } catch (e) { /* exists */ }

  // Migration: Add xp to employees
  try {
    await db.run("ALTER TABLE employees ADD COLUMN xp INTEGER DEFAULT 0");
    console.log('Migration: Added xp column to employees table');
  } catch (e) { /* exists */ }

  try {
    await db.run("ALTER TABLE employees ADD COLUMN level INTEGER DEFAULT 1");
    console.log('Migration: Added level column to employees table');
  } catch (e) { /* exists */ }

  // Migration: Add action_type column to loan_history
  try {
    await db.run("ALTER TABLE loan_history ADD COLUMN action_type TEXT DEFAULT 'loan'");
    console.log('Migration: Added action_type column to loan_history table');
  } catch (e) { /* exists */ }

  // Migration: Add permissions column to users
  try {
    await db.run("ALTER TABLE users ADD COLUMN permissions TEXT");
    console.log('Migration: Added permissions column to users table');
    // Set default permissions based on role
    await db.run(`UPDATE users SET permissions = '["inventory_view","inventory_edit","employees_view","employees_edit","loans_view","loans_manage","settings_access","users_manage"]' WHERE role = 'admin' AND permissions IS NULL`);
    await db.run(`UPDATE users SET permissions = '["inventory_view","inventory_edit","loans_view","loans_manage"]' WHERE role = 'hotliner' AND permissions IS NULL`);
  } catch (e) { /* exists */ }

  // Migration: Add permissions column to employees
  try {
    await db.run("ALTER TABLE employees ADD COLUMN permissions TEXT");
    console.log('Migration: Added permissions column to employees table');
  } catch (e) { /* exists */ }

  // Migration: Create audit_logs table if not exists (for existing DBs)
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT,
        user_role TEXT,
        action TEXT,
        details TEXT,
        ip_address TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Migration: Created audit_logs table');
  } catch (e) { /* exists */ }

  // Migration: Create user_badges table if not exists (for existing DBs)
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        badge_id TEXT,
        unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('Migration: Created user_badges table');
  } catch (e) { /* exists */ }

  // Migration: Add creator_role to loan_history
  try {
    await db.run("ALTER TABLE loan_history ADD COLUMN creator_role TEXT DEFAULT 'user'");
    console.log('Migration: Added creator_role column to loan_history table');
  } catch (e) { /* exists */ }

  // Migration: Add creator_role to notes
  try {
    await db.run("ALTER TABLE notes ADD COLUMN creator_role TEXT DEFAULT 'user'");
    console.log('Migration: Added creator_role column to notes table');
  } catch (e) { /* exists */ }

  // Migration: Add user_role to user_badges
  try {
    await db.run("ALTER TABLE user_badges ADD COLUMN user_role TEXT DEFAULT 'user'");
    console.log('Migration: Added user_role column to user_badges table');
  } catch (e) { /* exists */ }

  // ==================== NEW INVENTORY FIELDS ====================
  // Migration: Add serial_number to products
  try {
    await db.run("ALTER TABLE products ADD COLUMN serial_number TEXT");
    console.log('Migration: Added serial_number column to products table');
  } catch (e) { /* exists */ }

  // Migration: Add asset_tag to products (PRT1234, STA5678)
  try {
    await db.run("ALTER TABLE products ADD COLUMN asset_tag TEXT");
    console.log('Migration: Added asset_tag column to products table');
  } catch (e) { /* exists */ }

  // Migration: Add condition to products (Neuf, Bon, Usé, Hors service)
  try {
    await db.run("ALTER TABLE products ADD COLUMN condition TEXT DEFAULT 'Bon'");
    console.log('Migration: Added condition column to products table');
  } catch (e) { /* exists */ }

  // Migration: Add last_maintenance to products
  try {
    await db.run("ALTER TABLE products ADD COLUMN last_maintenance DATETIME");
    console.log('Migration: Added last_maintenance column to products table');
  } catch (e) { /* exists */ }

  // Migration: Add next_maintenance to products
  try {
    await db.run("ALTER TABLE products ADD COLUMN next_maintenance DATETIME");
    console.log('Migration: Added next_maintenance column to products table');
  } catch (e) { /* exists */ }

  // ==================== LOAN PC SENSITIVE MISSION FIELDS ====================
  try {
    await db.run("ALTER TABLE loan_pcs ADD COLUMN is_sensitive INTEGER DEFAULT 0");
    console.log('Migration: Added is_sensitive column to loan_pcs table');
  } catch (e) { /* exists */ }

  try {
    await db.run("ALTER TABLE loan_pcs ADD COLUMN dossier_number TEXT");
    console.log('Migration: Added dossier_number column to loan_pcs table');
  } catch (e) { /* exists */ }

  try {
    await db.run("ALTER TABLE loan_pcs ADD COLUMN imputation TEXT");
    console.log('Migration: Added imputation column to loan_pcs table');
  } catch (e) { /* exists */ }

  try {
    await db.run("ALTER TABLE loan_pcs ADD COLUMN last_remaster_date DATETIME");
    console.log('Migration: Added last_remaster_date column to loan_pcs table');
  } catch (e) { /* exists */ }

  try {
    await db.run("ALTER TABLE reservations ADD COLUMN reason TEXT");
    console.log('Migration: Added reason column to reservations table');
  } catch (e) { /* exists */ }

  // Migration: Add license_required to software_installations
  try {
    await db.run("ALTER TABLE software_installations ADD COLUMN license_required INTEGER DEFAULT 0");
    console.log('Migration: Added license_required column to software_installations table');
  } catch (e) { /* exists */ }

  // ==================== PHONE SENSITIVE MISSION FIELDS ====================
  try {
    await db.run("ALTER TABLE phones ADD COLUMN is_sensitive INTEGER DEFAULT 0");
    console.log('Migration: Added is_sensitive column to phones table');
  } catch (e) { /* exists */ }

  try {
    await db.run("ALTER TABLE phones ADD COLUMN dossier_number TEXT");
    console.log('Migration: Added dossier_number column to phones table');
  } catch (e) { /* exists */ }

  try {
    await db.run("ALTER TABLE phones ADD COLUMN imputation TEXT");
    console.log('Migration: Added imputation column to phones table');
  } catch (e) { /* exists */ }

  try {
    await db.run("ALTER TABLE phones ADD COLUMN last_remaster_date DATETIME");
    console.log('Migration: Added last_remaster_date column to phones table');
  } catch (e) { /* exists */ }

  try {
    await db.run("ALTER TABLE phones ADD COLUMN loan_start DATETIME");
    console.log('Migration: Added loan_start column to phones table');
  } catch (e) { /* exists */ }

  try {
    await db.run("ALTER TABLE phones ADD COLUMN loan_end_expected DATETIME");
    console.log('Migration: Added loan_end_expected column to phones table');
  } catch (e) { /* exists */ }

  // ==================== LICENSE SYSTEM ====================
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS licenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_key TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        expires_at DATETIME,
        activated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Migration: Ensured licenses table exists');
  } catch (e) {
    console.error('Migration Error (licenses):', e.message);
  }

  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

module.exports = { initializeDatabase, getDb };
