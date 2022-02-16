import React from 'react'
import * as d3Geo from 'd3-geo'
import './StationsMap.css'
import { query } from './query'
import type {
  StationId,
  StationMetadata,
  QueryReturn,
  Filters,
  SetFilter
} from './query'

const roads = require('./manhattan-roads.json')

const STATIONS_OPACITY = 0.8
const STATIONS_RADIUS = 4
const CONNECTION_OPACITY = 0.01
const TRIPS_CONNECTION_THRESHOLD = 4

type Connection = { start: StationId; end: StationId; count: number }

type StationsMapState = {
  connections: Connection[];
  connectionsByStart: Map<StationId, Array<{ end: StationId; count: number }>>;
}
type StationsMapProps = {
  stationsMap: Map<StationId, StationMetadata>;
  highlightedStation: StationId | null;
  filters: Filters;
  setFilter: SetFilter;
}
export class StationsMap extends React.Component<StationsMapProps, StationsMapState> {
  queryReturns: QueryReturn[] = [];
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
  state: StationsMapState = {
    connections: [],
    connectionsByStart: new Map()
  };

  componentDidMount() {
    this.setCanvasDimensions()

    this.baseCtx = this.baseCanvasRef.current!.getContext('2d')
    this.connectionsCtx = this.connectionsCanvasRef.current!.getContext('2d')
    this.stationsCtx = this.stationsCanvasRef.current!.getContext('2d')
    this.highlightedCtx = this.highlightedCanvasRef.current!.getContext('2d')

    this.setCanvasOpacities()
    this.drawBaseMap()
    this.drawStations()

    this.fetchData()
  }

  componentDidUpdate(prevProps: StationsMapProps, prevState: StationsMapState) {
    if (this.props.highlightedStation !== prevProps.highlightedStation) {
      this.startRenderLoop()
      this.setCanvasOpacities()
    }
    if (this.props.filters !== prevProps.filters) {
      this.cancelQueries()
      this.fetchData()
    }
    if (this.state.connections !== prevState.connections) {
      this.drawConnections()
    }
  }

  fetchData() {
    const queryReturn = query('tripCountsByStartAndEnd', this.props.filters)
    this.queryReturns.push(queryReturn)
    queryReturn.promise.then((res) => {
      const idx = this.queryReturns.indexOf(queryReturn)
      this.queryReturns.splice(idx, 1)
      const connectionsByStart = new Map()
      for (const c of res) {
        const list = connectionsByStart.get(c.start) || []
        list.push({ end: c.end, count: c.count })
        connectionsByStart.set(c.start, list)
      }
      this.setState({
        connections: res,
        connectionsByStart: connectionsByStart
      })
    })
  }

  setCanvasDimensions() {
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
  }

  setCanvasOpacities() {
    this.baseCanvasRef.current!.style.opacity = '1'
    if (this.props.highlightedStation !== null) {
      this.connectionsCanvasRef.current!.style.opacity = '0.25'
      this.stationsCanvasRef.current!.style.opacity = '0.5'
      this.highlightedCanvasRef.current!.style.opacity = '1'
    } else {
      this.connectionsCanvasRef.current!.style.opacity = '1'
      this.stationsCanvasRef.current!.style.opacity = '1'
      this.highlightedCanvasRef.current!.style.opacity = '0'
    }
  }

  startRenderLoop() {
    this.stopRenderLoop()
    this.rafToken = requestAnimationFrame(this.renderLoop)
  }

  stopRenderLoop() {
    cancelAnimationFrame(this.rafToken)
    this.rafToken = 0
  }

  renderLoop = () => {
    this.drawHighlightedStation(this.props.highlightedStation)
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
    if (!this.stationsCtx) return
    this.stationsCtx.clearRect(0, 0, this.width, this.height)
    for (const [, station] of Array.from(this.props.stationsMap)) {
      const xy = this.projection([station.longitude, station.latitude])
      if (!xy) continue
      this.stationsCtx.beginPath()
      this.stationsCtx.arc(xy[0], xy[1], STATIONS_RADIUS, 0, Math.PI * 2)
      this.stationsCtx.fillStyle = `rgba(135, 206, 250, ${STATIONS_OPACITY})`
      this.stationsCtx.strokeStyle = `rgba(50, 50, 50, 0.5)`
      this.stationsCtx.fill()
      this.stationsCtx.stroke()
    }
  }

  drawConnections() {
    if (!this.connectionsCtx || this.state.connections.length === 0) return
    this.connectionsCtx.clearRect(0, 0, this.width, this.height)
    this.connectionsCtx.globalCompositeOperation = 'lighter'
    this.connectionsCtx.beginPath()
    for (const connection of this.state.connections) {
      const startStation = this.props.stationsMap.get(connection.start)
      const endStation = this.props.stationsMap.get(connection.end)
      if (!startStation || !endStation || connection.count < TRIPS_CONNECTION_THRESHOLD) continue
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

    const station = this.props.stationsMap.get(highlightedStationId)!
    const stationXY = this.projection([station.longitude, station.latitude])
    if (!stationXY) return

    const countsByEndStation = this.state.connectionsByStart.get(highlightedStationId)
    if (countsByEndStation?.length) {
      for (const { end, count } of countsByEndStation) {
        const endStation = this.props.stationsMap.get(end)
        if (!endStation) continue
        const endXY = this.projection([endStation.longitude, endStation.latitude])
        if (!endXY) continue
        this.highlightedCtx.beginPath()
        this.highlightedCtx.moveTo(stationXY[0], stationXY[1])
        this.highlightedCtx.lineTo(endXY[0], endXY[1])
        this.highlightedCtx.lineWidth = count / 10;
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
    this.cancelQueries()
  }

  cancelQueries() {
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
