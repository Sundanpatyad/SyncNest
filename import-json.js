const initSqlJs = require('sql.js');
const fs = require('fs');

async function importJson() {
  if (!fs.existsSync('data.json')) {
    console.error("Please create a 'data.json' file in this folder containing your JSON array.");
    return;
  }
  
  // Read and format the file content.
  let rawData = fs.readFileSync('data.json', 'utf8').trim();

  // Handle cases where multiple JSON objects are pasted sequentially without a root array
  // E.g. { "meta": ... } { "data": [...] }
  if (rawData.includes('}\n{')) {
    rawData = '[' + rawData.replace(/}\n{/g, '},{') + ']';
  }

  let jsonData;
  try {
    jsonData = JSON.parse(rawData);
  } catch (e) {
    console.error("Invalid JSON format in data.json. Ensure it is a valid JSON array or object.");
    console.error(e.message);
    return;
  }
  
  // Extract data array if it's wrapped
  let dataArray = [];
  if (Array.isArray(jsonData)) {
    jsonData.forEach(item => {
      if (item.data && Array.isArray(item.data)) {
        dataArray.push(...item.data);
      } else {
        dataArray.push(item);
      }
    });
  } else if (jsonData.data && Array.isArray(jsonData.data)) {
    dataArray = jsonData.data;
  } else {
    dataArray = [jsonData];
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database();
  
  if (dataArray.length === 0) {
      console.log("JSON array is empty or could not be parsed as an array of items.");
      return;
  }
  
  // Get all unique keys across all objects to ensure dynamic columns capture everything
  const keySet = new Set();
  dataArray.forEach(item => {
    Object.keys(item).forEach(k => keySet.add(k));
  });
  const keys = Array.from(keySet);
  
  if (keys.length === 0) {
      console.log("No valid keys found in the JSON items.");
      return;
  }

  let colDefs = keys.map(k => `"${k}" TEXT`).join(", ");
  db.run(`CREATE TABLE imported_data ( id INTEGER PRIMARY KEY AUTOINCREMENT, ${colDefs} )`);
  
  const placeholders = keys.map(() => "?").join(", ");
  const insertStmt = db.prepare(`INSERT INTO imported_data (${keys.map(k => `"${k}"`).join(", ")}) VALUES (${placeholders})`);
  
  for (const item of dataArray) {
    const values = keys.map(k => {
      const val = item[k];
      if (typeof val === 'object' && val !== null) return JSON.stringify(val);
      return val !== undefined && val !== null ? String(val) : "";
    });
    insertStmt.run(values);
  }
  
  const buffer = Buffer.from(db.export());
  fs.writeFileSync('imported_user_data.sqlite', buffer);
  console.log("Successfully created imported_user_data.sqlite with " + dataArray.length + " records!");
}

importJson().catch(console.error);
