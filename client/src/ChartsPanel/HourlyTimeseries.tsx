import React from 'react'
import './ChartsPanel.css'
import { BarChart } from '../BarChart'
import { query, QueryReturn, Filters, Extent } from '../query'

type HourlyTimeseriesProps = {
  filters: Filters;
  setFilter: (name: keyof Filters, extent: Extent) => void;
}
type HourlyTimeseriesState = {
  tripsByHour: number[] | null;
  maxTripsInHour: number | null;
}
export class HourlyTimeseries extends React.Component<HourlyTimeseriesProps, HourlyTimeseriesState> {
  queryReturns: QueryReturn[] = []
  state: HourlyTimeseriesState = {
    tripsByHour: null,
    maxTripsInHour: null
  }
  componentDidMount() {
    this.fetchData()
  }
  componentDidUpdate(prevProps: HourlyTimeseriesProps) {
    if (this.props.filters !== prevProps.filters) {
      this.fetchData()
    }
  }
  fetchData() {
    const maxTripsInHourQueryReturn = query('tripsByHour', null) // no filters
    this.queryReturns.push(maxTripsInHourQueryReturn)
    maxTripsInHourQueryReturn.promise.then((tripsByHour) => {
      const maxTripsInHour = Math.max(0, ...tripsByHour)
      // TODO: check if this needs updating to avoid unnecessary rerenders
      this.setState({ maxTripsInHour })
    })

    const { hourly, ...filters } = this.props.filters
    const tripsByHourQueryReturn = query('tripsByHour', filters)
    this.queryReturns.push(tripsByHourQueryReturn)
    tripsByHourQueryReturn.promise.then((tripsByHour) => {
      // TODO: check if this needs updating to avoid unnecessary rerenders
      this.setState({ tripsByHour: tripsByHour })
    })
  }
  componentWillUnmount() {
    for (const queryReturn of this.queryReturns) queryReturn.cancel()
    this.queryReturns = []
  }
  render() {
    const { tripsByHour, maxTripsInHour } = this.state
    const isLoaded = tripsByHour && maxTripsInHour
    let bucketCounts: number[] = []
    let bucketValueStart = 0
    let xScaleExtent: [number, number] | null = null
    let yScaleExtent: [number, number] | null = null
    let filterExtent
    if (isLoaded) {
      bucketCounts = tripsByHour
      bucketValueStart = 0
      xScaleExtent = [0, 24]
      yScaleExtent = [0, maxTripsInHour]
      filterExtent = this.props.filters['hourly'] || xScaleExtent
    }
    return (
      <div>
        <h3>Trips by hour</h3>
        <div className={`chart-container ${isLoaded ? 'is-loaded' : ''}`}>
          {isLoaded && <BarChart
            bucketCounts={bucketCounts}
            bucketSize={1}
            bucketValueStart={bucketValueStart}
            xScaleExtent={xScaleExtent}
            yScaleExtent={yScaleExtent}
            barGap={2}
            filterExtent={filterExtent}
            onChangeFilterExtent={(filterExtent) => this.props.setFilter('hourly', filterExtent)}
          />}
          <div className="data-loader"><div className="data-loader-bar" /></div>
        </div>
      </div>
    )
  }
}
