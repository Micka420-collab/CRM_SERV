const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'inventory.db');
const db = new sqlite3.Database(dbPath);

const fullPermissions = [
    "inventory_view", "inventory_add", "inventory_edit", "inventory_delete", "inventory_export",
    "phones_view", "phones_add", "phones_edit", "phones_delete",
    "loans_view", "loans_manage",
    "applications_view", "applications_manage",
    "employees_view", "employees_edit", "employees_delete",
    "settings_access", "users_manage", "audit_view", "security_manage", "dashboard_view",
    "notes_view", "notes_create", "notes_delete", "categories_manage"
];

db.run("UPDATE users SET permissions = ? WHERE username = 'Mick'", [JSON.stringify(fullPermissions)], (err) => {
    if (err) console.error('Error:', err);
    else console.log('Permissions updated for Mick to include applications_view');
    db.close();
});
