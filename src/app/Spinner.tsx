export function Spinner({ className = "text-lg" }: { className?: string }) {
  return (
    <span
      className={`material-symbols-outlined animate-spin ${className}`}
      aria-hidden="true"
    >
      progress_activity
    </span>
  );
}
