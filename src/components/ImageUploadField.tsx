"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { Field, Input } from "./form";
import { api } from "@/lib/api";

// Two ways to set the image: upload a file (goes straight to S3 via a
// presigned URL, same pattern as the lesson video pipeline — the file
// bytes never touch this Next.js server) or paste a URL directly. Either
// way just ends up setting the same string field on the form.
export function ImageUploadField({
  label,
  value,
  onChange,
  folder,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder: "categories" | "courses";
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const { data } = await api.post<{ uploadUrl: string; imageUrl: string }>("/admin/uploads/image", {
        fileName: file.name,
        contentType: file.type,
        folder,
      });
      await fetch(data.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      onChange(data.imageUrl);
    } catch {
      setError("Couldn't upload that image — try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Field label={label}>
      <div className="flex items-start gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-backgroundAlt text-textMuted">
            <UploadCloud size={18} />
          </div>
        )}
        <div className="flex-1 space-y-2">
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Paste an image URL, or upload a file" />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-textPrimary transition-opacity hover:bg-backgroundAlt disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload image"}
            </button>
            {error ? <span className="text-xs text-danger">{error}</span> : null}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </Field>
  );
}
