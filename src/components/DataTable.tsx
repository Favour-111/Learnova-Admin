import { TableRowSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

interface Column<T> {
  header: string;
  render: (row: T) => React.ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyLabel?: string;
  emptyMessage?: string;
  isLoading?: boolean;
}

export function DataTable<T>({ columns, rows, rowKey, emptyLabel = "Nothing here yet.", emptyMessage, isLoading }: Props<T>) {
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-soft">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-textSecondary">
            {columns.map((col) => (
              <th key={col.header} className="px-5 py-3.5 font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={columns.length} />)
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState title={emptyLabel} message={emptyMessage} />
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-border last:border-0 transition-colors hover:bg-backgroundAlt">
                {columns.map((col) => (
                  <td key={col.header} className="px-5 py-4 text-textPrimary">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
