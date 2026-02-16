const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'inventory.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking database at:', dbPath);

db.serialize(() => {
    // Check user Mick
    db.get("SELECT * FROM users WHERE username = 'Mick'", (err, row) => {
        if (err) console.error('Error fetching Mick:', err);
        else console.log('User Mick:', row ? { id: row.id, username: row.username, role: row.role } : 'NOT FOUND');
    });

    // Check recent auth logs
    db.all("SELECT * FROM auth_logs ORDER BY id DESC LIMIT 5", (err, rows) => {
        if (err) console.error('Error fetching logs:', err);
        else console.log('Latest Auth Logs:', rows);
    });
});

db.close();
