export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-soft">
      <p className="text-sm text-textSecondary">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-textPrimary">{value}</p>
    </div>
  );
}
