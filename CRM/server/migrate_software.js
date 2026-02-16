const XLSX = require('xlsx');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, 'inventory.db');
const brgmFile = 'c:/Users/Mick/Desktop/projet test/CRM/DATA/Liste des applications BRGM.xlsx';
const forbiddenFile = 'c:/Users/Mick/Desktop/projet test/CRM/DATA/Liste des logiciels interdits.xlsx';

async function migrate() {
    console.log('Starting migration...');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    // 1. Migrate Catalog (BRGM Outil Support)
    try {
        const wbBrgm = XLSX.readFile(brgmFile);
        const sheetName = 'Outil Support';
        const sheet = wbBrgm.Sheets[sheetName];
        if (!sheet) throw new Error(`Sheet ${sheetName} not found`);

        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const entries = data.slice(2); 
        console.log(`Found ${entries.length} catalog entries.`);
        
        await db.run("DELETE FROM software_catalog");
        
        for (const row of entries) {
            const name = row[0];
            const description = row[1];
            const comments = row[2];
            
            if (name && name.toString().trim()) {
                await db.run(
                    "INSERT OR IGNORE INTO software_catalog (name, description, comments) VALUES (?, ?, ?)",
                    [name.toString().trim(), description?.toString() || '', comments?.toString() || '']
                );
            }
        }
        console.log('Software catalog migrated.');
    } catch (err) {
        console.error('Error migrating catalog:', err.message);
    }

    // 2. Migrate Blacklist (Forbidden Software)
    try {
        const wbForb = XLSX.readFile(forbiddenFile);
        // Find sheet that starts with 'Logiciels'
        const sheetName = wbForb.SheetNames.find(sn => sn.startsWith('Logiciels'));
        if (!sheetName) throw new Error('Logiciels sheet not found');
        console.log(`Using sheet: ${sheetName}`);

        const sheet = wbForb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        // Headers are at Row 1 (index 0)
        const entries = data.slice(1);
        console.log(`Found ${entries.length} potential blacklist entries.`);

        await db.run("DELETE FROM software_blacklist");

        for (const row of entries) {
            const name = row[0];
            const status = row[3]; // Status is at index 3
            const comments = row[2]; // Risk/Comments at index 2

            if (name && name.toString().trim() && !name.toString().includes('Nom du logiciel')) {
                await db.run(
                    "INSERT OR IGNORE INTO software_blacklist (name, status, comments) VALUES (?, ?, ?)",
                    [name.toString().trim(), status?.toString() || 'Interdit', comments?.toString() || '']
                );
            }
        }
        console.log('Software blacklist migrated.');
    } catch (err) {
        console.error('Error migrating blacklist:', err.message);
    }

    await db.close();
    console.log('Migration finished.');
}

migrate();
