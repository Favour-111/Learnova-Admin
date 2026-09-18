"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Field, Input, Select, Button } from "@/components/form";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { AITextarea } from "@/components/ui/AITextarea";
import { useToast } from "@/components/ui/Toast";
import { useAdminCrud } from "@/hooks/useAdminCrud";

interface CourseModule {
  _id: string;
  title: string;
  course: string;
}

interface RubricCriterion {
  key: string;
  label: string;
  weightPercent: number;
}

interface Requirement {
  key: string;
  label: string;
}

interface Project {
  _id: string;
  module: string;
  title: string;
  description: string;
  learningObjectives: string[];
  instructions: string;
  requirements: Requirement[];
  requiredTechnologies: string[];
  optionalTechnologies: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  passingScore: number;
  xpReward: number;
  creditReward: number;
  bonusXpThreshold: number;
  bonusXp: number;
  rubric: RubricCriterion[];
  githubRequired: boolean;
  demoUrlRequired: boolean;
  maxAttempts: number | null;
}

type ProjectForm = Omit<Project, "_id">;

const DEFAULT_RUBRIC: RubricCriterion[] = [
  { key: "requirements", label: "Requirements", weightPercent: 30 },
  { key: "functionality", label: "Functionality", weightPercent: 30 },
  { key: "codeQuality", label: "Code Quality", weightPercent: 20 },
  { key: "uiUx", label: "UI/UX", weightPercent: 10 },
  { key: "bestPractices", label: "Best Practices", weightPercent: 10 },
];

const EMPTY_FORM: ProjectForm = {
  module: "",
  title: "",
  description: "",
  learningObjectives: [],
  instructions: "",
  requirements: [],
  requiredTechnologies: [],
  optionalTechnologies: [],
  difficulty: "beginner",
  estimatedMinutes: 120,
  passingScore: 70,
  xpReward: 300,
  creditReward: 150,
  bonusXpThreshold: 90,
  bonusXp: 100,
  rubric: DEFAULT_RUBRIC,
  githubRequired: true,
  demoUrlRequired: false,
  maxAttempts: null,
};

function slugify(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `req_${Date.now()}`;
}

