import React from 'react'
import * as d3Geo from 'd3-geo'
import './StationsMap.css'
import { query, QueryReturn } from './query'
import type {
  StationId,
  UserType,
  UserBirthYear,
  TripCountByDay,
  StationMetadata
} from './query'

const roads = require('./manhattan-roads')

const STATIONS_DATA_PROPERTY_COUNT = 1
const STATIONS_OPACITY = 0.8
const STATIONS_RADIUS = 4
const TRANSITION_RATE = 0.15
const CONNECTION_OPACITY = 0.005
const TRIPS_CONNECTION_THRESHOLD = 4

type StationData = {
  tripCountByEndStation?: Record<StationId, number>;
  tripCountByUserType?: Record<UserType, number>
  tripCountByDay?: TripCountByDay;
  tripCountByUserBirthYear?: Record<UserBirthYear, number>;
}

type StationPercRendered = number
type Connection = [StationId, StationId]

type StationsMapProps = {
  stations: StationMetadata[];
  highlightedStation: StationId | null;
}
export class StationsMap extends React.Component<StationsMapProps> {
  responseCount = 0;
  queryReturns: QueryReturn[] = [];
  // @ts-ignore
  stationsDataMap: Map<StationId, StationData> = (window.stationsDataMap = new Map());
  stationsPercRendered: Map<StationId, StationPercRendered> = new Map();
  stationsMetadataMap: Map<StationId, StationMetadata> = new Map();
  containerRef = React.createRef<HTMLDivElement>();
  baseCanvasRef = React.createRef<HTMLCanvasElement>();
  connectionsCanvasRef = React.createRef<HTMLCanvasElement>();
  stationsCanvasRef = React.createRef<HTMLCanvasElement>();
  highlightedCanvasRef = React.createRef<HTMLCanvasElement>();
  baseCtx: CanvasRenderingContext2D | null = null;
  connectionsCtx: CanvasRenderingContext2D | null = null;
  stationsCtx: CanvasRenderingContext2D | null = null;
  highlightedCtx: CanvasRenderingContext2D | null = null;
  projection = d3Geo.geoMercator().center([-73.96, 40.77]).scale(320000);
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
    this.highlightedCanvasRef.current!.width = width
    this.highlightedCanvasRef.current!.height = height

    this.baseCtx = this.baseCanvasRef.current!.getContext('2d')
    this.connectionsCtx = this.connectionsCanvasRef.current!.getContext('2d')
    this.stationsCtx = this.stationsCanvasRef.current!.getContext('2d')
    this.highlightedCtx = this.highlightedCanvasRef.current!.getContext('2d')

    for (const station of this.props.stations) {
      this.stationsMetadataMap.set(station.id, station)
      this.stationsPercRendered.set(station.id, 0)
    }

    const highlightedStation = this.isDoneRenderingStations ? this.props.highlightedStation : null

    this.baseCanvasRef.current!.style.opacity = '1'
    if (highlightedStation) {
      this.connectionsCanvasRef.current!.style.opacity = '0.5'
      this.stationsCanvasRef.current!.style.opacity = '0.5'
      this.highlightedCanvasRef.current!.style.opacity = '1'
    } else {
      this.connectionsCanvasRef.current!.style.opacity = '1'
      this.stationsCanvasRef.current!.style.opacity = '1'
      this.highlightedCanvasRef.current!.style.opacity = '0'
    }

    this.drawBaseMap()
    this.startRenderLoop()

    const stationsDataMap = this.stationsDataMap

