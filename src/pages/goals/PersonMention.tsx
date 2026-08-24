import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Avatar } from "@/components/ui";
import { avatarStyle } from "@/lib/employees/avatar";
import type { GoalEditLockSegment } from "@/lib/goals/editWindow";

export type MentionPerson = {
  id?: string | null;
  name: string;
  avatarUrl?: string;
};

export function PersonMention({
  person,
  className = "pd-goals-late__person",
}: {
  person: MentionPerson;
  className?: string;
}) {
  const inner = (
    <>
      <Avatar
        name={person.name}
        src={person.avatarUrl}
        size="sm"
        className="pd-goals-late__avatar"
        alt=""
        style={avatarStyle(person.name)}
      />
      <span className="pd-goals-late__person-name">{person.name}</span>
    </>
  );

  if (!person.id) {
    return <span className={className}>{inner}</span>;
  }

  return (
    <Link to={`/people/${person.id}`} className={className}>
      {inner}
    </Link>
  );
}

export function PersonOrRole({
  person,
  fallback,
}: {
  person?: MentionPerson | null;
  fallback: string;
}) {
  if (person) return <PersonMention person={person} />;
  return fallback;
}

/** Names the known approvers; falls back to role titles only when nobody is resolved. */
export function ApproverPair({
  lineManager,
  skipLevelManager,
}: {
  lineManager?: MentionPerson | null;
  skipLevelManager?: MentionPerson | null;
}) {
  const chips: ReactNode[] = [];
  if (lineManager) {
    chips.push(
      <PersonMention key="line-manager" person={lineManager} />,
    );
  }
  if (skipLevelManager) {
    chips.push(
      <PersonMention key="skip-level" person={skipLevelManager} />,
    );
  }
  if (chips.length === 0) {
    return "the direct manager and the skip-level manager";
  }
  if (chips.length === 1) return chips[0];
  return (
    <>
      {chips[0]} and {chips[1]}
    </>
  );
}

export function GoalLockSegments({
  segments,
  lineManager,
  skipLevelManager,
}: {
  segments: GoalEditLockSegment[];
  lineManager?: MentionPerson | null;
  skipLevelManager?: MentionPerson | null;
}) {
  return (
    <>
      {segments.map((segment, index) => {
        if (segment === "lineManager") {
          return (
            <PersonOrRole
              key={`line-${index}`}
              person={lineManager}
              fallback="the direct manager"
            />
          );
        }
        if (segment === "skipLevelManager") {
          return (
            <PersonOrRole
              key={`skip-${index}`}
              person={skipLevelManager}
              fallback="the skip-level manager"
            />
          );
        }
        return <Fragment key={`text-${index}`}>{segment}</Fragment>;
      })}
    </>
  );
}
