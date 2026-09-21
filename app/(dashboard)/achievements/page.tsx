"use client";

import { useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Field, Input, Select, Button } from "@/components/form";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { SearchInput } from "@/components/ui/SearchInput";
import { AITextarea } from "@/components/ui/AITextarea";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useAdminCrud } from "@/hooks/useAdminCrud";
import { api } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";

type Metric =
  | "user_level"
  | "learning_streak"
  | "lessons_completed"
  | "lessons_completed_today"
  | "courses_completed"
  | "quizzes_completed"
  | "quiz_score"
  | "projects_completed"
  | "project_score"
  | "certificates_earned"
  | "leaderboard_top5_finishes";

type Operator = ">=" | ">" | "==" | "<=" | "<";
type Category = "consistency" | "learning" | "courses" | "quizzes" | "projects" | "certificates" | "special";

interface Achievement {
  _id: string;
  key: string;
  name: string;
  description: string;
  category: Category;
  type: string;
  icon: string;
  requirement: { metric: Metric; operator: Operator; value: number };
  reward: { xp: number; credits: number };
  active: boolean;
}

type AchievementForm = Omit<Achievement, "_id">;

// Same icons8 "3d-fluency" set the mobile app's Progress screen already
// uses for achievement badges  templates below point straight at these so
// picking a template gives a real image immediately, with the field still
// free-text if the admin wants to paste something else instead.
const ICON_3D = {
  flame: "https://img.icons8.com/3d-fluency/188/fire-element.png",
  book: "https://img.icons8.com/3d-fluency/188/book.png",
  laptop: "https://img.icons8.com/3d-fluency/188/laptop.png",
  trophy: "https://img.icons8.com/3d-fluency/188/trophy.png",
  zap: "https://img.icons8.com/3d-fluency/188/lightning-bolt.png",
  target: "https://img.icons8.com/3d-fluency/188/goal.png",
  crown: "https://img.icons8.com/3d-fluency/188/crown.png",
  graduationCap: "https://img.icons8.com/3d-fluency/188/graduation-cap.png",
} as const;

const EMPTY_FORM: AchievementForm = {
  key: "",
  name: "",
  description: "",
  category: "learning",
  type: "custom",
  icon: ICON_3D.trophy,
  requirement: { metric: "lessons_completed", operator: ">=", value: 1 },
  reward: { xp: 0, credits: 0 },
  active: true,
};

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "consistency", label: "Consistency" },
  { value: "learning", label: "Learning" },
  { value: "courses", label: "Courses" },
  { value: "quizzes", label: "Quizzes" },
  { value: "projects", label: "Projects" },
  { value: "certificates", label: "Certificates" },
  { value: "special", label: "Special" },
];

// Every metric the backend evaluator (backend/src/services/achievements.ts)
// knows how to compute from real user data  this list must stay in sync
// with that file's METRICS map. Picking one here is the entire "logic" an
// achievement needs; no code change is required to use any of these.
const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: "user_level", label: "Account Level" },
  { value: "learning_streak", label: "Learning Streak (consecutive days)" },
  { value: "lessons_completed", label: "Lessons Completed (all time)" },
  { value: "lessons_completed_today", label: "Lessons Completed Today" },
  { value: "courses_completed", label: "Courses Completed" },
  { value: "quizzes_completed", label: "Quizzes Passed" },
  { value: "quiz_score", label: "Best Quiz Score (%)" },
  { value: "projects_completed", label: "Projects Passed" },
  { value: "project_score", label: "Best Project Score" },
  { value: "certificates_earned", label: "Certificates Earned" },
  { value: "leaderboard_top5_finishes", label: "Weekly Top-5 Finishes" },
];

const OPERATOR_OPTIONS: { value: Operator; label: string }[] = [
  { value: ">=", label: "at least (>=)" },
  { value: ">", label: "more than (>)" },
  { value: "==", label: "exactly (==)" },
  { value: "<=", label: "at most (<=)" },
  { value: "<", label: "less than (<)" },
];

interface Template {
  id: string;
  label: string;
  category: Category;
  type: string;
  icon: string;
  metric: Metric;
  operator: Operator;
  defaultValue: number;
  name: (value: number) => string;
  description: (value: number) => string;
}

