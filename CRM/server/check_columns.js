
const { initializeDatabase, getDb } = require('./database');

async function checkColumns() {
    await initializeDatabase();
    const db = getDb();

    console.log('--- USERS Table Columns ---');
    const usersCols = await db.all("PRAGMA table_info(users)");
    usersCols.forEach(c => console.log(c.name));

    console.log('\n--- EMPLOYEES Table Columns ---');
    const empCols = await db.all("PRAGMA table_info(employees)");
    empCols.forEach(c => console.log(c.name));
}

checkColumns().catch(console.error);
