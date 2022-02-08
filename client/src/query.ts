import { io } from 'socket.io-client'

// FIXME: WE SHOULDN'T STORE tablename in two places
const tableName = 'citibike_trips'

type QueryName = 
  'totalTrips' |
  'tripsTimerange' |
  'maxHourlyTrips' |
  'stationsMetadata' |
  'tripCountsByEndStation' |
  'tripCountsByUserType' |
  'tripCountsByDayHour' |
  'tripCountsByUserBirthYear'

type CacheItem = {
  queryStr: string;
  responseTs: number | null;
  isFetching: boolean;
  callbacks: Array<(transformedResponse: any) => void>;
  response: QueryResponse<any> | null;
}

type QueryResponse<ResultT> = {
  queryStr: string;
  queryTime: number;
  result: ResultT;
}

type QueryDef = {
  getQueryStr: (...args: any[]) => string;
  transformResponse: (result: any, ...args: any[]) => any;
}

export type StationId = number;
export type StationMetadata = { id: StationId; latitude: number; longitude: number; name: string }
export type UserType = 'Subscriber' | 'Customer'
export type UserBirthYear = number;
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type HourlyCountsPerDay = number[]
export type TripCountByDay = Record<DayOfWeek, HourlyCountsPerDay>

type TotalTripsDB = { 'count_star()': number }[]
type TripsTimerangeDB = { 'min(start_time)': string; 'max(start_time)': string }[]
type MaxHourlyTripsDB = { 'count_star()': number }[]
type StationMetadataDB = {
  start_station_id: StationId;
  start_station_latitude: number;
  start_station_longitude: number;
  start_station_name: string;
}
type StationsMetadataDB = StationMetadataDB[]
type EndStationsByStartStationDB = { end_station_id: number; 'count_star()': number }[]
type UserTypesByStartStationDB = { user_type: UserType; 'count_star()': number }[]
type HourlyTripCountByStartStationDB = { 'dayofweek(start_time)': DayOfWeek; 'hour(start_time)': number; 'count_star()': number }[]
type UserBirthYearByStartStationDB = { birth_year: number; 'count_star()': number }[]


// @ts-ignore
const socket = (window.socket = io())
const cache = new Map<string, CacheItem>()
const transformedResponseCache = new Map<string, any>()

