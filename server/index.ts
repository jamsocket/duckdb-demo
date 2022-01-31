const path = require('path')
const { Server } = require('socket.io')
const express = require('express')
const duckdb = require('duckdb')
const { localDBPath, tableName } = require('./dbConfig.js')

import type {
  StationId,
  UserType,
  TripCountByDay,
  TotalTripsResponse,
  MaxHourlyTripsResponse,
  StationsMetadataResponse,
  EndStationsByStartStationResponse,
  UserTypesByStartStationResponse,
  HourlyTripCountByStartStationResponse,
  UserBirthYearByStartStationResponse,
  // types for what we expect to be returned from DuckDB
  TotalTripsDB,
  MaxHourlyTripsDB,
  StationsMetadataDB,
  EndStationsByStartStationDB,
  UserTypesByStartStationDB,
  HourlyTripCountByStartStationDB,
  UserBirthYearByStartStationDB,
  TripsTimerangeDB,
  TripsTimerangeResponse
} from './api.types'

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

  socket.on('total-trips', () => {
    console.log((performance.now() - startTime) | 0, 'Total Trips Request')
    const dbCallPlaced = performance.now()
    db.all(`SELECT COUNT(*) FROM ${tableName}`, (err: any, result: TotalTripsDB) => {
      console.log((performance.now() - startTime) | 0, 'Total Trips DB response')
      const response: TotalTripsResponse = {
        totalTrips: result[0]['count_star()'],
        queryTime: performance.now() - dbCallPlaced
      }
      socket.emit('total-trips', response)
    })
  });

  socket.on('trips-timerange', () => {
    console.log((performance.now() - startTime) | 0, 'Trips Timerange Request')
    const dbCallPlaced = performance.now()
    db.all(`SELECT min(start_time), max(start_time) FROM ${tableName}`, (err: any, result: TripsTimerangeDB) => {
      console.log((performance.now() - startTime) | 0, 'Trips Timerange DB response')
      const response: TripsTimerangeResponse = {
        tripsTimerange: [
          result[0]['min(start_time)'].toISOString(),
          result[0]['max(start_time)'].toISOString()
        ],
        queryTime: performance.now() - dbCallPlaced
      }
      socket.emit('trips-timerange', response)
    })
  });

  socket.on('max-hourly-trips', () => {
    console.log((performance.now() - startTime) | 0, 'Max Hourly Trips Request')
    const dbCallPlaced = performance.now()
    db.all(`SELECT COUNT(*) FROM ${tableName} GROUP BY HOUR(start_time), start_station_id`, (err: any, result: MaxHourlyTripsDB) => {
      console.log((performance.now() - startTime) | 0, 'Max Hourly Trips DB response')
      let max = 0;
      for (const obj of result) max = Math.max(max, obj['count_star()'])
      const response: MaxHourlyTripsResponse = {
        maxHourlyTrips: max,
        queryTime: performance.now() - dbCallPlaced
      }
      socket.emit('max-hourly-trips', response)
    })
  });

  socket.on('stations-metadata', () => {
    console.log((performance.now() - startTime) | 0, 'Stations Metadata Request')
    const dbCallPlaced = performance.now()
    db.all(`SELECT DISTINCT start_station_id, start_station_name, start_station_latitude, start_station_longitude FROM ${tableName}`, (err: any, result: StationsMetadataDB) => {
      console.log((performance.now() - startTime) | 0, 'Stations Metadata DB response')
      const response: StationsMetadataResponse = {
        stations: result.map(station => ({
          id: station['start_station_id'],
          latitude: station['start_station_latitude'],
          longitude: station['start_station_longitude'],
          name: station['start_station_name'],
        })),
        queryTime: performance.now() - dbCallPlaced
      }
      socket.emit('stations-metadata', response)
    })
  });

  socket.on('station-stats', (stationId: StationId) => {
    console.log((performance.now() - startTime) | 0, 'Stations Stats Request for station:', stationId)
    const dbCallPlaced = performance.now()
    // 1. get counts from stationId to all other stations
    db.all(`SELECT end_station_id, COUNT(*) FROM ${tableName} WHERE start_station_id=${stationId} GROUP BY end_station_id`, (err: any, result: EndStationsByStartStationDB) => {
      console.log((performance.now() - startTime) | 0, 'End stations DB response for station:', stationId)
      const tripCountByEndStation: Record<StationId, number> = {}
      for (const station of result) {
        tripCountByEndStation[station.end_station_id] = station['count_star()']
      }
      const response: EndStationsByStartStationResponse = {
        stationId,
        tripCountByEndStation,
        queryTime: performance.now() - dbCallPlaced
      }
      socket.emit('end-stations-by-start-station', response)
    })
    // 2. get user type counts for trips from stationId
    db.all(`SELECT user_type, COUNT(*) FROM ${tableName} WHERE start_station_id=${stationId} GROUP BY user_type`, (err: any, result: UserTypesByStartStationDB) => {
      console.log((performance.now() - startTime) | 0, 'User types DB response for station:', stationId)
      const tripCountByUserType: Record<UserType, number> = { Subscriber: 0, Customer: 0 }
      for (const station of result) {
        tripCountByUserType[station.user_type] = station['count_star()']
      }
      const response: UserTypesByStartStationResponse = {
        stationId,
        tripCountByUserType,
        queryTime: performance.now() - dbCallPlaced
      }
      socket.emit('user-types-by-start-station', response)
    })
    // 3. TODO: get trip duration distribution for trips from stationId
    // 4. get trip start time timeseries for trips from stationId
    db.all(`SELECT DAYOFWEEK(start_time), HOUR(start_time), COUNT(*) FROM ${tableName} WHERE start_station_id=${stationId} GROUP BY DAYOFWEEK(start_time), HOUR(start_time)`, (err: any, result: HourlyTripCountByStartStationDB) => {
      console.log((performance.now() - startTime) | 0, 'Hourly traffic DB response for station:', stationId)
      const tripCountByDay: TripCountByDay = {
        0: new Array(24).fill(0),
        1: new Array(24).fill(0),
        2: new Array(24).fill(0),
        3: new Array(24).fill(0),
        4: new Array(24).fill(0),
        5: new Array(24).fill(0),
        6: new Array(24).fill(0)
      }
      for (const station of result) {
        const dayOfWeek = station['dayofweek(start_time)']
        const hourOfDay = station['hour(start_time)']
        const count = station['count_star()']
        tripCountByDay[dayOfWeek][hourOfDay] = count
      }
      const response: HourlyTripCountByStartStationResponse = {
        stationId,
        tripCountByDay,
        queryTime: performance.now() - dbCallPlaced
      }
      socket.emit('hourly-trip-count-by-start-station', response)
    })

    // 5. get birth year distribution for trips from stationId
    db.all(`SELECT birth_year, COUNT(*) FROM ${tableName} WHERE start_station_id=${stationId} GROUP BY birth_year`, (err: any, result: UserBirthYearByStartStationDB) => {
      console.log((performance.now() - startTime) | 0, 'Birth year DB response for station:', stationId)
      const tripCountByUserBirthYear: Record<number, number> = {}
      for (const station of result) {
        tripCountByUserBirthYear[station.birth_year] = station['count_star()']
      }
      const response: UserBirthYearByStartStationResponse = {
        stationId,
        tripCountByUserBirthYear,
        queryTime: performance.now() - dbCallPlaced
      }
      socket.emit('user-birth-year-by-start-station', response)
    })
  })
});

app.get('/', (req: any, res: any) => {
  res.sendFile(path.join(__dirname, '../../client/build/index.html'))
})