// Simple "type, press Add or Enter" list editor — reused for learning
// objectives, requirements, and technologies so those don't need their own
// bespoke components.
function ListEditor({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    if (!draft.trim()) return;
    onChange([...items, draft.trim()]);
    setDraft("");
  };
  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="ghost" onClick={add}>
          Add
        </Button>
      </div>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {items.map((item, i) => (
            <li key={`${item}-${i}`} className="flex items-center justify-between rounded-lg bg-backgroundAlt px-3 py-1.5 text-sm">
              <span>{item}</span>
              <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-textMuted hover:text-danger">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function ProjectsPage() {
  const { list, create, update, remove } = useAdminCrud<Project>("projects");
  const modules = useAdminCrud<CourseModule>("modules");
  const { toast } = useToast();

  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);

  const totalWeight = form.rubric.reduce((sum, r) => sum + r.weightPercent, 0);
  const moduleTitle = (id: string) => modules.list.data?.find((m) => m._id === id)?.title ?? id;

  const modulesWithoutProject = useMemo(() => {
    const takenModuleIds = new Set((list.data ?? []).filter((p) => (editing === "new" ? true : p._id !== (editing as Project)?._id)).map((p) => p.module));
    return (modules.list.data ?? []).filter((m) => !takenModuleIds.has(m._id) || (editing !== "new" && editing?.module === m._id));
  }, [modules.list.data, list.data, editing]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing("new");
  };
  const openEdit = (p: Project) => {
    setForm({
      module: p.module,
      title: p.title,
      description: p.description,
      learningObjectives: p.learningObjectives ?? [],
      instructions: p.instructions ?? "",
      requirements: p.requirements ?? [],
      requiredTechnologies: p.requiredTechnologies ?? [],
      optionalTechnologies: p.optionalTechnologies ?? [],
      difficulty: p.difficulty,
      estimatedMinutes: p.estimatedMinutes ?? 120,
      passingScore: p.passingScore,
      xpReward: p.xpReward,
      creditReward: p.creditReward,
      bonusXpThreshold: p.bonusXpThreshold,
      bonusXp: p.bonusXp,
      rubric: p.rubric?.length ? p.rubric : DEFAULT_RUBRIC,
      githubRequired: p.githubRequired ?? true,
      demoUrlRequired: p.demoUrlRequired ?? false,
      maxAttempts: p.maxAttempts ?? null,
    });
    setEditing(p);
  };
  const closeModal = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
  };
  const isSaving = create.isPending || update.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalWeight !== 100) {
      toast("error", `Rubric weights must total 100% (currently ${totalWeight}%)`);
      return;
    }
    const course = modules.list.data?.find((m) => m._id === form.module)?.course;
    const body = { ...form, course };
    if (editing === "new") {
      create.mutate(body as never, {
        onSuccess: () => {
          toast("success", "Project created");
          closeModal();
        },
        onError: () => toast("error", "Couldn't create the project — does this module already have one?"),
      });
    } else if (editing) {
      update.mutate(
        { id: editing._id, body: body as never },
        {
          onSuccess: () => {
            toast("success", "Project updated");
            closeModal();
          },
          onError: () => toast("error", "Couldn't update the project"),
        }
      );
    }
  };

  const handleDelete = () => {
    if (!pendingDelete) return;
    remove.mutate(pendingDelete._id, {
      onSuccess: () => {
        toast("success", "Project deleted");
        setPendingDelete(null);
      },
      onError: () => toast("error", "Couldn't delete this project"),
    });
  };

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Practical projects with a configurable rubric — evaluated automatically from a GitHub submission."
        action={
          <Button onClick={openCreate}>
            <Plus size={16} /> Add Project
          </Button>
        }
      />

      <DataTable
        columns={[
          { header: "Title", render: (p) => <span className="font-medium">{p.title}</span> },
          { header: "Module", render: (p) => moduleTitle(p.module) },
          { header: "Passing score", render: (p) => `${p.passingScore}%` },
          { header: "XP / Credits", render: (p) => `+${p.xpReward} / +${p.creditReward}` },
          { header: "Max attempts", render: (p) => p.maxAttempts ?? "Unlimited" },
          {
            header: "",
            render: (p) => (
              <div className="flex justify-end">
                <ActionMenu
                  items={[
                    { label: "Edit Project", onClick: () => openEdit(p) },
                    { label: "Delete", onClick: () => setPendingDelete(p), destructive: true },
                  ]}
                />
              </div>
            ),
          },
        ]}
        rows={list.data ?? []}
        rowKey={(p) => p._id}
        isLoading={list.isLoading}
        emptyLabel="No projects yet"
        emptyMessage="Add a practical project to a module."
      />

      <Modal
        open={editing !== null}
        onClose={closeModal}
        title={editing === "new" ? "Create Project" : "Edit Project"}
        widthClassName="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" form="project-form" loading={isSaving}>
              {editing === "new" ? "Create Project" : "Save Changes"}
            </Button>
          </>
        }
      >
        <form id="project-form" className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <Field label="Module">
            <Select value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} required>
              <option value="">Select module</option>
              {modulesWithoutProject.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Title">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </Field>

          <div className="sm:col-span-2">
            <AITextarea label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} required rows={2} />
          </div>
          <div className="sm:col-span-2">
            <AITextarea
              label="Instructions"
              value={form.instructions}
              onChange={(v) => setForm({ ...form, instructions: v })}
              rows={4}
            />
          </div>

          <div className="sm:col-span-2">
            <Field label="Learning Objectives">
              <ListEditor
                items={form.learningObjectives}
                onChange={(items) => setForm({ ...form, learningObjectives: items })}
                placeholder="e.g. Understand component state"
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Requirements (shown as a checklist, verified by evaluation)">
              <ListEditor
                items={form.requirements.map((r) => r.label)}
                onChange={(labels) => setForm({ ...form, requirements: labels.map((label) => ({ key: slugify(label), label })) })}
                placeholder="e.g. User can create a Todo"
              />
            </Field>
          </div>

          <Field label="Required Technologies">
            <ListEditor
              items={form.requiredTechnologies}
              onChange={(items) => setForm({ ...form, requiredTechnologies: items })}
              placeholder="e.g. React"
            />
          </Field>
          <Field label="Optional Technologies">
            <ListEditor
              items={form.optionalTechnologies}
              onChange={(items) => setForm({ ...form, optionalTechnologies: items })}
              placeholder="e.g. Tailwind CSS"
            />
          </Field>

          <Field label="Difficulty">
            <Select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as Project["difficulty"] })}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
          </Field>
          <Field label="Estimated Time (minutes)">
            <Input type="number" value={form.estimatedMinutes} onChange={(e) => setForm({ ...form, estimatedMinutes: Number(e.target.value) })} />
          </Field>

          <Field label="Passing Score (%)">
            <Input type="number" value={form.passingScore} onChange={(e) => setForm({ ...form, passingScore: Number(e.target.value) })} />
          </Field>
          <Field label="Max Attempts (blank = unlimited)">
            <Input
              type="number"
              value={form.maxAttempts ?? ""}
              onChange={(e) => setForm({ ...form, maxAttempts: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </Field>

          <Field label="XP Reward">
            <Input type="number" value={form.xpReward} onChange={(e) => setForm({ ...form, xpReward: Number(e.target.value) })} />
          </Field>
          <Field label="Credit Reward">
            <Input type="number" value={form.creditReward} onChange={(e) => setForm({ ...form, creditReward: Number(e.target.value) })} />
          </Field>
          <Field label="Bonus XP Threshold (score %)">
            <Input type="number" value={form.bonusXpThreshold} onChange={(e) => setForm({ ...form, bonusXpThreshold: Number(e.target.value) })} />
          </Field>
          <Field label="Bonus XP">
            <Input type="number" value={form.bonusXp} onChange={(e) => setForm({ ...form, bonusXp: Number(e.target.value) })} />
          </Field>

          <label className="flex items-center gap-2 text-sm text-textPrimary">
            <input type="checkbox" checked={form.githubRequired} onChange={(e) => setForm({ ...form, githubRequired: e.target.checked })} />
            GitHub repository required
          </label>
          <label className="flex items-center gap-2 text-sm text-textPrimary">
            <input type="checkbox" checked={form.demoUrlRequired} onChange={(e) => setForm({ ...form, demoUrlRequired: e.target.checked })} />
            Live demo URL required
          </label>

          <div className="rounded-xl border border-border p-4 sm:col-span-2">
            <p className="mb-2 text-sm font-semibold text-textPrimary">
              Evaluation rubric weights (must total 100% — currently {totalWeight}%)
            </p>
            <div className="space-y-2">
              {form.rubric.map((criterion, index) => (
                <div key={criterion.key} className="flex items-center gap-3">
                  <span className="w-40 text-sm text-textPrimary">{criterion.label}</span>
                  <input
                    type="number"
                    className="w-24 rounded-xl border border-border bg-backgroundAlt px-3 py-1.5 text-sm outline-none focus:border-primary"
                    value={criterion.weightPercent}
                    onChange={(e) => {
                      const next = [...form.rubric];
                      next[index] = { ...criterion, weightPercent: Number(e.target.value) };
                      setForm({ ...form, rubric: next });
                    }}
                  />
                  <span className="text-sm text-textMuted">%</span>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete Project?"
        message={`Are you sure you want to delete "${pendingDelete?.title}"? Existing submissions and attempts will remain but will no longer be linked to an active project.`}
        confirmLabel="Delete Project"
        loading={remove.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
