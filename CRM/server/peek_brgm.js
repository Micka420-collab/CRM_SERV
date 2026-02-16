const XLSX = require('xlsx');
const path = require('path');

const file = 'c:/Users/Mick/Desktop/projet test/CRM/DATA/Liste des applications BRGM.xlsx';
const workbook = XLSX.readFile(file);

console.log('Sheets:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (data.length > 0) {
        console.log('Headers:', JSON.stringify(data[0]));
        if (data.length > 1) {
            console.log('Row 1:', JSON.stringify(data[1]));
        }
    }
});
