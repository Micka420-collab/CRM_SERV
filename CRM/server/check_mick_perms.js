const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'inventory.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking permissions for Mick...');
db.get("SELECT permissions FROM users WHERE username = 'Mick'", (err, row) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Permissions for Mick:', row ? row.permissions : 'USER NOT FOUND');
    }
    db.close();
});
