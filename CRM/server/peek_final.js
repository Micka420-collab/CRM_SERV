const XLSX = require('xlsx');

const files = [
    'c:/Users/Mick/Desktop/projet test/CRM/DATA/Liste des applications BRGM.xlsx',
    'c:/Users/Mick/Desktop/projet test/CRM/DATA/Liste des logiciels interdits.xlsx'
];

files.forEach(file => {
    console.log(`\n\n========================================`);
    console.log(`FILE: ${file}`);
    const workbook = XLSX.readFile(file);
    workbook.SheetNames.forEach(sheetName => {
        console.log(`\n--- SHEET: ${sheetName} ---`);
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (data.length > 0) {
            // Find first non-empty row to detect headers better
            let headerRow = 0;
            while(headerRow < data.length && (!data[headerRow] || data[headerRow].length === 0)) {
                headerRow++;
            }
            if (headerRow < data.length) {
                console.log(`Headers Found at Row ${headerRow + 1}:`, JSON.stringify(data[headerRow]));
                for (let i = headerRow + 1; i < Math.min(headerRow + 5, data.length); i++) {
                    console.log(`Data Row ${i + 1}:`, JSON.stringify(data[i]));
                }
            }
        }
    });
});
