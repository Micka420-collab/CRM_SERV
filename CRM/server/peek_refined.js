const XLSX = require('xlsx');

const brgmFile = 'c:/Users/Mick/Desktop/projet test/CRM/DATA/Liste des applications BRGM.xlsx';
const forbiddenFile = 'c:/Users/Mick/Desktop/projet test/CRM/DATA/Liste des logiciels interdits.xlsx';

console.log('--- BRGM APPLICATIONS ---');
const wbBrgm = XLSX.readFile(brgmFile);
wbBrgm.SheetNames.forEach(sn => {
    const data = XLSX.utils.sheet_to_json(wbBrgm.Sheets[sn], { header: 1 });
    console.log(`Sheet: ${sn}, Rows: ${data.length}`);
    if (data.length > 0) {
        console.log(`Row 1:`, JSON.stringify(data[0]));
        console.log(`Row 2:`, JSON.stringify(data[1]));
        console.log(`Row 3:`, JSON.stringify(data[2]));
    }
});

console.log('\n--- FORBIDDEN SOFTWARE ---');
const wbForb = XLSX.readFile(forbiddenFile);
wbForb.SheetNames.forEach(sn => {
    const data = XLSX.utils.sheet_to_json(wbForb.Sheets[sn], { header: 1 });
    console.log(`Sheet: ${sn}, Rows: ${data.length}`);
    if (data.length > 0) {
        console.log(`Row 1:`, JSON.stringify(data[0]));
        console.log(`Row 2:`, JSON.stringify(data[1]));
    }
});
