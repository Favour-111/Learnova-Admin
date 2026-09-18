import { notFound } from "next/navigation";

interface VerifyResponse {
  authentic: boolean;
  studentName?: string;
  courseName?: string;
  completedAt?: string;
  finalScore?: number;
  certificateId?: string;
  error?: string;
}

async function fetchCertificate(certificateId: string): Promise<VerifyResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
  const res = await fetch(`${apiUrl}/certificates/verify/${certificateId}`, { cache: "no-store" });
  return res.json();
}

export default async function VerifyPage({ params }: { params: { certificateId: string } }) {
  const result = await fetchCertificate(params.certificateId);

  if (!result.authentic) {
    notFound();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-backgroundAlt px-6">
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
          <span className="text-2xl text-success">✓</span>
        </div>
        <h1 className="text-xl font-extrabold text-textPrimary">Certificate Authentic</h1>
        <div className="mt-6 space-y-3 text-left text-sm">
          <Row label="Student" value={result.studentName} />
          <Row label="Course" value={result.courseName} />
          <Row label="Score" value={String(result.finalScore)} />
          <Row label="Completed" value={result.completedAt ? new Date(result.completedAt).toLocaleDateString() : undefined} />
          <Row label="Certificate ID" value={result.certificateId} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between border-b border-border pb-2">
      <span className="text-textSecondary">{label}</span>
      <span className="font-semibold text-textPrimary">{value ?? "—"}</span>
    </div>
  );
}
