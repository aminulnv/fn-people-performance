import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  daysInMonth,
  extractCycleCalendarMarkers,
  initialCalendarMonthIndex,
  isDateInCycle,
  legendItems,
  listCycleCalendarMonths,
  markersForDay,
  primaryCalendarFillKind,
  toIsoDate,
  weekdayIndex,
  type CycleCalendarMonth,
} from "@/lib/reviews/cycleCalendar";
import { formatShortDate } from "@/lib/reviews/periods";
import type { ReviewCycle } from "@/lib/reviews/types";

type CycleSettingsCalendarProps = {
  cycle: ReviewCycle;
  today?: Date;
  size?: "default" | "large";
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

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
  const activeMonth = months[monthIndex] ?? months[0]
  const canGoPrev = monthIndex > 0
  const canGoNext = monthIndex < months.length - 1

  if (!activeMonth) {
    return null
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
          className="pd-people__icon-btn pd-cycle-calendar__nav-btn"
          aria-label="Previous month"
          disabled={!canGoPrev}
          onClick={() => setMonthIndex((index) => Math.max(0, index - 1))}
        >
          <ChevronLeft size={18} strokeWidth={2} aria-hidden />
        </button>
        <p className="pd-cycle-calendar__nav-label">
          {MONTH_LABELS[activeMonth.month - 1]} {activeMonth.year}
        </p>
        <button
          type="button"
          className="pd-people__icon-btn pd-cycle-calendar__nav-btn"
          aria-label="Next month"
          disabled={!canGoNext}
          onClick={() =>
            setMonthIndex((index) => Math.min(months.length - 1, index + 1))
          }
        >
          <ChevronRight size={18} strokeWidth={2} aria-hidden />
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
  const totalDays = daysInMonth(month.year, month.month);
  const leadingBlanks = weekdayIndex(month.year, month.month, 1);
  const cells: Array<{ iso: string | null; day: number | null }> = [];

  for (let index = 0; index < leadingBlanks; index += 1) {
    cells.push({ iso: null, day: null });
  }
  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({
      iso: toIsoDate(month.year, month.month, day),
      day,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ iso: null, day: null });
  }

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
          if (!cell.iso || cell.day == null) {
            return (
              <span
                key={`blank-${month.key}-${index}`}
                className="pd-cycle-calendar__day is-empty"
                aria-hidden
              />
            );
          }

          const inCycle = isDateInCycle(cell.iso, markers.bounds);
          const dayMarkers = markersForDay(cell.iso, markers);
          const fillKind = inCycle ? primaryCalendarFillKind(dayMarkers) : null;
          const isToday = cell.iso === todayIso;
          const title = inCycle ? buildDayTitle(cell.iso, dayMarkers) : undefined;

          if (!inCycle) {
            return (
              <span
                key={`outside-${month.key}-${index}`}
                className="pd-cycle-calendar__day is-empty"
                aria-hidden
              />
            );
          }

          return (
            <div
              key={cell.iso}
              className={[
                "pd-cycle-calendar__day",
                fillKind ? `fill-${fillKind}` : "",
                isToday ? "is-today" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              role="gridcell"
              title={title}
              aria-label={title}
            >
              <span className="pd-cycle-calendar__day-num">{cell.day}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
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
