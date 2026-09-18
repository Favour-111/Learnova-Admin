export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-border/70 ${className}`} />;
}

// Mirrors DataTable's row shape so a loading table doesn't jump in height
// once real rows arrive.
export function TableRowSkeleton({ columns }: { columns: number }) {
  return (
    <tr className="border-b border-border last:border-0">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <Skeleton className="h-4 w-24" />
        </td>
      ))}
    </tr>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-soft">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-16" />
    </div>
  );
}
