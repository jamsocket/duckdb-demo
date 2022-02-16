import React from 'react'
import './StationsList.css'
import { BarChart } from './BarChartCanvas'
import { query } from './query'
import type {
  StationId,
  Filters,
  QueryReturn
} from './query'


const TOP_N_COUNT = 20

type StationsListProps = {
  filters: Filters;
  onStationHover: (stationId: StationId | null) => void;
}

type StationsListState = {
  topStations: { stationId: number; count: number }[];
}

export class StationsList extends React.Component<StationsListProps, StationsListState> {
  state: StationsListState = { topStations: [] }
  queryReturns: QueryReturn[] = []
  componentDidMount() {
    this.fetchStations()
  }
  componentDidUpdate() {
    this.fetchStations()
  }
  fetchStations() {
    const stationsQueryReturn = query('topNStations', this.props.filters, TOP_N_COUNT)
    this.queryReturns.push(stationsQueryReturn)
    stationsQueryReturn.promise.then((res) => {
      if (res === this.state.topStations) return
      this.setState({ topStations: res })
    })
  }
  componentWillUnmount() {
    for (const queryReturn of this.queryReturns) queryReturn.cancel()
    this.queryReturns = []
  }
  render() {
    const { onStationHover } = this.props
    const { topStations } = this.state
    return (
      <ul className="Stations" onMouseLeave={() => onStationHover(null)}>
        {topStations.map(station =>
          <Station
            key={station.stationId}
            id={station.stationId}
            filters={this.props.filters}
            onMouseEnter={() => onStationHover(station.stationId)}
            onMouseLeave={() => onStationHover(null)}
          />
        )}
      </ul>
    )
  }
}

type StationProps = {
  id: number;
  filters: Filters;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

type StationState = {
  tripCountByHour: number[] | null;
  maxHourlyTrips: number | null;
  stationName: string | null;
}
class Station extends React.Component<StationProps, StationState> {
  state: StationState = { tripCountByHour: null, maxHourlyTrips: null, stationName: null }
  queryReturns: QueryReturn[] = []
  componentDidMount() {
    this.fetchData()
  }
  componentDidUpdate() {
    this.fetchData()
  }
  fetchData() {
    const maxHourlyTripsQueryReturn = query('maxHourlyTrips', this.props.filters)
    this.queryReturns.push(maxHourlyTripsQueryReturn)
    maxHourlyTripsQueryReturn.promise.then((res) => {
      if (res.maxHourlyTrips === this.state.maxHourlyTrips) return
      this.setState({ maxHourlyTrips: res.maxHourlyTrips })
    })

    const dayHourQueryReturn = query('tripsByHour', this.props.filters, this.props.id)
    this.queryReturns.push(dayHourQueryReturn)
    dayHourQueryReturn.promise.then((res) => {
      if (res === this.state.tripCountByHour) return
      this.setState({ tripCountByHour: res })
    })

    const stationNameReturn = query('stationName', this.props.id)
    this.queryReturns.push(stationNameReturn)
    stationNameReturn.promise.then((res) => {
      if (res === this.state.stationName) return
      this.setState({ stationName: res })
    })
  }
  componentWillUnmount() {
    for (const queryReturn of this.queryReturns) queryReturn.cancel()
    this.queryReturns = []
  }
  render() {
    const { tripCountByHour, maxHourlyTrips, stationName } = this.state

    let totalTripsFromStation = null
    if (tripCountByHour) {
      totalTripsFromStation = tripCountByHour.reduce((sum, count) => sum + count, 0)
    }

    const isLoaded = Boolean(tripCountByHour)

    return (
      <li
        className={`${isLoaded ? 'isLoaded' : ''}`}
        onMouseEnter={this.props.onMouseEnter}
        onMouseLeave={this.props.onMouseLeave}
      >
        <div className="StationName">{stationName}</div>
        <div className="StationData">
          <div className="TripsVolume">
            {tripCountByHour ? <TripsHistogram tripCountByHour={tripCountByHour} maxHourlyTrips={maxHourlyTrips || 1} /> : null}
          </div>
          <div className="TripsCount" >{totalTripsFromStation} trips</div>
          <div className="DataLoader">
            <div className="DataLoader-bar" style={{ width: isLoaded ? `100%` : '0%' }} />
          </div>
        </div>
      </li>
    )
  }
}

type TripsHistogramProps = { tripCountByHour: number[]; maxHourlyTrips: number }
function TripsHistogram (props: TripsHistogramProps) {
  return <BarChart
    bucketCounts={props.tripCountByHour}
    bucketValueStart={0}
    bucketSize={1}
    barGap={1}
    xScaleExtent={[0, 24]}
    yScaleExtent={[0, props.maxHourlyTrips]}
  />
}
