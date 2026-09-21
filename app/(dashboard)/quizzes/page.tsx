"use client";

import { useMemo, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Field, Input, Select, Textarea, Button } from "@/components/form";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { ImageUploadField } from "@/components/ImageUploadField";
import { useToast } from "@/components/ui/Toast";
import { useAdminCrud } from "@/hooks/useAdminCrud";
import { api } from "@/lib/api";

interface CourseModule {
  _id: string;
  title: string;
  course: string;
}

interface Category {
  _id: string;
  name: string;
}

interface Quiz {
  _id: string;
  title: string;
  module?: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  topics?: string[];
  estimatedMinutes?: number;
  passingScorePercent: number;
  xpReward: number;
  creditReward: number;
  isPublished: boolean;
}

type QuizForm = {
  title: string;
  module: string;
  category: string;
  description: string;
  imageUrl: string;
  topics: string;
  estimatedMinutes: number;
  passingScorePercent: number;
  xpReward: number;
  creditReward: number;
};
const EMPTY_FORM: QuizForm = {
  title: "",
  module: "",
  category: "",
  description: "",
  imageUrl: "",
  topics: "",
  estimatedMinutes: 5,
  passingScorePercent: 70,
  xpReward: 50,
  creditReward: 20,
};

// Generating a full question set is a real 20-30s round trip to OpenAI (a
// reasoning model, not a quick completion)  well past the API client's
// normal 20s default, so these two calls get their own generous timeout.
const AI_GENERATION_TIMEOUT_MS = 120000;

function aiErrorMessage(err: unknown) {
  if (axios.isAxiosError(err)) {
    if (err.code === "ECONNABORTED") return "The AI is taking longer than expected  try again, or ask for fewer questions.";
    const serverMessage = (err.response?.data as { error?: string } | undefined)?.error;
    if (serverMessage) return serverMessage;
  }
  return "AI request failed  check the OpenAI configuration and try again.";
}

