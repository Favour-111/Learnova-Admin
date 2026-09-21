"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Field, Input, Button } from "@/components/form";
import { ImageUploadField } from "@/components/ImageUploadField";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { SearchInput } from "@/components/ui/SearchInput";
import { useToast } from "@/components/ui/Toast";
import { useAdminCrud } from "@/hooks/useAdminCrud";

interface Category {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  colorToken: string;
  imageUrl?: string;
}

type CategoryForm = Omit<Category, "_id">;
const EMPTY_FORM: CategoryForm = { name: "", slug: "", icon: "", colorToken: "blue", imageUrl: "" };

export default function CategoriesPage() {
  const { list, create, update, remove } = useAdminCrud<Category>("categories");
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  const filteredRows = useMemo(() => {
    const rows = list.data ?? [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((c) => c.name.toLowerCase().includes(q));
  }, [list.data, search]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing("new");
  };
  const openEdit = (c: Category) => {
    setForm({ name: c.name, slug: c.slug, icon: c.icon, colorToken: c.colorToken, imageUrl: c.imageUrl ?? "" });
    setEditing(c);
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
          toast("success", "Category created successfully");
          closeModal();
        },
        onError: () => toast("error", "Couldn't create the category"),
      });
    } else if (editing) {
      update.mutate(
        { id: editing._id, body: form as never },
        {
          onSuccess: () => {
            toast("success", "Category updated");
            closeModal();
          },
          onError: () => toast("error", "Couldn't update the category"),
        }
      );
    }
  };

  const handleDelete = () => {
    if (!pendingDelete) return;
    remove.mutate(pendingDelete._id, {
      onSuccess: () => {
        toast("success", "Category deleted");
        setPendingDelete(null);
      },
      onError: () => toast("error", "Couldn't delete this category"),
    });
  };

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle="Course categories shown on the Courses screen."
        action={
          <Button onClick={openCreate}>
            <Plus size={16} /> Add Category
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search categories..." />
      </div>

      <DataTable
        columns={[
          { header: "Name", render: (c) => <span className="font-medium">{c.name}</span> },
          { header: "Slug", render: (c) => c.slug },
          { header: "Icon", render: (c) => c.icon },
          {
            header: "",
            render: (c) => (
              <div className="flex justify-end">
                <ActionMenu
                  items={[
                    { label: "Edit Category", onClick: () => openEdit(c) },
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
        emptyLabel={search ? "No categories match your search" : "No categories yet"}
        emptyMessage={search ? undefined : "Add your first category to organize courses."}
      />

      <Modal
        open={editing !== null}
        onClose={closeModal}
        title={editing === "new" ? "Create Category" : "Edit Category"}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" form="category-form" loading={isSaving}>
              {editing === "new" ? "Create Category" : "Save Changes"}
            </Button>
          </>
        }
      >
        <form id="category-form" className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Slug">
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
          </Field>
          <Field label="Icon (Ionicons name)">
            <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} required />
          </Field>
          <Field label="Color token">
            <Input value={form.colorToken} onChange={(e) => setForm({ ...form, colorToken: e.target.value })} required />
          </Field>
          <div className="sm:col-span-2">
            <ImageUploadField
              label="Learning Path image (optional  falls back to the icon above)"
              value={form.imageUrl ?? ""}
              onChange={(url) => setForm({ ...form, imageUrl: url })}
              folder="categories"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete Category?"
        message={`Are you sure you want to delete "${pendingDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Category"
        loading={remove.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