// Common achievement "shapes"  picking one fills in category/type/icon/
// metric/operator plus a suggested name+description for the default
// amount, so creating e.g. a streak achievement is "pick Streak, type the
// number of days" instead of hand-picking every field from scratch. Still
// fully editable afterward  this is just a starting point, not a
// separate code path.
const TEMPLATES: Template[] = [
  {
    id: "streak",
    label: "Streak",
    category: "consistency",
    type: "streak",
    icon: ICON_3D.flame,
    metric: "learning_streak",
    operator: ">=",
    defaultValue: 7,
    name: (v) => `${v} Day Streak`,
    description: (v) => `Learn for ${v} consecutive day${v === 1 ? "" : "s"}.`,
  },
  {
    id: "level",
    label: "Account Level",
    category: "special",
    type: "milestone",
    icon: ICON_3D.crown,
    metric: "user_level",
    operator: ">=",
    defaultValue: 5,
    name: (v) => `Reach Level ${v}`,
    description: (v) => `Reach account level ${v}.`,
  },
  {
    id: "lessons_total",
    label: "Lessons Completed (total)",
    category: "learning",
    type: "count",
    icon: ICON_3D.book,
    metric: "lessons_completed",
    operator: ">=",
    defaultValue: 10,
    name: (v) => `${v} Lessons Completed`,
    description: (v) => `Complete ${v} lessons in total.`,
  },
  {
    id: "lessons_today",
    label: "Lessons In One Day",
    category: "learning",
    type: "count",
    icon: ICON_3D.zap,
    metric: "lessons_completed_today",
    operator: ">=",
    defaultValue: 10,
    name: (v) => `${v} Lessons in One Day`,
    description: (v) => `Complete ${v} lessons in a single day.`,
  },
  {
    id: "courses",
    label: "Courses Completed",
    category: "courses",
    type: "count",
    icon: ICON_3D.book,
    metric: "courses_completed",
    operator: ">=",
    defaultValue: 1,
    name: (v) => (v === 1 ? "First Course" : `${v} Courses Completed`),
    description: (v) => (v === 1 ? "Complete your first course." : `Complete ${v} courses.`),
  },
  {
    id: "quizzes",
    label: "Quizzes Passed",
    category: "quizzes",
    type: "count",
    icon: ICON_3D.target,
    metric: "quizzes_completed",
    operator: ">=",
    defaultValue: 20,
    name: (v) => `${v} Quizzes Passed`,
    description: (v) => `Pass ${v} quizzes.`,
  },
  {
    id: "quiz_score",
    label: "Quiz Score",
    category: "quizzes",
    type: "score",
    icon: ICON_3D.zap,
    metric: "quiz_score",
    operator: ">=",
    defaultValue: 100,
    name: (v) => `Score ${v}% on a Quiz`,
    description: (v) => `Score at least ${v}% on any quiz.`,
  },
  {
    id: "projects",
    label: "Projects Passed",
    category: "projects",
    type: "count",
    icon: ICON_3D.laptop,
    metric: "projects_completed",
    operator: ">=",
    defaultValue: 1,
    name: (v) => (v === 1 ? "First Project" : `${v} Projects Passed`),
    description: (v) => (v === 1 ? "Submit and pass your first project." : `Pass ${v} projects.`),
  },
  {
    id: "project_score",
    label: "Project Score",
    category: "projects",
    type: "score",
    icon: ICON_3D.target,
    metric: "project_score",
    operator: ">=",
    defaultValue: 90,
    name: (v) => `Score ${v} on a Project`,
    description: (v) => `Score at least ${v} on any project.`,
  },
  {
    id: "certificates",
    label: "Certificates Earned",
    category: "certificates",
    type: "milestone",
    icon: ICON_3D.graduationCap,
    metric: "certificates_earned",
    operator: ">=",
    defaultValue: 1,
    name: (v) => (v === 1 ? "First Certificate" : `${v} Certificates Earned`),
    description: (v) => (v === 1 ? "Earn your first certificate." : `Earn ${v} certificates.`),
  },
  {
    id: "leaderboard",
    label: "Weekly Top 5 Finishes",
    category: "special",
    type: "leaderboard",
    icon: ICON_3D.crown,
    metric: "leaderboard_top5_finishes",
    operator: ">=",
    defaultValue: 1,
    name: (v) => (v === 1 ? "Weekly Top 5" : `Top 5 Finish x${v}`),
    description: (v) => (v === 1 ? "Finish top 5 on the weekly leaderboard." : `Finish top 5 on the weekly leaderboard ${v} times.`),
  },
];