export default function QuizzesPage() {
  const { list, create, update, remove } = useAdminCrud<Quiz>("quizzes");
  const modules = useAdminCrud<CourseModule>("modules");
  const categories = useAdminCrud<Category>("categories");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const togglePublish = (q: Quiz) =>
    update.mutate(
      { id: q._id, body: { isPublished: !q.isPublished } as never },
      {
        onSuccess: () => toast("success", "Quiz status updated"),
        onError: () => toast("error", "Couldn't update quiz status"),
      }
    );

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Quiz | "new" | null>(null);
  const [form, setForm] = useState<QuizForm>(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<Quiz | null>(null);
  const [generatingFor, setGeneratingFor] = useState<Quiz | null>(null);
  const [genTopic, setGenTopic] = useState("");
  const [genCount, setGenCount] = useState(20);

  const generateQuestions = useMutation({
    mutationFn: async ({ quizId, topic, count }: { quizId: string; topic: string; count: number }) => {
      const { data } = await api.post<{ questions: unknown[] }>(
        `/admin/quizzes/${quizId}/generate-questions`,
        { topic, count },
        { timeout: AI_GENERATION_TIMEOUT_MS }
      );
      return data.questions;
    },
    onSuccess: (questions) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "questions"] });
      toast("success", `Generated ${questions.length} question${questions.length === 1 ? "" : "s"}  existing questions for this quiz were replaced.`);
      setGeneratingFor(null);
      setGenTopic("");
      setGenCount(20);
    },
    onError: (err) => toast("error", aiErrorMessage(err)),
  });

  // The one-step flow: pick a module, describe it, get a ready quiz  no
  // need to create an empty Quiz row by hand first. Creates the module's
  // quiz if it doesn't have one yet, otherwise reuses it and replaces its
  // questions.
  const [moduleGenOpen, setModuleGenOpen] = useState(false);
  const [moduleGenModule, setModuleGenModule] = useState("");
  const [moduleGenTopic, setModuleGenTopic] = useState("");
  const [moduleGenCount, setModuleGenCount] = useState(20);

  const closeModuleGen = () => {
    setModuleGenOpen(false);
    setModuleGenModule("");
    setModuleGenTopic("");
    setModuleGenCount(20);
  };

  const generateModuleQuiz = useMutation({
    mutationFn: async ({ moduleId, topic, count }: { moduleId: string; topic: string; count: number }) => {
      const { data } = await api.post<{ questions: unknown[] }>(
        `/admin/modules/${moduleId}/generate-quiz`,
        { topic, count },
        { timeout: AI_GENERATION_TIMEOUT_MS }
      );
      return data.questions;
    },
    onSuccess: (questions) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "questions"] });
      toast("success", `Generated a quiz with ${questions.length} question${questions.length === 1 ? "" : "s"} for this module.`);
      closeModuleGen();
    },
    onError: (err) => toast("error", aiErrorMessage(err)),
  });

  const moduleTitle = (id?: string) => (id ? modules.list.data?.find((m) => m._id === id)?.title ?? id : "Standalone");
  const categoryName = (id?: string) => (id ? categories.list.data?.find((c) => c._id === id)?.name ?? id : "");

  const filteredRows = useMemo(() => {
    const rows = list.data ?? [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((quiz) => quiz.title.toLowerCase().includes(q));
  }, [list.data, search]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing("new");
  };
  const openEdit = (quiz: Quiz) => {
    setForm({
      title: quiz.title,
      module: quiz.module ?? "",
      category: quiz.category ?? "",
      description: quiz.description ?? "",
      imageUrl: quiz.imageUrl ?? "",
      topics: (quiz.topics ?? []).join(", "),
      estimatedMinutes: quiz.estimatedMinutes ?? 5,
      passingScorePercent: quiz.passingScorePercent,
      xpReward: quiz.xpReward,
      creditReward: quiz.creditReward,
    });
    setEditing(quiz);
  };
  const closeModal = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
  };
  const isSaving = create.isPending || update.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { topics, module, category, ...rest } = form;
    const body = {
      ...rest,
      module: module || undefined,
      category: category || undefined,
      course: module ? modules.list.data?.find((m) => m._id === module)?.course : undefined,
      topics: topics
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    if (editing === "new") {
      create.mutate(body as never, {
        onSuccess: () => {
          toast("success", "Quiz created successfully");
          closeModal();
        },
        onError: () => toast("error", "Couldn't create the quiz"),
      });
    } else if (editing) {
      update.mutate(
        { id: editing._id, body: body as never },
        {
          onSuccess: () => {
            toast("success", "Quiz updated");
            closeModal();
          },
          onError: () => toast("error", "Couldn't update the quiz"),
        }
      );
    }
  };

  const handleDelete = () => {
    if (!pendingDelete) return;
    remove.mutate(pendingDelete._id, {
      onSuccess: () => {
        toast("success", "Quiz deleted");
        setPendingDelete(null);
      },
      onError: () => toast("error", "Couldn't delete this quiz"),
    });
  };

  return (
    <div>
      <PageHeader
        title="Quizzes"
        subtitle="Module quizzes and standalone quizzes learners can take anytime."
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setModuleGenOpen(true)}>
              <Sparkles size={16} /> Generate Quiz with AI
            </Button>
            <Button onClick={openCreate}>
              <Plus size={16} /> Add Quiz
            </Button>
          </div>
        }
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search quizzes..." />
      </div>

      <DataTable
        columns={[
          { header: "Title", render: (q) => <span className="font-medium">{q.title}</span> },
          { header: "Module", render: (q) => moduleTitle(q.module) },
          { header: "Category", render: (q) => categoryName(q.category) },
          { header: "Passing %", render: (q) => q.passingScorePercent },
          { header: "XP", render: (q) => q.xpReward },
          {
            header: "Status",
            render: (q) => (
              <Badge variant={q.isPublished ? "success" : "neutral"} onClick={() => togglePublish(q)}>
                {q.isPublished ? "Published" : "Draft"}
              </Badge>
            ),
          },
          {
            header: "",
            render: (q) => (
              <div className="flex justify-end">
                <ActionMenu
                  items={[
                    { label: "Edit Quiz", onClick: () => openEdit(q) },
                    { label: "Generate Questions with AI", onClick: () => setGeneratingFor(q) },
                    { label: "Delete", onClick: () => setPendingDelete(q), destructive: true },
                  ]}
                />
              </div>
            ),
          },
        ]}
        rows={filteredRows}
        rowKey={(q) => q._id}
        isLoading={list.isLoading}
        emptyLabel={search ? "No quizzes match your search" : "No quizzes yet"}
        emptyMessage={search ? undefined : "Add your first quiz to a module."}
      />

      <Modal
        open={editing !== null}
        onClose={closeModal}
        title={editing === "new" ? "Create Quiz" : "Edit Quiz"}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" form="quiz-form" loading={isSaving}>
              {editing === "new" ? "Create Quiz" : "Save Changes"}
            </Button>
          </>
        }
      >
        <form id="quiz-form" className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <Field label="Module (optional)">
            <Select value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })}>
              <option value="">None  standalone quiz</option>
              {(modules.list.data ?? []).map((m) => (
                <option key={m._id} value={m._id}>
                  {m.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">No category</option>
              {(categories.list.data ?? []).map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Title">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </Field>
          <Field label="Estimated minutes">
            <Input
              type="number"
              value={form.estimatedMinutes}
              onChange={(e) => setForm({ ...form, estimatedMinutes: Number(e.target.value) })}
            />
          </Field>
          <div className="sm:col-span-2">
            <ImageUploadField
              label="Quiz image"
              value={form.imageUrl}
              onChange={(url) => setForm({ ...form, imageUrl: url })}
              folder="quizzes"
            />
          </div>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="What this quiz tests the learner on."
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Topics (comma-separated)">
              <Input
                value={form.topics}
                onChange={(e) => setForm({ ...form, topics: e.target.value })}
                placeholder="Variables, Functions, Arrays, Objects, ES6"
              />
            </Field>
          </div>
          <Field label="Passing score %">
            <Input
              type="number"
              value={form.passingScorePercent}
              onChange={(e) => setForm({ ...form, passingScorePercent: Number(e.target.value) })}
            />
          </Field>
          <Field label="XP reward">
            <Input type="number" value={form.xpReward} onChange={(e) => setForm({ ...form, xpReward: Number(e.target.value) })} />
          </Field>
          <Field label="Credit reward">
            <Input type="number" value={form.creditReward} onChange={(e) => setForm({ ...form, creditReward: Number(e.target.value) })} />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete Quiz?"
        message={`Are you sure you want to delete "${pendingDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Quiz"
        loading={remove.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <Modal
        open={!!generatingFor}
        onClose={() => (generateQuestions.isPending ? null : setGeneratingFor(null))}
        title={`Generate Questions with AI${generatingFor ? `  ${generatingFor.title}` : ""}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setGeneratingFor(null)} disabled={generateQuestions.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => generatingFor && generateQuestions.mutate({ quizId: generatingFor._id, topic: genTopic, count: genCount })}
              loading={generateQuestions.isPending}
              disabled={!genTopic.trim()}
            >
              <Sparkles size={16} /> Generate {genCount} Questions
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="What is this module about?">
            <Textarea
              value={genTopic}
              onChange={(e) => setGenTopic(e.target.value)}
              rows={4}
              placeholder="e.g. HTML fundamentals  tags, elements, attributes, links, images, and semantic structure."
              disabled={generateQuestions.isPending}
            />
          </Field>
          <Field label="Number of questions">
            <Input
              type="number"
              min={1}
              max={30}
              value={genCount}
              onChange={(e) => setGenCount(Number(e.target.value))}
              disabled={generateQuestions.isPending}
            />
          </Field>
          <p className="text-xs text-textMuted">
            This replaces any existing questions on this quiz with the newly generated set  review them on the Questions page
            afterward.
          </p>
        </div>
      </Modal>

      <Modal
        open={moduleGenOpen}
        onClose={() => (generateModuleQuiz.isPending ? null : closeModuleGen())}
        title="Generate Quiz with AI"
        footer={
          <>
            <Button variant="ghost" onClick={closeModuleGen} disabled={generateModuleQuiz.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                moduleGenModule &&
                generateModuleQuiz.mutate({ moduleId: moduleGenModule, topic: moduleGenTopic, count: moduleGenCount })
              }
              loading={generateModuleQuiz.isPending}
              disabled={!moduleGenModule || !moduleGenTopic.trim()}
            >
              <Sparkles size={16} /> Generate {moduleGenCount} Questions
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Module">
            <Select value={moduleGenModule} onChange={(e) => setModuleGenModule(e.target.value)} disabled={generateModuleQuiz.isPending}>
              <option value="">Select module</option>
              {(modules.list.data ?? []).map((m) => (
                <option key={m._id} value={m._id}>
                  {m.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="What is this module about?">
            <Textarea
              value={moduleGenTopic}
              onChange={(e) => setModuleGenTopic(e.target.value)}
              rows={4}
              placeholder="e.g. HTML fundamentals  tags, elements, attributes, links, images, and semantic structure."
              disabled={generateModuleQuiz.isPending}
            />
          </Field>
          <Field label="Number of questions">
            <Input
              type="number"
              min={1}
              max={30}
              value={moduleGenCount}
              onChange={(e) => setModuleGenCount(Number(e.target.value))}
              disabled={generateModuleQuiz.isPending}
            />
          </Field>
          <p className="text-xs text-textMuted">
            If this module doesn&apos;t have a quiz yet, one is created automatically. If it already has one, its existing
            questions are replaced with the newly generated set.
          </p>
        </div>
      </Modal>
    </div>
  );
}
