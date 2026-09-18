"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { api } from "@/lib/api";

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  level: number;
  xp: number;
  credits: number;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data } = await api.get<{ users: AdminUser[] }>("/admin/users");
      return data.users;
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "user" | "admin" }) => api.put(`/admin/users/${id}/role`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  return (
    <div>
      <PageHeader title="Users" subtitle="Everyone registered on Learnova" />

      <DataTable
        columns={[
          { header: "Name", render: (u) => u.name },
          { header: "Email", render: (u) => u.email },
          { header: "Level", render: (u) => u.level },
          { header: "XP", render: (u) => u.xp.toLocaleString() },
          { header: "Credits", render: (u) => u.credits.toLocaleString() },
          {
            header: "Role",
            render: (u) => (
              <button
                className={`rounded-pill px-3 py-1 text-xs font-semibold ${
                  u.role === "admin" ? "bg-primary/10 text-primary" : "bg-backgroundAlt text-textSecondary"
                }`}
                onClick={() => setRole.mutate({ id: u._id, role: u.role === "admin" ? "user" : "admin" })}
              >
                {u.role}
              </button>
            ),
          },
        ]}
        rows={data ?? []}
        rowKey={(u) => u._id}
        isLoading={isLoading}
      />
    </div>
  );
}
