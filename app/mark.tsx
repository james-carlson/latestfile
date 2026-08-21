// The wordmark's glyph: the same declared-list mark as the favicon, minus the
// container box. The box exists so the favicon holds its own in a browser tab;
// inline on the site it would just be a dark square on a dark background.
//
// Colour comes from `currentColor`, so it inherits whatever it sits in.

export function Mark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 38"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="0" y="0" width="48" height="7" rx="3.5" fill="currentColor" />
      <rect x="0" y="15.5" width="48" height="7" rx="3.5" fill="currentColor" />
      <rect x="0" y="31" width="27" height="7" rx="3.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
