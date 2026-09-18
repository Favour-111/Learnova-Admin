import { PageHeader } from "@/components/PageHeader";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Platform-wide configuration" />
      <div className="rounded-card border border-border bg-surface p-6 shadow-soft">
        <p className="text-sm text-textSecondary">
          AI tutor / evaluation instructions, XP rules, and Credit rules currently live as code in the backend
          (<code className="rounded bg-backgroundAlt px-1">backend/src/config/gamification.ts</code> and{" "}
          <code className="rounded bg-backgroundAlt px-1">backend/src/services/openai.ts</code>) rather than an editable admin
          form. Moving them into a DB-backed config collection with an edit form here is a natural next step once those values
          need to change without a redeploy.
        </p>
      </div>
    </div>
  );
}