const queries: Record<QueryName, QueryDef> = {
  totalTrips: {
    getQueryStr: () => `SELECT COUNT(*) FROM ${tableName}`,
    transformResponse: (result: TotalTripsDB) => ({ totalTrips: result[0]['count_star()'] })
  },
  tripsTimerange: {
    getQueryStr: () => `SELECT min(start_time), max(start_time) FROM ${tableName}`,
    transformResponse: (result: TripsTimerangeDB) => ({
      tripsTimerange: [
        result[0]['min(start_time)'],
        result[0]['max(start_time)']
      ]
    })
  },
  maxHourlyTrips: {
    getQueryStr: () => `SELECT COUNT(*) FROM ${tableName} GROUP BY HOUR(start_time), start_station_id`,
    transformResponse: (result: MaxHourlyTripsDB) => {
      let max = 0
      for (const obj of result) max = Math.max(max, obj['count_star()'])
      return { maxHourlyTrips: max }
    }
  },
  stationsMetadata: {
    getQueryStr: () => `SELECT DISTINCT start_station_id, start_station_name, start_station_latitude, start_station_longitude FROM ${tableName}`,
    transformResponse: (result: StationsMetadataDB) => ({
      stations: result.map(station => ({
        id: station['start_station_id'],
        latitude: station['start_station_latitude'],
        longitude: station['start_station_longitude'],
        name: station['start_station_name'],
      }))
    })
  },
  tripCountsByEndStation: {
    getQueryStr: (startStationId: StationId) => `SELECT end_station_id, COUNT(*) FROM ${tableName} WHERE start_station_id=${startStationId} GROUP BY end_station_id`,
    transformResponse: (result: EndStationsByStartStationDB, startStationId: StationId) => {
      const tripCountByEndStation: Record<StationId, number> = {}
      for (const station of result) {
        tripCountByEndStation[station.end_station_id] = station['count_star()']
      }
      return { stationId: startStationId, tripCountByEndStation }
    }
  },
  tripCountsByUserType: {
    getQueryStr: (startStationId: number) => `SELECT user_type, COUNT(*) FROM ${tableName} WHERE start_station_id=${startStationId} GROUP BY user_type`,
    transformResponse: (result: UserTypesByStartStationDB, startStationId: StationId) => {
      const tripCountByUserType: Record<UserType, number> = { Subscriber: 0, Customer: 0 }
      for (const station of result) {
        tripCountByUserType[station.user_type] = station['count_star()']
      }
      return { stationId: startStationId, tripCountByUserType }
    }
  },
  tripCountsByDayHour: {
    getQueryStr: (startStationId: number) => `SELECT DAYOFWEEK(start_time), HOUR(start_time), COUNT(*) FROM ${tableName} WHERE start_station_id=${startStationId} GROUP BY DAYOFWEEK(start_time), HOUR(start_time)`,
    transformResponse: (result: HourlyTripCountByStartStationDB, startStationId: StationId) => {
      const tripCountByDay = {
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
      return { stationId: startStationId, tripCountByDay }
    }
  },
  tripCountsByUserBirthYear: {
    getQueryStr: (startStationId: number) => `SELECT birth_year, COUNT(*) FROM ${tableName} WHERE start_station_id=${startStationId} GROUP BY birth_year`,
    transformResponse: (result: UserBirthYearByStartStationDB, startStationId: StationId) => {
      const tripCountByUserBirthYear: Record<number, number> = {}
      for (const station of result) {
        tripCountByUserBirthYear[station.birth_year] = station['count_star()']
      }
      return { stationId: startStationId, tripCountByUserBirthYear }
    }
  },
}

function createCacheItem (queryStr: string): CacheItem {
  return {
    queryStr: queryStr,
    responseTs: null,
    isFetching: false,
    callbacks: [],
    response: null
  }
}

socket.on('query-response', (response: QueryResponse<any>) => {
  if (!cache.has(response.queryStr)) cache.set(response.queryStr, createCacheItem(response.queryStr))
  const cacheitem = cache.get(response.queryStr)!
  cacheitem.responseTs = Date.now()
  cacheitem.response = response
  if (!cacheitem.isFetching) {
    // what to do with callbacks? for now, just ignore them
    return
  }
  cacheitem.isFetching = false
  if (cacheitem.callbacks.length) {
    for (const cb of cacheitem.callbacks) {
      cb(cacheitem.response)
    }
    cacheitem.callbacks.length = 0
  }
})

export type QueryReturn = { promise: Promise<any>, cancel: () => void }
export function query (queryName: QueryName, ...queryArgs: Array<any>): QueryReturn {
  let isCancelled = false
  return {
    promise: new Promise((resolve, reject) => {
      const queryStr = queries[queryName].getQueryStr(...queryArgs)
      if (!cache.has(queryStr)) cache.set(queryStr, createCacheItem(queryStr))
      const cacheitem = cache.get(queryStr)!
      if (cacheitem.isFetching === false && cacheitem.response !== null) {
        let transformedResponse = transformedResponseCache.get(queryStr) || queries[queryName].transformResponse(cacheitem.response.result, ...queryArgs)
        transformedResponseCache.set(queryStr, transformedResponse)
        resolve(transformedResponse)
        return
      }
  
      cacheitem.callbacks.push((response) => {
        let transformedResponse = transformedResponseCache.get(queryStr) || queries[queryName].transformResponse(response.result, ...queryArgs)
        transformedResponseCache.set(queryStr, transformedResponse)
        if (!isCancelled) resolve(transformedResponse)
      })
      if (cacheitem.isFetching) {
        return
      }
      cacheitem.isFetching = true
      socket.emit('query', queryStr)
    }),
    cancel: () => isCancelled = true
  }
}
