const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const dbPath = path.resolve(__dirname, 'inventory.db');
const db = new sqlite3.Database(dbPath);

(async () => {
    try {
        const hash = await bcrypt.hash('admin3150', 10);
        db.run("INSERT OR REPLACE INTO users (username, password, role, permissions) VALUES (?, ?, ?, ?)", 
            ['Mick', hash, 'admin', '["inventory_view","inventory_edit","employees_view","employees_edit","loans_view","loans_manage","settings_access","users_manage"]'], 
            (err) => {
                if (err) {
                    console.error('Error creating user Mick:', err.message);
                } else {
                    console.log('User Mick restored successfully with password admin3150');
                }
                db.close();
            }
        );
    } catch (err) {
        console.error('Bcrypt error:', err.message);
        db.close();
    }
})();
