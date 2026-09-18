import React from "react";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-textSecondary">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-backgroundAlt px-4 py-2.5 text-sm text-textPrimary outline-none focus:border-primary";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={inputClass} rows={props.rows ?? 3} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={inputClass} />;
}

export function Button({
  children,
  variant = "primary",
  loading,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger"; loading?: boolean }) {
  const base = "inline-flex items-center gap-2 rounded-pill px-5 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50";
  const styles = {
    primary: "bg-primary text-white hover:opacity-90",
    ghost: "border border-border text-textPrimary hover:bg-backgroundAlt",
    danger: "bg-danger text-white hover:opacity-90",
  }[variant];
  return (
    <button {...rest} disabled={disabled || loading} className={`${base} ${styles}`}>
      {loading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
      {children}
    </button>
  );
}
