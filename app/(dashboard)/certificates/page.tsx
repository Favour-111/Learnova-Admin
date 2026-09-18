"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { api } from "@/lib/api";

interface Certificate {
  _id: string;
  certificateId: string;
  user: { name: string; email: string };
  courseName: string;
  finalScore: number;
  completedAt: string;
}

export default function CertificatesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "certificates"],
    queryFn: async () => {
      const { data } = await api.get<{ certificates: Certificate[] }>("/admin/certificates");
      return data.certificates;
    },
  });

  return (
    <div>
      <PageHeader title="Certificates" subtitle="Every certificate issued, verifiable by ID" />

      <DataTable
        columns={[
          { header: "Certificate ID", render: (c) => c.certificateId },
          { header: "Learner", render: (c) => c.user?.name ?? "—" },
          { header: "Course", render: (c) => c.courseName },
          { header: "Score", render: (c) => c.finalScore },
          { header: "Issued", render: (c) => new Date(c.completedAt).toLocaleDateString() },
        ]}
        rows={data ?? []}
        rowKey={(c) => c._id}
        isLoading={isLoading}
      />
    </div>
  );
}
