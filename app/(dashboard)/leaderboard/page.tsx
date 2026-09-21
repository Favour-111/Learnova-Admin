"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { api } from "@/lib/api";

interface Entry {
  _id: string;
  user: { name: string; email: string };
  weeklyXp: number;
  rank: number;
}

export default function LeaderboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "leaderboard"],
    queryFn: async () => {
      const { data } = await api.get<{ board: { weekStart: string; weekEnd: string }; entries: Entry[] }>("/admin/leaderboard");
      return data;
    },
  });

  return (
    <div>
      <PageHeader
        title="Leaderboard"
        subtitle={
          data
            ? `Current week: ${new Date(data.board.weekStart).toLocaleDateString()} – ${new Date(data.board.weekEnd).toLocaleDateString()}`
            : "This week's weekly-XP ranking"
        }
      />

      <DataTable
        columns={[
          { header: "Rank", render: (e) => `#${e.rank}` },
          { header: "Learner", render: (e) => e.user?.name ?? "" },
          { header: "Weekly XP", render: (e) => e.weeklyXp.toLocaleString() },
        ]}
        rows={data?.entries ?? []}
        rowKey={(e) => e._id}
        isLoading={isLoading}
      />

      <p className="mt-4 text-xs text-textMuted">
        Weekly settlement (pay out top 5, freeze, reset) runs via{" "}
        <code className="rounded bg-backgroundAlt px-1 py-0.5">npm run cron:settle-leaderboard</code> on the backend  point your
        host&apos;s scheduled-job feature at it.
      </p>
    </div>
  );
}
