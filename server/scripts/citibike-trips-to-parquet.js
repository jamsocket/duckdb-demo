// expects a comma-separated csv from stdin with the following columns:
// 'tripduration', // 970
// 'starttime', // "2018-01-01 13:50:57.4340"
// 'stoptime', // "2018-01-01 13:50:57.4340"
// 'start station id', // 72
// 'start station name', // "W 52 St & 11 Ave"
// 'start station latitude', // 40.76727216
// 'start station longitude', // -73.99392888
// 'end station id', // 72
// 'end station name', // "W 52 St & 11 Ave"
// 'end station latitude', // 40.76727216
// 'end station longitude', // -73.99392888
// 'bikeid', // 31956
// 'usertype', // "Subscriber"
// 'birth year', // 1992
// 'gender' // 1

// [
//   ['duration', 'INT'],
//   ['start_time', 'TIMESTAMP'],
//   ['stop_time', 'TIMESTAMP'],
//   ['start_station_id', 'INT'],
//   ['start_station_name', 'VARCHAR'],
//   ['start_station_latitude', 'FLOAT4'],
//   ['start_station_longitude', 'FLOAT4'],
//   ['end_station_id', 'INT'],
//   ['end_station_name', 'VARCHAR'],
//   ['end_station_latitude', 'FLOAT4'],
//   ['end_station_longitude', 'FLOAT4'],
//   ['bike_id', 'INT'],
//   ['user_type', 'VARCHAR'],
//   ['birth_year', 'INT'],
//   ['gender', 'INT']
// ]

const path = require('path')
const fs = require('fs')
const readline = require('readline')
import('d3-dsv').then(({ csvParseRows }) => {
  // const { csvParseRows } = require('d3-dsv')
  const argv = require('minimist')(process.argv.slice(2))

  const rl = readline.createInterface({ input: process.stdin })

  if (argv.h || argv.help) {
    console.log(
      `Usage: cat PATH_TO_CITIBIKE_TRIPS.csv | ${process.argv0} ${path.basename(process.argv[1])}`
    )
    process.exit(0)
  }

  let firstLine = true

  rl.on('line', (input) => {
    if (!input || firstLine) {
      firstLine = false
      return
    }
    const vals = csvParseRows(input)[0]
    const [
      tripduration,
      starttime,
      stoptime,
      start_station_id,
      start_station_name,
      start_station_latitude,
      start_station_longitude,
      end_station_id,
      end_station_name,
      end_station_latitude,
      end_station_longitude,
      bikeid,
      usertype,
      birth_year,
      gender
    ] = vals

    // all these should be castable to Number
    if (!Number.isFinite(Number(tripduration))) return
    if (!Number.isFinite(Number(start_station_id))) return
    if (!Number.isFinite(Number(start_station_latitude))) return
    if (!Number.isFinite(Number(start_station_longitude))) return
    if (!Number.isFinite(Number(end_station_id))) return
    if (!Number.isFinite(Number(end_station_latitude))) return
    if (!Number.isFinite(Number(end_station_longitude))) return
    if (!Number.isFinite(Number(bikeid))) return
    if (!Number.isFinite(Number(birth_year))) return
    if (!Number.isFinite(Number(gender))) return

    const hasBadValues = vals.some(v => {
      return Number.isNaN(v) || v === null || v === '' || v === undefined || v === 'NULL'
    })
    if (hasBadValues) return
    process.stdout.write(input)
    process.stdout.write('\n')
  })
})
