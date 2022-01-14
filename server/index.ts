const path = require('path')
const { Server } = require('socket.io')
const express = require('express')
const duckdb = require('duckdb')
const { localDBPath, tableName } = require('../dbConfig.js')

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
  const idx = connectionsCount++
  console.log('CONNECTED TO CLIENT', idx)
  socket.on('total-trips', () => {
    db.all(`SELECT COUNT(*) FROM ${tableName}`, (err: any, result: any) => {
      const totalTrips = result[0]['count_star()']
      socket.emit('total-trips', { totalTrips })
    })
  });
  
  socket.on('stations-metadata', () => {
    db.all(`SELECT DISTINCT start_station_id, start_station_name, start_station_latitude, start_station_longitude FROM ${tableName}`, (err: any, result: any) => {
      socket.emit('stations-metadata', result)
    })
  });
  
  socket.on('station-stats', (stationID: number) => {
    console.log('station stats requested:', stationID)

    // 1. get counts from stationID to all other stations
    db.all(`SELECT end_station_id, COUNT(*) FROM ${tableName} WHERE start_station_id=${stationID} GROUP BY end_station_id`, (err: any, result: any) => {
      socket.emit('end-stations-by-start-station', { stationID, result })
    })
    // 2. get user type counts for trips from stationID
    db.all(`SELECT user_type, COUNT(*) FROM ${tableName} WHERE start_station_id=${stationID} GROUP BY user_type`, (err: any, result: any) => {
      socket.emit('user-types-by-start-station', { stationID, result })
    })
    // 3. TODO: get trip duration distribution for trips from stationID
    // 4. get trip start time timeseries for trips from stationID
    db.all(`SELECT DAYOFWEEK(start_time), HOUR(start_time), COUNT(*) FROM ${tableName} WHERE start_station_id=${stationID} GROUP BY DAYOFWEEK(start_time), HOUR(start_time)`, (err: any, result: any) => {
      socket.emit('hourly-trip-count-by-start-station', { stationID, result })
    })
  
    // 5. get birth year distribution for trips from stationID
    db.all(`SELECT birth_year, COUNT(*) FROM ${tableName} WHERE start_station_id=${stationID} GROUP BY birth_year`, (err: any, result: any) => {
      socket.emit('user-birth-year-by-start-station', { stationID, result })
    })
  })
});

app.get('/', (req: any, res: any) => {
  res.sendFile(path.join(__dirname, '../../client/build/index.html'))
})
