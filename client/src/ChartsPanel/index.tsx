import './ChartsPanel.css'
import { DateTimeseries } from './DateTimeseries'
import { DayOfWeekTimeseries } from './DayOfWeekTimeseries'
import { HourlyTimeseries } from './HourlyTimeseries'
import { DurationHistogram } from './DurationHistogram'
import { DistanceHistogram } from './DistanceHistogram'
import { BirthYearHistogram } from './BirthYearHistogram'
import { StationsList } from '../StationsList'
import { Filters, SetFilter, StationId } from '../query'


type ChartsPanelProps = {
  totalTrips: number;
  filters: Filters;
  setFilter: SetFilter;
  onStationHover: (stationId: StationId | null) => void;
}
export function ChartsPanel({ totalTrips, onStationHover, filters, setFilter }: ChartsPanelProps) {
  return (
    <div className="ChartsPanel">
      <div className="row">
        <DayOfWeekTimeseries filters={filters} setFilter={setFilter} />
        <HourlyTimeseries filters={filters} setFilter={setFilter} />
      </div>
      <div className="row">
        <DurationHistogram filters={filters} totalTrips={totalTrips} setFilter={setFilter} />
        <DistanceHistogram filters={filters} totalTrips={totalTrips} setFilter={setFilter} />
        <BirthYearHistogram filters={filters} totalTrips={totalTrips} setFilter={setFilter} />
      </div>
      <div className="row">
        <DateTimeseries filters={filters} setFilter={setFilter} />
      </div>
      <div>
        <StationsList filters={filters} onStationHover={onStationHover} />
      </div>
    </div>
  )
}
