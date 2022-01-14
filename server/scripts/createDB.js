const fs = require('fs')
const path = require('path')
const duckdb = require('duckdb')

const { tableName, importPath, localDBPath, schema } = require('../dbConfig.js')

const dbPath = path.join(__dirname, '..', localDBPath)
const dbDir = path.dirname(dbPath)

fs.mkdirSync(dbDir, { recursive: true })

if (fs.existsSync(dbPath)) {
  console.log(`createDB.js: database already exists: ${dbPath}`)
} else {
  console.log(`createDB.js: creating database: ${dbPath}`)
  const db = new duckdb.Database(dbPath)
  db.run(`CREATE TABLE ${tableName}(${schema.map(pair => pair.join(' ')).join(', ')})`)
  db.run(`COPY ${tableName} FROM '${importPath}' (AUTO_DETECT TRUE)`)
}
