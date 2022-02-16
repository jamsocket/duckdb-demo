import React from 'react'
import './ChartsPanel.css'
import { BarChart } from '../BarChart'
import { query, QueryReturn, Filters, SetFilter, fillBuckets } from '../query'

type BirthYearHistogramProps = {
  filters: Filters;
  totalTrips: number;
  setFilter: SetFilter;
}
type BirthYearHistogramState = {
  birthYearBuckets: { birthYear: number; count: number }[] | null;
  birthYearExtent: [number, number] | null;
}
export class BirthYearHistogram extends React.Component<BirthYearHistogramProps, BirthYearHistogramState> {
  queryReturns: QueryReturn[] = []
  state: BirthYearHistogramState = {
    birthYearBuckets: null,
    birthYearExtent: null
  }
  componentDidMount() {
    this.fetchData()
  }
  componentDidUpdate(prevProps: BirthYearHistogramProps) {
    if (this.props.filters !== prevProps.filters) {
      this.cancelQueries()
      this.fetchData()
    }
  }
  fetchData() {
    const birthYearExtentQueryReturn = query('birthYearExtent')
    this.queryReturns.push(birthYearExtentQueryReturn)
    birthYearExtentQueryReturn.promise.then((birthYearExtent) => {
      const idx = this.queryReturns.indexOf(birthYearExtentQueryReturn)
      this.queryReturns.splice(idx, 1)
      const { birthYear, ...filters } = this.props.filters
      const valueMax = birthYearExtent[1]
      if (this.state.birthYearExtent === birthYearExtent) return
      this.setState({ birthYearExtent })

      const birthYearDistributionQueryReturn = query('birthYearDistribution', filters, valueMax)
      this.queryReturns.push(birthYearDistributionQueryReturn)
      birthYearDistributionQueryReturn.promise.then((birthYearDistribution) => {
        const idx = this.queryReturns.indexOf(birthYearDistributionQueryReturn)
        this.queryReturns.splice(idx, 1)
        if (this.state.birthYearBuckets === birthYearDistribution) return
        this.setState({ birthYearBuckets: birthYearDistribution })
      })
    })
  }
  componentWillUnmount() {
    this.cancelQueries()
  }
  cancelQueries() {
    for (const queryReturn of this.queryReturns) queryReturn.cancel()
    this.queryReturns = []
  }
  render() {
    const { birthYearBuckets, birthYearExtent } = this.state
    const isLoaded = birthYearBuckets && birthYearExtent
    let bucketCounts: number[] = []
    let bucketValueStart = 0
    let xScaleExtent: [number, number] | null = null
    let yScaleExtent: [number, number] | null = null
    let filterExtent
    if (isLoaded) {
      const maxBirthYearBucket = Math.max(...birthYearBuckets.map((b: any) => b.count))
      bucketCounts = fillBuckets(birthYearBuckets, 'count', 'birthYear', (by: number) => by + 1)
      bucketValueStart = birthYearBuckets[0] ? birthYearBuckets[0].birthYear : 0
      // TODO: should include the entire bottom and top buckets
      xScaleExtent = birthYearExtent
      yScaleExtent = [0, maxBirthYearBucket]
      filterExtent = this.props.filters['birthYear'] || xScaleExtent
    }
    return (
      <div>
        <h3>Birth year</h3>
        <div className={`chart-container ${isLoaded ? 'is-loaded' : ''}`}>
          {isLoaded && <BarChart
            bucketCounts={bucketCounts}
            bucketSize={1}
            bucketValueStart={bucketValueStart}
            xScaleExtent={xScaleExtent}
            yScaleExtent={yScaleExtent}
            barGap={1}
            filterExtent={filterExtent}
            onChangeFilterExtent={(filterExtent) => this.props.setFilter('birthYear', filterExtent)}
          />}
          <div className="data-loader"><div className="data-loader-bar" /></div>
        </div>
      </div>
    )
  }
}
