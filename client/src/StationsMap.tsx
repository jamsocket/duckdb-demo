import React from 'react'
import * as d3Geo from 'd3-geo'
import './StationsMap.css'
import type {
  StationId,
  UserType,
  UserBirthYear,
  TripCountByDay,
  StationMetadata,
  EndStationsByStartStationResponse,
  UserTypesByStartStationResponse,
  HourlyTripCountByStartStationResponse,
  UserBirthYearByStartStationResponse
} from '../../server/api.types'

const roads = require('./manhattan-roads')

const STATIONS_DATA_PROPERTY_COUNT = 4
const STATIONS_OPACITY = 0.7
const STATIONS_RADIUS = 3
const TRANSITION_RATE = 0.2
const CONNECTION_OPACITY = 0.01
const TRIPS_CONNECTION_THRESHOLD = 4

type StationData = {
  tripCountByEndStation?: Record<StationId, number>;
  tripCountByUserType?: Record<UserType, number>
  tripCountByDay?: TripCountByDay;
  tripCountByUserBirthYear?: Record<UserBirthYear, number>;
}

type StationPercRendered = number
type Connection = [StationId, StationId]

let responseCount = 0

type StationsMapProps = { socket: any; stations: StationMetadata[] }
export class StationsMap extends React.Component<StationsMapProps> {
  responseCount = 0;
  // @ts-ignore
  stationsDataMap: Map<StationId, StationData> = (window.stationsDataMap = new Map());
  stationsPercRendered: Map<StationId, StationPercRendered> = new Map();
  stationsMetadataMap: Map<StationId, StationMetadata> = new Map();
  containerRef = React.createRef<HTMLDivElement>();
  baseCanvasRef = React.createRef<HTMLCanvasElement>();
  connectionsCanvasRef = React.createRef<HTMLCanvasElement>();
  stationsCanvasRef = React.createRef<HTMLCanvasElement>();
  baseCtx: CanvasRenderingContext2D | null = null;
  connectionsCtx: CanvasRenderingContext2D | null = null;
  stationsCtx: CanvasRenderingContext2D | null = null;
  projection = d3Geo.geoMercator().center([-73.96, 40.79]).scale(330000);
  width = 0;
  height = 0;
  rafToken = 0;
  connectionsSinceLastFrame: Connection[] = [];
  isDoneRenderingStations = false;

  componentDidMount() {
    const { width, height } = this.containerRef.current!.getBoundingClientRect()

    this.width = width
    this.height = height

    this.baseCanvasRef.current!.width = width
    this.baseCanvasRef.current!.height = height
    this.connectionsCanvasRef.current!.width = width
    this.connectionsCanvasRef.current!.height = height
    this.stationsCanvasRef.current!.width = width
    this.stationsCanvasRef.current!.height = height

    this.baseCtx = this.baseCanvasRef.current!.getContext('2d')
    this.connectionsCtx = this.connectionsCanvasRef.current!.getContext('2d')
    this.stationsCtx = this.stationsCanvasRef.current!.getContext('2d')

    for (const station of this.props.stations) {
      this.stationsMetadataMap.set(station.id, station)
      this.stationsPercRendered.set(station.id, 0)
    }

    this.drawBaseMap()
    this.startRenderLoop()

    const socket = this.props.socket
    const stationsDataMap = this.stationsDataMap

    for (const station of this.props.stations) {
      socket.emit('station-stats', station.id)
    }

    socket.on('end-stations-by-start-station', (res: EndStationsByStartStationResponse) => {
      console.log('responseCount', responseCount++)
      if (!stationsDataMap.has(res.stationId)) stationsDataMap.set(res.stationId, {})
      const data = stationsDataMap.get(res.stationId)!
      data.tripCountByEndStation = res.tripCountByEndStation
      for (const endStationIdStr of Object.keys(data.tripCountByEndStation)) {
        const endStationId = Number(endStationIdStr)
        const tripCount = data.tripCountByEndStation[endStationId]
        if (tripCount <= TRIPS_CONNECTION_THRESHOLD) continue
        this.connectionsSinceLastFrame.push([res.stationId, endStationId])
      }
    })
    socket.on('user-types-by-start-station', (res: UserTypesByStartStationResponse) => {
      console.log('responseCount', responseCount++)
      if (!stationsDataMap.has(res.stationId)) stationsDataMap.set(res.stationId, {})
      const data = stationsDataMap.get(res.stationId)!
      data.tripCountByUserType = res.tripCountByUserType
    })
    socket.on('hourly-trip-count-by-start-station', (res: HourlyTripCountByStartStationResponse) => {
      console.log('responseCount', responseCount++)
      if (!stationsDataMap.has(res.stationId)) stationsDataMap.set(res.stationId, {})
      const data = stationsDataMap.get(res.stationId)!
      data.tripCountByDay = res.tripCountByDay
    })
    socket.on('user-birth-year-by-start-station', (res: UserBirthYearByStartStationResponse) => {
      console.log('responseCount', responseCount++)
      if (!stationsDataMap.has(res.stationId)) stationsDataMap.set(res.stationId, {})
      const data = stationsDataMap.get(res.stationId)!
      data.tripCountByUserBirthYear = res.tripCountByUserBirthYear
    })
  }

