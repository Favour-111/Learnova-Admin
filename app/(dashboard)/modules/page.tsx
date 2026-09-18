"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Field, Input, Select, Button } from "@/components/form";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { AITextarea } from "@/components/ui/AITextarea";
import { useToast } from "@/components/ui/Toast";
import { useAdminCrud } from "@/hooks/useAdminCrud";

interface Course {
  _id: string;
  title: string;
}

interface CourseModule {
  _id: string;
  title: string;
  description?: string;
  course: string;
  order: number;
  isPublished: boolean;
}

type ModuleForm = { title: string; description: string; course: string; order: number };
const EMPTY_FORM: ModuleForm = { title: "", description: "", course: "", order: 0 };

export default function ModulesPage() {
  const { list, create, update, remove } = useAdminCrud<CourseModule>("modules");
  const courses = useAdminCrud<Course>("courses");
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CourseModule | "new" | null>(null);
  const [form, setForm] = useState<ModuleForm>(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<CourseModule | null>(null);

  const courseTitle = (id: string) => courses.list.data?.find((c) => c._id === id)?.title ?? id;

  // Modules have no dedicated /publish route (unlike courses/lessons) —
  // isPublished is just a normal field on the generic CRUD PUT.
  const togglePublish = (m: CourseModule) =>
    update.mutate(
      { id: m._id, body: { isPublished: !m.isPublished } as never },
      {
        onSuccess: () => toast("success", "Module status updated"),
        onError: () => toast("error", "Couldn't update module status"),
      }
    );

  const filteredRows = useMemo(() => {
    const rows = list.data ?? [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((m) => m.title.toLowerCase().includes(q));
  }, [list.data, search]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing("new");
  };
  const openEdit = (m: CourseModule) => {
    setForm({ title: m.title, description: m.description ?? "", course: m.course, order: m.order });
    setEditing(m);
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
          toast("success", "Module created successfully");
          closeModal();
        },
        onError: () => toast("error", "Couldn't create the module"),
      });
    } else if (editing) {
      update.mutate(
        { id: editing._id, body: form as never },
        {
          onSuccess: () => {
            toast("success", "Module updated");
            closeModal();
          },
          onError: () => toast("error", "Couldn't update the module"),
        }
      );
    }
  };

  const handleDelete = () => {
    if (!pendingDelete) return;
    remove.mutate(pendingDelete._id, {
      onSuccess: () => {
        toast("success", "Module deleted");
        setPendingDelete(null);
      },
      onError: () => toast("error", "Couldn't delete this module"),
    });
  };

  return (
    <div>
      <PageHeader
        title="Modules"
        subtitle="Group lessons + a project within a course."
        action={
          <Button onClick={openCreate}>
            <Plus size={16} /> Add Module
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search modules..." />
      </div>

      <DataTable
        columns={[
          { header: "Title", render: (m) => <span className="font-medium">{m.title}</span> },
          { header: "Course", render: (m) => courseTitle(m.course) },
          { header: "Order", render: (m) => m.order },
          {
            header: "Status",
            render: (m) => (
              <Badge variant={m.isPublished ? "success" : "neutral"} onClick={() => togglePublish(m)}>
                {m.isPublished ? "Published" : "Draft"}
              </Badge>
            ),
          },
          {
            header: "",
            render: (m) => (
              <div className="flex justify-end">
                <ActionMenu
                  items={[
                    { label: "Edit Module", onClick: () => openEdit(m) },
                    { label: "Delete", onClick: () => setPendingDelete(m), destructive: true },
                  ]}
                />
              </div>
            ),
          },
        ]}
        rows={filteredRows}
        rowKey={(m) => m._id}
        isLoading={list.isLoading}
        emptyLabel={search ? "No modules match your search" : "No modules yet"}
        emptyMessage={search ? undefined : "Add your first module to start structuring a course."}
      />

      <Modal
        open={editing !== null}
        onClose={closeModal}
        title={editing === "new" ? "Create Module" : "Edit Module"}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" form="module-form" loading={isSaving}>
              {editing === "new" ? "Create Module" : "Save Changes"}
            </Button>
          </>
        }
      >
        <form id="module-form" className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <Field label="Course">
            <Select value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} required>
              <option value="">Select course</option>
              {(courses.list.data ?? []).map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Title">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </Field>
          <div className="sm:col-span-2">
            <AITextarea label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          </div>
          <Field label="Order">
            <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete Module?"
        message={`Are you sure you want to delete "${pendingDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Module"
        loading={remove.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