export default function AchievementsPage() {
  const { list, create, update, remove } = useAdminCrud<Achievement>("achievements");
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Achievement | "new" | null>(null);
  const [form, setForm] = useState<AchievementForm>(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<Achievement | null>(null);
  // "custom" = no template applied (or an existing achievement being
  // edited)  once a template is picked, changing the Required Value below
  // keeps regenerating the name/description for that template's wording.
  const [templateId, setTemplateId] = useState<string>("custom");

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = TEMPLATES.find((tpl) => tpl.id === id);
    if (!t) return;
    setForm((f) => ({
      ...f,
      category: t.category,
      type: t.type,
      icon: t.icon,
      name: t.name(t.defaultValue),
      description: t.description(t.defaultValue),
      requirement: { metric: t.metric, operator: t.operator, value: t.defaultValue },
    }));
  };

  const setRequirementValue = (value: number) => {
    const t = TEMPLATES.find((tpl) => tpl.id === templateId);
    setForm((f) => ({
      ...f,
      requirement: { ...f.requirement, value },
      ...(t ? { name: t.name(value), description: t.description(value) } : {}),
    }));
  };

  const recalculateAll = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ usersProcessed: number; achievementsUnlocked: number }>("/admin/achievements/recalculate-all");
      return data;
    },
    onSuccess: (data) => {
      toast("success", `Recalculated ${data.usersProcessed} users  ${data.achievementsUnlocked} new unlock(s).`);
    },
    onError: () => toast("error", "Couldn't recalculate achievements"),
  });

  const filteredRows = useMemo(() => {
    const rows = list.data ?? [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((a) => a.name.toLowerCase().includes(q));
  }, [list.data, search]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setTemplateId("custom");
    setEditing("new");
  };
  const openEdit = (a: Achievement) => {
    setForm({
      key: a.key,
      name: a.name,
      description: a.description,
      category: a.category,
      type: a.type,
      icon: a.icon,
      requirement: { ...a.requirement },
      reward: { ...a.reward },
      active: a.active,
    });
    setTemplateId("custom");
    setEditing(a);
  };
  const closeModal = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setTemplateId("custom");
  };
  const isSaving = create.isPending || update.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing === "new") {
      create.mutate(form as never, {
        onSuccess: () => {
          toast("success", "Achievement created successfully");
          closeModal();
        },
        onError: () => toast("error", "Couldn't create the achievement"),
      });
    } else if (editing) {
      update.mutate(
        { id: editing._id, body: form as never },
        {
          onSuccess: () => {
            toast("success", "Achievement updated");
            closeModal();
          },
          onError: () => toast("error", "Couldn't update the achievement"),
        }
      );
    }
  };

  const toggleActive = (a: Achievement) => {
    update.mutate(
      { id: a._id, body: { active: !a.active } as never },
      {
        onSuccess: () => toast("success", a.active ? "Achievement disabled" : "Achievement enabled"),
        onError: () => toast("error", "Couldn't update this achievement"),
      }
    );
  };

  const handleDelete = () => {
    if (!pendingDelete) return;
    remove.mutate(pendingDelete._id, {
      onSuccess: () => {
        toast("success", "Achievement deleted");
        setPendingDelete(null);
      },
      onError: () => toast("error", "Couldn't delete this achievement"),
    });
  };

  return (
    <div>
      <PageHeader
        title="Achievements"
        subtitle="Badges learners unlock  fully data-driven, no app update needed."
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => recalculateAll.mutate()} loading={recalculateAll.isPending}>
              <RefreshCw size={16} /> Recalculate All Users
            </Button>
            <Button onClick={openCreate}>
              <Plus size={16} /> Add Achievement
            </Button>
          </div>
        }
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search achievements..." />
      </div>

      <DataTable
        columns={[
          { header: "Name", render: (a) => <span className="font-medium">{a.name}</span> },
          {
            header: "Category",
            render: (a) => <Badge variant="primary">{CATEGORY_OPTIONS.find((c) => c.value === a.category)?.label ?? a.category}</Badge>,
          },
          {
            header: "Requirement",
            render: (a) => (
              <span className="text-textSecondary">
                {METRIC_OPTIONS.find((m) => m.value === a.requirement.metric)?.label ?? a.requirement.metric} {a.requirement.operator}{" "}
                {a.requirement.value}
              </span>
            ),
          },
          { header: "Reward", render: (a) => `+${a.reward.xp} XP, +${a.reward.credits} Credits` },
          {
            header: "Status",
            render: (a) => (
              <Badge variant={a.active ? "success" : "neutral"} onClick={() => toggleActive(a)}>
                {a.active ? "Active" : "Disabled"}
              </Badge>
            ),
          },
          {
            header: "",
            render: (a) => (
              <div className="flex justify-end">
                <ActionMenu
                  items={[
                    { label: "Edit Achievement", onClick: () => openEdit(a) },
                    { label: a.active ? "Disable" : "Enable", onClick: () => toggleActive(a) },
                    { label: "Delete", onClick: () => setPendingDelete(a), destructive: true },
                  ]}
                />
              </div>
            ),
          },
        ]}
        rows={filteredRows}
        rowKey={(a) => a._id}
        isLoading={list.isLoading}
        emptyLabel={search ? "No achievements match your search" : "No achievements yet"}
        emptyMessage={search ? undefined : "Add your first achievement badge."}
      />

      <Modal
        open={editing !== null}
        onClose={closeModal}
        title={editing === "new" ? "Create Achievement" : "Edit Achievement"}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" form="achievement-form" loading={isSaving}>
              {editing === "new" ? "Create Achievement" : "Save Changes"}
            </Button>
          </>
        }
      >
        <form id="achievement-form" className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <div className="sm:col-span-2">
            <Field label="Template (optional  fills in the fields below for you)">
              <Select value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
                <option value="custom">Custom (pick everything manually)</option>
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Achievement Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Key (unique identifier)">
            <Input
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value.trim().toLowerCase().replace(/\s+/g, "_") })}
              required
            />
          </Field>

          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Icon Image URL">
            <div className="flex items-center gap-3">
              {form.icon.startsWith("http") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.icon} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover" />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-backgroundAlt text-xs text-textMuted">
                  
                </div>
              )}
              <Input
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                required
                placeholder="Paste an image URL (e.g. https://.../badge.png)"
              />
            </div>
          </Field>

          <div className="sm:col-span-2">
            <AITextarea label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} required rows={2} />
          </div>

          <div className="rounded-xl border border-border p-4 sm:col-span-2">
            <p className="mb-3 text-sm font-semibold text-textPrimary">Requirement</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Metric">
                <Select
                  value={form.requirement.metric}
                  onChange={(e) => {
                    setTemplateId("custom");
                    setForm({ ...form, requirement: { ...form.requirement, metric: e.target.value as Metric } });
                  }}
                >
                  {METRIC_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Operator">
                <Select
                  value={form.requirement.operator}
                  onChange={(e) => setForm({ ...form, requirement: { ...form.requirement, operator: e.target.value as Operator } })}
                >
                  {OPERATOR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Required Value">
                <Input type="number" value={form.requirement.value} onChange={(e) => setRequirementValue(Number(e.target.value))} required />
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-border p-4 sm:col-span-2">
            <p className="mb-3 text-sm font-semibold text-textPrimary">Reward</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="XP Reward">
                <Input
                  type="number"
                  value={form.reward.xp}
                  onChange={(e) => setForm({ ...form, reward: { ...form.reward, xp: Number(e.target.value) } })}
                  required
                />
              </Field>
              <Field label="Credit Reward">
                <Input
                  type="number"
                  value={form.reward.credits}
                  onChange={(e) => setForm({ ...form, reward: { ...form.reward, credits: Number(e.target.value) } })}
                  required
                />
              </Field>
            </div>
          </div>

          <Field label="Status">
            <Select value={form.active ? "active" : "disabled"} onChange={(e) => setForm({ ...form, active: e.target.value === "active" })}>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </Select>
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete Achievement?"
        message={`Are you sure you want to delete "${pendingDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Achievement"
        loading={remove.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
