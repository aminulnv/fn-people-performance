import { Fragment } from "react";
import { Link } from "react-router-dom";
import {
  splitCommentMentions,
  type MentionablePerson,
} from "@/lib/goals/mentions";

export function GoalCommentText({
  text,
  people,
}: {
  text: string;
  people: MentionablePerson[];
}) {
  return (
    <p className="pd-goal-view__comment-text">
      {splitCommentMentions(text, people).map((part, index) =>
        part.kind === "mention" ? (
          <Link
            key={`${part.person.id}-${index}`}
            to={`/people/${part.person.id}`}
            className="pd-goal-view__mention"
          >
            @{part.person.name}
          </Link>
        ) : (
          <Fragment key={`text-${index}`}>{part.value}</Fragment>
        ),
      )}
    </p>
  );
}
