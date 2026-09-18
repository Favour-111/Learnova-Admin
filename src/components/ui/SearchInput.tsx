import { Search } from "lucide-react";

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full max-w-xs">
      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search..."}
        className="w-full rounded-xl border border-border bg-backgroundAlt py-2.5 pl-10 pr-4 text-sm text-textPrimary outline-none transition-colors focus:border-primary"
      />
    </div>
  );
}
