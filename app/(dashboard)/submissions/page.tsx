"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea, Select, Button } from "@/components/form";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

interface RequirementResult {
  key: string;
  label: string;
  status: "met" | "partial" | "not_met";
  note?: string;
}

interface CategoryScore {
  key: string;
  label: string;
  score: number;
  maxScore: number;
}

interface Evaluation {
  gptSummary: string;
  strengths: string[];
  areasToImprove: string[];
  detectedIssues: string[];
  recommendations: string[];
  staticAnalysis: { summary?: string; integrityFlags?: string[]; repository?: { owner: string; repo: string; branch: string; commitSha: string } };
  testResults: { executed: boolean; summary: string };
}

interface Attempt {
  _id: string;
  attemptNumber: number;
  score: number;
  passed: boolean;
  categoryScores: CategoryScore[];
  requirementResults: RequirementResult[];
  branch?: string;
  commitSha?: string;
  createdAt: string;
  evaluation?: Evaluation;
  xpAwarded: number;
  creditsAwarded: number;
}

interface Submission {
  _id: string;
  user: { _id: string; name: string; email: string };
  project: { _id: string; title: string; passingScore: number };
  status: "queued" | "processing" | "evaluated" | "failed";
  stage: string;
  stageError?: string;
  githubUrl?: string;
  demoUrl?: string;
  notes?: string;
  branch?: string;
  commitSha?: string;
  createdAt: string;
  evaluatedAt?: string;
  integrityFlags: string[];
  currentAttempt?: Attempt;
  adminReview: { reviewed: boolean; note?: string; overriddenScore?: number; overriddenPassed?: boolean; reviewedAt?: string };
}

const STATUS_STYLE: Record<Submission["status"], "neutral" | "primary" | "success" | "danger"> = {
  queued: "neutral",
  processing: "primary",
  evaluated: "success",
  failed: "danger",
};

const REQUIREMENT_ICON: Record<RequirementResult["status"], string> = { met: "✓", partial: "⚠", not_met: "✗" };

function useSubmissionDetail(id: string | null) {
  return useQuery({
    enabled: !!id,
    queryKey: ["admin", "submissions", id],
    queryFn: async () => {
      const { data } = await api.get<{ submission: Submission; attemptHistory: Attempt[] }>(`/admin/submissions/${id}`);
      return data;
    },
  });
}

