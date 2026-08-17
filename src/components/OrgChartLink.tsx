import { Link } from 'react-router-dom'
import { Network } from 'lucide-react'
import { cx } from '@/lib/cx'

export type OrgChartLinkProps = {
  className?: string
}

export function OrgChartLink({ className }: OrgChartLinkProps) {
  return (
    <Link
      to="/organisation/chart"
      className={cx('pd-people__ghost-btn', className)}
    >
      <Network size={16} strokeWidth={1.75} aria-hidden />
      Org Chart
    </Link>
  )
}
