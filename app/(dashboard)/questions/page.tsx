"use client";

import { useMemo, useState } from "react";
import { Plus, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea, Button } from "@/components/form";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { AITextarea } from "@/components/ui/AITextarea";
import { useToast } from "@/components/ui/Toast";
import { useAdminCrud } from "@/hooks/useAdminCrud";

interface Quiz {
  _id: string;
  title: string;
}

interface Question {
  _id: string;
  quiz: string;
  type: "multiple_choice" | "true_false" | "code" | "scenario";
  prompt: string;
  options?: string[];
  correctOptionIndex?: number;
  correctBoolean?: boolean;
  explanation?: string;
}

const EMPTY_FORM = {
  quiz: "",
  type: "multiple_choice" as Question["type"],
  prompt: "",
  optionsRaw: "",
  correctOptionIndex: 0,
  correctBoolean: true,
  explanation: "",
};
type QuestionForm = typeof EMPTY_FORM;

export default function QuestionsPage() {
  const { list, create, update, remove } = useAdminCrud<Question>("questions");
  const quizzes = useAdminCrud<Quiz>("quizzes");
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  // Which quiz's question list is open — the questions inside that quiz are
  // only ever shown/managed through this modal, not as a flat table.
  const [openQuiz, setOpenQuiz] = useState<Quiz | null>(null);
  const [editing, setEditing] = useState<Question | "new" | null>(null);
  const [form, setForm] = useState<QuestionForm>(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<Question | null>(null);

  const questionsByQuiz = useMemo(() => {
    const map = new Map<string, Question[]>();
    for (const q of list.data ?? []) {
      const arr = map.get(q.quiz) ?? [];
      arr.push(q);
      map.set(q.quiz, arr);
    }
    return map;
  }, [list.data]);

  const filteredQuizzes = useMemo(() => {
    const rows = quizzes.list.data ?? [];
    if (!search.trim()) return rows;
    const term = search.toLowerCase();
    return rows.filter((quiz) => {
      if (quiz.title.toLowerCase().includes(term)) return true;
      return (questionsByQuiz.get(quiz._id) ?? []).some((question) => question.prompt.toLowerCase().includes(term));
    });
  }, [quizzes.list.data, questionsByQuiz, search]);

  const openCreate = (quiz: Quiz) => {
    setForm({ ...EMPTY_FORM, quiz: quiz._id });
    setEditing("new");
  };
  const openEdit = (q: Question) => {
    setForm({
      quiz: q.quiz,
      type: q.type,
      prompt: q.prompt,
      optionsRaw: (q.options ?? []).join("\n"),
      correctOptionIndex: q.correctOptionIndex ?? 0,
      correctBoolean: q.correctBoolean ?? true,
      explanation: q.explanation ?? "",
    });
    setEditing(q);
  };
  const closeModal = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
  };
  const isSaving = create.isPending || update.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const options = form.optionsRaw
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    const body = {
      quiz: form.quiz,
      type: form.type,
      prompt: form.prompt,
      options: form.type === "true_false" ? [] : options,
      correctOptionIndex: form.type === "true_false" ? undefined : form.correctOptionIndex,
      correctBoolean: form.type === "true_false" ? form.correctBoolean : undefined,
      explanation: form.explanation,
    };
    if (editing === "new") {
      create.mutate(body as never, {
        onSuccess: () => {
          toast("success", "Question created successfully");
          closeModal();
        },
        onError: () => toast("error", "Couldn't create the question"),
      });
    } else if (editing) {
      update.mutate(
        { id: editing._id, body: body as never },
        {
          onSuccess: () => {
            toast("success", "Question updated");
            closeModal();
          },
          onError: () => toast("error", "Couldn't update the question"),
        }
      );
    }
  };

  const handleDelete = () => {
    if (!pendingDelete) return;
    remove.mutate(pendingDelete._id, {
      onSuccess: () => {
        toast("success", "Question deleted");
        setPendingDelete(null);
      },
      onError: () => toast("error", "Couldn't delete this question"),
    });
  };

  const openQuizQuestions = openQuiz ? questionsByQuiz.get(openQuiz._id) ?? [] : [];

  return (
    <div>
      <PageHeader title="Questions" subtitle="Grouped by quiz — open a quiz to view and manage its questions." />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search quizzes or questions..." />
      </div>

      {quizzes.list.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <EmptyState
          title={search ? "No quizzes match your search" : "No quizzes yet"}
          message={search ? undefined : "Create a quiz on the Quizzes page, then add questions to it here."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredQuizzes.map((quiz) => {
            const count = (questionsByQuiz.get(quiz._id) ?? []).length;
            return (
              <button
                key={quiz._id}
                onClick={() => setOpenQuiz(quiz)}
                className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-5 text-left shadow-soft transition-colors hover:border-primary"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="line-clamp-1 font-semibold text-textPrimary">{quiz.title}</span>
                  <ChevronRight size={18} className="shrink-0 text-textMuted" />
                </div>
                <Badge variant={count > 0 ? "primary" : "neutral"}>
                  {count} question{count === 1 ? "" : "s"}
                </Badge>
              </button>
            );
          })}
        </div>
      )}

      <Modal
        open={!!openQuiz}
        onClose={() => setOpenQuiz(null)}
        title={openQuiz?.title ?? ""}
        widthClassName="max-w-2xl"
        footer={
          <Button onClick={() => openQuiz && openCreate(openQuiz)}>
            <Plus size={16} /> Add Question
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          {openQuizQuestions.length === 0 ? (
            <EmptyState title="No questions yet" message="Add the first question to this quiz." />
          ) : (
            openQuizQuestions.map((q) => (
              <div key={q._id} className="flex items-start justify-between gap-3 rounded-xl border border-border p-4">
                <div className="min-w-0">
                  <p className="line-clamp-2 font-medium text-textPrimary">{q.prompt}</p>
                  <Badge variant="neutral">{q.type.replace("_", " ")}</Badge>
                </div>
                <ActionMenu
                  items={[
                    { label: "Edit Question", onClick: () => openEdit(q) },
                    { label: "Delete", onClick: () => setPendingDelete(q), destructive: true },
                  ]}
                />
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal
        open={editing !== null}
        onClose={closeModal}
        title={editing === "new" ? "Create Question" : "Edit Question"}
        widthClassName="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" form="question-form" loading={isSaving}>
              {editing === "new" ? "Create Question" : "Save Changes"}
            </Button>
          </>
        }
      >
        <form id="question-form" className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <Field label="Quiz">
            <Select value={form.quiz} onChange={(e) => setForm({ ...form, quiz: e.target.value })} required>
              <option value="">Select quiz</option>
              {(quizzes.list.data ?? []).map((q) => (
                <option key={q._id} value={q._id}>
                  {q.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Question["type"] })}>
              <option value="multiple_choice">Multiple choice</option>
              <option value="true_false">True / False</option>
              <option value="code">Code</option>
              <option value="scenario">Scenario</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <AITextarea label="Prompt" value={form.prompt} onChange={(v) => setForm({ ...form, prompt: v })} required rows={3} />
          </div>

          {form.type !== "true_false" ? (
            <>
              <div className="sm:col-span-2">
                <Field label="Options (one per line)">
                  <Textarea value={form.optionsRaw} onChange={(e) => setForm({ ...form, optionsRaw: e.target.value })} rows={4} />
                </Field>
              </div>
              <Field label="Correct option index (0-based)">
                <Input
                  type="number"
                  value={form.correctOptionIndex}
                  onChange={(e) => setForm({ ...form, correctOptionIndex: Number(e.target.value) })}
                />
              </Field>
            </>
          ) : (
            <Field label="Correct answer">
              <Select value={String(form.correctBoolean)} onChange={(e) => setForm({ ...form, correctBoolean: e.target.value === "true" })}>
                <option value="true">True</option>
                <option value="false">False</option>
              </Select>
            </Field>
          )}

          <div className="sm:col-span-2">
            <AITextarea
              label="Explanation (shown after submitting)"
              value={form.explanation}
              onChange={(v) => setForm({ ...form, explanation: v })}
              rows={2}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete Question?"
        message="Are you sure you want to delete this question? This action cannot be undone."
        confirmLabel="Delete Question"
        loading={remove.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
