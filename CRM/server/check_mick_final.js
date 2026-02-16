const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'inventory.db');
const db = new sqlite3.Database(dbPath);

db.get("SELECT id, username, role, permissions FROM users WHERE username = 'Mick'", (err, row) => {
    if (err) {
        console.error("Error:", err);
    } else {
        console.log("User Data:", JSON.stringify(row, null, 2));
    }
    db.close();
});
