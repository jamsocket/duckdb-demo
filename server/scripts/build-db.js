const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const duckdb = require('duckdb')
const { DB_DIR, DB_FILENAME } = require('../constants')

const { tableName, importPath, schema } = require('../dbConfig.js')

const dbPath = path.join(__dirname, '..', DB_DIR, DB_FILENAME)
const dbDir = path.dirname(dbPath)
const dataFilename = path.basename(importPath)
const dataPath = isUri(importPath) ? path.join(__dirname, '..', DB_DIR, dataFilename) : importPath
const dataDir = path.dirname(dataPath)

fs.mkdirSync(dbDir, { recursive: true })
fs.mkdirSync(dataDir, { recursive: true })

if (fs.existsSync(dbPath)) {
  console.log(`build-db.js: database already exists: ${dbPath}`)
} else {
  fetchData(importPath, dataPath).then(createDatabase)
}

function fetchData(dataUri, dataPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dataPath)) {
      console.log(`build-db.js: data found at path: ${dataPath}`)
      resolve()
    } else {
      console.log(`build-db.js: data not found at path: ${dataPath}`)
      if (!isUri(dataUri)) {
        console.warn(`build-db.js: unable to cURL importPath: ${importPath}`)
        reject()
        return
      }
      console.log(`build-db.js: downloading data from ${dataUri}`)
      exec(`curl ${dataUri} > ${dataPath}`, (err, stdout, stderr) => {
        if (err) {
          console.warn('build-db.js: curl error fetching data:', err)
          reject(err)
          return
        }
        console.log('stdout:', stdout)
        console.log('stderr:', stderr)
        resolve()
      })
    }
  })
}

function createDatabase() {
  console.log(`build-db.js: creating database: ${dbPath}`)
  const db = new duckdb.Database(dbPath)
  db.run(`CREATE TABLE ${tableName}(${schema.map(pair => pair.join(' ')).join(', ')})`, (err) => {
    if (err) console.error('build-db.js: duckdb error creating table:', err)
    db.run(`COPY ${tableName} FROM '${dataPath}' (AUTO_DETECT TRUE)`, (err) => {
      if (err) console.error('build-db.js: duckdb error copying data to table:', err)
      console.log(`build-db.js: database created at: ${dbPath}`)
    })
  })
}

function isUri(uri) {
  return uri.search(/https?:\/\//) === 0
}
