import React from 'react'
import './ChartsPanel.css'
import { BarChart } from '../BarChart'
import { query, QueryReturn, Filters, SetFilter } from '../query'

type DayOfWeekTimeseriesProps = {
  filters: Filters;
  setFilter: SetFilter;
}
type DayOfWeekTimeseriesState = {
  tripsByDay: number[] | null;
}
export class DayOfWeekTimeseries extends React.Component<DayOfWeekTimeseriesProps, DayOfWeekTimeseriesState> {
  queryReturns: QueryReturn[] = []
  state: DayOfWeekTimeseriesState = {
    tripsByDay: null
  }
  componentDidMount() {
    this.fetchData()
  }
  componentDidUpdate(prevProps: DayOfWeekTimeseriesProps) {
    if (this.props.filters !== prevProps.filters) {
      this.cancelQueries()
      this.fetchData()
    }
  }
  fetchData() {
    const { dayOfWeek, ...filters } = this.props.filters
    const tripsByDayQueryReturn = query('tripsByDay', filters)
    this.queryReturns.push(tripsByDayQueryReturn)
    tripsByDayQueryReturn.promise.then((tripsByDay) => {
      const idx = this.queryReturns.indexOf(tripsByDayQueryReturn)
      this.queryReturns.splice(idx, 1)
      if (this.state.tripsByDay === tripsByDay) return
      this.setState({ tripsByDay: tripsByDay })
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
    const { tripsByDay } = this.state
    const isLoaded = tripsByDay
    let bucketCounts: number[] = []
    let bucketValueStart = 0
    let xScaleExtent: [number, number] | null = null
    let yScaleExtent: [number, number] | null = null
    let filterExtent
    if (isLoaded) {
      const maxTripsInDay = Math.max(0, ...tripsByDay)
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