  startRenderLoop() {
    this.rafToken = requestAnimationFrame(this.renderLoop)
  }

  stopRenderLoop() {
    cancelAnimationFrame(this.rafToken)
    this.rafToken = 0
  }

  renderLoop = () => {
    this.drawStations()
    this.drawNewConnections(this.connectionsSinceLastFrame)
    this.connectionsSinceLastFrame.length = 0
    this.rafToken = requestAnimationFrame(this.renderLoop)
  }

  drawBaseMap() {
    if (!this.baseCtx) return
    const path = d3Geo.geoPath().projection(this.projection).context(this.baseCtx)
    path(roads)
    this.baseCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
    this.baseCtx.stroke()
  }

  drawStations() {
    if (!this.stationsCtx || this.isDoneRenderingStations) return
    this.stationsCtx.clearRect(0, 0, this.width, this.height)
    this.isDoneRenderingStations = true
    for (const station of this.props.stations) {
      const data = this.stationsDataMap.get(station.id)
      let percLoaded = 0
      if (data) percLoaded = Object.keys(data).length / STATIONS_DATA_PROPERTY_COUNT
      const xy = this.projection([station.longitude, station.latitude])
      if (!xy) continue
      let percRendered = this.stationsPercRendered.get(station.id)!
      percRendered += (percLoaded - percRendered) * TRANSITION_RATE
      if (Math.abs(percLoaded - percRendered) < 0.01) percRendered = percLoaded
      this.stationsPercRendered.set(station.id, percRendered)
      const opacity = STATIONS_OPACITY * percRendered
      const radius = STATIONS_RADIUS * percRendered
      if (percRendered < 1) this.isDoneRenderingStations = false

      this.stationsCtx.beginPath()
      this.stationsCtx.arc(xy[0], xy[1], radius, 0, Math.PI * 2)
      this.stationsCtx.fillStyle = `rgba(135, 206, 250, ${opacity})`
      this.stationsCtx.strokeStyle = `rgba(50, 50, 50, 0.5)`
      this.stationsCtx.fill()
      this.stationsCtx.stroke()
    }
  }

  drawNewConnections(newConnections: Connection[]) {
    if (!this.connectionsCtx || newConnections.length === 0) return
    this.connectionsCtx.globalCompositeOperation = 'lighter'
    this.connectionsCtx.beginPath()
    for (const connection of newConnections) {
      const startStation = this.stationsMetadataMap.get(connection[0])
      const endStation = this.stationsMetadataMap.get(connection[1])
      if (!startStation || !endStation) continue
      const startXY = this.projection([startStation.longitude, startStation.latitude])
      const endXY = this.projection([endStation.longitude, endStation.latitude])
      if (!startXY || !endXY) continue
      this.connectionsCtx.moveTo(startXY[0], startXY[1])
      this.connectionsCtx.lineTo(endXY[0], endXY[1])
    }
    this.connectionsCtx.lineWidth = 1
    this.connectionsCtx.strokeStyle = `rgba(135, 206, 250, ${CONNECTION_OPACITY})`
    this.connectionsCtx.stroke()
  }

  componentWillUnmount() {
    this.stopRenderLoop()
    const socket = this.props.socket
    socket.off('end-stations-by-start-station')
    socket.off('user-types-by-start-station')
    socket.off('hourly-trip-count-by-start-station')
    socket.off('user-birth-year-by-start-station')
  }
  render() {
    return (
      <div className="StationsMap" ref={this.containerRef}>
        <canvas ref={this.baseCanvasRef} />
        <canvas ref={this.connectionsCanvasRef} />
        <canvas ref={this.stationsCanvasRef} />
      </div>
    )
  }
}