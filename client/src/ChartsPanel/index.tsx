import { useState } from 'react'
import './ChartsPanel.css'
import { DateTimeseries } from './DateTimeseries'
import { DayOfWeekTimeseries } from './DayOfWeekTimeseries'
import { HourlyTimeseries } from './HourlyTimeseries'
import { DurationHistogram } from './DurationHistogram'
import { DistanceHistogram } from './DistanceHistogram'
import { BirthYearHistogram } from './BirthYearHistogram'
import { Filters, Extent } from '../query'


type ChartsPanelProps = { totalTrips: number }
export function ChartsPanel({ totalTrips }: ChartsPanelProps) {
  const [filters, setFilters] = useState<Filters>({
    date: null,
    dayOfWeek: null,
    hourly: null,
    duration: null,
    distance: null,
    birthYear: null
  })
  const setFilter = (name: keyof Filters, extent: Extent) => {
    setFilters(filters => ({
      ...filters,
      [name]: extent
    }))
  }
  console.log(filters)
  return (
    <div className="ChartsPanel">
      <div className="row">
        <DateTimeseries filters={filters} setFilter={setFilter} />
      </div>
      <div className="row">
        <DayOfWeekTimeseries filters={filters} setFilter={setFilter} />
        <HourlyTimeseries filters={filters} setFilter={setFilter} />
      </div>
      <div className="row">
        <DurationHistogram filters={filters} totalTrips={totalTrips} setFilter={setFilter} />
        <DistanceHistogram filters={filters} totalTrips={totalTrips} setFilter={setFilter} />
        <BirthYearHistogram filters={filters} totalTrips={totalTrips} setFilter={setFilter} />
      </div>
    </div>
  )
}
