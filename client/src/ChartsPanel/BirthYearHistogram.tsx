import React from 'react'
import './ChartsPanel.css'
import { BarChart } from '../BarChart'
import { query, QueryReturn, Filters, Extent } from '../query'

type BirthYearHistogramProps = {
  filters: Filters;
  totalTrips: number;
  setFilter: (name: keyof Filters, extent: Extent) => void;
}
type BirthYearHistogramState = {
  birthYearBuckets: { birthYear: number; count: number }[] | null;
  maxBirthYearBucket: number | null;
  birthYearExtent: [number, number] | null;
}
export class BirthYearHistogram extends React.Component<BirthYearHistogramProps, BirthYearHistogramState> {
  queryReturns: QueryReturn[] = []
  state: BirthYearHistogramState = {
    birthYearBuckets: null,
    maxBirthYearBucket: null,
    birthYearExtent: null
  }
  componentDidMount() {
    this.fetchData()
  }
  componentDidUpdate(prevProps: BirthYearHistogramProps) {
    if (this.props.filters !== prevProps.filters) {
      this.fetchData()
    }
  }
  fetchData() {
    const birthYearExtentQueryReturn = query('birthYearExtent')
    this.queryReturns.push(birthYearExtentQueryReturn)
    birthYearExtentQueryReturn.promise.then((birthYearExtent) => {
      // TODO: filter Birth Year out of filters because we want to show data outside
      // of the Birth Year filter's range
      const filters = this.props.filters
      const valueMax = birthYearExtent[1]

      // TODO: check if this needs updating to avoid unnecessary rerenders
      this.setState({ birthYearExtent })

      const birthYearDistributionQueryReturn = query('birthYearDistribution', filters, valueMax)
      this.queryReturns.push(birthYearDistributionQueryReturn)
      birthYearDistributionQueryReturn.promise.then((birthYearDistribution) => {
        // TODO: check if this needs updating to avoid unnecessary rerenders
        this.setState({ birthYearBuckets: birthYearDistribution })
      })

      const maxBirthYearQueryReturn = query('birthYearDistribution', null, valueMax)
      this.queryReturns.push(maxBirthYearQueryReturn)
      maxBirthYearQueryReturn.promise.then((birthYearDistribution) => {
        const maxBirthYearBucket = Math.max(...birthYearDistribution.map((b: any) => b.count))
        // TODO: check if this needs updating to avoid unnecessary rerenders
        this.setState({ maxBirthYearBucket })
      })
    })
  }
  componentWillUnmount() {
    for (const queryReturn of this.queryReturns) queryReturn.cancel()
    this.queryReturns = []
  }
  render() {
    const { birthYearBuckets, birthYearExtent, maxBirthYearBucket } = this.state
    const isLoaded = birthYearBuckets && birthYearExtent && maxBirthYearBucket
    let bucketCounts: number[] = []
    let bucketValueStart = 0
    let xScaleExtent: [number, number] | null = null
    let yScaleExtent: [number, number] | null = null
    let filterExtent
    if (isLoaded) {
      bucketCounts = birthYearBuckets.map(({ count }) => count)
      bucketValueStart = birthYearBuckets[0].birthYear
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
