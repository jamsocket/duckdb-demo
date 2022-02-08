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

const path = require('path')
const readline = require('readline')
const parquet = require('parquetjs')

import('d3-dsv').then(async ({ csvParseRows }) => {
  const schema = new parquet.ParquetSchema({
    'duration': { type: 'INT32' },
    'start_time': { type: 'TIMESTAMP_MILLIS' },
    'stop_time': { type: 'TIMESTAMP_MILLIS' },
    'start_station_id': { type: 'INT32' },
    'start_station_name': { type: 'UTF8' },
    'start_station_latitude': { type: 'FLOAT' },
    'start_station_longitude': { type: 'FLOAT' },
    'end_station_id': { type: 'INT32' },
    'end_station_name': { type: 'UTF8' },
    'end_station_latitude': { type: 'FLOAT' },
    'end_station_longitude': { type: 'FLOAT' },
    'bike_id': { type: 'INT32' },
    'user_type': { type: 'UTF8' },
    'birth_year': { type: 'INT32' }
  });

  const argv = require('minimist')(process.argv.slice(2))

  const rl = readline.createInterface({ input: process.stdin })

  if (argv.h || argv.help || !argv.out) {
    console.log(
      `Usage: cat PATH_TO_CITIBIKE_TRIPS.csv | ${process.argv0} ${path.basename(process.argv[1])} --out path/to/output.parquet`
    )
    process.exit(0)
  }

  const outFile = path.resolve(process.cwd(), argv.out)
  const writer = await parquet.ParquetWriter.openFile(schema, outFile)

  let rows = 0
  let firstLine = true
  for await (const input of rl) {
    if (!input || firstLine) {
      firstLine = false
      continue
    }
    rows += 1

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
      birth_year
    ] = vals

    await writer.appendRow({
      duration: tripduration,
      start_time: new Date(starttime),
      stop_time: new Date(stoptime),
      start_station_id,
      start_station_name,
      start_station_latitude,
      start_station_longitude,
      end_station_id,
      end_station_name,
      end_station_latitude,
      end_station_longitude,
      bike_id: bikeid,
      user_type: usertype,
      birth_year
    })
  }

  await writer.close()
  console.log('All done! Row count:', rows)
})
