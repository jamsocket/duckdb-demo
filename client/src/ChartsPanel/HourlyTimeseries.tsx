import React from 'react'
import './ChartsPanel.css'
import { BarChart } from '../BarChart'
import { query, QueryReturn, Filters, SetFilter } from '../query'

type HourlyTimeseriesProps = {
  filters: Filters;
  setFilter: SetFilter;
}
type HourlyTimeseriesState = {
  tripsByHour: number[] | null;
}
export class HourlyTimeseries extends React.Component<HourlyTimeseriesProps, HourlyTimeseriesState> {
  queryReturns: QueryReturn[] = []
  state: HourlyTimeseriesState = {
    tripsByHour: null
  }
  componentDidMount() {
    this.fetchData()
  }
  componentDidUpdate(prevProps: HourlyTimeseriesProps) {
    if (this.props.filters !== prevProps.filters) {
      this.cancelQueries()
      this.fetchData()
    }
  }
  fetchData() {
    const { hourly, ...filters } = this.props.filters
    const tripsByHourQueryReturn = query('tripsByHour', filters)
    this.queryReturns.push(tripsByHourQueryReturn)
    tripsByHourQueryReturn.promise.then((tripsByHour) => {
      const idx = this.queryReturns.indexOf(tripsByHourQueryReturn)
      this.queryReturns.splice(idx, 1)
      if (this.state.tripsByHour === tripsByHour) return
      this.setState({ tripsByHour: tripsByHour })
    })
  }
  cancelQueries() {
    for (const queryReturn of this.queryReturns) queryReturn.cancel()
    this.queryReturns = []
  }
  componentWillUnmount() {
    this.cancelQueries()
  }
  render() {
    const { tripsByHour } = this.state
    const isLoaded = tripsByHour
    let bucketCounts: number[] = []
    let bucketValueStart = 0
    let xScaleExtent: [number, number] | null = null
    let yScaleExtent: [number, number] | null = null
    let filterExtent
    if (isLoaded) {
      const maxTripsInHour = Math.max(...tripsByHour)
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
