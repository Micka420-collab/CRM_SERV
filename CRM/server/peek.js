const XLSX = require('xlsx');
const path = require('path');

const files = [
    { name: 'BRGM', path: 'c:/Users/Mick/Desktop/projet test/CRM/DATA/Liste des applications BRGM.xlsx' },
    { name: 'Interdits', path: 'c:/Users/Mick/Desktop/projet test/CRM/DATA/Liste des logiciels interdits.xlsx' }
];

files.forEach(f => {
    console.log(`\n=== FILE: ${f.name} ===`);
    try {
        const workbook = XLSX.readFile(f.path);
        console.log('Sheets:', workbook.SheetNames);
        workbook.SheetNames.forEach(sheetName => {
            console.log(`\n--- Sheet: ${sheetName} ---`);
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            if (data.length > 0) {
                console.log('Headers (Row 1):', JSON.stringify(data[0]));
                if (data.length > 1) {
                    console.log('Row 2:', JSON.stringify(data[1]));
                }
            } else {
                console.log('Empty');
            }
        });
    } catch (err) {
        console.error(`Error: ${err.message}`);
    }
});
