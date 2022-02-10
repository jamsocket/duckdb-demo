import React from 'react'
import './StationsList.css'
import { BarChart } from './BarChartCanvas'
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

    const dayHourQueryReturn = query('tripCountsByDayHour', this.props.metadata.id)
    this.queryReturns.push(dayHourQueryReturn)
    dayHourQueryReturn.promise.then((res) => {
      // eslint-disable-next-line react/no-direct-mutation-state
      this.state.data.tripCountByDay = res.tripCountByDay
      this.setState({ data: this.state.data })
    })
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
function TripsHistogram (props: TripsHistogramProps) {
  const avgHourlyTrips = new Array(24).fill(0)
  for (const dayIdx of Object.keys(props.tripCountByDay)) {
    const hours = props.tripCountByDay[Number(dayIdx) as DayOfWeek]
    for (let i = 0; i < hours.length; i++) avgHourlyTrips[i] += hours[i]
  }

  return <BarChart
    bucketCounts={avgHourlyTrips}
    bucketValueStart={0}
    bucketSize={1}
    barGap={1}
    xScaleExtent={[0, 24]}
    yScaleExtent={[0, props.maxHourlyTrips]}
  />
}
