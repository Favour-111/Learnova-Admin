"use client";

import React, { useState } from "react";
import { Sparkles, Wand2, PenLine, Minimize2, Maximize2, LucideIcon } from "lucide-react";
import { Field, Textarea } from "@/components/form";
import { api } from "@/lib/api";
import { useToast } from "./Toast";

const ACTIONS: { key: "rewrite" | "complete" | "shorten" | "lengthen"; label: string; icon: LucideIcon }[] = [
  { key: "rewrite", label: "Rewrite", icon: PenLine },
  { key: "complete", label: "Complete", icon: Wand2 },
  { key: "shorten", label: "Shorten", icon: Minimize2 },
  { key: "lengthen", label: "Lengthen", icon: Maximize2 },
];

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  rows?: number;
  maxLength?: number;
}

// A Textarea with an AI-assist toolbar (rewrite/complete/shorten/lengthen)
// above it — every long-text field in the admin panel should use this
// instead of the plain Textarea so the same writing-help is available
// everywhere consistently.
export function AITextarea({ label, value, onChange, required, rows, maxLength }: Props) {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const { toast } = useToast();

  const run = async (action: (typeof ACTIONS)[number]["key"]) => {
    if (!value.trim()) {
      toast("error", "Write something first, then AI can help with it.");
      return;
    }
    setPendingAction(action);
    try {
      const { data } = await api.post<{ result: string }>("/admin/ai/assist", { text: value, action });
      onChange(maxLength ? data.result.slice(0, maxLength) : data.result);
    } catch {
      toast("error", "AI request failed — check the OpenAI configuration and try again.");
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <Field label={label}>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Sparkles size={13} className="mr-0.5 text-primary" />
        {ACTIONS.map(({ key, label: actionLabel, icon: Icon }) => (
          <button
            key={key}
            type="button"
            disabled={pendingAction !== null}
            onClick={() => run(key)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-textSecondary transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {pendingAction === key ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            ) : (
              <Icon size={12} />
            )}
            {actionLabel}
          </button>
        ))}
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        rows={rows}
        maxLength={maxLength}
        disabled={pendingAction !== null}
      />
    </Field>
  );
}
