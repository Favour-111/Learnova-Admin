"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { api } from "@/lib/api";

export default function AnalyticsPage() {
  const { data } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const res = await api.get("/admin/dashboard");
      return res.data as {
        userCount: number;
        courseCount: number;
        publishedCourseCount: number;
        certificateCount: number;
        projectAttempts: number;
      };
    },
  });

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Platform-wide numbers" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total users" value={data?.userCount ?? "—"} />
        <StatCard label="Courses (published / total)" value={`${data?.publishedCourseCount ?? "—"} / ${data?.courseCount ?? "—"}`} />
        <StatCard label="Certificates issued" value={data?.certificateCount ?? "—"} />
        <StatCard label="Project attempts" value={data?.projectAttempts ?? "—"} />
      </div>
      <p className="mt-6 text-sm text-textSecondary">
        This reuses the dashboard summary endpoint. Deeper analytics (cohort retention, funnel drop-off, per-course completion
        rates) would warrant dedicated aggregation endpoints in <code className="rounded bg-backgroundAlt px-1">backend</code> —
        not built yet.
      </p>
    </div>
  );
}
