import { useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/useAuth'
import { canOverrideCalibrationGrade } from '@/lib/calibration/overrideAccess'
import { gradeTierDelta } from '@/lib/calibration/indicators'
import {
  EMPTY_CALIBRATOR_ASSIGNMENTS,
  type CalibrationSitting,
} from '@/lib/calibration/sessionApi'
import {
  setCalibrationSittingCache,
  useCalibrationSitting,
  useCalibratorAssignments,
} from '@/lib/calibration/useCalibrationSession'
import { jobLevelOf, type RatingTableRow } from '@/lib/calibration/ratingTable'
import { officialGrade } from '@/lib/analytics/dashboard'
import { queryClient, queryKeys } from '@/lib/queryClient'
import type { PlatformEmployee } from '@/lib/employees/types'
import type { ReviewCycle, ReviewPacket } from '@/lib/reviews/types'
import { CalibrationEmployeeDrawer } from '@/pages/calibration/CalibrationEmployeeDrawer'

type CalibrationEmployeePanelHostProps = {
  employeeId: number
  /** Prebuilt rows from the page — avoid rebuilding on every open. */
  rows: readonly RatingTableRow[]
  cycle: ReviewCycle
  cycles: readonly ReviewCycle[]
  employees: readonly PlatformEmployee[]
  packets: readonly ReviewPacket[]
  historyPackets: readonly (readonly ReviewPacket[])[]
  sittingEpoch?: number
  onClose: () => void
  onPacketUpdated: (packet: ReviewPacket) => void
}

function fallbackRow(
  employeeId: number,
  employee: PlatformEmployee | undefined,
  packet: ReviewPacket | null,
): RatingTableRow {
  const annualGrade = officialGrade(packet)
  const selfGrade = packet?.selfOverallGrade ?? null
  return {
    employeeId,
    fullName: employee?.fullName.trim() || `Employee ${employeeId}`,
    avatarUrl: employee?.avatarUrl?.trim() ?? '',
    department: employee?.department.trim() || '—',
    team: employee?.team.trim() || '—',
    market: employee?.site.trim() || '—',
    jobGrade: employee?.jobGrade.trim() || '—',
    jobLevel: jobLevelOf(employee?.jobGrade ?? ''),
    managerName: employee?.reportsToName.trim() || '—',
    packetId: packet?.id ?? null,
    quarters: [],
    quarterAverageScore: null,
    quarterAverageGrade: null,
    annualGrade,
    selfGrade,
    gapTiers: gradeTierDelta(selfGrade, annualGrade),
    priorGrade: null,
    priorYearLabel: '',
    trend: null,
    joinDateLabel: '—',
    timeInGradeLabel: '—',
    lastPromoLabel: '—',
    flags: [],
    isFlagged: false,
    isAdjusted: false,
  }
}

export function CalibrationEmployeePanelHost({
  employeeId,
  rows,
  cycle,
  cycles,
  employees,
  packets,
  historyPackets,
  sittingEpoch = 0,
  onClose,
  onPacketUpdated,
}: CalibrationEmployeePanelHostProps) {
  const { user } = useAuth()
  const viewerEmployeeId = user?.employeeId ?? null
  // sittingEpoch bumps after lock/unlock from the header badge.
  useEffect(() => {
    if (sittingEpoch <= 0) return
    void queryClient.invalidateQueries({
      queryKey: queryKeys.calibrationSitting(cycle.id),
    })
  }, [cycle.id, sittingEpoch])

  const { data: sitting = null, isFetched: sittingFetched } =
    useCalibrationSitting(cycle.id)
  const { data: assignments = EMPTY_CALIBRATOR_ASSIGNMENTS } =
    useCalibratorAssignments()

  const employee = useMemo(
    () => employees.find((person) => person.employeeId === employeeId),
    [employeeId, employees],
  )
  const summaryPacket = useMemo(
    () => packets.find((packet) => packet.employeeId === employeeId) ?? null,
    [employeeId, packets],
  )
  const row = useMemo(() => {
    const fromPage = rows.find((item) => item.employeeId === employeeId)
    if (fromPage) return fromPage
    return fallbackRow(employeeId, employee, summaryPacket)
  }, [employee, employeeId, rows, summaryPacket])

  // Seed the detail cache from the summary so the drawer paints content
  // immediately while a full packet prefetch (if any) catches up.
  useEffect(() => {
    if (!summaryPacket) return
    const key = queryKeys.reviewPacket(cycle.id, employeeId)
    const existing = queryClient.getQueryData<ReviewPacket>(key)
    if (!existing) {
      queryClient.setQueryData(key, summaryPacket)
    }
  }, [cycle.id, employeeId, summaryPacket])

  return (
    <CalibrationEmployeeDrawer
      row={row}
      employee={employee}
      cycle={cycle}
      cycles={cycles}
      summaryPacket={summaryPacket}
      historyPackets={historyPackets}
      onClose={onClose}
      onPacketUpdated={onPacketUpdated}
      sittingEmployee={
        sitting?.employees.find(
          (person) => person.employeeId === row.employeeId,
        ) ?? null
      }
      sittingReady={sittingFetched || sitting != null}
      sessionLocked={Boolean(sitting?.lockedAt)}
      canOverride={canOverrideCalibrationGrade({
        viewerEmployeeId,
        permissions: user?.permissions,
        subject:
          employee ?? {
            employeeId: row.employeeId,
            department: row.department,
            team: row.team,
          },
        assignments,
      })}
      onSittingSaved={(next: CalibrationSitting) => {
        setCalibrationSittingCache(cycle.id, next)
      }}
      onRatingAdjusted={() => {
        /* Ratings tab owns adjusted chips; insights panel only needs packet. */
      }}
    />
  )
}
