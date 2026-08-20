export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        className="origin-center transition-transform duration-300 ease-out group-hover:-translate-x-0.5"
        d="M30 10 8 32l22 22 8.5-8.5L25 32l13.5-13.5L30 10Z"
        fill="currentColor"
      />
      <path
        className="origin-center transition-transform duration-300 ease-out group-hover:scale-105"
        d="M40 18.5 66 32 40 45.5V18.5Z"
        fill="currentColor"
      />
      <path
        className="origin-center transition-transform duration-300 ease-out group-hover:translate-x-0.5"
        d="M66 10 88 32 66 54l-8.5-8.5L71 32 57.5 18.5 66 10Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="group inline-flex items-center gap-2 text-paper">
        <Mark className="h-5 w-8" />
        <span>Code Along</span>
      </span>
    </span>
  );
}
