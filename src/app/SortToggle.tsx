export function SortToggle({
  sortBy,
  onChange,
}: {
  sortBy: "sd" | "score";
  onChange: (sortBy: "sd" | "score") => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span
        className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
          sortBy === "score" ? "text-ink" : "text-ink-muted"
        }`}
      >
        Score
      </span>
      <span className="sort-toggle">
        <input
          type="checkbox"
          className="sort-toggle-input"
          checked={sortBy === "sd"}
          onChange={(e) => onChange(e.target.checked ? "sd" : "score")}
        />
        <span className="sort-toggle-indicator" />
      </span>
      <span
        className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
          sortBy === "sd" ? "text-ink" : "text-ink-muted"
        }`}
      >
        SD
      </span>
    </label>
  );
}
