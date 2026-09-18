"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Users, BookOpen, CheckCircle2, Award, Rocket, LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCardSkeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";

interface DashboardStats {
  userCount: number;
  courseCount: number;
  publishedCourseCount: number;
  certificateCount: number;
  projectAttempts: number;
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-soft transition-shadow hover:shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm text-textSecondary">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon size={16} />
        </div>
      </div>
      <p className="mt-3 text-3xl font-extrabold text-textPrimary">{value.toLocaleString()}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const res = await api.get<DashboardStats>("/admin/dashboard");
      return res.data;
    },
  });

  const firstName = user?.firstName ?? "Admin";

  return (
    <div>
      <PageHeader title={`Good to see you, ${firstName} 👋`} subtitle="Here's what's happening with Learnova today." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {isLoading || !data ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Users" value={data.userCount} icon={Users} />
            <StatCard label="Courses" value={data.courseCount} icon={BookOpen} />
            <StatCard label="Published Courses" value={data.publishedCourseCount} icon={CheckCircle2} />
            <StatCard label="Certificates Issued" value={data.certificateCount} icon={Award} />
            <StatCard label="Project Attempts" value={data.projectAttempts} icon={Rocket} />
          </>
        )}
      </div>
    </div>
  );
}
