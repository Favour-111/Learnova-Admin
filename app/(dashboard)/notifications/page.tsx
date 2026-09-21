"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/form";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { AITextarea } from "@/components/ui/AITextarea";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

interface NotificationRow {
  _id: string;
  user: { name: string; email: string };
  type: string;
  title: string;
  createdAt: string;
  isRead: boolean;
}

const EMPTY_FORM = { title: "", body: "" };

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [composerOpen, setComposerOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<NotificationRow | null>(null);

  const list = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: async () => {
      const { data } = await api.get<{ notifications: NotificationRow[] }>("/admin/notifications");
      return data.notifications;
    },
  });

  // Reuses the same query key as the dashboard's stat card  shares its
  // cache instead of firing a second request just to show a user count.
  const dashboard = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const { data } = await api.get<{ userCount: number }>("/admin/dashboard");
      return data;
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ notifiedCount: number }>("/admin/announcements", form);
      return data;
    },
    onSuccess: ({ notifiedCount }) => {
      toast("success", `Sent to ${notifiedCount} user${notifiedCount === 1 ? "" : "s"}`);
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
      setConfirming(false);
      setComposerOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: () => toast("error", "Couldn't send the announcement"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/notifications/${id}`),
    onSuccess: () => {
      toast("success", "Notification deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
      setPendingDelete(null);
    },
    onError: () => toast("error", "Couldn't delete this notification"),
  });

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Recent notifications sent across all users"
        action={
          <Button onClick={() => setComposerOpen(true)}>
            <Megaphone size={16} /> Send Announcement
          </Button>
        }
      />

      <DataTable
        columns={[
          { header: "User", render: (n) => n.user?.name ?? "" },
          { header: "Type", render: (n) => n.type },
          { header: "Title", render: (n) => n.title },
          { header: "Read", render: (n) => (n.isRead ? "Yes" : "No") },
          { header: "Sent", render: (n) => new Date(n.createdAt).toLocaleString() },
          {
            header: "",
            render: (n) => (
              <div className="flex justify-end">
                <ActionMenu items={[{ label: "Delete", onClick: () => setPendingDelete(n), destructive: true }]} />
              </div>
            ),
          },
        ]}
        rows={list.data ?? []}
        rowKey={(n) => n._id}
        isLoading={list.isLoading}
      />

      <Modal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="Send Announcement"
        footer={
          <>
            <Button variant="ghost" onClick={() => setComposerOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="announcement-form"
              disabled={!form.title.trim() || !form.body.trim()}
            >
              Review &amp; Send
            </Button>
          </>
        }
      >
        <form
          id="announcement-form"
          className="grid grid-cols-1 gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setConfirming(true);
          }}
        >
          <AITextarea
            label="Title"
            value={form.title}
            onChange={(v) => setForm({ ...form, title: v })}
            rows={2}
            maxLength={80}
            required
          />
          <AITextarea
            label="Message"
            value={form.body}
            onChange={(v) => setForm({ ...form, body: v })}
            rows={4}
            maxLength={280}
            required
          />
          <p className="text-xs text-textMuted">
            Goes out as a push notification and appears in every user&apos;s Notifications screen.
          </p>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirming}
        title="Send to everyone?"
        message={
          dashboard.data
            ? `This will immediately notify all ${dashboard.data.userCount} users  push notification and in-app. This can't be undone.`
            : "This will immediately notify every user  push notification and in-app. This can't be undone."
        }
        confirmLabel="Send Announcement"
        destructive={false}
        loading={send.isPending}
        onConfirm={() => send.mutate()}
        onCancel={() => setConfirming(false)}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete notification?"
        message={`Are you sure you want to delete "${pendingDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete._id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
