
const db = require('./database');

async function migrate() {
    await db.initializeDatabase();
    const d = db.getDb();

    // Find all hotliners
    const hotliners = await d.all("SELECT id, username, permissions FROM users WHERE role = 'hotliner'");

    for (const user of hotliners) {
        if (!user.permissions) continue;

        let perms = [];
        try {
            perms = JSON.parse(user.permissions);
        } catch (e) {
            console.error(`Invalid permissions for user ${user.username}`);
            continue;
        }

        // Remove unwanted permissions
        const originalLength = perms.length;
        perms = perms.filter(p => p !== 'employees_view' && p !== 'users_manage');

        if (perms.length !== originalLength) {
            console.log(`Updating permissions for ${user.username}...`);
            await d.run("UPDATE users SET permissions = ? WHERE id = ?", [JSON.stringify(perms), user.id]);
        }
    }

    console.log('Migration complete.');
}

migrate();
