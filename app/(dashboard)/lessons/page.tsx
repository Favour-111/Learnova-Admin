"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { extractYouTubeId } from "@/lib/youtube";
import { api } from "@/lib/api";

interface CourseModule {
  _id: string;
  title: string;
  course: string;
}

interface Lesson {
  _id: string;
  title: string;
  description?: string;
  module: string;
  videoId?: string;
  readingMaterial?: string;
  xpReward: number;
  creditReward: number;
  estimatedMinutes: number;
  order: number;
  isPublished: boolean;
}

const EMPTY_FORM = {
  title: "",
  description: "",
  module: "",
  youtubeUrl: "",
  readingMaterial: "",
  xpReward: 20,
  creditReward: 5,
  estimatedMinutes: 10,
  order: 0,
  isPublished: false,
};

export default function LessonsPage() {
  const { list, create, update, remove } = useAdminCrud<Lesson>("lessons");
  const modules = useAdminCrud<CourseModule>("modules");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const togglePublish = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => api.put(`/admin/lessons/${id}/publish`, { isPublished }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "lessons"] });
      toast("success", "Lesson status updated");
    },
    onError: () => toast("error", "Couldn't update lesson status"),
  });

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Lesson | "new" | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<Lesson | null>(null);

  const videoId = useMemo(() => (form.youtubeUrl ? extractYouTubeId(form.youtubeUrl) : null), [form.youtubeUrl]);
  const moduleTitle = (id: string) => modules.list.data?.find((m) => m._id === id)?.title ?? id;

  const filteredRows = useMemo(() => {
    const rows = list.data ?? [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((l) => l.title.toLowerCase().includes(q));
  }, [list.data, search]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing("new");
  };
  const openEdit = (l: Lesson) => {
    setForm({
      title: l.title,
      description: l.description ?? "",
      module: l.module,
      youtubeUrl: l.videoId ? `https://www.youtube.com/watch?v=${l.videoId}` : "",
      readingMaterial: l.readingMaterial ?? "",
      xpReward: l.xpReward,
      creditReward: l.creditReward,
      estimatedMinutes: l.estimatedMinutes,
      order: l.order,
      isPublished: l.isPublished,
    });
    setEditing(l);
  };
  const closeModal = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
  };
  const isSaving = create.isPending || update.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // isPublished is excluded from the regular create/update body and sent
    // separately (create: inline, since a brand-new lesson has no
    // draft->published transition to notify anyone about; edit: via the
    // dedicated /publish route, which is what actually notifies enrolled
    // users — only called when the status checkbox was actually changed,
    // so editing other fields on an already-published lesson doesn't
    // re-notify anyone).
    const { youtubeUrl, isPublished, ...rest } = form;
    const body = {
      ...rest,
      course: modules.list.data?.find((m) => m._id === form.module)?.course,
      videoProvider: videoId ? "youtube" : null,
      videoId: videoId ?? undefined,
    };
    if (editing === "new") {
      create.mutate({ ...body, isPublished } as never, {
        onSuccess: () => {
          toast("success", "Lesson created successfully");
          closeModal();
        },
        onError: () => toast("error", "Couldn't create the lesson"),
      });
    } else if (editing) {
      update.mutate(
        { id: editing._id, body: body as never },
        {
          onSuccess: () => {
            if (isPublished !== editing.isPublished) {
              togglePublish.mutate({ id: editing._id, isPublished });
            }
            toast("success", "Lesson updated");
            closeModal();
          },
          onError: () => toast("error", "Couldn't update the lesson"),
        }
      );
    }
  };

  const handleDelete = () => {
    if (!pendingDelete) return;
    remove.mutate(pendingDelete._id, {
      onSuccess: () => {
        toast("success", "Lesson deleted");
        setPendingDelete(null);
      },
      onError: () => toast("error", "Couldn't delete this lesson"),
    });
  };

  return (
    <div>
      <PageHeader
        title="Lessons"
        subtitle="Attach a YouTube video + reading material to a module."
        action={
          <Button onClick={openCreate}>
            <Plus size={16} /> Add Lesson
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search lessons..." />
      </div>

      <DataTable
        columns={[
          { header: "Title", render: (l) => <span className="font-medium">{l.title}</span> },
          { header: "Module", render: (l) => moduleTitle(l.module) },
          { header: "Video", render: (l) => (l.videoId ? <Badge variant="success">YouTube ✓</Badge> : <Badge>—</Badge>) },
          { header: "XP", render: (l) => l.xpReward },
          {
            header: "Status",
            render: (l) => (
              <Badge variant={l.isPublished ? "success" : "neutral"} onClick={() => togglePublish.mutate({ id: l._id, isPublished: !l.isPublished })}>
                {l.isPublished ? "Published" : "Draft"}
              </Badge>
            ),
          },
          {
            header: "",
            render: (l) => (
              <div className="flex justify-end">
                <ActionMenu
                  items={[
                    { label: "Edit Lesson", onClick: () => openEdit(l) },
                    { label: "Delete", onClick: () => setPendingDelete(l), destructive: true },
                  ]}
                />
              </div>
            ),
          },
        ]}
        rows={filteredRows}
        rowKey={(l) => l._id}
        isLoading={list.isLoading}
        emptyLabel={search ? "No lessons match your search" : "No lessons yet"}
        emptyMessage={search ? undefined : "Add your first lesson to a module."}
      />

      <Modal
        open={editing !== null}
        onClose={closeModal}
        title={editing === "new" ? "Create Lesson" : "Edit Lesson"}
        widthClassName="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" form="lesson-form" loading={isSaving}>
              {editing === "new" ? "Create Lesson" : "Save Changes"}
            </Button>
          </>
        }
      >
        <form id="lesson-form" className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <Field label="Module">
            <Select value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} required>
              <option value="">Select module</option>
              {(modules.list.data ?? []).map((m) => (
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
            <AITextarea label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} rows={2} />
          </div>
          <div className="sm:col-span-2">
            <Field label="YouTube URL">
              <Input
                value={form.youtubeUrl}
                onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </Field>
            <p className="mt-1 text-xs text-textMuted">
              {form.youtubeUrl ? (videoId ? `Video ID: ${videoId}` : "Couldn't parse a video ID from that URL") : "Optional"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <AITextarea
              label="Reading material"
              value={form.readingMaterial}
              onChange={(v) => setForm({ ...form, readingMaterial: v })}
              rows={5}
            />
          </div>
          <Field label="XP reward">
            <Input type="number" value={form.xpReward} onChange={(e) => setForm({ ...form, xpReward: Number(e.target.value) })} />
          </Field>
          <Field label="Credit reward">
            <Input type="number" value={form.creditReward} onChange={(e) => setForm({ ...form, creditReward: Number(e.target.value) })} />
          </Field>
          <Field label="Estimated minutes">
            <Input
              type="number"
              value={form.estimatedMinutes}
              onChange={(e) => setForm({ ...form, estimatedMinutes: Number(e.target.value) })}
            />
          </Field>
          <Field label="Order">
            <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
          </Field>
          <Field label="Status">
            <Select
              value={form.isPublished ? "published" : "draft"}
              onChange={(e) => setForm({ ...form, isPublished: e.target.value === "published" })}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete Lesson?"
        message={`Are you sure you want to delete "${pendingDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Lesson"
        loading={remove.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
