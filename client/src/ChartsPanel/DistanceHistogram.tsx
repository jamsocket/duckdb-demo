import React from 'react'
import './ChartsPanel.css'
import { BarChart } from '../BarChart'
import { query, QueryReturn, Filters, Extent } from '../query'

type DistanceHistogramProps = {
  filters: Filters;
  totalTrips: number;
  setFilter: (name: keyof Filters, extent: Extent) => void;
}
type DistanceHistogramState = {
  distanceBuckets: { distance: number; count: number }[] | null;
  maxDistanceBucket: number | null;
  distanceP99: number | null;
  binSize: number | null;
}
export class DistanceHistogram extends React.Component<DistanceHistogramProps, DistanceHistogramState> {
  queryReturns: QueryReturn[] = []
  state: DistanceHistogramState = {
    distanceBuckets: null,
    maxDistanceBucket: null,
    distanceP99: null,
    binSize: null
  }
  componentDidMount() {
    this.fetchData()
  }
  componentDidUpdate(prevProps: DistanceHistogramProps) {
    if (this.props.filters !== prevProps.filters) {
      this.fetchData()
    }
  }
  fetchData() {
    const distanceP99QueryReturn = query('distanceP99')
    this.queryReturns.push(distanceP99QueryReturn)
    distanceP99QueryReturn.promise.then((distanceP99) => {
      // TODO: filter Distance out of filters because we want to show data outside
      // of the Distance filter's range
      const filters = this.props.filters
      const range = distanceP99
      const numBins = (1 + Math.log2(this.props.totalTrips)) * 4
      const binSize = Math.ceil(range / numBins)
      const valueMax = distanceP99

      // TODO: check if this needs updating to avoid unnecessary rerenders
      this.setState({ distanceP99, binSize })

      const distanceDistributionQueryReturn = query('distanceDistribution', filters, binSize, valueMax)
      this.queryReturns.push(distanceDistributionQueryReturn)
      distanceDistributionQueryReturn.promise.then((distanceDistribution) => {
        // TODO: check if this needs updating to avoid unnecessary rerenders
        this.setState({ distanceBuckets: distanceDistribution })
      })

      const maxDistanceQueryReturn = query('distanceDistribution', null, binSize, valueMax)
      this.queryReturns.push(maxDistanceQueryReturn)
      maxDistanceQueryReturn.promise.then((distanceDistribution) => {
        const maxDistanceBucket = Math.max(...distanceDistribution.map((b: any) => b.count))
        // TODO: check if this needs updating to avoid unnecessary rerenders
        this.setState({ maxDistanceBucket })
      })
    })
  }
  componentWillUnmount() {
    for (const queryReturn of this.queryReturns) queryReturn.cancel()
    this.queryReturns = []
  }
  render() {
    const { distanceBuckets, distanceP99, maxDistanceBucket } = this.state
    const isLoaded = distanceBuckets && distanceP99 && maxDistanceBucket
    let bucketCounts: number[] = []
    let bucketValueStart = 0
    let xScaleExtent: [number, number] | null = null
    let yScaleExtent: [number, number] | null = null
    let filterExtent
    if (isLoaded) {
      bucketCounts = distanceBuckets.map(({ count }) => count)
      bucketValueStart = distanceBuckets[0].distance
      // TODO: should include the entire bottom and top buckets
      xScaleExtent = [0, distanceP99]
      yScaleExtent = [0, maxDistanceBucket]
      filterExtent = this.props.filters['distance'] || xScaleExtent
    }
    return (
      <div>
        <h3>Distance</h3>
        <div className={`chart-container ${isLoaded ? 'is-loaded' : ''}`}>
          {isLoaded && <BarChart
            bucketCounts={bucketCounts}
            bucketSize={this.state.binSize || 1}
            bucketValueStart={bucketValueStart}
            xScaleExtent={xScaleExtent}
            yScaleExtent={yScaleExtent}
            barGap={1}
            filterExtent={filterExtent}
            onChangeFilterExtent={(filterExtent) => this.props.setFilter('distance', filterExtent)}
          />}
          <div className="data-loader"><div className="data-loader-bar" /></div>
        </div>
      </div>
    )
  }
}
