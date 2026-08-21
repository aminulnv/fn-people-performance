import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  extractCycleCalendarMarkers,
  initialCalendarMonthIndex,
  isDateInCycle,
  legendItems,
  listCalendarMonthCells,
  listCycleCalendarMonths,
  markersForDay,
  primaryCalendarFillKind,
  toIsoDate,
  type CycleCalendarMarkerKind,
  type CycleCalendarMonth,
} from "@/lib/reviews/cycleCalendar";
import { formatShortDate } from "@/lib/reviews/periods";
import type { ReviewCycle } from "@/lib/reviews/types";

type CycleSettingsCalendarProps = {
  cycle: ReviewCycle;
  today?: Date;
  size?: "default" | "large";
};

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MILESTONE_KINDS = new Set<CycleCalendarMarkerKind>([
  "publish-managers",
  "publish-employees",
]);

export function CycleSettingsCalendar({
  cycle,
  today: todayProp,
  size = "default",
}: CycleSettingsCalendarProps) {
  const today = useMemo(() => todayProp ?? new Date(), [todayProp]);
  const markers = useMemo(
    () => extractCycleCalendarMarkers(cycle),
    [cycle],
  );
  const months = useMemo(
    () =>
      listCycleCalendarMonths(markers.bounds.startDate, markers.bounds.endDate),
    [markers.bounds.endDate, markers.bounds.startDate],
  );
  const legend = useMemo(() => legendItems(markers), [markers]);
  const [monthIndex, setMonthIndex] = useState(() =>
    initialCalendarMonthIndex(months, markers.bounds, today),
  );

  useEffect(() => {
    const bounds = { startDate: cycle.startDate, endDate: cycle.endDate };
    const monthList = listCycleCalendarMonths(bounds.startDate, bounds.endDate);
    setMonthIndex(initialCalendarMonthIndex(monthList, bounds, today));
  }, [cycle.id, cycle.startDate, cycle.endDate, today]);

  const todayIso = toIsoDate(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate(),
  );
  const activeMonth = months[monthIndex] ?? months[0];
  const canGoPrev = monthIndex > 0;
  const canGoNext = monthIndex < months.length - 1;

  if (!activeMonth) {
    return null;
  }

  return (
    <div
      className={[
        "pd-cycle-calendar",
        size === "large" ? "pd-cycle-calendar--large" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Cycle calendar"
    >
      <div className="pd-cycle-calendar__nav">
        <button
          type="button"
          className="pd-cycle-calendar__nav-btn"
          aria-label="Previous month"
          disabled={!canGoPrev}
          onClick={() => setMonthIndex((index) => Math.max(0, index - 1))}
        >
          <ChevronLeft size={18} strokeWidth={1.75} aria-hidden />
        </button>
        <p className="pd-cycle-calendar__nav-label">
          {MONTH_LABELS[activeMonth.month - 1]} {activeMonth.year}
        </p>
        <button
          type="button"
          className="pd-cycle-calendar__nav-btn"
          aria-label="Next month"
          disabled={!canGoNext}
          onClick={() =>
            setMonthIndex((index) => Math.min(months.length - 1, index + 1))
          }
        >
          <ChevronRight size={18} strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      <MonthGrid month={activeMonth} markers={markers} todayIso={todayIso} />

      {legend.length > 0 ? (
        <ul className="pd-cycle-calendar__legend" aria-label="Calendar legend">
          {legend.map((item) => (
            <li key={item.kind} className="pd-cycle-calendar__legend-item">
              <span
                className={`pd-cycle-calendar__legend-swatch is-${item.kind}`}
                aria-hidden
              />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

type MonthGridProps = {
  month: CycleCalendarMonth;
  markers: ReturnType<typeof extractCycleCalendarMarkers>;
  todayIso: string;
};

function MonthGrid({ month, markers, todayIso }: MonthGridProps) {
  const cells = listCalendarMonthCells(month.year, month.month);

  return (
    <section
      className="pd-cycle-calendar__month"
      aria-label={`${MONTH_LABELS[month.month - 1]} ${month.year}`}
    >
      <div className="pd-cycle-calendar__weekdays" aria-hidden>
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="pd-cycle-calendar__weekday">
            {label}
          </span>
        ))}
      </div>
      <div className="pd-cycle-calendar__grid" role="grid">
        {cells.map((cell, index) => {
          const inCycle = isDateInCycle(cell.iso, markers.bounds);
          const dayMarkers = markersForDay(cell.iso, markers);
          const fillKind = inCycle ? primaryCalendarFillKind(dayMarkers) : null;
          const isToday = cell.iso === todayIso;
          const title = inCycle
            ? buildDayTitle(cell.iso, dayMarkers)
            : undefined;
          const column = index % 7;
          const connectsLeft =
            Boolean(fillKind) &&
            column > 0 &&
            fillKindForCell(cells[index - 1], markers) === fillKind;
          const connectsRight =
            Boolean(fillKind) &&
            column < 6 &&
            fillKindForCell(cells[index + 1], markers) === fillKind;

          return (
            <div
              key={cell.iso}
              className={[
                "pd-cycle-calendar__day",
                cell.inMonth ? "is-in-month" : "is-adjacent",
                inCycle ? "is-in-cycle" : "",
                fillKind ? `fill-${fillKind}` : "",
                fillKind && MILESTONE_KINDS.has(fillKind) ? "is-milestone" : "",
                connectsLeft ? "is-connect-left" : "",
                connectsRight ? "is-connect-right" : "",
                isToday ? "is-today" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              role="gridcell"
              title={title}
              aria-label={title ?? `${cell.day}`}
              aria-current={isToday ? "date" : undefined}
            >
              <span className="pd-cycle-calendar__day-num">{cell.day}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function fillKindForCell(
  cell: { iso: string } | undefined,
  markers: ReturnType<typeof extractCycleCalendarMarkers>,
): CycleCalendarMarkerKind | null {
  if (!cell?.iso || !isDateInCycle(cell.iso, markers.bounds)) return null;
  return primaryCalendarFillKind(markersForDay(cell.iso, markers));
}

function buildDayTitle(
  isoDate: string,
  dayMarkers: ReturnType<typeof markersForDay>,
): string {
  const parts = [formatShortDate(isoDate)];
  for (const range of dayMarkers.ranges) {
    if (range.kind === "cycle") continue;
    parts.push(range.label);
  }
  for (const milestone of dayMarkers.milestones) {
    parts.push(milestone.label);
  }
  return parts.join(" · ");
}
