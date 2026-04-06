const initSqlJs = require('sql.js');
const fs = require('fs');

async function createDb() {
  if (fs.existsSync('nested_mock.sqlite')) {
    fs.unlinkSync('nested_mock.sqlite');
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE complex_data (
      _id TEXT PRIMARY KEY,
      seriesName TEXT,
      description TEXT,
      totalTests INTEGER,
      price REAL,
      itemType TEXT,
      status TEXT,
      studentsEnrolled TEXT,
      creator TEXT,
      attachments TEXT,
      mockTests TEXT,
      metadata TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      __v INTEGER
    )
  `);

  db.run(`
    INSERT INTO complex_data (_id, seriesName, description, totalTests, price, itemType, status, studentsEnrolled, creator, attachments, mockTests, metadata, createdAt, updatedAt, __v)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    "ObjectId('694d6786ce5746c0bd211771')",
    "Junior Assistant JKSSB Mock Test",
    "Junior Assistant JKSSB Sectional and Full Length Test",
    14,
    99.00,
    "mocktest",
    "published",
    JSON.stringify([
      "ObjectId('user_9302_alpha')", 
      "ObjectId('user_1194_beta')", 
      "ObjectId('user_8821_gamma')"
    ]),
    "ObjectId('694d636bce5746c0bd211722')",
    JSON.stringify([]),
    JSON.stringify([
      { 
        testId: "T001", 
        name: "Full Length Test 1", 
        durationMinutes: 120, 
        totalQuestions: 100,
        tags: ["full-length", "mandatory"],
        isActive: true
      },
      { 
        testId: "T002", 
        name: "Sectional Math", 
        durationMinutes: 60, 
        totalQuestions: 50,
        tags: ["sectional", "math", "hard"],
        metadata: {
          lastEditedBy: "admin",
          approved: false,
          topics: [
            { name: "Algebra", weight: 0.4 },
            { name: "Geometry", weight: 0.6 }
          ]
        },
        isActive: true 
      }
    ]),
    JSON.stringify({
      views: 1045,
      likes: 230,
      tags: ["jkssb", "clerk", "state-exams"]
    }),
    "2025-12-25T16:34:14.938Z",
    "2026-04-06T16:35:26.997Z",
    0
  ]);

  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync('nested_mock.sqlite', buffer);
  
  console.log("Created nested_mock.sqlite with complex JSON arrays/objects mock data.");
}

createDb();
