export type AssistantMood = 'idle' | 'tip' | 'think' | 'celebrate'

/** Normalized look direction in roughly [-1, 1] for each axis. */
export type AssistantLook = {
  x: number
  y: number
}

type AssistantCharacterProps = {
  mood?: AssistantMood
  look?: AssistantLook
  className?: string
}

const PUPIL_MAX_X = 2.45
const PUPIL_MAX_Y = 2.7

/**
 * Compass mascot with contrast-safe paints.
 * Rim follows brand hue; dial / eyes / ink stay fixed so light themes,
 * neon seeds, and dark mode never wash the character out.
 */
export function AssistantCharacter({
  mood = 'idle',
  look = { x: 0, y: 0 },
  className,
}: AssistantCharacterProps) {
  const pupilX = look.x * PUPIL_MAX_X
  const pupilY = look.y * PUPIL_MAX_Y
  const pupilTransform = `translate(${pupilX} ${pupilY})`

  return (
    <svg
      className={['pd-assistant-char', `pd-assistant-char--${mood}`, className]
        .filter(Boolean)
        .join(' ')}
      viewBox="0 0 96 112"
      width="96"
      height="112"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="pd-pip-rim" x1="16" y1="28" x2="80" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--pd-pip-chrome-lit)" />
          <stop offset="48%" stopColor="var(--pd-pip-chrome)" />
          <stop offset="100%" stopColor="var(--pd-pip-chrome-deep)" />
        </linearGradient>
        <radialGradient id="pd-pip-dial" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="62%" stopColor="var(--pd-pip-dial)" />
          <stop offset="100%" stopColor="var(--pd-pip-dial-edge)" />
        </radialGradient>
        <linearGradient id="pd-pip-needle-n" x1="48" y1="46" x2="48" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--pd-pip-chrome)" />
          <stop offset="100%" stopColor="var(--pd-pip-chrome-deep)" />
        </linearGradient>
      </defs>

      <ellipse
        className="pd-assistant-char__shadow"
        cx="48"
        cy="105"
        rx="19"
        ry="3.8"
        fill="var(--pd-pip-shadow)"
      />

      <g className="pd-assistant-char__body">
        <g className="pd-assistant-char__legs" stroke="url(#pd-pip-rim)" strokeLinecap="round">
          <g className="pd-assistant-char__leg pd-assistant-char__leg--left">
            <path d="M39 86v12" fill="none" strokeWidth="4.2" />
            <path d="M34.5 98.2h9.2" fill="none" strokeWidth="4" />
          </g>
          <g className="pd-assistant-char__leg pd-assistant-char__leg--right">
            <path d="M57 86v12" fill="none" strokeWidth="4.2" />
            <path d="M52.3 98.2h9.2" fill="none" strokeWidth="4" />
          </g>
        </g>

        <g className="pd-assistant-char__hands" fill="url(#pd-pip-rim)">
          <g className="pd-assistant-char__hand pd-assistant-char__hand--left">
            <path
              d="M24.5 58c-4.5 2-8 6.2-8.8 11.2"
              fill="none"
              stroke="url(#pd-pip-rim)"
              strokeWidth="4.2"
              strokeLinecap="round"
            />
            <circle cx="14.8" cy="71.5" r="3.4" />
          </g>
          <g className="pd-assistant-char__hand pd-assistant-char__hand--right">
            <path
              d="M71.5 58c4.5 2 8 6.2 8.8 11.2"
              fill="none"
              stroke="url(#pd-pip-rim)"
              strokeWidth="4.2"
              strokeLinecap="round"
            />
            <circle cx="81.2" cy="71.5" r="3.4" />
          </g>
        </g>

        <g className="pd-assistant-char__compass">
          {/* Soft keyline keeps the silhouette clear on both light and dark canvases */}
          <circle
            cx="48"
            cy="60"
            r="27.2"
            fill="none"
            stroke="var(--pd-pip-outline)"
            strokeWidth="1.6"
          />
          <circle cx="48" cy="60" r="26" fill="url(#pd-pip-rim)" />
          <circle cx="48" cy="60" r="20" fill="url(#pd-pip-dial)" />
          <circle
            cx="48"
            cy="60"
            r="17.5"
            fill="none"
            stroke="var(--pd-pip-dial-ring)"
            strokeWidth="1.15"
          />

          <g stroke="var(--pd-pip-tick)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M48 45.5v2.6" />
            <path d="M48 71.9v2.6" />
            <path d="M33.5 60h2.6" />
            <path d="M59.9 60h2.6" />
          </g>

          <g className="pd-assistant-char__needle">
            <path d="M48 46.5 L51.8 60 L48 58.4 L44.2 60 Z" fill="url(#pd-pip-needle-n)" />
            <path d="M48 73.5 L44.2 60 L48 61.6 L51.8 60 Z" fill="var(--pd-pip-needle-s)" />
            <circle
              cx="48"
              cy="60"
              r="2.2"
              fill="#fff"
              stroke="var(--pd-pip-chrome-deep)"
              strokeWidth="1.15"
            />
          </g>
        </g>

        <g className="pd-assistant-char__face">
          <g className="pd-assistant-char__brows" fill="var(--pd-pip-ink)">
            <rect
              className="pd-assistant-char__brow pd-assistant-char__brow--left"
              x="34.2"
              y="16.2"
              width="7.2"
              height="1.6"
              rx="0.8"
              transform="rotate(-8 37.8 17)"
            />
            <rect
              className="pd-assistant-char__brow pd-assistant-char__brow--right"
              x="54.6"
              y="16.2"
              width="7.2"
              height="1.6"
              rx="0.8"
              transform="rotate(8 58.2 17)"
            />
          </g>

          <g className="pd-assistant-char__eyes">
            <g className="pd-assistant-char__eye pd-assistant-char__eye--left">
              <ellipse
                cx="38.5"
                cy="27"
                rx="7.6"
                ry="8.2"
                fill="none"
                stroke="var(--pd-pip-outline)"
                strokeWidth="1.4"
              />
              <ellipse
                cx="38.5"
                cy="27"
                rx="7.2"
                ry="7.8"
                fill="var(--pd-pip-eye)"
                stroke="var(--pd-pip-chrome-deep)"
                strokeWidth="2"
              />
              <g className="pd-assistant-char__pupil" transform={pupilTransform}>
                <circle cx="38.5" cy="27" r="3.35" fill="var(--pd-pip-ink)" />
                <circle className="pd-assistant-char__glint" cx="37.4" cy="25.7" r="1.15" fill="#fff" />
              </g>
            </g>
            <g className="pd-assistant-char__eye pd-assistant-char__eye--right">
              <ellipse
                cx="57.5"
                cy="27"
                rx="7.6"
                ry="8.2"
                fill="none"
                stroke="var(--pd-pip-outline)"
                strokeWidth="1.4"
              />
              <ellipse
                cx="57.5"
                cy="27"
                rx="7.2"
                ry="7.8"
                fill="var(--pd-pip-eye)"
                stroke="var(--pd-pip-chrome-deep)"
                strokeWidth="2"
              />
              <g className="pd-assistant-char__pupil" transform={pupilTransform}>
                <circle cx="57.5" cy="27" r="3.35" fill="var(--pd-pip-ink)" />
                <circle className="pd-assistant-char__glint" cx="56.4" cy="25.7" r="1.15" fill="#fff" />
              </g>
            </g>
          </g>

          {/* Smile sits on the light dial so ink stays readable on every rim color */}
          <path
            className="pd-assistant-char__mouth"
            d="M43.8 41.2c1.35 2.05 2.85 3 4.2 3s2.85-.95 4.2-3"
            fill="none"
            stroke="var(--pd-pip-ink)"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  )
}
