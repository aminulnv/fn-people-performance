import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Link2 } from "lucide-react";
import { cx } from "@/lib/cx";
import { proofLinkLabel, proofParts } from "@/lib/goals/proof";
import {
  logPopoverCoords,
  visibleLogPopoverBounds,
} from "@/pages/goals/logPopoverPosition";

function keepRowClickFromOpening(event: { stopPropagation(): void }) {
  event.stopPropagation();
}

export function MeasureProofFields({
  proofUrl,
  onChange,
  name = "measure",
  disabled = false,
  open: openProp,
  onOpenChange,
}: {
  proofUrl?: string;
  comment?: string;
  onChange?: (next: { proofUrl?: string; comment?: string }) => void;
  name?: string;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const committedHref = proofParts(proofUrl).href;
  const hasProof = Boolean(committedHref);
  const canEdit = Boolean(onChange) && !disabled;
  const headingId = useId();
  const [openState, setOpenState] = useState(Boolean(openProp));
  const [draft, setDraft] = useState(proofUrl ?? "");
  const [isWriting, setIsWriting] = useState(false);
  const [coords, setCoords] = useState<CSSProperties>();
  const draftRef = useRef(draft);
  const rootRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const open = openProp ?? openState;
  draftRef.current = draft;

  const setOpen = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
  };

  const persist = (value: string) => {
    const trimmed = value.trim();
    const next = proofParts(value).href;
    setIsWriting(false);

    if (!trimmed) {
      setDraft("");
      if (committedHref) onChange?.({ proofUrl: undefined });
      return;
    }

    if (!next) {
      setDraft(committedHref ?? proofUrl ?? "");
      return;
    }

    setDraft(next);
    if (next === committedHref) return;
    onChange?.({ proofUrl: next });
  };

  const close = () => {
    persist(draftRef.current);
    setOpen(false);
  };

  const toggle = () => {
    if (!canEdit) return;
    if (open) close();
    else {
      setDraft(proofUrl ?? "");
      setIsWriting(false);
      setOpen(true);
    }
  };

  useEffect(() => {
    if (isWriting) return;
    setDraft(proofUrl ?? "");
  }, [proofUrl, isWriting]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        rootRef.current?.contains(target) ||
        popRef.current?.contains(target)
      ) {
        return;
      }
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, committedHref, onChange]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(undefined);
      return;
    }

    const update = () => {
      const trigger = rootRef.current;
      if (!trigger) return;
      const pop = popRef.current;
      setCoords(
        logPopoverCoords(
          trigger.getBoundingClientRect(),
          pop
            ? {
                width: pop.offsetWidth,
                height: Math.max(pop.offsetHeight, pop.scrollHeight),
              }
            : undefined,
          visibleLogPopoverBounds(),
        ),
      );
    };

    update();
    const frame = window.requestAnimationFrame(update);
    const observer =
      popRef.current && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(update)
        : null;
    if (popRef.current && observer) observer.observe(popRef.current);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  if (!canEdit && !hasProof) return null;

  const triggerLabel = hasProof
    ? `Edit proof for ${name}`
    : `Add Proof For ${name}`;
  const draftHref = proofParts(draft).href;
  const openHref = draftHref ?? committedHref;
  const showSaved =
    Boolean(committedHref) && !isWriting && draftHref === committedHref;

  const popover =
    open && canEdit ? (
      <div
        ref={popRef}
        className="pd-goals-table__log-pop pd-goals-table__log-pop--portal pd-goal-proof__pop"
        style={{ ...coords, visibility: coords ? "visible" : "hidden" }}
        role="dialog"
        aria-labelledby={headingId}
        onClick={keepRowClickFromOpening}
        onKeyDown={keepRowClickFromOpening}
      >
        <p className="pd-goal-proof__pop-title" id={headingId}>
          <span>Proof URL</span>
          {showSaved ? (
            <span className="pd-goal-proof__saved">
              <span className="pd-goal-proof__saved-dot" aria-hidden />
              Saved
            </span>
          ) : null}
        </p>
        <div className="pd-goal-proof__link-row">
          <Link2 size={13} strokeWidth={2} aria-hidden />
          <label className="pd-goal-proof__link-field">
            <span className="pd-sr-only">Proof link for {name}</span>
            <input
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://"
              value={draft}
              aria-label={`Proof link for ${name}`}
              autoFocus
              onChange={(event) => {
                setIsWriting(true);
                setDraft(event.target.value);
              }}
              onBlur={(event) => persist(event.target.value)}
            />
          </label>
          {openHref ? (
            <a
              className="pd-goal-proof__open-btn"
              href={openHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open proof for ${name} in a new tab`}
              onClick={keepRowClickFromOpening}
            >
              <ExternalLink size={13} strokeWidth={2} aria-hidden />
            </a>
          ) : null}
        </div>
      </div>
    ) : null;

  const urlButtonClass = cx(
    "pd-goal-proof__url-btn",
    hasProof && "is-linked",
  );

  return (
    <div
      ref={rootRef}
      className="pd-goal-proof"
      onClick={keepRowClickFromOpening}
      onKeyDown={keepRowClickFromOpening}
    >
      {canEdit ? (
        <button
          type="button"
          className={urlButtonClass}
          aria-label={triggerLabel}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={toggle}
        >
          <Link2 size={16} strokeWidth={1.75} aria-hidden />
        </button>
      ) : committedHref ? (
        <a
          className={urlButtonClass}
          href={committedHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open proof for ${name}`}
          onClick={keepRowClickFromOpening}
        >
          <Link2 size={16} strokeWidth={1.75} aria-hidden />
        </a>
      ) : null}
      {popover && typeof document !== "undefined"
        ? createPortal(popover, document.body)
        : null}
    </div>
  );
}

export function MeasureProofReadout({
  proofUrl,
}: {
  proofUrl?: string;
}) {
  const { href } = proofParts(proofUrl);
  if (!href) return null;

  return (
    <div className="pd-goal-proof-readout">
      <a
        className="pd-goal-proof__url-btn is-linked"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open proof at ${proofLinkLabel(href)}`}
        title={href}
        onClick={(event) => event.stopPropagation()}
      >
        <Link2 size={16} strokeWidth={1.75} aria-hidden />
      </a>
    </div>
  );
}
