const path = require('path')
const { Server } = require('socket.io')
const express = require('express')
const duckdb = require('duckdb')
const { tableName } = require('./dbConfig.js')

const { DB_DIR, DB_FILENAME } = require('../constants')
const localDBPath = path.join('.', DB_DIR, DB_FILENAME)

// TODO: pull this into a shared types file
type QueryName = 
  'totalTrips' |
  'tripsTimerange' |
  'maxHourlyTrips' |
  'stationsMetadata' |
  'tripCountsByEndStation' |
  'tripCountsByUserType' |
  'tripCountsByDayHour' |
  'tripCountsByUserBirthYear'

type QueryResponse<ResultT> = {
  queryStr: string;
  queryTime: number;
  queryName: QueryName;
  queryArgs: any[];
  result: ResultT;
}

const port = process.env.SERVER_PORT
const app = express()

const db = new duckdb.Database(localDBPath)

app.use(express.json())
app.use(express.static(path.join(__dirname, '../../client/build')))

const server = app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`)
});

const io = new Server(server)

let connectionsCount = 0
io.on('connection', (socket: any) => {
  const startTime = performance.now()
  const idx = connectionsCount++
  console.log((performance.now() - startTime) | 0, 'CONNECTED TO CLIENT', idx)

  socket.on('query', (queryStr: string, queryName: QueryName, queryArgs: any[]) => {
    console.log((performance.now() - startTime) | 0, 'request for:', queryStr)
    const dbCallPlaced = performance.now()
    db.all(queryStr, (err: any, result: any) => {
      console.log((performance.now() - startTime) | 0, 'db response for:', queryStr)
      if (err) {
        // TODO: send error to client?
        console.warn(`duckdb: error from ${queryStr}`, err)
      }
      const response: QueryResponse<any> = {
        queryStr: queryStr,
        queryArgs: queryArgs,
        queryName: queryName,
        queryTime: performance.now() - dbCallPlaced,
        result: result
      }
      socket.emit('query-response', response)
    })
  });
});

app.get('/', (req: any, res: any) => {
  res.sendFile(path.join(__dirname, '../../client/build/index.html'))
})
