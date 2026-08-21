import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui";
import { dayValue, formatShortDate } from "@/lib/reviews/periods";
import {
  createCycleGroup,
  deleteCycleGroup,
} from "@/lib/reviews/store";
import { cycleForOverviewCalendar } from "@/lib/reviews/cycleCalendar";
import { PURPOSE_HINT, PURPOSE_LABEL } from "@/lib/reviews/purpose";
import { describeEnabledFlow } from "@/lib/reviews/reviewStages";
import type { CycleGroup, ReviewCycle } from "@/lib/reviews/types";
import { CycleSettingsCalendar } from "./CycleSettingsCalendar";
import { CycleDetailsEditPage } from "./CycleDetailsEditPage";
import { CycleGroupsSection } from "./CycleGroupsSection";
import { GroupSettingsView } from "./GroupSettingsView";
import { SettingsSidePanel } from "./SettingsSidePanel";

type CycleSettingsViewProps = {
  cycle: ReviewCycle;
};

type EditTarget = "cycle-details" | { groupId: string } | null;

export function CycleSettingsView({ cycle }: CycleSettingsViewProps) {
  const [editing, setEditing] = useState<EditTarget>(null);
  const [openedGroup, setOpenedGroup] = useState<CycleGroup | null>(null);
  const groups = cycle.groups ?? [];
  const editingGroup =
    editing && typeof editing === "object"
      ? (groups.find((item) => item.id === editing.groupId) ??
        (openedGroup?.id === editing.groupId ? openedGroup : null))
      : null;
  const cycleForEditor =
    editingGroup && !groups.some((group) => group.id === editingGroup.id)
      ? { ...cycle, groups: [...groups, editingGroup] }
      : cycle;
  const closeEditor = () => {
    setEditing(null);
    setOpenedGroup(null);
  };
  const openGroup = (group: CycleGroup) => {
    setOpenedGroup(group);
    setEditing({ groupId: group.id });
  };

  const calendarCycle = cycleForOverviewCalendar(cycle);
  const sameYear = cycle.startDate.slice(0, 4) === cycle.endDate.slice(0, 4);
  const dayCount = inclusiveDayCount(cycle.startDate, cycle.endDate);

  return (
    <div className="pd-reviews-settings">
      <section
        className="pd-reviews-overview"
        aria-labelledby="cycle-overview-heading"
      >
        <div className="pd-reviews-overview__identity">
          <header className="pd-reviews-overview__toolbar">
            <h2
              className="pd-reviews-overview__eyebrow"
              id="cycle-overview-heading"
            >
              Cycle details
            </h2>
            <EditButton onClick={() => setEditing("cycle-details")} />
          </header>

          <div className="pd-reviews-overview__span">
            <div className="pd-reviews-overview__date">
              <span className="pd-reviews-overview__date-label">Starts</span>
              <span className="pd-reviews-overview__date-value">
                {formatShortDate(cycle.startDate, {
                  omitYear: sameYear,
                })}
              </span>
            </div>
            <div className="pd-reviews-overview__span-track" aria-hidden>
              <span className="pd-reviews-overview__span-line" />
              <span className="pd-reviews-overview__span-meta">
                {dayCount === 1 ? "1 day" : `${dayCount} days`}
              </span>
              <span className="pd-reviews-overview__span-line" />
            </div>
            <div className="pd-reviews-overview__date pd-reviews-overview__date--end">
              <span className="pd-reviews-overview__date-label">Ends</span>
              <span className="pd-reviews-overview__date-value">
                {formatShortDate(cycle.endDate)}
              </span>
            </div>
          </div>
          <p className="pd-reviews-flow__hint">
            {PURPOSE_LABEL[cycle.purpose ?? "quarterly_checkin"]}.{" "}
            {PURPOSE_HINT[cycle.purpose ?? "quarterly_checkin"]}{" "}
            {groups[0]
              ? describeEnabledFlow(groups[0].stagesConfig.reviewStages)
              : "Add a group to turn stages on for people."}
          </p>
        </div>

        <div className="pd-reviews-overview__calendar">
          <CycleSettingsCalendar cycle={calendarCycle} size="large" />
        </div>
      </section>

      <CycleGroupsSection
        cycle={cycle}
        onAddGroup={() => {
          void createCycleGroup(cycle.id, { name: "New group" })
            .then((group) => {
              openGroup(group);
            })
            .catch(() => {});
        }}
        onDelete={(groupId) => {
          void deleteCycleGroup(cycle.id, groupId).catch(() => {});
        }}
        onOpenGroup={(groupId) => {
          const group = groups.find((item) => item.id === groupId);
          if (group) openGroup(group);
        }}
      />

      {editing === "cycle-details" ? (
        <SettingsSidePanel
          label="Cycle details"
          closeLabel="Close cycle details"
          onClose={closeEditor}
        >
          <CycleDetailsEditPage
            cycle={cycle}
            embedded
            onClose={closeEditor}
          />
        </SettingsSidePanel>
      ) : null}

      {editingGroup ? (
        <GroupSettingsView
          cycle={cycleForEditor}
          group={editingGroup}
          onClose={closeEditor}
        />
      ) : null}
    </div>
  );
}

function inclusiveDayCount(startDate: string, endDate: string): number {
  const days =
    Math.round((dayValue(endDate) - dayValue(startDate)) / 86_400_000) + 1;
  return Number.isFinite(days) && days > 0 ? days : 1;
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="primary" size="sm" pill onClick={onClick}>
      <Pencil size={13} strokeWidth={2} aria-hidden />
      Edit
    </Button>
  );
}
