const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const duckdb = require('duckdb')

const { tableName, importPath, localDBPath, schema, dataOrigin } = require('../dbConfig.js')

const dbPath = path.join(__dirname, '..', localDBPath)
const dbDir = path.dirname(dbPath)
const dataPath = path.join(__dirname, '..', importPath)
const dataDir = path.dirname(dataPath)

fs.mkdirSync(dbDir, { recursive: true })
fs.mkdirSync(dataDir, { recursive: true })

if (fs.existsSync(dbPath)) {
  console.log(`build-db.js: database already exists: ${dbPath}`)
} else {
  if (fs.existsSync(dataPath)) {
    console.log(`build-db.js: data already exists: ${dataPath}`)
    createDatabase()
  } else {
    const dataFilename = path.basename(dataPath)
    const dataUri = path.join(dataOrigin, dataFilename)
    console.log(`build-db.js: data not found at path: ${dataPath}`)
    console.log(`build-db.js: downloading data from ${dataUri}`)
    exec(`curl ${dataUri} > ${dataPath}`, (err) => {
      if (err) console.error('build-db.js: curl error fetching data:', err)
      createDatabase()
    })
  }
}

function createDatabase() {
  console.log(`build-db.js: creating database: ${dbPath}`)
  const db = new duckdb.Database(dbPath)
  db.run(`CREATE TABLE ${tableName}(${schema.map(pair => pair.join(' ')).join(', ')})`, (err) => {
    if (err) console.error('build-db.js: duckdb error creating table:', err)
    db.run(`COPY ${tableName} FROM '${importPath}' (AUTO_DETECT TRUE)`, (err) => {
      if (err) console.error('build-db.js: duckdb error copying data to table:', err)
      console.log(`build-db.js: database created at: ${dbPath}`)
    })
  })
}
