export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-extrabold text-textPrimary">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-textSecondary">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
