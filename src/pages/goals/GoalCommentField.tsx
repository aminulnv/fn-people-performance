import { useId, useMemo, useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui";
import { avatarStyle } from "@/lib/employees/avatar";
import {
  filterMentionCandidates,
  insertMention,
  mentionQueryAt,
  type MentionablePerson,
} from "@/lib/goals/mentions";

export function GoalCommentField({
  id,
  value,
  onChange,
  people,
  disabled,
  placeholder,
  label,
  onSubmit,
  onCancel,
  children,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  people: MentionablePerson[];
  disabled?: boolean;
  placeholder?: string;
  label: string;
  onSubmit: () => void;
  onCancel?: () => void;
  children?: ReactNode;
}) {
  const listId = useId();
  const [cursor, setCursor] = useState(value.length);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mentionsDismissed, setMentionsDismissed] = useState(false);

  const query = mentionQueryAt(value, cursor);
  const suggestions = useMemo(
    () => (query ? filterMentionCandidates(people, query.query) : []),
    [people, query],
  );
  const mentionOpen = Boolean(
    query && suggestions.length > 0 && !disabled && !mentionsDismissed,
  );

  const mentionCursor = (position: number, text: string) => {
    if (mentionQueryAt(text, position)) return position;
    return mentionQueryAt(text, text.length) ? text.length : position;
  };

  const applyMention = (person: MentionablePerson) => {
    const next = insertMention(value, mentionCursor(cursor, value), person);
    onChange(next.text);
    setCursor(next.cursor);
    setActiveIndex(0);
  };

  return (
    <label className="pd-goal-view__composer" htmlFor={id}>
      <span className="pd-sr-only">{label}</span>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={mentionOpen}
        aria-controls={mentionOpen ? listId : undefined}
        aria-activedescendant={
          mentionOpen ? `${listId}-${suggestions[activeIndex]?.id}` : undefined
        }
        onChange={(event) => {
          const nextValue = event.target.value;
          const selection = event.target.selectionStart ?? nextValue.length;
          onChange(nextValue);
          setCursor(mentionCursor(selection, nextValue));
          setActiveIndex(0);
          setMentionsDismissed(false);
        }}
        onClick={(event) => {
          setCursor(event.currentTarget.selectionStart ?? value.length);
        }}
        onKeyUp={(event) => {
          setCursor(event.currentTarget.selectionStart ?? value.length);
        }}
        onKeyDown={(event) => {
          if (mentionOpen && event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index) => (index + 1) % suggestions.length);
            return;
          }
          if (mentionOpen && event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex(
              (index) => (index - 1 + suggestions.length) % suggestions.length,
            );
            return;
          }
          if (mentionOpen && event.key === "Enter") {
            event.preventDefault();
            const person = suggestions[activeIndex];
            if (person) applyMention(person);
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            if (mentionOpen) {
              setMentionsDismissed(true);
              return;
            }
            onCancel?.();
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
        }}
      />
      {mentionOpen ? (
        <ul
          id={listId}
          className="pd-goal-view__mentions"
          role="listbox"
          aria-label="Tag someone"
        >
          {suggestions.map((person, index) => (
            <li key={person.id} role="presentation">
              <button
                id={`${listId}-${person.id}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={
                  index === activeIndex
                    ? "pd-goal-view__mention-option is-active"
                    : "pd-goal-view__mention-option"
                }
                onMouseDown={(event) => {
                  event.preventDefault();
                  applyMention(person);
                }}
              >
                <Avatar
                  name={person.name}
                  src={person.avatarUrl}
                  size="sm"
                  className="pd-people__avatar"
                  style={avatarStyle(person.name)}
                />
                <span>
                  <strong>{person.name}</strong>
                  {person.title ? <em>{person.title}</em> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {children}
    </label>
  );
}