export default function SubmissionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"" | "passed" | "failed">("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [overrideNote, setOverrideNote] = useState("");
  const [overrideScore, setOverrideScore] = useState("");
  const [overridePassed, setOverridePassed] = useState<"pass" | "fail">("pass");
  const [overriding, setOverriding] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "submissions", { statusFilter }],
    queryFn: async () => {
      const { data } = await api.get<{ submissions: Submission[] }>("/admin/submissions", { params: statusFilter ? { status: statusFilter } : {} });
      return data.submissions;
    },
  });

  const detail = useSubmissionDetail(openId);

  const override = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/admin/submissions/${openId}/override`, {
        note: overrideNote,
        overriddenPassed: overridePassed === "pass",
        ...(overrideScore ? { overriddenScore: Number(overrideScore) } : {}),
      });
      return data;
    },
    onSuccess: () => {
      toast("success", "Evaluation overridden");
      setOverriding(false);
      setOverrideNote("");
      setOverrideScore("");
      queryClient.invalidateQueries({ queryKey: ["admin", "submissions"] });
    },
    onError: () => toast("error", "Couldn't save the override"),
  });

  const submission = detail.data?.submission;
  const attempt = submission?.currentAttempt;

  return (
    <div>
      <PageHeader title="Submissions" subtitle="Every project submission and its evaluation status" />

      <div className="mb-4 flex gap-2">
        {(["", "passed", "failed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-pill px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s ? "bg-primary text-white" : "bg-surface text-textSecondary hover:bg-backgroundAlt"
            }`}
          >
            {s === "" ? "All" : s === "passed" ? "Passed" : "Failed"}
          </button>
        ))}
      </div>

      <DataTable
        columns={[
          { header: "Learner", render: (s) => s.user?.name ?? "—" },
          { header: "Project", render: (s) => s.project?.title ?? "—" },
          {
            header: "Status",
            render: (s) => <Badge variant={STATUS_STYLE[s.status]}>{s.status}</Badge>,
          },
          { header: "Score", render: (s) => (s.currentAttempt ? `${s.currentAttempt.score}/100 ${s.currentAttempt.passed ? "✓" : ""}` : "—") },
          { header: "Submitted", render: (s) => new Date(s.createdAt).toLocaleString() },
          {
            header: "",
            render: (s) => (
              <button className="text-sm font-medium text-primary" onClick={() => setOpenId(s._id)}>
                View
              </button>
            ),
          },
        ]}
        rows={data ?? []}
        rowKey={(s) => s._id}
        isLoading={isLoading}
        emptyLabel="No submissions yet"
      />

      <Modal
        open={!!openId}
        onClose={() => {
          setOpenId(null);
          setOverriding(false);
        }}
        title="Submission Detail"
        widthClassName="max-w-2xl"
      >
        {detail.isLoading || !submission ? (
          <p className="text-sm text-textSecondary">Loading…</p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-textMuted">Student</p>
                <p className="font-medium text-textPrimary">
                  {submission.user.name} ({submission.user.email})
                </p>
              </div>
              <div>
                <p className="text-textMuted">Project</p>
                <p className="font-medium text-textPrimary">{submission.project.title}</p>
              </div>
              <div>
                <p className="text-textMuted">Repository</p>
                <p className="break-all font-medium text-textPrimary">{submission.githubUrl ?? "—"}</p>
              </div>
              <div>
                <p className="text-textMuted">Commit evaluated</p>
                <p className="font-mono text-xs text-textPrimary">
                  {submission.branch ?? "—"} @ {submission.commitSha?.slice(0, 8) ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-textMuted">Submitted</p>
                <p className="text-textPrimary">{new Date(submission.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-textMuted">Status</p>
                <Badge variant={STATUS_STYLE[submission.status]}>
                  {submission.status}
                  {submission.status === "failed" && submission.stageError ? `: ${submission.stageError}` : ""}
                </Badge>
              </div>
            </div>

            {submission.integrityFlags.length > 0 ? (
              <div className="rounded-xl bg-warning/10 p-3 text-sm text-warning">
                <p className="mb-1 font-semibold">Integrity flags (for review — not an accusation)</p>
                <ul className="list-inside list-disc space-y-0.5">
                  {submission.integrityFlags.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {attempt ? (
              <>
                <div className="rounded-xl border border-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-lg font-bold text-textPrimary">
                      {attempt.score}/100 — Attempt {attempt.attemptNumber}
                    </p>
                    <Badge variant={attempt.passed ? "success" : "danger"}>{attempt.passed ? "PASSED" : "NEEDS IMPROVEMENT"}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                    {attempt.categoryScores.map((c) => (
                      <div key={c.key} className="rounded-lg bg-backgroundAlt px-3 py-2">
                        <p className="text-textMuted">{c.label}</p>
                        <p className="font-semibold text-textPrimary">{c.score}/100</p>
                      </div>
                    ))}
                  </div>
                </div>

                {attempt.requirementResults?.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-textPrimary">Requirement verification</p>
                    <ul className="space-y-1.5">
                      {attempt.requirementResults.map((r) => (
                        <li key={r.key} className="flex items-start gap-2 text-sm">
                          <span
                            className={
                              r.status === "met" ? "text-success" : r.status === "partial" ? "text-warning" : "text-danger"
                            }
                          >
                            {REQUIREMENT_ICON[r.status]}
                          </span>
                          <span className="text-textPrimary">
                            {r.label}
                            {r.note ? <span className="text-textMuted"> — {r.note}</span> : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {attempt.evaluation ? (
                  <div className="space-y-2 text-sm">
                    <p className="text-textPrimary">{attempt.evaluation.gptSummary}</p>
                    {attempt.evaluation.strengths.length > 0 ? (
                      <div>
                        <p className="font-semibold text-success">Strengths</p>
                        <ul className="list-inside list-disc text-textSecondary">
                          {attempt.evaluation.strengths.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {attempt.evaluation.areasToImprove.length > 0 ? (
                      <div>
                        <p className="font-semibold text-warning">Areas to improve</p>
                        <ul className="list-inside list-disc text-textSecondary">
                          {attempt.evaluation.areasToImprove.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {detail.data && detail.data.attemptHistory.length > 1 ? (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-textPrimary">Evaluation history</p>
                    <div className="flex flex-wrap gap-2">
                      {detail.data.attemptHistory.map((a) => (
                        <span key={a._id} className={`rounded-pill px-3 py-1 text-xs font-medium ${a.passed ? "bg-success/10 text-success" : "bg-backgroundAlt text-textSecondary"}`}>
                          Attempt {a.attemptNumber}: {a.score}/100
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {submission.adminReview?.reviewed ? (
                  <div className="rounded-xl bg-primary/5 p-3 text-sm text-textPrimary">
                    <p className="font-semibold">Manually overridden</p>
                    <p className="text-textSecondary">{submission.adminReview.note}</p>
                  </div>
                ) : null}

                {overriding ? (
                  <div className="space-y-3 rounded-xl border border-border p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Result">
                        <Select value={overridePassed} onChange={(e) => setOverridePassed(e.target.value as "pass" | "fail")}>
                          <option value="pass">Pass</option>
                          <option value="fail">Fail</option>
                        </Select>
                      </Field>
                      <Field label="Score (optional)">
                        <Input type="number" value={overrideScore} onChange={(e) => setOverrideScore(e.target.value)} placeholder={String(attempt.score)} />
                      </Field>
                    </div>
                    <Field label="Reason (required)">
                      <Textarea value={overrideNote} onChange={(e) => setOverrideNote(e.target.value)} rows={2} required />
                    </Field>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setOverriding(false)}>
                        Cancel
                      </Button>
                      <Button onClick={() => override.mutate()} loading={override.isPending} disabled={!overrideNote.trim()}>
                        Save Override
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="ghost" onClick={() => setOverriding(true)}>
                    Manually Override Result
                  </Button>
                )}
              </>
            ) : (
              <p className="text-sm text-textSecondary">
                {submission.status === "failed" ? `Evaluation failed: ${submission.stageError}` : `In progress — stage: ${submission.stage}`}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
