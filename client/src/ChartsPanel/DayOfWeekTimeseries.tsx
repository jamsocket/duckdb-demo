import React from 'react'
import './ChartsPanel.css'
import { BarChart } from '../BarChart'
import { query, QueryReturn, Filters, Extent } from '../query'

type DayOfWeekTimeseriesProps = {
  filters: Filters;
  setFilter: (name: keyof Filters, extent: Extent) => void;
}
type DayOfWeekTimeseriesState = {
  tripsByDay: number[] | null;
  maxTripsInDay: number | null;
}
export class DayOfWeekTimeseries extends React.Component<DayOfWeekTimeseriesProps, DayOfWeekTimeseriesState> {
  queryReturns: QueryReturn[] = []
  state: DayOfWeekTimeseriesState = {
    tripsByDay: null,
    maxTripsInDay: null
  }
  componentDidMount() {
    this.fetchData()
  }
  componentDidUpdate(prevProps: DayOfWeekTimeseriesProps) {
    if (this.props.filters !== prevProps.filters) {
      this.fetchData()
    }
  }
  fetchData() {
    const maxTripsInDayQueryReturn = query('tripsByDay', null) // no filters
    this.queryReturns.push(maxTripsInDayQueryReturn)
    maxTripsInDayQueryReturn.promise.then((tripsByDay) => {
      const maxTripsInDay = Math.max(0, ...tripsByDay)
      // TODO: check if this needs updating to avoid unnecessary rerenders
      this.setState({ maxTripsInDay })
    })

    // TODO: filter Day out of filters because we want to show data outside
    // of the Day filter's range
    const filters = this.props.filters
    const tripsByDayQueryReturn = query('tripsByDay', filters)
    this.queryReturns.push(tripsByDayQueryReturn)
    tripsByDayQueryReturn.promise.then((tripsByDay) => {
      // TODO: check if this needs updating to avoid unnecessary rerenders
      this.setState({ tripsByDay: tripsByDay })
    })
  }
  componentWillUnmount() {
    for (const queryReturn of this.queryReturns) queryReturn.cancel()
    this.queryReturns = []
  }
  render() {
    const { tripsByDay, maxTripsInDay } = this.state
    const isLoaded = tripsByDay && maxTripsInDay
    let bucketCounts: number[] = []
    let bucketValueStart = 0
    let xScaleExtent: [number, number] | null = null
    let yScaleExtent: [number, number] | null = null
    let filterExtent
    if (isLoaded) {
      bucketCounts = tripsByDay
      bucketValueStart = 0
      xScaleExtent = [0, 7]
      yScaleExtent = [0, maxTripsInDay]
      filterExtent = this.props.filters['dayOfWeek'] || xScaleExtent
    }
    return (
      <div>
        <h3>Day of week</h3>
        <div className={`chart-container ${isLoaded ? 'is-loaded' : ''}`}>
          {isLoaded && <BarChart
            bucketCounts={bucketCounts}
            bucketSize={1}
            bucketValueStart={bucketValueStart}
            xScaleExtent={xScaleExtent}
            yScaleExtent={yScaleExtent}
            barGap={2}
            filterExtent={filterExtent}
            onChangeFilterExtent={(filterExtent) => this.props.setFilter('dayOfWeek', filterExtent)}
          />}
          <div className="data-loader"><div className="data-loader-bar" /></div>
        </div>
      </div>
    )
  }
}
