import { NumericStatCard } from '@/components/ui/NumericStatCard'
import '@/styles/numeric-stat-card.css'

const ORDERS_SERIES = [12, 14, 13, 18, 16, 22, 19, 28, 24, 36, 42, 58, 72, 88]
const UNFULFILLED_SERIES = [8, 9, 10, 11, 12, 11, 13, 14, 15, 16, 18, 20, 22, 24]

export default function TestPage() {
  return (
    <div className="pd-page pd-page--test" aria-label="Test">
      <div className="pd-numeric-stat-demo">
        <NumericStatCard
          title="Total orders"
          value={1054}
          delta="+330 today"
          changePercent="56.4%"
          tone="positive"
          series={ORDERS_SERIES}
          activeIndex={6}
          activePoint={{ value: 20, label: '20 total', date: '04 Apr, 2025' }}
        />
        <NumericStatCard
          title="Unfulfilled"
          value={233}
          delta="18 today"
          changePercent="21.8%"
          tone="negative"
          series={UNFULFILLED_SERIES}
          activeIndex={10}
          activePoint={{ value: 12, label: '12 total', date: '20 Apr, 2025' }}
        />
      </div>
    </div>
  )
}
