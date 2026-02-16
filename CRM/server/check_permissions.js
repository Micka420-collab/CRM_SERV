
const db = require('./database');

async function check() {
    await db.initializeDatabase();
    const d = db.getDb();
    const users = await d.all('SELECT id, username, role, permissions FROM users');
    console.log(JSON.stringify(users, null, 2));
}

check();
