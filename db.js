const fs = require('fs');

let db = { applications: {} };

if (fs.existsSync('./db.json')) {
    try {
        const parsed = JSON.parse(fs.readFileSync('./db.json', 'utf8'));
        db.applications = parsed.applications || {};
    } catch (err) {
        console.error("[DB] Error loading db.json:", err);
    }
}

function saveDB() {
    try {
        fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));
        console.log("[DB] Database saved successfully");
    } catch (err) {
        console.error("[DB] Error saving db.json:", err);
    }
}

module.exports = { db, saveDB };