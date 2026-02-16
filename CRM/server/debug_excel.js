const XLSX = require('xlsx');

const file = 'c:/Users/Mick/Desktop/projet test/CRM/DATA/Liste des logiciels interdits.xlsx';
const workbook = XLSX.readFile(file);

console.log('Sheets:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
    console.log(`\n--- Sheet: "${sheetName}" ---`);
    const sheet = workbook.Sheets[sheetName];
    // console.log('Sheet raw:', sheet); // This might be too big
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log('Total Rows:', data.length);
    data.slice(0, 10).forEach((row, i) => {
        console.log(`Row ${i}:`, JSON.stringify(row));
    });
});
