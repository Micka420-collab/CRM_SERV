const crypto = require('crypto');

const LICENSE_SECRET = "CRM_PREMIUM_SALT_2024";

function generateKey(prefix, expiryDate) {
    // prefix ex: CRM
    // expiryDate ex: 20251231
    const content = `${prefix}-${expiryDate}`;
    
    const hash = crypto
      .createHmac('sha256', LICENSE_SECRET)
      .update(content)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase();
      
    return `${content}-${hash}`;
}

const args = process.argv.slice(2);
if (args.length < 2) {
    console.log("Usage: node generate_license.js <PREFIX> <YYYYMMDD>");
    console.log("Example: node generate_license.js CRM 20261231");
    process.exit(1);
}

const key = generateKey(args[0], args[1]);
console.log("\n========================================");
console.log("   CLE DE LICENCE GENERE POUR LE CRM");
console.log("========================================");
console.log(`\nCLÉ : ${key}`);
console.log("\n========================================\n");
