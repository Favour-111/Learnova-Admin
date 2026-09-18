import React from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  message,
  icon,
  action,
}: {
  title: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-backgroundAlt text-textMuted">
        {icon ?? <Inbox size={20} />}
      </div>
      <div>
        <p className="font-semibold text-textPrimary">{title}</p>
        {message ? <p className="mt-1 text-sm text-textSecondary">{message}</p> : null}
      </div>
      {action}
    </div>
  );
}
