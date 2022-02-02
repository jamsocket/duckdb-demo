import React from 'react';
import './StationsList.css';
import { query, QueryReturn } from './query'
import type {
  StationId,
  UserType,
  UserBirthYear,
  TripCountByDay,
  StationMetadata,
  DayOfWeek
} from './query'

const STATIONS_DATA_PROPERTY_COUNT = 2
type StationData = {
  tripCountByEndStation?: Record<StationId, number>;
  tripCountByUserType?: Record<UserType, number>
  tripCountByDay?: TripCountByDay;
  tripCountByUserBirthYear?: Record<UserBirthYear, number>;
}

type StationsListProps = {
  stationsMap: Map<StationId, StationMetadata>;
  maxHourlyTrips: number;
  onStationHover: (stationId: StationId | null) => void
}
export function StationsList({ stationsMap, onStationHover, maxHourlyTrips }: StationsListProps) {
  const stations = Array.from(stationsMap.values())
  return (
    <ul className="Stations" onMouseLeave={() => onStationHover(null)}>
      {stations.map(station =>
        <Station
          key={station.id}
          metadata={station}
          maxHourlyTrips={maxHourlyTrips}
          onMouseEnter={() => onStationHover(station.id)}
          onMouseLeave={() => onStationHover(null)}
        />
      )}
    </ul>
  )
}

type StationProps = {
  metadata: StationMetadata;
  maxHourlyTrips: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}
type StationState = { data: StationData }
class Station extends React.Component<StationProps, StationState> {
  state: StationState = { data: {} }
  queryReturns: QueryReturn[] = []
  componentDidMount() {
    const endStationQueryReturn = query('tripCountsByEndStation', this.props.metadata.id)
    this.queryReturns.push(endStationQueryReturn)
    endStationQueryReturn.promise.then((res) => {
      // eslint-disable-next-line react/no-direct-mutation-state
      this.state.data.tripCountByEndStation = res.tripCountByEndStation
      this.setState({ data: this.state.data })
    })
    // -----------------------------------------------------------------------
    // START HERE TOMORROW!

    // FIGURE OUT WHY THE ABOVE QUERY IS NOT RESOLVING!

    // -----------------------------------------------------------------------
    // query('tripCountsByUserType', this.props.metadata.id).then((res) => {
    //   // eslint-disable-next-line react/no-direct-mutation-state
    //   this.state.data.tripCountByUserType = res.tripCountByUserType
    //   this.setState({ data: this.state.data })
    // })

    const dayHourQueryReturn = query('tripCountsByDayHour', this.props.metadata.id)
    this.queryReturns.push(dayHourQueryReturn)
    dayHourQueryReturn.promise.then((res) => {
      // eslint-disable-next-line react/no-direct-mutation-state
      this.state.data.tripCountByDay = res.tripCountByDay
      this.setState({ data: this.state.data })
    })
    // query('tripCountsByUserBirthYear', this.props.metadata.id).then((res) => {
    //   // eslint-disable-next-line react/no-direct-mutation-state
    //   this.state.data.tripCountByUserBirthYear = res.tripCountByUserBirthYear
    //   this.setState({ data: this.state.data })
    // })
  }
  componentWillUnmount() {
    for (const queryReturn of this.queryReturns) queryReturn.cancel()
    this.queryReturns = []
  }
  render() {
    const { metadata, maxHourlyTrips } = this.props
    const { data } = this.state

    let totalTripsFromStation = null
    if (data.tripCountByDay) {
      totalTripsFromStation = Object.values(data.tripCountByDay).reduce(
        (sum, hours) => sum + hours.reduce((s, v) => s + v, 0),
        0
      )
    }

    let percLoaded = 0
    if (data) {
      percLoaded = Object.keys(data).length / STATIONS_DATA_PROPERTY_COUNT
    }

    const isLoaded = percLoaded === 1

    return (
      <li
        className={`${isLoaded ? 'isLoaded' : ''}`}
        onMouseEnter={this.props.onMouseEnter}
        onMouseLeave={this.props.onMouseLeave}
      >
        <div className="StationName">{metadata.name}</div>
        <div className="StationData">
          <div className="TripsVolume">
            {data.tripCountByDay ? <TripsHistogram tripCountByDay={data.tripCountByDay} maxHourlyTrips={maxHourlyTrips} /> : null}
          </div>
          <div className="TripsCount" >{totalTripsFromStation} trips</div>
          <div className="DataLoader">
            <div className="DataLoader-bar" style={{ width: `${percLoaded * 100 | 0}%` }} />
          </div>
        </div>
      </li>
    )
  }
}

type TripsHistogramProps = { tripCountByDay: TripCountByDay; maxHourlyTrips: number }
class TripsHistogram extends React.Component<TripsHistogramProps> {
  canvasRef = React.createRef<HTMLCanvasElement>();
  componentDidMount() {
    const { width, height } = this.canvasRef.current!.getBoundingClientRect()
    this.canvasRef.current!.width = width
    this.canvasRef.current!.height = height
    const avgHourlyTrips = new Array(24).fill(0)
    for (const dayIdx of Object.keys(this.props.tripCountByDay)) {
      const hours = this.props.tripCountByDay[Number(dayIdx) as DayOfWeek]
      for (let i = 0; i < hours.length; i++) avgHourlyTrips[i] += hours[i]
    }
    const maxTripCount = this.props.maxHourlyTrips
    const path = [[0, height]]
    for (let i = 0; i < avgHourlyTrips.length; i++) {
      const tripCount = avgHourlyTrips[i]
      const y = (1 - tripCount / maxTripCount) * height
      const x0 = i * width / 24
      const x1 = (i + 1) * width / 24
      path.push([x0, y], [x1, y])
    }
    path.push([width, height])

    const ctx = this.canvasRef.current!.getContext('2d')!
    ctx.beginPath()
    ctx.moveTo(path[0][0], path[0][1])
    for (const p of path.slice(1)) ctx.lineTo(p[0], p[1])
    ctx.closePath()
    ctx.fillStyle = '#bbb'
    ctx.fill()
  }
  render() {
    return <canvas ref={this.canvasRef} />
  }
}