    for (const station of this.props.stations) {
      // wrapping this in a timeout so other parts of the application have a chance to send their queries, too
      setTimeout(() => {
        const queryReturn = query('tripCountsByEndStation', station.id)
        this.queryReturns.push(queryReturn)
        queryReturn.promise.then((res) => {
          if (!stationsDataMap.has(res.stationId)) stationsDataMap.set(res.stationId, {})
          const data = stationsDataMap.get(res.stationId)!
          data.tripCountByEndStation = res.tripCountByEndStation
          for (const endStationIdStr of Object.keys(data.tripCountByEndStation!)) {
            const endStationId = Number(endStationIdStr)
            const tripCount = data.tripCountByEndStation![endStationId]
            if (tripCount <= TRIPS_CONNECTION_THRESHOLD) continue
            this.connectionsSinceLastFrame.push([res.stationId, endStationId])
          }
        })
        // query('tripCountsByUserType', station.id).then((res) => {
        //   if (!stationsDataMap.has(res.stationId)) stationsDataMap.set(res.stationId, {})
        //   const data = stationsDataMap.get(res.stationId)!
        //   data.tripCountByUserType = res.tripCountByUserType
        // })
        // query('tripCountsByDayHour', station.id).then((res) => {
        //   if (!stationsDataMap.has(res.stationId)) stationsDataMap.set(res.stationId, {})
        //   const data = stationsDataMap.get(res.stationId)!
        //   data.tripCountByDay = res.tripCountByDay
        // })
        // query('tripCountsByUserBirthYear', station.id).then((res) => {
        //   if (!stationsDataMap.has(res.stationId)) stationsDataMap.set(res.stationId, {})
        //   const data = stationsDataMap.get(res.stationId)!
        //   data.tripCountByUserBirthYear = res.tripCountByUserBirthYear
        // })
      }, 0)
    }
  }

  componentDidUpdate(prevProps: StationsMapProps) {
    if (this.props.highlightedStation !== prevProps.highlightedStation) {
      const highlightedStation = this.isDoneRenderingStations ? this.props.highlightedStation : null
      if (highlightedStation !== null) {
        this.connectionsCanvasRef.current!.style.opacity = '0.25'
        this.stationsCanvasRef.current!.style.opacity = '0.5'
        this.highlightedCanvasRef.current!.style.opacity = '1'
      } else {
        this.connectionsCanvasRef.current!.style.opacity = '1'
        this.stationsCanvasRef.current!.style.opacity = '1'
        this.highlightedCanvasRef.current!.style.opacity = '0'
      }
    }
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
    const highlightedStation = this.isDoneRenderingStations ? this.props.highlightedStation : null
    this.drawHighlightedStation(highlightedStation)
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

  drawHighlightedStation(highlightedStationId: StationId | null) {
    if (!this.highlightedCtx || highlightedStationId === null) return
    this.highlightedCtx.clearRect(0, 0, this.width, this.height)

    const station = this.stationsMetadataMap.get(highlightedStationId)!
    const stationXY = this.projection([station.longitude, station.latitude])
    if (!stationXY) return

    const data = this.stationsDataMap.get(highlightedStationId)
    if (data?.tripCountByEndStation) {
      for (const endStationIdStr of Object.keys(data.tripCountByEndStation)) {
        const endStationId = Number(endStationIdStr)
        const endStation = this.stationsMetadataMap.get(endStationId)
        const tripCount = data.tripCountByEndStation[endStationId]
        if (!endStation) continue
        const endXY = this.projection([endStation.longitude, endStation.latitude])
        if (!endXY) continue
        this.highlightedCtx.beginPath()
        this.highlightedCtx.moveTo(stationXY[0], stationXY[1])
        this.highlightedCtx.lineTo(endXY[0], endXY[1])
        this.highlightedCtx.lineWidth = tripCount / 10;
        this.highlightedCtx.strokeStyle = `rgba(230, 230, 250, 0.6)`
        this.highlightedCtx.stroke()
      }
    }

    this.highlightedCtx.beginPath()
    this.highlightedCtx.arc(stationXY[0], stationXY[1], STATIONS_RADIUS * 2, 0, Math.PI * 2)
    this.highlightedCtx.fillStyle = `rgba(255, 127, 80, 1)`
    this.highlightedCtx.strokeStyle = `rgba(50, 50, 50, 0.5)`
    this.highlightedCtx.fill()
    this.highlightedCtx.stroke()
  }

  componentWillUnmount() {
    this.stopRenderLoop()
    for (const queryReturn of this.queryReturns) queryReturn.cancel()
    this.queryReturns = []
  }
  render() {
    return (
      <div className="StationsMap" ref={this.containerRef}>
        <canvas ref={this.baseCanvasRef} />
        <canvas ref={this.connectionsCanvasRef} />
        <canvas ref={this.stationsCanvasRef} />
        <canvas ref={this.highlightedCanvasRef} />
      </div>
    )
  }
}
