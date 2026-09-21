"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Field, Input, Select, Button } from "@/components/form";
import { ImageUploadField } from "@/components/ImageUploadField";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { AITextarea } from "@/components/ui/AITextarea";
import { useToast } from "@/components/ui/Toast";
import { useAdminCrud } from "@/hooks/useAdminCrud";
import { api } from "@/lib/api";

interface Category {
  _id: string;
  name: string;
}

interface Course {
  _id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  xpReward: number;
  isPublished: boolean;
  isPremium: boolean;
  materialContent?: string;
  priceCredits: number;
  thumbnailUrl?: string;
}

type CourseForm = Omit<Course, "_id" | "isPublished">;

const EMPTY_FORM: CourseForm = {
  title: "",
  slug: "",
  description: "",
  category: "",
  difficulty: "beginner",
  xpReward: 1000,
  isPremium: false,
  materialContent: "",
  priceCredits: 0,
  thumbnailUrl: "",
};

export default function CoursesPage() {
  const { list, create, update, remove } = useAdminCrud<Course>("courses");
  const categories = useAdminCrud<Category>("categories");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  // null = modal closed, "new" = creating, a Course = editing that course.
  const [editing, setEditing] = useState<Course | "new" | null>(null);
  const [form, setForm] = useState<CourseForm>(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<Course | null>(null);

  const togglePublish = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => api.put(`/admin/courses/${id}/publish`, { isPublished }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      toast("success", "Course status updated");
    },
    onError: () => toast("error", "Couldn't update course status"),
  });

  const filteredRows = useMemo(() => {
    const rows = list.data ?? [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((c) => c.title.toLowerCase().includes(q));
  }, [list.data, search]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing("new");
  };

  const openEdit = (course: Course) => {
    setForm({
      title: course.title,
      slug: course.slug,
      description: course.description,
      category: course.category,
      difficulty: course.difficulty,
      xpReward: course.xpReward,
      isPremium: course.isPremium,
      materialContent: course.materialContent ?? "",
      priceCredits: course.priceCredits,
      thumbnailUrl: course.thumbnailUrl ?? "",
    });
    setEditing(course);
  };

  const closeModal = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const isSaving = create.isPending || update.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing === "new") {
      create.mutate(form as never, {
        onSuccess: () => {
          toast("success", "Course created successfully");
          closeModal();
        },
        onError: () => toast("error", "Couldn't create the course  check the fields and try again."),
      });
    } else if (editing) {
      update.mutate(
        { id: editing._id, body: form as never },
        {
          onSuccess: () => {
            toast("success", "Course updated");
            closeModal();
          },
          onError: () => toast("error", "Couldn't update the course  check the fields and try again."),
        }
      );
    }
  };

  const handleDelete = () => {
    if (!pendingDelete) return;
    remove.mutate(pendingDelete._id, {
      onSuccess: () => {
        toast("success", "Course deleted");
        setPendingDelete(null);
      },
      onError: () => toast("error", "Couldn't delete this course"),
    });
  };

  return (
    <div>
      <PageHeader
        title="Courses"
        subtitle="Manage your learning catalog."
        action={
          <Button onClick={openCreate}>
            <Plus size={16} /> Add Course
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search courses..." />
      </div>

      <DataTable
        columns={[
          { header: "Title", render: (c) => <span className="font-medium">{c.title}</span> },
          { header: "Difficulty", render: (c) => <span className="capitalize">{c.difficulty}</span> },
          { header: "XP", render: (c) => c.xpReward },
          {
            header: "Price",
            render: (c) => (c.isPremium ? `${c.priceCredits.toLocaleString()} credits` : <span className="text-textMuted">Free</span>),
          },
          {
            header: "Status",
            render: (c) => (
              <Badge variant={c.isPublished ? "success" : "neutral"} onClick={() => togglePublish.mutate({ id: c._id, isPublished: !c.isPublished })}>
                {c.isPublished ? "Published" : "Draft"}
              </Badge>
            ),
          },
          {
            header: "",
            render: (c) => (
              <div className="flex justify-end">
                <ActionMenu
                  items={[
                    { label: "Edit Course", onClick: () => openEdit(c) },
                    { label: "Delete", onClick: () => setPendingDelete(c), destructive: true },
                  ]}
                />
              </div>
            ),
          },
        ]}
        rows={filteredRows}
        rowKey={(c) => c._id}
        isLoading={list.isLoading}
        emptyLabel={search ? "No courses match your search" : "No courses yet"}
        emptyMessage={search ? undefined : "Create your first course to start building the Learnova library."}
      />

      <Modal
        open={editing !== null}
        onClose={closeModal}
        title={editing === "new" ? "Create Course" : "Edit Course"}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" form="course-form" loading={isSaving}>
              {editing === "new" ? "Create Course" : "Save Changes"}
            </Button>
          </>
        }
      >
        <form id="course-form" className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <div className="sm:col-span-2">
            <Field label="Course title">
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <ImageUploadField
              label="Course thumbnail (optional  falls back to a generated badge)"
              value={form.thumbnailUrl ?? ""}
              onChange={(url) => setForm({ ...form, thumbnailUrl: url })}
              folder="courses"
            />
          </div>
          <Field label="Slug">
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
          </Field>
          <Field label="XP reward">
            <Input type="number" value={form.xpReward} onChange={(e) => setForm({ ...form, xpReward: Number(e.target.value) })} />
          </Field>
          <div className="sm:col-span-2">
            <AITextarea label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} required />
          </div>
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
              <option value="">Select category</option>
              {(categories.list.data ?? []).map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Difficulty">
            <Select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as Course["difficulty"] })}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
          </Field>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="isPremium"
              type="checkbox"
              checked={form.isPremium}
              onChange={(e) => setForm({ ...form, isPremium: e.target.checked })}
            />
            <label htmlFor="isPremium" className="text-sm text-textSecondary">
              Premium course
            </label>
          </div>
          {form.isPremium ? (
            <Field label="Price (in credits)">
              <Input
                type="number"
                min={0}
                value={form.priceCredits}
                onChange={(e) => setForm({ ...form, priceCredits: Number(e.target.value) })}
              />
            </Field>
          ) : null}
          <div className="sm:col-span-2">
            <AITextarea
              label="Course material (shown in the app's in-app document reader)"
              value={form.materialContent ?? ""}
              onChange={(v) => setForm({ ...form, materialContent: v })}
              rows={8}
            />
            <p className="mt-1.5 text-xs text-textMuted">
              Supports # / ## / ### headings, blank-line paragraphs, - bullet lists, 1. numbered lists, and **bold** text 
              rendered natively in the app instead of a PDF.
            </p>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete Course?"
        message={`Are you sure you want to delete "${pendingDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Course"
        loading={remove.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
